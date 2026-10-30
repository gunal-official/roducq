/**
 * Stage 1A inert Razorpay schema foundation tests.
 *
 * Uses local PGlite fixtures only. The test applies the existing migrations,
 * inserts representative legacy billing/ledger rows, snapshots the existing
 * atomic function and grants, then applies only the Stage 1A migration.
 * PGlite is a single-connection database and does NOT prove transaction races.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = "supabase/migrations";
const FOUNDATION_MIGRATION = "20261030100000_razorpay_stage1a_schema_foundation.sql";
const WS_A = "10000000-0000-0000-0000-0000000000a1";
const WS_B = "10000000-0000-0000-0000-0000000000b2";
const WS_C = "10000000-0000-0000-0000-0000000000c3";
const WS_D = "10000000-0000-0000-0000-0000000000d4";
const WS_E = "10000000-0000-0000-0000-0000000000e5";
const WS_F = "10000000-0000-0000-0000-0000000000f6";
const OWNER = "20000000-0000-0000-0000-000000000001";
const PLAN_STARTER = "30000000-0000-0000-0000-000000000001";
const PLAN_TEAM = "30000000-0000-0000-0000-000000000002";
const PLAN_PRO = "30000000-0000-0000-0000-000000000003";
const INTENT_A = "40000000-0000-0000-0000-000000000001";
const INTENT_B = "40000000-0000-0000-0000-000000000002";
const INTENT_C = "40000000-0000-0000-0000-000000000003";
const BINDING_A = "50000000-0000-0000-0000-000000000001";
const SUB_A = "sub_FoundationA001";
const SUB_B = "sub_FoundationB002";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const FUTURE = "2099-01-01T00:00:00Z";
const NOWISH = "2026-10-30T12:00:00Z";
const APPLY_SIGNATURE = "public.apply_razorpay_subscription_event(text,text,timestamptz,text,uuid,text,text,timestamptz,text,text,numeric,boolean,text,text)";

let db: PGlite;
let preMigrationBilling: unknown;
let preMigrationLedger: unknown;
let preMigrationBillingColumns: string[];
let preMigrationApplyDefinition: string;
let preMigrationApplyPrivileges: Record<string, boolean>;

async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<T>(sql, params);
  assert.equal(result.rows.length, 1, `expected one result for: ${sql}`);
  return result.rows[0];
}

async function expectSqlFailure(promise: Promise<unknown>, message?: RegExp): Promise<void> {
  let failure: unknown;
  try {
    await promise;
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof Error, "expected the statement to be rejected");
  if (message) assert.match(failure.message, message);
}

async function addPlan(opts: {
  id?: string;
  planId: string;
  tier: "pro" | "starter" | "team";
  currency?: string;
  amountMinor: number;
  seats: number | null;
  mode?: "test" | "live";
}) {
  const { id, planId, tier, currency = "USD", amountMinor, seats, mode = "test" } = opts;
  const result = await db.query<{ id: string }>(
    `insert into public.razorpay_plan_catalog
       (id, provider_mode, provider_plan_id, tier, currency, amount_minor,
        interval_unit, interval_count, included_seats, created_by)
     values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, 'month', 1, $7, $8)
     returning id`,
    [id ?? null, mode, planId, tier, currency, amountMinor, seats, OWNER],
  );
  return result.rows[0].id;
}

async function addIntent(opts: {
  id?: string;
  workspaceId: string;
  planId: string;
  requestKey?: string;
  state?: string;
}) {
  const id = opts.id ?? crypto.randomUUID();
  const state = opts.state ?? "reserved";
  const started = ["provider_create_started", "provider_created", "verified", "reconciliation_required"].includes(state)
    ? NOWISH
    : null;
  const providerCreated = ["provider_created", "verified"].includes(state) ? "2026-10-30T12:01:00Z" : null;
  const verified = state === "verified" ? "2026-10-30T12:02:00Z" : null;
  const closed = ["failed", "expired"].includes(state) ? "2026-10-30T12:02:00Z" : null;
  await db.query(
    `insert into public.razorpay_checkout_intents
       (id, workspace_id, initiating_owner_id, plan_catalog_id, request_key, state,
        reservation_expires_at, provider_create_started_at, provider_created_at,
        verified_at, closed_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [id, opts.workspaceId, OWNER, opts.planId, opts.requestKey ?? crypto.randomUUID(), state,
      FUTURE, started, providerCreated, verified, closed],
  );
  return id;
}

async function addIntentBinding(opts: {
  id?: string;
  providerSubscriptionId: string;
  workspaceId: string;
  planId: string;
  intentId: string;
}) {
  const id = opts.id ?? crypto.randomUUID();
  await db.query(
    `insert into public.razorpay_subscription_bindings
       (id, provider_subscription_id, workspace_id, plan_catalog_id,
        checkout_intent_id, source, state)
     values ($1, $2, $3, $4, $5, 'checkout_intent', 'provider_created')`,
    [id, opts.providerSubscriptionId, opts.workspaceId, opts.planId, opts.intentId],
  );
  return id;
}

async function resetNewRows(): Promise<void> {
  await db.exec(`
    delete from public.razorpay_webhook_work;
    update public.billing_subscriptions
       set provider = 'stripe', razorpay_subscription_id = null, razorpay_customer_id = null,
           razorpay_binding_id = null, paid_through = '2026-12-01T00:00:00Z',
           paid_through_source = 'stripe_reconciled'
     where workspace_id = '${WS_A}'
       and (provider is distinct from 'stripe'
         or razorpay_subscription_id is not null
         or razorpay_customer_id is not null
         or razorpay_binding_id is not null
         or paid_through is distinct from '2026-12-01T00:00:00Z'::timestamptz
         or paid_through_source is distinct from 'stripe_reconciled');
    delete from public.razorpay_subscription_bindings;
    delete from public.razorpay_checkout_intents;
    delete from public.razorpay_plan_catalog;
  `);
}

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email varchar(255),
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('app.jwt_sub', true), '')::uuid;
    $$;
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql") && file !== FOUNDATION_MIGRATION)
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  await db.exec(`
    insert into auth.users (id, email) values ('${OWNER}', 'fixture-owner@example.invalid');
    insert into public.workspaces (id, name) values
      ('${WS_A}', 'Foundation A'),
      ('${WS_B}', 'Foundation B'),
      ('${WS_C}', 'Foundation C'),
      ('${WS_D}', 'Foundation D'),
      ('${WS_E}', 'Foundation E'),
      ('${WS_F}', 'Foundation F');
    insert into public.billing_subscriptions
      (workspace_id, stripe_customer_id, stripe_subscription_id, provider, status,
       currency, amount, paid_through, paid_through_source)
    values
      ('${WS_A}', 'cus_fixture', 'sub_stripe_fixture', 'stripe', 'active',
       'USD', 19, '2026-12-01T00:00:00Z', 'stripe_reconciled');
    insert into public.billing_webhook_events (event_key, event_type)
    values ('legacy-ledger-fixture', 'subscription.activated');
  `);

  const billing = await queryOne<{ row: unknown }>(
    `select to_jsonb(b) as row from public.billing_subscriptions b where workspace_id = $1`, [WS_A],
  );
  preMigrationBilling = billing.row;
  const ledger = await queryOne<{ row: unknown }>(
    `select to_jsonb(e) as row from public.billing_webhook_events e where event_key = 'legacy-ledger-fixture'`,
  );
  preMigrationLedger = ledger.row;
  const columns = await db.query<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'billing_subscriptions'
      order by ordinal_position`,
  );
  preMigrationBillingColumns = columns.rows.map((row) => row.column_name);
  const apply = await queryOne<{ definition: string }>(
    `select pg_get_functiondef($1::regprocedure) as definition`, [APPLY_SIGNATURE],
  );
  preMigrationApplyDefinition = apply.definition;
  preMigrationApplyPrivileges = await queryOne<Record<string, boolean>>(
    `select has_function_privilege('public', $1, 'EXECUTE') as public_exec,
            has_function_privilege('anon', $1, 'EXECUTE') as anon_exec,
            has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated_exec,
            has_function_privilege('service_role', $1, 'EXECUTE') as service_role_exec`,
    [APPLY_SIGNATURE],
  );

  await db.exec(readFileSync(join(MIGRATIONS_DIR, FOUNDATION_MIGRATION), "utf8"));
});

after(async () => {
  await db?.close();
});

beforeEach(async () => {
  await resetNewRows();
});

describe("Stage 1A schema compatibility", () => {
  it("applies cleanly without changing existing billing rows, ledger rows, or the atomic function", async () => {
    const billing = await queryOne<{ row: Record<string, unknown> }>(
      `select to_jsonb(b) - 'razorpay_binding_id' as row
         from public.billing_subscriptions b where workspace_id = $1`, [WS_A],
    );
    assert.deepEqual(billing.row, preMigrationBilling);

    const ledger = await queryOne<{ row: unknown }>(
      `select to_jsonb(e) as row from public.billing_webhook_events e
        where event_key = 'legacy-ledger-fixture'`,
    );
    assert.deepEqual(ledger.row, preMigrationLedger);

    const columns = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'billing_subscriptions'
        order by ordinal_position`,
    );
    const afterColumns = columns.rows.map((row) => row.column_name);
    for (const column of preMigrationBillingColumns) assert.ok(afterColumns.includes(column), `${column} must remain`);
    assert.equal(afterColumns.filter((column) => column === 'razorpay_binding_id').length, 1);

    const apply = await queryOne<{ definition: string }>(
      `select pg_get_functiondef($1::regprocedure) as definition`, [APPLY_SIGNATURE],
    );
    assert.equal(apply.definition, preMigrationApplyDefinition);
    const privileges = await queryOne<Record<string, boolean>>(
      `select has_function_privilege('public', $1, 'EXECUTE') as public_exec,
              has_function_privilege('anon', $1, 'EXECUTE') as anon_exec,
              has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated_exec,
              has_function_privilege('service_role', $1, 'EXECUTE') as service_role_exec`,
      [APPLY_SIGNATURE],
    );
    assert.deepEqual(privileges, preMigrationApplyPrivileges);
  });

  it("preserves legacy Stripe billing and generic Pro behavior without inferring a Razorpay mapping", async () => {
    await addPlan({ id: PLAN_PRO, planId: "plan_GenericProRegression", tier: "pro", amountMinor: 1900, seats: null });
    const stripe = await queryOne<{ row: Record<string, unknown> }>(
      `select to_jsonb(b) - 'razorpay_binding_id' as row
         from public.billing_subscriptions b where workspace_id = $1`, [WS_A],
    );
    assert.deepEqual(stripe.row, preMigrationBilling);
    const plan = await queryOne<{ tier: string; included_seats: number | null; state: string }>(
      `select tier, included_seats, state from public.razorpay_plan_catalog where id = $1`, [PLAN_PRO],
    );
    assert.deepEqual(plan, { tier: 'pro', included_seats: null, state: 'inactive' });
    const linkCount = await queryOne<{ count: number }>(
      `select count(*)::int as count from public.billing_subscriptions
        where workspace_id = $1 and razorpay_binding_id is not null`, [WS_A],
    );
    assert.equal(linkCount.count, 0, 'no historical Plan identity is inferred from legacy billing');
  });

  it("seeds no Plan mappings and permits no active Plan on insert", async () => {
    const count = await queryOne<{ count: number }>(
      `select count(*)::int as count from public.razorpay_plan_catalog`,
    );
    assert.equal(count.count, 0);

    await expectSqlFailure(db.query(
      `insert into public.razorpay_plan_catalog
         (provider_mode, provider_plan_id, tier, currency, amount_minor,
          included_seats, state)
       values ('test', 'plan_StudioNope', 'studio', 'USD', 19900, 1, 'inactive')`,
    ));
    await expectSqlFailure(db.query(
      `insert into public.razorpay_plan_catalog
         (provider_mode, provider_plan_id, tier, currency, amount_minor,
          included_seats, state)
       values ('test', 'plan_ActiveInsert', 'starter', 'USD', 2900, 1, 'active')`,
    ), /razorpay_plan_must_start_inactive/);
  });
});

describe("Stage 1A Plan catalog constraints", () => {
  it("accepts Pro, Starter, and Team with their supported seat representations", async () => {
    await addPlan({ id: PLAN_PRO, planId: "plan_GenericPro001", tier: "pro", amountMinor: 1900, seats: null });
    await addPlan({ id: PLAN_STARTER, planId: "plan_Starter001", tier: "starter", amountMinor: 2900, seats: 1 });
    await addPlan({ id: PLAN_TEAM, planId: "plan_Team000001", tier: "team", amountMinor: 7900, seats: 5 });

    const rows = await db.query<{ tier: string; included_seats: number | null; state: string }>(
      `select tier, included_seats, state from public.razorpay_plan_catalog order by tier`,
    );
    assert.equal(rows.rows.length, 3);
    assert.ok(rows.rows.every((row) => row.state === 'inactive'));
    assert.deepEqual(rows.rows.map((row) => [row.tier, row.included_seats]), [
      ['pro', null], ['starter', 1], ['team', 5],
    ]);
  });

  it("rejects duplicate Plan identities, invalid seat counts, and unsupported tier names", async () => {
    await addPlan({ planId: "plan_Duplicate001", tier: "starter", amountMinor: 2900, seats: 1 });
    await expectSqlFailure(addPlan({ planId: "plan_Duplicate001", tier: "team", amountMinor: 7900, seats: 5 }));
    await expectSqlFailure(addPlan({ planId: "plan_BadStarter01", tier: "starter", amountMinor: 2900, seats: 5 }));
    await expectSqlFailure(addPlan({ planId: "plan_BadTeam0001", tier: "team", amountMinor: 7900, seats: 1 }));
    await expectSqlFailure(db.query(
      `insert into public.razorpay_plan_catalog
         (provider_mode, provider_plan_id, tier, currency, amount_minor, included_seats)
       values ('test', 'plan_StudioNotAllowed', 'studio', 'USD', 19900, 1)`,
    ));
  });

  it("limits each mode/tier/currency/interval to one active mapping and separates Test from Live", async () => {
    const testA = await addPlan({ planId: "plan_TestMappingA01", tier: "starter", amountMinor: 2900, seats: 1 });
    const testB = await addPlan({ planId: "plan_TestMappingB01", tier: "starter", amountMinor: 2900, seats: 1 });
    const liveA = await addPlan({ planId: "plan_TestMappingA01", tier: "starter", amountMinor: 2900, seats: 1, mode: 'live' });

    await db.query(`update public.razorpay_plan_catalog set state = 'active' where id = $1`, [testA]);
    await expectSqlFailure(db.query(
      `update public.razorpay_plan_catalog set state = 'active' where id = $1`, [testB],
    ));
    await db.query(`update public.razorpay_plan_catalog set state = 'active' where id = $1`, [liveA]);
    const activeCount = await queryOne<{ count: number }>(
      `select count(*)::int as count from public.razorpay_plan_catalog where state = 'active'`,
    );
    assert.equal(activeCount.count, 2, 'Test and Live mappings are independently scoped');
  });

  it("prevents reassignment of Plan identity and pricing while allowing retirement", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_Immutable001", tier: "starter", amountMinor: 2900, seats: 1 });
    await expectSqlFailure(db.query(
      `update public.razorpay_plan_catalog set provider_plan_id = 'plan_Reassigned1' where id = $1`,
      [PLAN_STARTER],
    ), /immutable/);
    await expectSqlFailure(db.query(
      `update public.razorpay_plan_catalog set amount_minor = 3000 where id = $1`,
      [PLAN_STARTER],
    ), /immutable/);
    await expectSqlFailure(db.query(
      `update public.razorpay_plan_catalog set tier = 'team', included_seats = 5 where id = $1`,
      [PLAN_STARTER],
    ), /immutable/);

    await db.query(`update public.razorpay_plan_catalog set state = 'active' where id = $1`, [PLAN_STARTER]);
    await db.query(
      `update public.razorpay_plan_catalog
          set state = 'retired', retired_at = now()
        where id = $1`, [PLAN_STARTER],
    );
    await expectSqlFailure(db.query(
      `update public.razorpay_plan_catalog set state = 'active', retired_at = null where id = $1`,
      [PLAN_STARTER],
    ), /lifecycle/);
  });
});

describe("Stage 1A checkout intent and binding constraints", () => {
  it("accepts supported intent states and rejects unknown states", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_IntentStates01", tier: "starter", amountMinor: 2900, seats: 1 });
    await addIntent({ id: INTENT_A, workspaceId: WS_A, planId: PLAN_STARTER, state: 'reserved' });
    await addIntent({ workspaceId: WS_B, planId: PLAN_STARTER, state: 'provider_create_started' });
    await addIntent({ workspaceId: WS_C, planId: PLAN_STARTER, state: 'provider_created' });
    await addIntent({ workspaceId: WS_D, planId: PLAN_STARTER, state: 'verified' });
    await addIntent({ workspaceId: WS_E, planId: PLAN_STARTER, state: 'reconciliation_required' });
    await addIntent({ workspaceId: WS_F, planId: PLAN_STARTER, state: 'failed' });
    await addIntent({ workspaceId: WS_F, planId: PLAN_STARTER, state: 'expired' });
    await expectSqlFailure(addIntent({ workspaceId: WS_A, planId: PLAN_STARTER, state: 'done' }));
    const stateCount = await queryOne<{ count: number }>(
      `select count(*)::int as count from public.razorpay_checkout_intents`,
    );
    assert.equal(stateCount.count, 7, 'all seven persisted intent states should be representable');

    const reserved = await queryOne<{ state: string; provider_create_started_at: string | null; verified_at: string | null }>(
      `select state, provider_create_started_at, verified_at
         from public.razorpay_checkout_intents where id = $1`, [INTENT_A],
    );
    assert.equal(reserved.state, 'reserved');
    assert.equal(reserved.provider_create_started_at, null);
    assert.equal(reserved.verified_at, null, 'a reservation is not payment verification');
  });

  it("allows only one open intent per workspace, including create-started and uncertain states", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_OneOpen0001", tier: "starter", amountMinor: 2900, seats: 1 });
    await addIntent({ workspaceId: WS_A, planId: PLAN_STARTER, state: 'reserved' });
    await expectSqlFailure(addIntent({ workspaceId: WS_A, planId: PLAN_STARTER, state: 'provider_create_started' }));
    await addIntent({ workspaceId: WS_B, planId: PLAN_STARTER, state: 'reconciliation_required' });
    await expectSqlFailure(addIntent({ workspaceId: WS_B, planId: PLAN_STARTER, state: 'reserved' }));
  });

  it("keeps the idempotency request tuple unique even after an intent closes", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_Idempotency001", tier: "starter", amountMinor: 2900, seats: 1 });
    const key = "60000000-0000-0000-0000-000000000001";
    await addIntent({ workspaceId: WS_A, planId: PLAN_STARTER, requestKey: key, state: 'failed' });
    await expectSqlFailure(addIntent({ workspaceId: WS_A, planId: PLAN_STARTER, requestKey: key, state: 'expired' }));
    await addIntent({ workspaceId: WS_B, planId: PLAN_STARTER, requestKey: key, state: 'failed' });
  });

  it("enforces unique provider IDs and intent links plus composite workspace/Plan integrity", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_BindingStart01", tier: "starter", amountMinor: 2900, seats: 1 });
    await addPlan({ id: PLAN_TEAM, planId: "plan_BindingTeam01", tier: "team", amountMinor: 7900, seats: 5 });
    await addIntent({ id: INTENT_A, workspaceId: WS_A, planId: PLAN_STARTER, state: 'provider_created' });
    await addIntent({ id: INTENT_B, workspaceId: WS_B, planId: PLAN_TEAM, state: 'provider_created' });
    await addIntent({ id: INTENT_C, workspaceId: WS_D, planId: PLAN_TEAM, state: 'provider_created' });
    await addIntentBinding({ id: BINDING_A, providerSubscriptionId: SUB_A, workspaceId: WS_A, planId: PLAN_STARTER, intentId: INTENT_A });

    await expectSqlFailure(addIntentBinding({ providerSubscriptionId: SUB_B, workspaceId: WS_B, planId: PLAN_STARTER, intentId: INTENT_A }));
    await expectSqlFailure(addIntentBinding({ providerSubscriptionId: SUB_B, workspaceId: WS_A, planId: PLAN_TEAM, intentId: INTENT_A }));
    await expectSqlFailure(addIntentBinding({ providerSubscriptionId: SUB_A, workspaceId: WS_B, planId: PLAN_TEAM, intentId: INTENT_B }));
    await expectSqlFailure(addIntentBinding({ providerSubscriptionId: SUB_B, workspaceId: WS_A, planId: PLAN_STARTER, intentId: INTENT_A }));

    const operatorBinding = await db.query(
      `insert into public.razorpay_subscription_bindings
         (provider_subscription_id, workspace_id, plan_catalog_id, source, state,
          verified_at, verified_by, approval_ref)
       values ('sub_Operator001', $1, $2, 'operator_reconciled', 'legacy_verified', now(), $3, 'OPS-APPROVAL-1')`,
      [WS_C, PLAN_TEAM, OWNER],
    );
    assert.equal(operatorBinding.rowCount, 1, 'an explicitly approved legacy binding is supported without an intent');
    await db.query(
      `insert into public.razorpay_subscription_bindings
         (provider_subscription_id, workspace_id, plan_catalog_id, checkout_intent_id,
          source, state, verified_at)
       values ('sub_VerifiedIntent01', $1, $2, $3, 'checkout_intent', 'verified', now())`,
      [WS_B, PLAN_TEAM, INTENT_B],
    );
    await expectSqlFailure(db.query(
      `insert into public.razorpay_subscription_bindings
         (provider_subscription_id, workspace_id, plan_catalog_id, checkout_intent_id,
          source, state)
       values ('sub_MissingVerified01', $1, $2, $3, 'checkout_intent', 'verified')`,
      [WS_D, PLAN_TEAM, INTENT_C],
    ));
    await expectSqlFailure(db.query(
      `insert into public.razorpay_subscription_bindings
         (provider_subscription_id, workspace_id, plan_catalog_id, source, state)
       values ('sub_NoApproval01', $1, $2, 'operator_reconciled', 'legacy_verified')`,
      [WS_C, PLAN_TEAM],
    ));
  });

  it("uses MATCH SIMPLE safely for NULL references and enforces non-NULL billing binding identity", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_BillingRef001", tier: "starter", amountMinor: 2900, seats: 1 });
    await addIntent({ id: INTENT_A, workspaceId: WS_A, planId: PLAN_STARTER, state: 'provider_created' });
    await addIntentBinding({ id: BINDING_A, providerSubscriptionId: SUB_A, workspaceId: WS_A, planId: PLAN_STARTER, intentId: INTENT_A });

    // Existing Stripe row has no Razorpay binding and remains valid/preserved.
    const untouched = await queryOne<{ provider: string; razorpay_binding_id: string | null }>(
      `select provider, razorpay_binding_id from public.billing_subscriptions where workspace_id = $1`, [WS_A],
    );
    assert.equal(untouched.provider, 'stripe');
    assert.equal(untouched.razorpay_binding_id, null);

    await db.query(
      `update public.billing_subscriptions
          set provider = 'razorpay', razorpay_subscription_id = $1,
              razorpay_binding_id = $2
        where workspace_id = $3`, [SUB_A, BINDING_A, WS_A],
    );
    await expectSqlFailure(db.query(
      `update public.billing_subscriptions
          set razorpay_subscription_id = $1
        where workspace_id = $2`, [SUB_B, WS_A],
    ));
    await expectSqlFailure(db.query(
      `update public.billing_subscriptions
          set provider = 'stripe'
        where workspace_id = $1`, [WS_A],
    ));
    await expectSqlFailure(db.query(
      `update public.billing_subscriptions
          set razorpay_subscription_id = null
        where workspace_id = $1`, [WS_A],
    ));
    await db.query(
      `insert into public.billing_subscriptions
         (workspace_id, stripe_customer_id, stripe_subscription_id, provider, status,
          currency, amount, paid_through, paid_through_source)
       values ($1, 'cus_workspace_b', 'sub_stripe_workspace_b', 'stripe', 'active',
          'USD', 19, '2026-12-01T00:00:00Z', 'stripe_reconciled')`, [WS_B],
    );
    await expectSqlFailure(db.query(
      `update public.billing_subscriptions
          set provider = 'razorpay', razorpay_subscription_id = $1,
              razorpay_binding_id = $2
        where workspace_id = $3`, [SUB_A, BINDING_A, WS_B],
    ));
  });
});

describe("Stage 1A webhook work constraints", () => {
  it("uses body hashes as unique identity and permits duplicate event-ID headers", async () => {
    const base = {
      event_type: 'subscription.activated',
      event_created_at: NOWISH,
      provider_subscription_id: SUB_A,
      claimed_plan_id: 'plan_claimedNotAuthority',
      event_id_header: 'evt_reused_header',
      state: 'received',
    };
    await db.query(
      `insert into public.razorpay_webhook_work
         (body_sha256, event_type, event_created_at, provider_subscription_id,
          claimed_plan_id, event_id_header, state)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [HASH_A, base.event_type, base.event_created_at, base.provider_subscription_id,
        base.claimed_plan_id, base.event_id_header, base.state],
    );
    await db.query(
      `insert into public.razorpay_webhook_work
         (body_sha256, event_type, event_created_at, provider_subscription_id,
          claimed_plan_id, event_id_header, state)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [HASH_B, base.event_type, base.event_created_at, base.provider_subscription_id,
        base.claimed_plan_id, base.event_id_header, base.state],
    );
    await expectSqlFailure(db.query(
      `insert into public.razorpay_webhook_work
         (body_sha256, event_type, event_created_at)
       values ($1, 'subscription.activated', $2)`, [HASH_A, NOWISH],
    ));
  });

  it("accepts every durable state and rejects invalid state/lease shapes", async () => {
    const states = ['received', 'processing', 'retryable', 'unresolved', 'applied', 'stale', 'superseded', 'rejected', 'ignored', 'dead_letter'];
    for (const [index, state] of states.entries()) {
      const hash = index.toString(16).padStart(64, '0');
      await db.query(
        `insert into public.razorpay_webhook_work
           (body_sha256, event_type, event_created_at, state, attempt_count,
            lease_token, lease_expires_at)
         values ($1, 'subscription.activated', $2, $3, 0, $4, $5)`,
        [hash, NOWISH, state,
          state === 'processing' ? crypto.randomUUID() : null,
          state === 'processing' ? FUTURE : null],
      );
    }
    await expectSqlFailure(db.query(
      `insert into public.razorpay_webhook_work
         (body_sha256, event_type, event_created_at, state)
       values ($1, 'subscription.activated', $2, 'pending')`, ['c'.repeat(64), NOWISH],
    ));
    await expectSqlFailure(db.query(
      `insert into public.razorpay_webhook_work
         (body_sha256, event_type, event_created_at, state, lease_token)
       values ($1, 'subscription.activated', $2, 'processing', $3)`,
      ['d'.repeat(64), NOWISH, crypto.randomUUID()],
    ));
  });
});

describe("Stage 1A RLS, grants, and inert binding guard", () => {
  it("enables RLS without browser policies or direct runtime-role table grants", async () => {
    const tables = [
      'razorpay_plan_catalog', 'razorpay_checkout_intents',
      'razorpay_subscription_bindings', 'razorpay_webhook_work',
    ];
    for (const table of tables) {
      const flags = await queryOne<{ relrowsecurity: boolean }>(
        `select c.relrowsecurity from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = $1`, [table],
      );
      assert.equal(flags.relrowsecurity, true, `${table} must have RLS enabled`);
      const policies = await queryOne<{ count: number }>(
        `select count(*)::int as count from pg_policies
          where schemaname = 'public' and tablename = $1`, [table],
      );
      assert.equal(policies.count, 0, `${table} must not have browser policies`);
      for (const role of ['anon', 'authenticated', 'service_role']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          const result = await queryOne<{ allowed: boolean }>(
            `select has_table_privilege($1, 'public.' || $2, $3) as allowed`,
            [role, table, privilege],
          );
          assert.equal(result.allowed, false, `${role} must not have ${privilege} on ${table}`);
        }
      }
    }
  });

  it("prevents service_role from setting the new billing reference despite table-level UPDATE", async () => {
    await addPlan({ id: PLAN_STARTER, planId: "plan_GuardBinding01", tier: "starter", amountMinor: 2900, seats: 1 });
    await addIntent({ id: INTENT_A, workspaceId: WS_A, planId: PLAN_STARTER, state: 'provider_created' });
    await addIntentBinding({ id: BINDING_A, providerSubscriptionId: SUB_A, workspaceId: WS_A, planId: PLAN_STARTER, intentId: INTENT_A });

    // Simulate a managed-service table-level grant that might cover a future
    // column. The inert guard must still keep this new reference owner-only.
    await db.exec(`grant select, update on public.billing_subscriptions to service_role; set role service_role;`);
    try {
      await expectSqlFailure(db.query(
        `update public.billing_subscriptions
            set provider = 'razorpay', razorpay_subscription_id = $1,
                razorpay_binding_id = $2
          where workspace_id = $3`, [SUB_A, BINDING_A, WS_A],
      ), /inert_until_guarded_integration/);
    } finally {
      await db.exec('reset role');
    }
    await db.exec('revoke select, update on public.billing_subscriptions from service_role');
  });

  it("revokes default PUBLIC execution on trigger helpers without changing the existing apply grants", async () => {
    for (const signature of [
      'public.guard_razorpay_plan_catalog()',
      'public.guard_billing_razorpay_binding_id()',
    ]) {
      for (const role of ['public', 'anon', 'authenticated', 'service_role']) {
        const result = await queryOne<{ allowed: boolean }>(
          `select has_function_privilege($1, $2, 'EXECUTE') as allowed`, [role, signature],
        );
        assert.equal(result.allowed, false, `${role} must not execute ${signature}`);
      }
    }
    const privileges = await queryOne<Record<string, boolean>>(
      `select has_function_privilege('public', $1, 'EXECUTE') as public_exec,
              has_function_privilege('anon', $1, 'EXECUTE') as anon_exec,
              has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated_exec,
              has_function_privilege('service_role', $1, 'EXECUTE') as service_role_exec`,
      [APPLY_SIGNATURE],
    );
    assert.deepEqual(privileges, preMigrationApplyPrivileges);
  });
});
