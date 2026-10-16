/**
 * Database regression tests for atomic Razorpay webhook processing and
 * legacy-safe billing state. Runs REAL Postgres 16 (PGlite/WASM) and applies
 * every migration in supabase/migrations in order. No Supabase project, no
 * live Razorpay.
 *
 * What is proven here (VERIFIED by this file, single-connection Postgres):
 *   - idempotency by event key AND by body hash
 *   - ordering on Razorpay's created_at (stale events never overwrite newer state)
 *   - workspace binding (a subscription cannot be moved between workspaces)
 *   - rollback: a failure after the ledger claim leaves NO ledger row and NO state change
 *   - takeover rules (a live Razorpay or legacy Stripe plan is never replaced)
 *   - function privileges: no EXECUTE for anon/authenticated, fixed search_path,
 *     SECURITY DEFINER, and no direct client writes to billing tables
 *
 * NOT proven here: true multi-connection row-lock races. PGlite has one
 * connection, so concurrency is covered by the mocked concurrent-duplicate test
 * in tests/lib/billing-webhook.test.ts and must be confirmed against a real
 * Supabase project (see docs/razorpay-security-hardening.md, NOT VERIFIED).
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = "supabase/migrations";
const WS_A = "00000000-0000-0000-0000-0000000000a1";
const WS_B = "00000000-0000-0000-0000-0000000000b2";
const WS_EMPTY = "00000000-0000-0000-0000-0000000000c3";
const SUB = "sub_TESTACTIVE01";
const SUB_NEW = "sub_TESTNEWSUB02";
const SUB_LEGACY_STRIPE_ROW = "sub_legacy_stripe_row";

const T1 = "2026-10-16T10:00:00Z";
const T2 = "2026-10-16T11:00:00Z";
const T3 = "2026-10-16T12:00:00Z";
const T4 = "2026-10-16T13:00:00Z";
const PT_FUTURE = "2026-11-16T10:00:00Z";
const PT_PAST = "2026-01-16T10:00:00Z";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

interface ApplyArgs {
  eventKey: string | null;
  eventType: string;
  eventCreatedAt: string | null;
  subscriptionId: string | null;
  workspaceId: string | null;
  status: string;
  customerId: string | null;
  paidThrough: string | null;
  paidThroughSource: string | null;
  currency: string | null;
  amount: number | null;
  onlyIfActive: boolean;
  bodySha256: string | null;
  razorpayEventId: string | null;
}

const BASE: ApplyArgs = {
  eventKey: "evt_1",
  eventType: "subscription.activated",
  eventCreatedAt: T1,
  subscriptionId: SUB,
  workspaceId: WS_A,
  status: "active",
  customerId: "cust_T1",
  paidThrough: PT_FUTURE,
  paidThroughSource: "razorpay_webhook",
  currency: "INR",
  amount: 1499,
  onlyIfActive: false,
  bodySha256: HASH_A,
  razorpayEventId: "evt_1",
};

let db: PGlite;

before(async () => {
  db = new PGlite();
  // Supabase roles + auth stand-ins (PGlite is a single superuser).
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email varchar(255));
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('app.jwt_sub', true), '')::uuid;
    $$;
  `);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  await db.exec(`
    insert into public.workspaces (id, name) values
      ('${WS_A}', 'Workspace A'),
      ('${WS_B}', 'Workspace B'),
      ('${WS_EMPTY}', 'Workspace Empty');
  `);
});

after(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.exec(`
    delete from public.billing_webhook_events;
    delete from public.billing_subscriptions;
  `);
});

async function apply(overrides: Partial<ApplyArgs> = {}): Promise<{ outcome: string; workspace_id: string | null }> {
  const a = { ...BASE, ...overrides };
  const r = await db.query<{ r: { outcome: string; workspace_id: string | null } }>(
    "select public.apply_razorpay_subscription_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) as r",
    [a.eventKey, a.eventType, a.eventCreatedAt, a.subscriptionId, a.workspaceId, a.status, a.customerId, a.paidThrough, a.paidThroughSource, a.currency, a.amount, a.onlyIfActive, a.bodySha256, a.razorpayEventId],
  );
  return r.rows[0].r;
}

async function applyThrows(overrides: Partial<ApplyArgs>): Promise<string> {
  try {
    await apply(overrides);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  return "";
}

async function billingFor(ws: string) {
  const r = await db.query<{ provider: string; status: string; razorpay_subscription_id: string | null; paid_through: string | null; last_billing_event_at: string | null; currency: string | null; amount: string | null }>(
    `select provider, status, razorpay_subscription_id, paid_through, last_billing_event_at, currency, amount::text as amount
       from public.billing_subscriptions where workspace_id = $1`,
    [ws],
  );
  return r.rows[0] ?? null;
}

async function ledgerCount(key: string) {
  const r = await db.query<{ n: number }>("select count(*)::int as n from public.billing_webhook_events where event_key = $1", [key]);
  return r.rows[0].n;
}

async function ledgerOutcome(key: string) {
  const r = await db.query<{ outcome: string }>("select outcome from public.billing_webhook_events where event_key = $1", [key]);
  return r.rows[0]?.outcome ?? null;
}

describe("atomic apply: valid subscription", () => {
  it("activates a Razorpay subscription, records the verified paid-through date and the ledger row", async () => {
    const res = await apply();
    assert.equal(res.outcome, "applied");
    assert.equal(res.workspace_id, WS_A);
    const row = await billingFor(WS_A);
    assert.equal(row?.provider, "razorpay");
    assert.equal(row?.status, "active");
    assert.equal(row?.razorpay_subscription_id, SUB);
    assert.equal(row?.currency, "INR");
    assert.equal(row?.amount, "1499");
    assert.ok(row?.paid_through && new Date(row.paid_through).toISOString() === new Date(PT_FUTURE).toISOString());
    assert.equal(await ledgerOutcome("evt_1"), "applied");
  });

  it("stores the Razorpay event id and body hash for audit", async () => {
    await apply();
    const r = await db.query<{ razorpay_event_id: string; body_sha256: string; workspace_id: string }>(
      "select razorpay_event_id, body_sha256, workspace_id from public.billing_webhook_events where event_key = 'evt_1'",
    );
    assert.equal(r.rows[0].razorpay_event_id, "evt_1");
    assert.equal(r.rows[0].body_sha256, HASH_A);
    assert.equal(r.rows[0].workspace_id, WS_A);
  });
});

describe("atomic apply: idempotency", () => {
  it("duplicate delivery (same event key) is a no-op", async () => {
    await apply();
    const before = await billingFor(WS_A);
    const res = await apply({ status: "halted", eventCreatedAt: T3, bodySha256: HASH_B });
    assert.equal(res.outcome, "duplicate");
    assert.deepEqual(await billingFor(WS_A), before);
    assert.equal(await ledgerCount("evt_1"), 1);
  });

  it("same raw body under a different event key is still a duplicate (body-hash uniqueness)", async () => {
    await apply();
    const res = await apply({ eventKey: "evt_other", razorpayEventId: null, bodySha256: HASH_A, status: "halted", eventCreatedAt: T3 });
    assert.equal(res.outcome, "duplicate");
    assert.equal((await billingFor(WS_A))?.status, "active");
    assert.equal(await ledgerCount("evt_other"), 0);
  });
});

describe("atomic apply: event ordering", () => {
  it("an older event does not overwrite a newer verified state", async () => {
    await apply({ eventKey: "evt_t2", eventCreatedAt: T2, eventType: "subscription.charged", bodySha256: HASH_B, razorpayEventId: null });
    const res = await apply({ eventKey: "evt_t1_halt", eventCreatedAt: T1, status: "halted", eventType: "subscription.halted", bodySha256: "c".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "stale");
    assert.equal((await billingFor(WS_A))?.status, "active");
    assert.equal(await ledgerOutcome("evt_t1_halt"), "stale");
  });

  it("a newer event that arrives first is not overwritten by a late older one", async () => {
    await apply({ eventKey: "evt_t3", eventCreatedAt: T3, status: "halted", eventType: "subscription.halted", bodySha256: HASH_B, razorpayEventId: null });
    const res = await apply({ eventKey: "evt_t1", eventCreatedAt: T1, bodySha256: "c".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "stale");
    assert.equal((await billingFor(WS_A))?.status, "halted");
  });

  it("failed payment after recovery: a stale payment.failed cannot downgrade a recovered subscription", async () => {
    await apply({ eventKey: "e_act", eventCreatedAt: T1, bodySha256: HASH_A });
    await apply({ eventKey: "e_charged", eventCreatedAt: T3, eventType: "subscription.charged", bodySha256: HASH_B, razorpayEventId: null });
    const late = await apply({ eventKey: "e_fail_old", eventCreatedAt: T2, eventType: "payment.failed", status: "pending", onlyIfActive: true, workspaceId: null, subscriptionId: SUB, bodySha256: "d".repeat(64), razorpayEventId: null, paidThrough: null, paidThroughSource: null, currency: null, amount: null, customerId: null });
    assert.equal(late.outcome, "stale");
    assert.equal((await billingFor(WS_A))?.status, "active");
  });

  it("a genuinely newer payment failure moves an active subscription to pending", async () => {
    await apply({ eventKey: "e_act", eventCreatedAt: T1, bodySha256: HASH_A });
    const fail = await apply({ eventKey: "e_fail_new", eventCreatedAt: T4, eventType: "payment.failed", status: "pending", onlyIfActive: true, workspaceId: null, bodySha256: "d".repeat(64), razorpayEventId: null, paidThrough: null, paidThroughSource: null, currency: null, amount: null, customerId: null });
    assert.equal(fail.outcome, "applied");
    assert.equal((await billingFor(WS_A))?.status, "pending");
  });

  it("payment.failed never creates or revives a subscription", async () => {
    const res = await apply({ eventKey: "e_fail_none", eventCreatedAt: T4, eventType: "payment.failed", status: "pending", onlyIfActive: true, workspaceId: WS_A, bodySha256: "e".repeat(64), razorpayEventId: null, paidThrough: null, paidThroughSource: null, currency: null, amount: null, customerId: null });
    assert.equal(res.outcome, "ignored");
    assert.equal(await billingFor(WS_A), null);
  });

  it("recovery after halt: a newer charged event re-activates with the new paid-through date", async () => {
    await apply({ eventKey: "e_act", eventCreatedAt: T1, bodySha256: HASH_A });
    await apply({ eventKey: "e_halt", eventCreatedAt: T2, status: "halted", eventType: "subscription.halted", bodySha256: HASH_B, razorpayEventId: null });
    const res = await apply({ eventKey: "e_recover", eventCreatedAt: T3, eventType: "subscription.charged", paidThrough: "2026-12-16T10:00:00Z", bodySha256: "f".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "applied");
    const row = await billingFor(WS_A);
    assert.equal(row?.status, "active");
    assert.equal(new Date(row!.paid_through!).toISOString(), "2026-12-16T10:00:00.000Z");
  });

  it("missing trusted timestamp for a keyed event is rejected before any state change", async () => {
    const msg = await applyThrows({ eventKey: "e_no_ts", eventCreatedAt: null });
    assert.match(msg, /missing_event_timestamp/);
    assert.equal(await billingFor(WS_A), null);
    assert.equal(await ledgerCount("e_no_ts"), 0);
  });
});

describe("atomic apply: workspace binding and takeover", () => {
  it("cross-workspace: a subscription bound to A cannot be applied to workspace B", async () => {
    await apply();
    const res = await apply({ eventKey: "e_cross", workspaceId: WS_B, status: "canceled", eventType: "subscription.cancelled", eventCreatedAt: T4, bodySha256: "1".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "rejected");
    assert.equal(await billingFor(WS_B), null, "workspace B must not gain a billing row");
    const a = await billingFor(WS_A);
    assert.equal(a?.status, "active", "workspace A state unchanged");
    assert.equal(await ledgerOutcome("e_cross"), "rejected");
  });

  it("unknown workspace with an unbound subscription is recorded, not applied", async () => {
    const res = await apply({ eventKey: "e_unknown_ws", subscriptionId: SUB_NEW, workspaceId: "00000000-0000-0000-0000-00000000dead", bodySha256: "2".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "unknown_workspace");
    assert.equal(await ledgerOutcome("e_unknown_ws"), "unknown_workspace");
  });

  it("a notes-less event for a known subscription resolves the workspace from the binding", async () => {
    await apply();
    const res = await apply({ eventKey: "e_nonotes", workspaceId: null, eventType: "subscription.charged", eventCreatedAt: T2, bodySha256: "3".repeat(64), razorpayEventId: null, paidThrough: "2026-12-16T10:00:00Z" });
    assert.equal(res.outcome, "applied");
    assert.equal(res.workspace_id, WS_A);
  });

  it("a live Razorpay subscription is not replaced by a second subscription (superseded)", async () => {
    await apply();
    const res = await apply({ eventKey: "e_second", subscriptionId: SUB_NEW, workspaceId: WS_A, eventCreatedAt: T4, bodySha256: "4".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "superseded");
    assert.equal((await billingFor(WS_A))?.razorpay_subscription_id, SUB);
  });

  it("an ended Razorpay subscription can be replaced by a new one (takeover)", async () => {
    await apply();
    await apply({ eventKey: "e_cancel", eventType: "subscription.cancelled", status: "canceled", eventCreatedAt: T2, bodySha256: "5".repeat(64), razorpayEventId: null, paidThrough: null, paidThroughSource: null });
    const res = await apply({ eventKey: "e_newsub", subscriptionId: SUB_NEW, workspaceId: WS_A, eventCreatedAt: T3, bodySha256: "6".repeat(64), razorpayEventId: null });
    assert.equal(res.outcome, "applied");
    assert.equal((await billingFor(WS_A))?.razorpay_subscription_id, SUB_NEW);
    // The old subscription's late events (still carrying workspace notes) cannot
    // overwrite the workspace's current, live subscription.
    const late = await apply({ eventKey: "e_old_late", eventType: "subscription.halted", status: "halted", eventCreatedAt: T4, bodySha256: "7".repeat(64), razorpayEventId: null });
    assert.equal(late.outcome, "superseded");
    assert.equal((await billingFor(WS_A))?.status, "active");
    assert.equal((await billingFor(WS_A))?.razorpay_subscription_id, SUB_NEW);
  });
});

describe("atomic apply: legacy Stripe rows", () => {
  async function seedLegacyStripe(status: string, paidThrough: string | null) {
    await db.exec(`
      insert into public.billing_subscriptions (workspace_id, provider, stripe_customer_id, stripe_subscription_id, status, currency, amount, paid_through, paid_through_source)
      values ('${WS_EMPTY}', 'stripe', 'cus_legacy', '${SUB_LEGACY_STRIPE_ROW}', '${status}', 'USD', 19, ${paidThrough ? `'${paidThrough}'` : "null"}, ${paidThrough ? "'stripe_reconciled'" : "null"});
    `);
  }

  it("a live legacy Stripe subscription is never double-billed: Razorpay activation is superseded", async () => {
    await seedLegacyStripe("active", PT_FUTURE);
    const res = await apply({ workspaceId: WS_EMPTY, eventKey: "e_legacy_block" });
    assert.equal(res.outcome, "superseded");
    const row = await billingFor(WS_EMPTY);
    assert.equal(row?.provider, "stripe", "legacy row untouched");
    assert.equal(row?.status, "active");
  });

  it("a legacy active row with no verified date also blocks takeover (no guess, no double bill)", async () => {
    await seedLegacyStripe("active", null);
    const res = await apply({ workspaceId: WS_EMPTY, eventKey: "e_legacy_nodate" });
    assert.equal(res.outcome, "superseded");
    assert.equal((await billingFor(WS_EMPTY))?.provider, "stripe");
  });

  it("an ended legacy row (canceled, paid period over) may be replaced by a Razorpay subscription", async () => {
    await seedLegacyStripe("canceled", PT_PAST);
    const res = await apply({ workspaceId: WS_EMPTY, eventKey: "e_legacy_ended" });
    assert.equal(res.outcome, "applied");
    const row = await billingFor(WS_EMPTY);
    assert.equal(row?.provider, "razorpay");
    assert.equal(row?.razorpay_subscription_id, SUB);
  });

  it("legacy Stripe columns and history are preserved by Razorpay writes", async () => {
    await seedLegacyStripe("canceled", PT_PAST);
    await apply({ workspaceId: WS_EMPTY, eventKey: "e_legacy_keep" });
    const r = await db.query<{ stripe_customer_id: string; stripe_subscription_id: string }>(
      "select stripe_customer_id, stripe_subscription_id from public.billing_subscriptions where workspace_id = $1",
      [WS_EMPTY],
    );
    assert.equal(r.rows[0].stripe_customer_id, "cus_legacy");
    assert.equal(r.rows[0].stripe_subscription_id, SUB_LEGACY_STRIPE_ROW);
  });
});

describe("atomic apply: partial database failure rolls everything back", () => {
  it("a failure after the ledger claim leaves no ledger row and no state change", async () => {
    await apply({ eventKey: "e_base", bodySha256: HASH_A });
    // Simulate an in-transaction DB fault on the billing write (after ledger claim).
    await db.exec(`
      create or replace function public.__test_fail_halt() returns trigger language plpgsql as $$
      begin
        if new.status = 'halted' then raise exception 'simulated_db_fault'; end if;
        return new;
      end $$;
      create trigger __test_fail_halt before update on public.billing_subscriptions
        for each row execute function public.__test_fail_halt();
    `);
    try {
      const msg = await applyThrows({ eventKey: "e_fault", eventType: "subscription.halted", status: "halted", eventCreatedAt: T3, bodySha256: "8".repeat(64), razorpayEventId: null });
      assert.match(msg, /simulated_db_fault/);
      assert.equal(await ledgerCount("e_fault"), 0, "ledger claim must roll back so the retry is processed");
      assert.equal((await billingFor(WS_A))?.status, "active", "billing state must roll back");
      assert.equal(await ledgerOutcome("e_base"), "applied", "earlier committed event keeps its outcome");
    } finally {
      await db.exec(`
        drop trigger if exists __test_fail_halt on public.billing_subscriptions;
        drop function if exists public.__test_fail_halt();
      `);
    }
    // Retry of the same event now succeeds from a clean slate.
    const retry = await apply({ eventKey: "e_fault", eventType: "subscription.halted", status: "halted", eventCreatedAt: T3, bodySha256: "8".repeat(64), razorpayEventId: null });
    assert.equal(retry.outcome, "applied");
    assert.equal((await billingFor(WS_A))?.status, "halted");
  });

  it("an event-ledger failure (invalid key) raises before any state is written", async () => {
    const msg = await applyThrows({ eventKey: "k".repeat(201), workspaceId: WS_B });
    assert.match(msg, /invalid_event_key/);
    assert.equal(await billingFor(WS_B), null);
  });
});

describe("input validation (SECURITY DEFINER boundary)", () => {
  it("rejects an invented status", async () => {
    assert.match(await applyThrows({ status: "invented" }), /invalid_status/);
  });
  it("rejects a malformed subscription id", async () => {
    assert.match(await applyThrows({ subscriptionId: "sub_x'; drop table x; --" }), /invalid_subscription_id/);
  });
  it("rejects a non-ISO currency", async () => {
    assert.match(await applyThrows({ currency: "rupees" }), /invalid_currency/);
  });
  it("rejects a non-positive amount", async () => {
    assert.match(await applyThrows({ amount: 0 }), /invalid_amount/);
  });
  it("rejects a malformed body hash", async () => {
    assert.match(await applyThrows({ bodySha256: "not-a-hash" }), /invalid_body_hash/);
  });
});

describe("function and table privileges", () => {
  it("apply function is SECURITY DEFINER with a fixed search_path", async () => {
    const r = await db.query<{ prosecdef: boolean; proconfig: string[] | null }>(
      "select prosecdef, proconfig from pg_proc where proname = 'apply_razorpay_subscription_event'",
    );
    assert.equal(r.rows[0].prosecdef, true);
    assert.ok(r.rows[0].proconfig?.some((c) => c.startsWith("search_path=") && c.includes("public")), "search_path must be pinned");
  });

  it("anon and authenticated cannot EXECUTE the apply function", async () => {
    const sig = "public.apply_razorpay_subscription_event(text,text,timestamptz,text,uuid,text,text,timestamptz,text,text,numeric,boolean,text,text)";
    for (const role of ["anon", "authenticated"]) {
      const r = await db.query<{ ok: boolean }>("select has_function_privilege($1, $2, 'EXECUTE') as ok", [role, sig]);
      assert.equal(r.rows[0].ok, false, `${role} must not execute billing mutations`);
    }
    const pub = await db.query<{ ok: boolean }>("select has_function_privilege('public', $1, 'EXECUTE') as ok", [sig]);
    assert.equal(pub.rows[0].ok, false, "PUBLIC must not execute billing mutations");
  });

  it("authenticated and anon have no direct write access to billing tables", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const priv of ["INSERT", "UPDATE", "DELETE"]) {
        const r = await db.query<{ ok: boolean }>("select has_table_privilege($1, 'public.billing_subscriptions', $2) as ok", [role, priv]);
        assert.equal(r.rows[0].ok, false, `${role} ${priv} on billing_subscriptions`);
      }
      const ledger = await db.query<{ ok: boolean }>("select has_table_privilege($1, 'public.billing_webhook_events', 'SELECT') as ok", [role]);
      assert.equal(ledger.rows[0].ok, false, `${role} must not read the webhook ledger`);
    }
  });

  it("the legacy schema is preserved: Stripe columns and no drops", async () => {
    const r = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'billing_subscriptions'",
    );
    const cols = r.rows.map((x) => x.column_name);
    for (const c of ["stripe_customer_id", "stripe_subscription_id", "provider", "paid_through", "razorpay_subscription_id"]) {
      assert.ok(cols.includes(c), `${c} must exist`);
    }
  });
});
