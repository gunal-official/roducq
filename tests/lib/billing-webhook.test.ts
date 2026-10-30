/**
 * Razorpay webhook + checkout-verify regression tests. Dependency-injected:
 * the database is an in-memory fake that mirrors apply_razorpay_subscription_event's
 * contract, and Razorpay's API is a stub. Nothing contacts live Razorpay.
 *
 * The real SQL semantics are verified separately in tests/db/razorpay-billing.test.ts.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { processRazorpayWebhook, deriveEventKey, sha256Hex, type ApplyEventArgs, type ApplyEventResult, type FetchSubscriptionResult, type WebhookDeps } from "../../lib/billing/webhook-processor.ts";
import { verifyRazorpayCheckout, type VerifyDeps } from "../../lib/billing/checkout-verify.ts";
import { parseRazorpayWebhookEvent, verifyPaymentSignature, type RazorpayPlanConfig } from "../../lib/razorpay.ts";

const SECRET = "whsec_unit_test_secret";
const KEY_SECRET = "key_secret_unit_test";
const WS = "11111111-2222-3333-4444-555555555555";
const WS_OTHER = "99999999-8888-7777-6666-555555555555";
const SUB = "sub_ABCDEF123456";
const PLAN = "plan_TESTPRO001";
const PLANS: RazorpayPlanConfig[] = [{ currency: "INR", planId: PLAN, amount: 1499 }];
const NOW_SEC = 1_792_000_000; // 2026-10-16 approx, unix seconds
const CURRENT_END = NOW_SEC + 30 * 86400;

function sign(raw: string, secret = SECRET) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

function subEvent(event: string, opts: { status?: string; notes?: Record<string, string>; createdAt?: number | null; currentEnd?: number | null; planId?: string } = {}) {
  const body: Record<string, unknown> = {
    event,
    payload: {
      subscription: {
        entity: {
          id: SUB,
          status: opts.status ?? "active",
          plan_id: opts.planId ?? PLAN,
          customer_id: "cust_TEST001",
          notes: opts.notes ?? { workspace_id: WS },
          ...(opts.currentEnd === null ? {} : { current_end: opts.currentEnd ?? CURRENT_END }),
        },
      },
    },
  };
  if (opts.createdAt !== null) body.created_at = opts.createdAt ?? NOW_SEC;
  return JSON.stringify(body);
}

function failedEvent(createdAt = NOW_SEC) {
  return JSON.stringify({ event: "payment.failed", created_at: createdAt, payload: { payment: { entity: { subscription_id: SUB } } } });
}

/** In-memory stand-in for the database function's contract. Serialised, like row locks. */
function fakeDb() {
  const ledger = new Map<string, { outcome: string }>();
  const bodies = new Set<string>();
  const rows = new Map<string, { provider: string; status: string; sub: string | null; ws: string; last: number | null; paidThrough: string | null }>();
  const calls: ApplyEventArgs[] = [];
  let chain: Promise<unknown> = Promise.resolve();
  let failNext: string | null = null;

  const impl = (args: ApplyEventArgs): ApplyEventResult => {
    calls.push(args);
    if (failNext) { const e = failNext; failNext = null; return { ok: false, error: e }; }
    if (args.eventKey !== null) {
      if (ledger.has(args.eventKey) || (args.bodySha256 && bodies.has(args.bodySha256))) return { ok: true, outcome: "duplicate", workspaceId: null };
      ledger.set(args.eventKey, { outcome: "pending" });
      if (args.bodySha256) bodies.add(args.bodySha256);
    }
    const outcome = (() => {
      if (args.subscriptionId === null) return "ignored";
      const bound = [...rows.values()].find((r) => r.sub === args.subscriptionId);
      const ws = bound?.ws ?? args.workspaceId;
      if (!ws) return "unknown_workspace";
      if (bound && args.workspaceId && args.workspaceId !== bound.ws) return "rejected";
      const row = rows.get(ws);
      // Verification calls carry no event time: they read the database clock (NOW_SEC here).
      const eventAt = args.eventCreatedAt ? Math.floor(new Date(args.eventCreatedAt).getTime() / 1000) : NOW_SEC;
      if (!row) {
        if (args.onlyIfActive) return "ignored";
        rows.set(ws, { provider: "razorpay", status: args.status!, sub: args.subscriptionId, ws, last: eventAt, paidThrough: args.paidThrough });
        return "applied";
      }
      if (row.sub === args.subscriptionId) {
        if (row.last !== null && eventAt < row.last) return "stale";
        if (args.onlyIfActive && row.status !== "active") return "ignored";
        Object.assign(row, { status: args.status, last: eventAt, paidThrough: args.paidThrough ?? row.paidThrough });
        return "applied";
      }
      if (args.onlyIfActive) return "ignored";
      return "superseded";
    })();
    if (args.eventKey !== null) ledger.get(args.eventKey)!.outcome = outcome;
    return { ok: true, outcome, workspaceId: null };
  };

  const apply = (args: ApplyEventArgs) => {
    // Serialise like SELECT ... FOR UPDATE: one transaction at a time.
    const run = chain.then(() => impl(args));
    chain = run.catch(() => undefined);
    return run;
  };

  return {
    apply,
    calls,
    ledger,
    rows,
    failNextWith(msg: string) { failNext = msg; },
    seed(ws: string, row: { status: string; sub: string; last: number; paidThrough?: string | null }) {
      rows.set(ws, { provider: "razorpay", status: row.status, sub: row.sub, ws, last: row.last, paidThrough: row.paidThrough ?? null });
    },
  };
}

