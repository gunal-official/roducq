/**
 * Stage 1B RPC contract tests using local PGlite and repository migrations only.
 * PGlite is single-connection: this proves skip-locked SQL is installed and
 * exercises lease/state behavior, but not true multi-connection races.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS = "supabase/migrations";
const OWNER = "20000000-0000-0000-0000-000000000001";
const WS_A = "10000000-0000-0000-0000-0000000000a1";
const WS_B = "10000000-0000-0000-0000-0000000000b2";
const PLAN_ID = "30000000-0000-0000-0000-000000000001";
const REQUEST_A = "40000000-0000-0000-0000-000000000001";
const REQUEST_B = "40000000-0000-0000-0000-000000000002";
const SUB_A = "sub_Stage1ATest001";
const HASH_A = "a".repeat(64);
const EVENT_AT = "2026-11-04T09:00:00Z";
let db: PGlite;

async function reserve(workspace = WS_A, requestKey = REQUEST_A) {
  return db.query<{ intent_id: string; state: string }>(
    `select (public.reserve_razorpay_checkout_intent($1, 'starter', 'USD', $2)).id as intent_id,
            (public.reserve_razorpay_checkout_intent($1, 'starter', 'USD', $2)).state as state`,
    [workspace, requestKey],
  );
}
async function start(intentId: string, workspace = WS_A) {
  return db.query<{ provider_call_authorized: boolean; intent_row: any; provider_plan_id: string | null }>(
    `select * from public.start_razorpay_checkout_create($1, $2, $3)`, [intentId, workspace, OWNER],
  );
}
async function addSubscriptionRow(workspace: string, status: "active" | "canceled", paidThrough: string | null) {
  await db.query(
    `insert into public.billing_subscriptions (workspace_id, provider, status, paid_through)
     values ($1, 'razorpay', $2, $3)`, [workspace, status, paidThrough],
  );
}
async function bindSubscription(intentId: string, subId = SUB_A, planId = "plan_stage1a001") {
  return db.query<{ result: any }>(
    `select public.record_razorpay_subscription_created($1, $2, $3) as result`,
    [intentId, subId, planId],
  );
}
async function ingest(input: {
  hash?: string;
  subscriptionId?: string | null;
  planId?: string | null;
  intentHint?: string | null;
  workspaceHint?: string | null;
} = {}) {
  return db.query<{ inserted: boolean; work_row: any }>(
    `select * from public.ingest_razorpay_webhook_work(
       $1, 'evt_stage1b', 'subscription.activated', $2, $3, $4, 'active',
       '2026-12-01T00:00:00Z', $5, $6
     )`,
    [input.hash ?? HASH_A, EVENT_AT, input.subscriptionId === undefined ? SUB_A : input.subscriptionId,
      input.planId ?? "plan_stage1a001", input.intentHint ?? null, input.workspaceHint ?? null],
  );
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email varchar(255), raw_user_meta_data jsonb not null default '{}'::jsonb);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('app.jwt_sub', true), '')::uuid;
    $$;
  `);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id, email) values ('${OWNER}', 'stage1b@example.invalid');
    insert into public.workspaces (id, name) values ('${WS_A}', 'Stage1B A'), ('${WS_B}', 'Stage1B B');
    insert into public.workspace_members (workspace_id, user_id, role) values
      ('${WS_A}', '${OWNER}', 'owner'), ('${WS_B}', '${OWNER}', 'owner');
    insert into public.razorpay_plan_catalog
      (id, provider_mode, provider_plan_id, tier, currency, amount_minor, interval_unit,
       interval_count, included_seats, created_by)
    values ('${PLAN_ID}', 'test', 'plan_stage1a001', 'starter', 'USD', 2900, 'month', 1, 1, '${OWNER}');
    update public.razorpay_plan_catalog set state = 'active' where id = '${PLAN_ID}';
    select set_config('app.jwt_sub', '${OWNER}', false);
  `);
});

after(async () => { await db?.close(); });

beforeEach(async () => {
  await db.exec(`
    delete from public.razorpay_webhook_work;
    delete from public.billing_subscriptions;
    delete from public.razorpay_subscription_bindings;
    delete from public.razorpay_checkout_intents;
  `);
});

describe("Stage 1B intent reservation and create authorization", () => {
  it("reserves an active Test Mode catalog plan and is idempotent", async () => {
    const first = await reserve();
    const second = await reserve();
    assert.equal(first.rows[0].intent_id, second.rows[0].intent_id);
    assert.equal(first.rows[0].state, "reserved");
    const count = await db.query<{ count: number }>("select count(*)::int as count from public.razorpay_checkout_intents");
    assert.equal(count.rows[0].count, 1);
  });

  it("rejects reservation when an active billing subscription exists", async () => {
    await addSubscriptionRow(WS_A, "active", null);
    await assert.rejects(reserve(), /workspace_has_current_subscription/);
  });

  it("rejects a canceled subscription with paid_through in the future", async () => {
    await addSubscriptionRow(WS_A, "canceled", "2099-01-01T00:00:00Z");
    await assert.rejects(reserve(), /workspace_has_current_subscription/);
  });

  it("allows a canceled subscription after paid_through", async () => {
    await addSubscriptionRow(WS_A, "canceled", "2000-01-01T00:00:00Z");
    assert.equal((await reserve()).rows[0].state, "reserved");
  });

  it("expires a stale reservation before allowing a new request key", async () => {
    const prior = await reserve();
    await db.query(
      `update public.razorpay_checkout_intents set created_at = now() - interval '20 minutes',
       reservation_expires_at = now() - interval '5 minutes' where id = $1`, [prior.rows[0].intent_id],
    );
    const next = await reserve(WS_A, REQUEST_B);
    assert.notEqual(next.rows[0].intent_id, prior.rows[0].intent_id);
    const states = await db.query<{ state: string }>(
      `select state from public.razorpay_checkout_intents where id = $1`, [prior.rows[0].intent_id],
    );
    assert.equal(states.rows[0].state, "expired");
  });

  it("only one start call authorizes a provider create and returns the catalog Plan ID", async () => {
    const intent = (await reserve()).rows[0];
    const first = await start(intent.intent_id);
    const second = await start(intent.intent_id);
    assert.equal(first.rows[0].provider_call_authorized, true);
    assert.equal(first.rows[0].provider_plan_id, "plan_stage1a001");
    assert.equal(second.rows[0].provider_call_authorized, false);
    assert.equal(second.rows[0].intent_row.state, "provider_create_started");
  });

  it("maps definite create failure to failed and ambiguous failure to reconciliation_required", async () => {
    const a = (await reserve(WS_A, REQUEST_A)).rows[0];
    await start(a.intent_id);
    const definitive = await db.query<{ state: string }>(
      `select (public.finish_razorpay_checkout_create_failure($1, false, 'provider_rejected')).state as state`, [a.intent_id],
    );
    assert.equal(definitive.rows[0].state, "failed");

    const b = (await reserve(WS_B, REQUEST_B)).rows[0];
    await start(b.intent_id, WS_B);
    const ambiguous = await db.query<{ state: string }>(
      `select (public.finish_razorpay_checkout_create_failure($1, true, 'transport_timeout')).state as state`, [b.intent_id],
    );
    assert.equal(ambiguous.rows[0].state, "reconciliation_required");
  });

  it("does not bind an unknown or mismatched provider Plan ID", async () => {
    const intent = (await reserve()).rows[0];
    await start(intent.intent_id);
    const result = await bindSubscription(intent.intent_id, SUB_A, "plan_unknown0001");
    assert.equal(result.rows[0].result.outcome, "reconciliation_required");
    const count = await db.query<{ count: number }>("select count(*)::int as count from public.razorpay_subscription_bindings");
    assert.equal(count.rows[0].count, 0);
  });
});

describe("Stage 1B binding integrity and verification", () => {
  it("records and verifies a binding only for the matching intent and catalog Plan", async () => {
    const intent = (await reserve()).rows[0];
    await start(intent.intent_id);
    const result = await bindSubscription(intent.intent_id);
    assert.equal(result.rows[0].result.outcome, "recorded");
    const verified = await db.query<{ result: any }>(
      `select public.verify_razorpay_checkout_binding($1, $2, 'plan_stage1a001') as result`, [intent.intent_id, SUB_A],
    );
    assert.equal(verified.rows[0].result.outcome, "verified");
    const mismatch = await db.query<{ result: any }>(
      `select public.verify_razorpay_checkout_binding($1, $2, 'plan_wrong0001') as result`, [intent.intent_id, SUB_A],
    );
    assert.equal(mismatch.rows[0].result.outcome, "rejected");
    const state = await db.query<{ state: string }>(
      `select state from public.razorpay_subscription_bindings where provider_subscription_id = $1`, [SUB_A],
    );
    assert.equal(state.rows[0].state, "verified");
  });

  it("rejects duplicate provider subscription binding and keeps second intent for reconciliation", async () => {
    const first = (await reserve(WS_A, REQUEST_A)).rows[0];
    await start(first.intent_id);
    assert.equal((await bindSubscription(first.intent_id)).rows[0].result.outcome, "recorded");
    const second = (await reserve(WS_B, REQUEST_B)).rows[0];
    await start(second.intent_id, WS_B);
    const duplicate = await bindSubscription(second.intent_id);
    assert.equal(duplicate.rows[0].result.outcome, "reconciliation_required");
    const count = await db.query<{ count: number }>(
      `select count(*)::int as count from public.razorpay_subscription_bindings where provider_subscription_id = $1`, [SUB_A],
    );
    assert.equal(count.rows[0].count, 1);
  });

  it("composite foreign key rejects a binding with intent/workspace mismatch", async () => {
    const first = (await reserve(WS_A, REQUEST_A)).rows[0];
    await start(first.intent_id);
    await assert.rejects(db.query(
      `insert into public.razorpay_subscription_bindings
       (provider_subscription_id, workspace_id, plan_catalog_id, checkout_intent_id, source, state)
       values ('sub_BadComposite1', $1, $2, $3, 'checkout_intent', 'provider_created')`,
      [WS_B, PLAN_ID, first.intent_id],
    ), /foreign key|violates/);
  });
});

describe("Stage 1B durable webhook work", () => {
  it("ingests once by body SHA-256 and preserves duplicate state", async () => {
    const first = await ingest();
    assert.equal(first.rows[0].inserted, true);
    const second = await ingest();
    assert.equal(second.rows[0].inserted, false);
    assert.equal(second.rows[0].work_row.state, "received");
    const count = await db.query<{ count: number }>("select count(*)::int as count from public.razorpay_webhook_work");
    assert.equal(count.rows[0].count, 1);
  });

  it("claims due work into a leased processing state and exposes SKIP LOCKED", async () => {
    await ingest();
    const claimed = await db.query<{ state: string; lease_token: string; attempt_count: number }>(
      `select state, lease_token, attempt_count from public.claim_razorpay_webhook_work(10)`,
    );
    assert.equal(claimed.rows.length, 1);
    assert.equal(claimed.rows[0].state, "processing");
    assert.ok(claimed.rows[0].lease_token);
    assert.equal(claimed.rows[0].attempt_count, 1);
    const definition = await db.query<{ definition: string }>(
      `select pg_get_functiondef('public.claim_razorpay_webhook_work(integer)'::regprocedure) as definition`,
    );
    assert.match(definition.rows[0].definition, /skip locked/i);
  });

  it("marks work with no provider subscription ID unresolved rather than trusting notes", async () => {
    await ingest({ subscriptionId: null, intentHint: REQUEST_A });
    const [lease] = (await db.query<{ body_sha256: string; lease_token: string }>(
      `select body_sha256, lease_token from public.claim_razorpay_webhook_work(1)`,
    )).rows;
    const result = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, $2, 'ready', 'ready', 'plan_stage1a001',
       null, 'active', '2026-12-01T00:00:00Z', 'razorpay_webhook') as result`,
      [lease.body_sha256, lease.lease_token],
    );
    assert.equal(result.rows[0].result.outcome, "unresolved");
    const billing = await db.query<{ count: number }>("select count(*)::int as count from public.billing_subscriptions");
    assert.equal(billing.rows[0].count, 0);
  });

  it("rejects a note-intent mismatch without applying billing", async () => {
    const intent = (await reserve()).rows[0];
    await start(intent.intent_id);
    await bindSubscription(intent.intent_id);
    const wrongIntent = "40000000-0000-0000-0000-000000000099";
    await ingest({ intentHint: wrongIntent });
    const [lease] = (await db.query<{ body_sha256: string; lease_token: string }>(
      `select body_sha256, lease_token from public.claim_razorpay_webhook_work(1)`,
    )).rows;
    const result = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, $2, 'ready', 'ready', 'plan_stage1a001',
       null, 'active', '2026-12-01T00:00:00Z', 'razorpay_webhook') as result`,
      [lease.body_sha256, lease.lease_token],
    );
    assert.equal(result.rows[0].result.outcome, "rejected");
    const billing = await db.query<{ count: number }>("select count(*)::int as count from public.billing_subscriptions");
    assert.equal(billing.rows[0].count, 0);
  });

  it("rejects an unknown Plan ID against the canonical binding", async () => {
    const intent = (await reserve()).rows[0];
    await start(intent.intent_id);
    await bindSubscription(intent.intent_id);
    await ingest();
    const [lease] = (await db.query<{ body_sha256: string; lease_token: string }>(
      `select body_sha256, lease_token from public.claim_razorpay_webhook_work(1)`,
    )).rows;
    const result = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, $2, 'ready', 'ready', 'plan_unknown0001',
       null, 'active', '2026-12-01T00:00:00Z', 'razorpay_webhook') as result`,
      [lease.body_sha256, lease.lease_token],
    );
    assert.equal(result.rows[0].result.outcome, "rejected");
  });

  it("finalizes a valid bound event atomically and writes the billing binding FK", async () => {
    const intent = (await reserve()).rows[0];
    await start(intent.intent_id);
    await bindSubscription(intent.intent_id);
    await ingest({ intentHint: intent.intent_id, workspaceHint: WS_A });
    const [lease] = (await db.query<{ body_sha256: string; lease_token: string }>(
      `select body_sha256, lease_token from public.claim_razorpay_webhook_work(1)`,
    )).rows;
    const result = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, $2, 'ready', 'ready', 'plan_stage1a001',
       'cus_test', 'active', '2026-12-01T00:00:00Z', 'razorpay_webhook') as result`,
      [lease.body_sha256, lease.lease_token],
    );
    assert.equal(result.rows[0].result.outcome, "applied");
    const billing = await db.query<{ status: string; razorpay_binding_id: string | null }>(
      `select status, razorpay_binding_id from public.billing_subscriptions where workspace_id = $1`, [WS_A],
    );
    assert.equal(billing.rows[0].status, "active");
    assert.ok(billing.rows[0].razorpay_binding_id);
    const work = await db.query<{ state: string }>(
      `select state from public.razorpay_webhook_work where body_sha256 = $1`, [HASH_A],
    );
    assert.equal(work.rows[0].state, "applied");
  });

  it("rejects a stale lease token and moves transient errors to retryable", async () => {
    await ingest();
    const [lease] = (await db.query<{ body_sha256: string; lease_token: string }>(
      `select body_sha256, lease_token from public.claim_razorpay_webhook_work(1)`,
    )).rows;
    const stale = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, gen_random_uuid(), 'retryable', 'provider_timeout') as result`,
      [lease.body_sha256],
    );
    assert.equal(stale.rows[0].result.outcome, "stale_lease");
    const retry = await db.query<{ result: any }>(
      `select public.finalize_razorpay_webhook_work($1, $2, 'retryable', 'provider_timeout') as result`,
      [lease.body_sha256, lease.lease_token],
    );
    assert.equal(retry.rows[0].result.outcome, "retryable");
  });
});
