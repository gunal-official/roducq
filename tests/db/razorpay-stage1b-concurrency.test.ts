/**
 * Opt-in multi-connection PostgreSQL tests for Stage 1B row-lock behavior.
 *
 * These require a disposable local PostgreSQL database named
 * `roducq_stage1b_test`, with URL in STAGE1B_TEST_DATABASE_URL. The setup drops
 * only that database's public/auth schemas before applying repository
 * migrations. Never point this at Supabase staging or production.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const databaseUrl = process.env.STAGE1B_TEST_DATABASE_URL;
const MIGRATIONS_DIR = "supabase/migrations";
const OWNER = "20000000-0000-0000-0000-000000000001";
const WORKSPACE_A = "10000000-0000-0000-0000-0000000000a1";
const WORKSPACE_B = "10000000-0000-0000-0000-0000000000b2";
const PLAN_CATALOG_ID = "30000000-0000-0000-0000-000000000001";
const PLAN_PROVIDER_ID = "plan_Stage1BConcurrency001";
const INTENT_A_KEY = "40000000-0000-0000-0000-000000000001";
const INTENT_B_KEY = "40000000-0000-0000-0000-000000000002";
const SUBSCRIPTION_ID = "sub_Stage1BConcurrency001";
const EVENT_HASH = "f".repeat(64);

let admin: Client | undefined;
let connectionA: Client | undefined;
let connectionB: Client | undefined;
let blocker: Client | undefined;

function assertDisposableLocalUrl(value: string): void {
  const url = new URL(value);
  const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!allowedHosts.has(url.hostname) || url.pathname !== "/roducq_stage1b_test") {
    throw new Error("Refusing Stage 1B concurrency tests: URL must target local database /roducq_stage1b_test.");
  }
}

async function makeClient(): Promise<Client> {
  if (!databaseUrl) throw new Error("STAGE1B_TEST_DATABASE_URL is not configured.");
  const client = new Client({ connectionString: databaseUrl, application_name: "roducq-stage1b-concurrency-test" });
  await client.connect();
  return client;
}

async function asRole(client: Client, role: "authenticated" | "service_role"): Promise<void> {
  await client.query("reset role");
  await client.query(`set role ${role}`);
  if (role === "authenticated") {
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [OWNER]);
  }
}

async function reserve(client: Client, workspaceId: string, requestKey: string): Promise<string> {
  const result = await client.query<{ intent: { id: string } }>(
    "select to_jsonb(public.reserve_razorpay_checkout_intent($1, 'starter', 'USD', $2)) as intent",
    [workspaceId, requestKey],
  );
  return result.rows[0].intent.id;
}

async function start(client: Client, intentId: string, workspaceId: string) {
  const result = await client.query<{
    provider_call_authorized: boolean;
    intent_row: { id: string; state: string };
    provider_plan_id: string | null;
  }>("select * from public.start_razorpay_checkout_create($1, $2, $3)", [intentId, workspaceId, OWNER]);
  return result.rows[0];
}

async function recordBinding(client: Client, intentId: string, subscriptionId = SUBSCRIPTION_ID) {
  const result = await client.query<{ result: { outcome: string } }>(
    "select public.record_razorpay_subscription_created($1, $2, $3) as result",
    [intentId, subscriptionId, PLAN_PROVIDER_ID],
  );
  return result.rows[0].result.outcome;
}

async function ingest(client: Client, bodyHash = EVENT_HASH, subscriptionId: string | null = SUBSCRIPTION_ID) {
  return client.query(
    `select * from public.ingest_razorpay_webhook_work(
       $1, 'evt_stage1b_concurrency', 'subscription.activated',
       '2026-11-04T09:00:00Z', $2, $3, 'active', '2026-12-01T00:00:00Z', null, null
     )`,
    [bodyHash, subscriptionId, PLAN_PROVIDER_ID],
  );
}

async function claim(client: Client) {
  return client.query<{ body_sha256: string; lease_token: string }>(
    "select body_sha256, lease_token from public.claim_razorpay_webhook_work(10)",
  );
}

async function finalize(client: Client, bodyHash: string, leaseToken: string) {
  const result = await client.query<{ result: { outcome: string } }>(
    `select public.finalize_razorpay_webhook_work(
       $1, $2, 'ready', 'ready', $3, 'cus_test', 'active',
       '2026-12-01T00:00:00Z', 'razorpay_webhook'
     ) as result`,
    [bodyHash, leaseToken, PLAN_PROVIDER_ID],
  );
  return result.rows[0].result.outcome;
}

async function resetFixtures() {
  await admin!.query(`
    delete from public.razorpay_webhook_work;
    delete from public.billing_webhook_events;
    delete from public.billing_subscriptions;
    delete from public.razorpay_subscription_bindings;
    delete from public.razorpay_checkout_intents;
  `);
}

describe("Stage 1B real PostgreSQL multi-connection races", { skip: !databaseUrl }, () => {
  before(async () => {
    assertDisposableLocalUrl(databaseUrl!);
    admin = await makeClient();

    // This URL guard and database name are deliberate safety rails. These tests
    // own and reset the complete disposable database schema.
    await admin.query(`drop schema if exists public cascade; create schema public;`);
    await admin.query(`drop schema if exists auth cascade; create schema auth;`);
    await admin.query(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
      end $$;
      create table auth.users (
        id uuid primary key,
        email varchar(255),
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `);

    for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
      await admin.query(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
    }

    await admin.query(
      "insert into auth.users (id, email) values ($1, 'stage1b-concurrency@example.invalid')",
      [OWNER],
    );
    await admin.query(
      "insert into public.workspaces (id, name) values ($1, 'Stage1B race A'), ($2, 'Stage1B race B')",
      [WORKSPACE_A, WORKSPACE_B],
    );
    await admin.query(
      "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $3, 'owner'), ($2, $3, 'owner')",
      [WORKSPACE_A, WORKSPACE_B, OWNER],
    );
    await admin.query(
      `insert into public.razorpay_plan_catalog
       (id, provider_mode, provider_plan_id, tier, currency, amount_minor, interval_unit,
        interval_count, included_seats, created_by)
       values ($1, 'test', $2, 'starter', 'USD', 2900, 'month', 1, 1, $3)`,
      [PLAN_CATALOG_ID, PLAN_PROVIDER_ID, OWNER],
    );
    await admin.query("update public.razorpay_plan_catalog set state = 'active' where id = $1", [PLAN_CATALOG_ID]);

    connectionA = await makeClient();
    connectionB = await makeClient();
    blocker = await makeClient();
    await asRole(connectionA, "authenticated");
    await asRole(connectionB, "authenticated");
  });

  after(async () => {
    for (const client of [connectionA, connectionB, blocker, admin]) {
      if (client) await client.end();
    }
  });

  beforeEach(async () => { await resetFixtures(); });

  it("serializes simultaneous workspace reservations on separate connections", async () => {
    const settled = await Promise.allSettled([
      reserve(connectionA!, WORKSPACE_A, INTENT_A_KEY),
      reserve(connectionB!, WORKSPACE_A, INTENT_B_KEY),
    ]);
    assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(settled.filter((result) => result.status === "rejected").length, 1);
    const count = await admin!.query<{ count: number }>(
      "select count(*)::int as count from public.razorpay_checkout_intents where workspace_id = $1 and state in ('reserved','provider_create_started','provider_created','reconciliation_required')",
      [WORKSPACE_A],
    );
    assert.equal(count.rows[0].count, 1);
  });

  it("authorizes only one concurrent provider-create start", async () => {
    await asRole(connectionA!, "authenticated");
    await asRole(connectionB!, "authenticated");
    const intentId = await reserve(connectionA!, WORKSPACE_A, INTENT_A_KEY);
    await asRole(connectionA!, "service_role");
    await asRole(connectionB!, "service_role");
    const [left, right] = await Promise.all([
      start(connectionA!, intentId, WORKSPACE_A),
      start(connectionB!, intentId, WORKSPACE_A),
    ]);
    assert.equal([left, right].filter((result) => result.provider_call_authorized).length, 1);
    assert.equal([left, right].filter((result) => !result.provider_call_authorized).length, 1);
  });

  it("turns a concurrent duplicate subscription binding into one binding and one reconciliation result", async () => {
    await asRole(connectionA!, "authenticated");
    await asRole(connectionB!, "authenticated");
    const intentA = await reserve(connectionA!, WORKSPACE_A, INTENT_A_KEY);
    const intentB = await reserve(connectionB!, WORKSPACE_B, INTENT_B_KEY);
    await asRole(connectionA!, "service_role");
    await asRole(connectionB!, "service_role");
    await start(connectionA!, intentA, WORKSPACE_A);
    await start(connectionB!, intentB, WORKSPACE_B);

    const outcomes = await Promise.all([
      recordBinding(connectionA!, intentA),
      recordBinding(connectionB!, intentB),
    ]);
    assert.equal(outcomes.filter((outcome) => outcome === "recorded").length, 1);
    assert.equal(outcomes.filter((outcome) => outcome === "reconciliation_required").length, 1);
    const count = await admin!.query<{ count: number }>(
      "select count(*)::int as count from public.razorpay_subscription_bindings where provider_subscription_id = $1",
      [SUBSCRIPTION_ID],
    );
    assert.equal(count.rows[0].count, 1);
  });

  it("uses SKIP LOCKED when another real connection holds a due work row", async () => {
    await asRole(connectionA!, "service_role");
    await asRole(connectionB!, "service_role");
    await ingest(connectionA!);

    await blocker!.query("begin");
    await blocker!.query("select body_sha256 from public.razorpay_webhook_work where body_sha256 = $1 for update", [EVENT_HASH]);
    const skipped = await claim(connectionA!);
    assert.equal(skipped.rows.length, 0);
    await blocker!.query("commit");

    const claimed = await claim(connectionB!);
    assert.equal(claimed.rows.length, 1);
    assert.equal(claimed.rows[0].body_sha256, EVENT_HASH);
  });

  it("allows only one concurrent finalizer to apply a leased event", async () => {
    await asRole(connectionA!, "authenticated");
    const intentId = await reserve(connectionA!, WORKSPACE_A, INTENT_A_KEY);
    await asRole(connectionA!, "service_role");
    await asRole(connectionB!, "service_role");
    await start(connectionA!, intentId, WORKSPACE_A);
    assert.equal(await recordBinding(connectionA!, intentId), "recorded");
    await ingest(connectionA!);
    const [lease] = (await claim(connectionA!)).rows;
    assert.ok(lease);

    const outcomes = await Promise.all([
      finalize(connectionA!, EVENT_HASH, lease.lease_token),
      finalize(connectionB!, EVENT_HASH, lease.lease_token),
    ]);
    assert.equal(outcomes.filter((outcome) => outcome === "applied").length, 1);
    assert.equal(outcomes.filter((outcome) => outcome === "stale_lease").length, 1);
    const billing = await admin!.query<{ count: number }>(
      "select count(*)::int as count from public.billing_subscriptions where workspace_id = $1 and razorpay_binding_id is not null",
      [WORKSPACE_A],
    );
    assert.equal(billing.rows[0].count, 1);
  });
});