function deps(db: ReturnType<typeof fakeDb>, extra: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    webhookSecret: SECRET,
    plans: PLANS,
    apply: db.apply,
    fetchSubscription: async () => ({ ok: false, error: "fetch not expected in this test" }),
    ...extra,
  };
}

function input(raw: string, extra: { signature?: string | null; eventId?: string | null } = {}) {
  return { raw, signature: extra.signature === undefined ? sign(raw) : extra.signature, eventIdHeader: extra.eventId ?? null };
}

/** The processors return their server log line; tests assert on it, never on payloads. */
function logsOf(result: { log?: string }): string {
  return result.log ?? "";
}

describe("valid Razorpay subscription", () => {
  test("a known Plan ID supplies server-owned currency and amount metadata", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    const r = await processRazorpayWebhook(input(raw), deps(db));
    assert.equal(r.status, 200);
    assert.equal(r.body.outcome, "applied");
    const call = db.calls[0];
    assert.equal(call.status, "active");
    assert.equal(call.currency, "INR");
    assert.equal(call.amount, 1499, "amount comes from configured server plans, not the payload");
    assert.equal(call.paidThrough, new Date(CURRENT_END * 1000).toISOString());
    assert.equal(call.paidThroughSource, "razorpay_webhook");
    assert.equal(call.workspaceId, WS);
  });

  test("event time is Razorpay's created_at, not local arrival time", async () => {
    const db = fakeDb();
    await processRazorpayWebhook(input(subEvent("subscription.activated", { createdAt: NOW_SEC - 500 })), deps(db));
    assert.equal(db.calls[0].eventCreatedAt, new Date((NOW_SEC - 500) * 1000).toISOString());
  });

  test("SECURITY CHARACTERIZATION: an unknown Plan ID reaches mocked apply and its active status is applied", async () => {
    const db = fakeDb();
    const result = await processRazorpayWebhook(
      input(subEvent("subscription.activated", { planId: "plan_UNKNOWN" })),
      deps(db),
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.outcome, "applied");
    assert.equal(db.calls.length, 1, "the unknown Plan event reaches the apply layer");
    assert.equal(db.calls[0].status, "active");
    assert.equal(db.calls[0].amount, null);
    assert.equal(db.calls[0].currency, null);
  });
});

describe("signature and payload validation", () => {
  test("invalid signature is rejected before any state change", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    const r = await processRazorpayWebhook(input(raw, { signature: sign(raw, "wrong") }), deps(db));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("a modified body with the original signature is rejected (raw-body HMAC)", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    const tampered = raw.replace(/active/, "halted");
    const r = await processRazorpayWebhook(input(tampered, { signature: sign(raw) }), deps(db));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("missing signature is rejected", async () => {
    const db = fakeDb();
    const r = await processRazorpayWebhook(input(subEvent("subscription.activated"), { signature: null }), deps(db));
    assert.equal(r.status, 400);
  });

  test("no webhook secret configured fails closed", async () => {
    const db = fakeDb();
    const r = await processRazorpayWebhook(input(subEvent("subscription.activated")), deps(db, { webhookSecret: undefined }));
    assert.equal(r.status, 500);
    assert.equal(db.calls.length, 0);
  });

  test("an event with no trusted created_at is rejected (no local-clock fallback)", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated", { createdAt: null });
    const r = await processRazorpayWebhook(input(raw), deps(db));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("unrelated event types are acknowledged and ignored", async () => {
    const db = fakeDb();
    const raw = JSON.stringify({ event: "order.paid", created_at: NOW_SEC, payload: {} });
    const r = await processRazorpayWebhook(input(raw), deps(db));
    assert.equal(r.status, 200);
    assert.equal(r.body.ignored, "order.paid");
    assert.equal(db.calls.length, 0);
  });

  test("a payload without a subscription entity is rejected as malformed", async () => {
    const db = fakeDb();
    const raw = JSON.stringify({ event: "subscription.activated", created_at: NOW_SEC, payload: {} });
    const r = await processRazorpayWebhook(input(raw), deps(db));
    assert.equal(r.status, 400);
  });
});

describe("duplicates and concurrency", () => {
  test("duplicate webhook (same raw body) is acknowledged without re-applying", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    const first = await processRazorpayWebhook(input(raw, { eventId: "evt_dup" }), deps(db));
    const second = await processRazorpayWebhook(input(raw, { eventId: "evt_dup" }), deps(db));
    assert.equal(first.body.outcome, "applied");
    assert.equal(second.status, 200);
    assert.equal(second.body.outcome, "duplicate");
    assert.equal(db.ledger.size, 1);
  });

  test("concurrent duplicate webhooks apply exactly once", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => processRazorpayWebhook(input(raw, { eventId: "evt_race" }), deps(db))),
    );
    const outcomes = results.map((r) => r.body.outcome).sort();
    assert.deepEqual(outcomes, ["applied", "duplicate", "duplicate", "duplicate", "duplicate"]);
    assert.equal(db.ledger.size, 1);
  });

  test("the same event redelivered with a different header id is still a duplicate (body hash)", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated");
    await processRazorpayWebhook(input(raw, { eventId: "evt_a" }), deps(db));
    const again = await processRazorpayWebhook(input(raw, { eventId: "evt_b" }), deps(db));
    assert.equal(again.body.outcome, "duplicate");
  });

  test("SECURITY CHARACTERIZATION: a shared unauthenticated event-ID header collides across different signed bodies", async () => {
    const db = fakeDb();
    const firstRaw = subEvent("subscription.activated", { createdAt: NOW_SEC });
    const secondRaw = subEvent("subscription.halted", { status: "halted", createdAt: NOW_SEC + 10 });
    const sharedHeader = "evt_reused_header";

    assert.notEqual(sha256Hex(firstRaw), sha256Hex(secondRaw), "the signed bodies are different");
    assert.equal(
      deriveEventKey(sharedHeader, sha256Hex(firstRaw)),
      deriveEventKey(sharedHeader, sha256Hex(secondRaw)),
      "the unsigned event-ID header wins over each distinct body hash",
    );

    const first = await processRazorpayWebhook(input(firstRaw, { eventId: sharedHeader }), deps(db));
    const second = await processRazorpayWebhook(input(secondRaw, { eventId: sharedHeader }), deps(db));

    assert.equal(first.body.outcome, "applied");
    assert.equal(second.status, 200);
    assert.equal(second.body.outcome, "duplicate", "the second distinct event is suppressed as a duplicate");
    assert.equal(db.rows.get(WS)?.status, "active", "the second event did not update stored state to halted");
    assert.equal(db.ledger.size, 1);
  });

  test("event key is the Razorpay event id when present, else the body hash", () => {
    const raw = subEvent("subscription.activated");
    assert.equal(deriveEventKey("evt_123", sha256Hex(raw)), "evt_123");
    assert.equal(deriveEventKey(null, sha256Hex(raw)), sha256Hex(raw));
    assert.equal(deriveEventKey("bad id with spaces", sha256Hex(raw)), sha256Hex(raw), "malformed header is ignored");
  });
});

describe("ordering", () => {
  test("out-of-order: an older halted event does not overwrite a newer active state", async () => {
    const db = fakeDb();
    await processRazorpayWebhook(input(subEvent("subscription.charged", { createdAt: NOW_SEC + 100 })), deps(db));
    const late = await processRazorpayWebhook(input(subEvent("subscription.halted", { status: "halted", createdAt: NOW_SEC })), deps(db));
    assert.equal(late.body.outcome, "stale");
    assert.equal(db.rows.get(WS)?.status, "active");
  });

  test("failed payment after recovery: a stale payment.failed cannot downgrade a recovered subscription", async () => {
    const db = fakeDb();
    await processRazorpayWebhook(input(subEvent("subscription.activated", { createdAt: NOW_SEC })), deps(db));
    await processRazorpayWebhook(input(subEvent("subscription.charged", { createdAt: NOW_SEC + 200 })), deps(db));
    const staleFailure = await processRazorpayWebhook(input(failedEvent(NOW_SEC + 100)), deps(db));
    assert.equal(staleFailure.body.outcome, "stale");
    assert.equal(db.rows.get(WS)?.status, "active");
  });

  test("a genuinely newer payment failure moves an active subscription to pending", async () => {
    const db = fakeDb();
    await processRazorpayWebhook(input(subEvent("subscription.activated", { createdAt: NOW_SEC })), deps(db));
    const fail = await processRazorpayWebhook(input(failedEvent(NOW_SEC + 300)), deps(db));
    assert.equal(fail.body.outcome, "applied");
    assert.equal(db.rows.get(WS)?.status, "pending");
    assert.equal(db.calls.at(-1)?.onlyIfActive, true, "payment failures are conditional on the stored state");
  });

  test("payment.failed for an unknown subscription never creates a workspace row", async () => {
    const db = fakeDb();
    const r = await processRazorpayWebhook(input(failedEvent()), deps(db));
    assert.equal(r.status, 200);
    assert.equal(db.rows.size, 0);
  });

  test("halted, paused, and cancelled map to non-entitling states", async () => {
    for (const [event, status] of [["subscription.halted", "halted"], ["subscription.paused", "paused"], ["subscription.cancelled", "canceled"]] as const) {
      const db = fakeDb();
      await processRazorpayWebhook(input(subEvent("subscription.activated")), deps(db));
      await processRazorpayWebhook(input(subEvent(event, { status: event === "subscription.cancelled" ? "cancelled" : status, createdAt: NOW_SEC + 10 })), deps(db));
      assert.equal(db.rows.get(WS)?.status, status, event);
    }
  });
});

describe("workspace binding", () => {
  test("SECURITY CHARACTERIZATION: the first webhook binds an unbound subscription using workspace_id from notes", async () => {
    const db = fakeDb();
    assert.equal(db.rows.size, 0, "there is no prior subscription binding or checkout intent in this fixture");

    const result = await processRazorpayWebhook(
      input(subEvent("subscription.activated", { notes: { workspace_id: WS } })),
      deps(db),
    );

    assert.equal(result.body.outcome, "applied");
    assert.equal(db.calls.length, 1);
    assert.equal(db.calls[0].workspaceId, WS, "the parsed notes workspace reaches the apply layer");
    assert.equal(db.rows.get(WS)?.sub, SUB, "the new binding is created from this webhook");
  });

  test("cross-workspace: a subscription bound to one workspace cannot be applied to another", async () => {
    const db = fakeDb();
    await processRazorpayWebhook(input(subEvent("subscription.activated")), deps(db));
    const attack = await processRazorpayWebhook(input(subEvent("subscription.cancelled", { status: "cancelled", notes: { workspace_id: WS_OTHER }, createdAt: NOW_SEC + 50 })), deps(db));
    assert.equal(attack.body.outcome, "rejected");
    assert.equal(db.rows.has(WS_OTHER), false);
    assert.equal(db.rows.get(WS)?.status, "active");
  });

  test("a non-UUID or missing workspace in notes with no bound subscription is unknown", async () => {
    const db = fakeDb();
    const r = await processRazorpayWebhook(input(subEvent("subscription.activated", { notes: {} })), deps(db));
    assert.equal(r.body.outcome, "unknown_workspace");
    assert.equal(db.rows.size, 0);
  });
});

describe("partial database failure and ledger failure", () => {
  test("a database failure returns 500 so Razorpay retries, and leaks no secret or payload", async () => {
    const db = fakeDb();
    db.failNextWith("simulated_db_fault");
    const raw = subEvent("subscription.activated");
    const result = await processRazorpayWebhook(input(raw), deps(db));
    const logs = logsOf(result);
    assert.equal(result.status, 500);
    assert.equal(result.body.error, "Webhook handling failed.");
    assert.match(logs, /simulated_db_fault/);
    assert.doesNotMatch(logs, new RegExp(SECRET));
    assert.doesNotMatch(logs, new RegExp(sign(raw)));
    assert.doesNotMatch(logs, /cust_TEST001|sub_ABCDEF/);
  });

  test("an event-ledger failure returns 500 and does not mark the event processed", async () => {
    const db = fakeDb();
    db.failNextWith("ledger_write_failed");
    const raw = subEvent("subscription.activated");
    const first = await processRazorpayWebhook(input(raw, { eventId: "evt_ledger" }), deps(db));
    assert.equal(first.status, 500);
    assert.equal(db.ledger.size, 0, "a failed transaction leaves no ledger row");
    const retry = await processRazorpayWebhook(input(raw, { eventId: "evt_ledger" }), deps(db));
    assert.equal(retry.status, 200);
    assert.equal(retry.body.outcome, "applied", "the retry is processed from a clean slate");
  });

  test("an unverifiable paid-through date returns 500 (retry) and does not apply guessed state", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated", { currentEnd: null });
    const r = await processRazorpayWebhook(input(raw), deps(db, {
      fetchSubscription: async (): Promise<FetchSubscriptionResult> => ({ ok: false, error: "Could not reach Razorpay" }),
    }));
    assert.equal(r.status, 500);
    assert.equal(db.calls.length, 0);
  });

  test("a missing current_end is filled from Razorpay's API before granting access", async () => {
    const db = fakeDb();
    const raw = subEvent("subscription.activated", { currentEnd: null });
    const r = await processRazorpayWebhook(input(raw), deps(db, {
      fetchSubscription: async () => ({ ok: true, subscription: { id: SUB, status: "active", plan_id: PLAN, customer_id: "cust_TEST001", notes: { workspace_id: WS }, current_end: CURRENT_END } }),
    }));
    assert.equal(r.status, 200);
    assert.equal(db.calls[0].paidThrough, new Date(CURRENT_END * 1000).toISOString());
    assert.equal(db.calls[0].paidThroughSource, "razorpay_api", "fetched date is labelled with its verified source");
  });

  test("a halted event with no date does not call the API (no access is granted)", async () => {
    const db = fakeDb();
    let fetched = false;
    const raw = subEvent("subscription.halted", { status: "halted", currentEnd: null });
    await processRazorpayWebhook(input(raw), deps(db, {
      fetchSubscription: async () => { fetched = true; return { ok: false, error: "unused" }; },
    }));
    assert.equal(fetched, false);
  });
});

// ── Checkout verification (browser → server) ───────────────────────────

const PAYMENT = "pay_TESTPAY0001";

function verifyDeps(db: ReturnType<typeof fakeDb>, sub: Partial<{ notes: Record<string, string>; plan_id: string; status: string; current_end: number | null }> = {}): VerifyDeps {
  return {
    keyId: "rzp_test_unit",
    keySecret: KEY_SECRET,
    plans: PLANS,
    apply: db.apply,
    now: new Date(NOW_SEC * 1000),
    fetchSubscription: async () => ({
      ok: true,
      subscription: { id: SUB, status: sub.status ?? "active", plan_id: sub.plan_id ?? PLAN, customer_id: "cust_TEST001", notes: sub.notes ?? { workspace_id: WS }, current_end: sub.current_end === undefined ? CURRENT_END : sub.current_end },
    }),
  };
}

function goodSig() {
  return createHmac("sha256", KEY_SECRET).update(`${PAYMENT}|${SUB}`).digest("hex");
}

describe("checkout verification", () => {
  const base = { paymentId: PAYMENT, subscriptionId: SUB, signature: "", workspaceId: WS, role: "owner" };

  test("valid checkout records the subscription from Razorpay's API, not the browser", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db));
    assert.equal(r.status, 200);
    assert.equal(r.body.plan, "pro");
    assert.equal(db.calls[0].eventKey, null, "checkout verification is not a webhook event");
    assert.equal(db.calls[0].paidThroughSource, "razorpay_api");
    assert.equal(db.calls[0].amount, 1499);
  });

  test("invalid payment signature is rejected and nothing is written", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, signature: "0".repeat(64) }, verifyDeps(db));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("a signature from a different subscription binding is rejected (replay)", async () => {
    const db = fakeDb();
    const otherSig = createHmac("sha256", KEY_SECRET).update(`${PAYMENT}|sub_OTHER000000`).digest("hex");
    const r = await verifyRazorpayCheckout({ ...base, signature: otherSig }, verifyDeps(db));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("cross-workspace: a subscription whose notes name another workspace is refused", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db, { notes: { workspace_id: WS_OTHER } }));
    assert.equal(r.status, 403);
    assert.equal(db.calls.length, 0);
  });

  test("unauthorized entitlement: a non-owner cannot verify or change billing", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, role: "member", signature: goodSig() }, verifyDeps(db));
    assert.equal(r.status, 403);
    assert.equal(db.calls.length, 0);
  });

  test("a plan that is not server-configured is refused", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db, { plan_id: "plan_EVIL" }));
    assert.equal(r.status, 400);
    assert.equal(db.calls.length, 0);
  });

  test("a verified-but-created (unpaid) subscription records a non-entitling status and grants no Pro", async () => {
    const db = fakeDb();
    const r = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db, { status: "created", current_end: null }));
    assert.equal(r.status, 200);
    assert.equal(r.body.plan, "free");
  });

  test("a second live subscription from the checkout path is refused with 409 (superseded)", async () => {
    const db = fakeDb();
    db.seed(WS, { status: "active", sub: "sub_EXISTING0001", last: NOW_SEC - 10, paidThrough: null });
    const r = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db));
    assert.equal(r.status, 409);
  });

  test("a database failure during verification returns 500 without leaking details", async () => {
    const db = fakeDb();
    db.failNextWith("simulated_db_fault");
    const result = await verifyRazorpayCheckout({ ...base, signature: goodSig() }, verifyDeps(db));
    assert.equal(result.status, 500);
    assert.doesNotMatch(JSON.stringify(result.body), /simulated/);
    assert.doesNotMatch(logsOf(result), new RegExp(KEY_SECRET));
    assert.match(logsOf(result), /simulated_db_fault/);
  });
});

describe("secrets and payment signatures are never logged", () => {
  test("a successful webhook writes no logs at all", async () => {
    const db = fakeDb();
    const result = await processRazorpayWebhook(input(subEvent("subscription.activated")), deps(db));
    assert.equal(logsOf(result), "");
  });

  test("the parser and verifiers stay pure (no console output)", () => {
    const lines: string[] = [];
    const origLog = console.log; const origErr = console.error;
    console.log = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); };
    console.error = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); };
    try {
      parseRazorpayWebhookEvent(subEvent("subscription.activated"));
      verifyPaymentSignature({ paymentId: PAYMENT, subscriptionId: SUB, signature: goodSig(), keySecret: KEY_SECRET });
    } finally { console.log = origLog; console.error = origErr; }
    assert.deepEqual(lines, []);
  });
});
