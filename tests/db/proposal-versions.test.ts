/**
 * DB integration test for proposal version history (Queue #7) — runs
 * REAL Postgres 16 (PGlite/WASM) against the REAL migration files, so
 * no Supabase project is needed.
 *
 * What it pins (all DB-side, all from
 * supabase/migrations/20261006000000_proposal_versions.sql):
 *   - CREATION capture: inserting a proposal appends v1 ('created')
 *     holding the full creation state, attributed to the actor
 *   - MEANINGFUL CHANGES only: no-op updates create nothing; the first
 *     edit dedups against the 'created' snapshot; the next edit appends
 *     v2 ('edited') holding the PRE-change state
 *   - ORDERING: gapless version numbers, newest-first listing
 *   - VIEW: a version row is the exact frozen snapshot (jsonb included)
 *   - RESTORE: restore_proposal_version() applies the snapshot, appends
 *     EXACTLY ONE 'restored' version holding the pre-restore state
 *     (auditable), keeps numbering gapless, refuses no-op restores and
 *     versions belonging to other proposals
 *   - ROLES: a viewer (member, not editor) can READ history but cannot
 *     restore / update proposals / append version rows; a stranger sees
 *     ZERO rows (workspace isolation) and cannot restore
 *   - APPEND-ONLY: zero UPDATE/DELETE policies, and update/delete
 *     statements silently touch zero rows
 *
 * RLS is exercised via the same `nstester` non-superuser role +
 * faked-JWT GUC harness as scripts/verify-db.mjs. This file lives in
 * tests/db/ because it boots a WASM Postgres and applies every
 * migration once.
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = "supabase/migrations";

const WS = "00000000-0000-0000-0000-0000000000a0";
const BRIEF = "00000000-0000-0000-0000-0000000000a1";
const PROPOSAL_A = "00000000-0000-0000-0000-0000000000a2";
const PROPOSAL_B = "00000000-0000-0000-0000-0000000000a3";
const UID_OWNER = "00000000-0000-0000-0000-0000000000b1";
const UID_VIEWER = "00000000-0000-0000-0000-0000000000b2";
const UID_STRANGER = "00000000-0000-0000-0000-0000000000b3";

/** The deliverable arrays as they evolve (D1 original, D2 flipped). */
const D1 = [
  { id: "d1", text: "Logo suite", checked: false },
  { id: "d2", text: "Brand guide", checked: true },
];
const D2 = [
  { id: "d1", text: "Logo suite", checked: true },
  { id: "d2", text: "Brand guide", checked: true },
];

let db: PGlite;

async function versionsOf(proposalId: string) {
  const { rows } = await db.query(
    `select id, version_number, reason, title, client_name, status,
            budget_timeline, deliverables, created_by
       from public.proposal_versions
      where proposal_id = $1
      order by version_number desc`,
    [proposalId]
  );
  return rows as Array<{
    id: string;
    version_number: number;
    reason: string;
    title: string;
    client_name: string | null;
    status: string;
    budget_timeline: string | null;
    deliverables: typeof D1;
    created_by: string | null;
  }>;
}

async function proposalRow(proposalId: string) {
  const { rows } = await db.query(
    `select title, client_name, status, budget_timeline, deliverables
       from public.proposals where id = $1`,
    [proposalId]
  );
  return rows[0] as {
    title: string;
    client_name: string | null;
    status: string;
    budget_timeline: string | null;
    deliverables: typeof D1;
  };
}

async function setJwt(uid: string) {
  await db.query("select set_config('app.jwt_sub', $1, false)", [uid]);
}

before(async () => {
  db = new PGlite();

  // Minimal stand-in for Supabase's auth schema (same approach as
  // scripts/verify-db.mjs — the migrations reference auth.users and
  // auth.uid(), and created_by attribution reads the faked JWT sub).
  await db.exec(`
    create schema auth;
    create table auth.users (
      id uuid primary key,
      instance_id uuid,
      aud varchar(255),
      role varchar(255),
      email varchar(255),
      encrypted_password varchar(255),
      email_confirmed_at timestamptz,
      recovery_sent_at timestamptz,
      last_sign_in_at timestamptz,
      raw_app_meta_data jsonb,
      raw_user_meta_data jsonb,
      created_at timestamptz,
      updated_at timestamptz,
      confirmation_token varchar(255),
      email_change varchar(255),
      email_change_token_new varchar(255),
      recovery_token varchar(255)
    );
    create table auth.identities (
      id uuid not null,
      user_id uuid not null,
      provider_id text not null,
      identity_data jsonb not null,
      provider text not null,
      last_sign_in_at timestamptz,
      created_at timestamptz,
      updated_at timestamptz
    );
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('app.jwt_sub', true), '')::uuid;
    $$;
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  // Fixtures (setup runs as superuser — RLS scenarios use nstester below).
  for (const [id, email] of [
    [UID_OWNER, "owner@example.com"],
    [UID_VIEWER, "viewer@example.com"],
    [UID_STRANGER, "stranger@example.com"],
  ] as const) {
    await db.query(
      "insert into auth.users (id, email) values ($1, $2) on conflict (id) do nothing",
      [id, email]
    );
  }
  await db.query(
    "insert into public.workspaces (id, name) values ($1, 'Version Test Studio') on conflict (id) do nothing",
    [WS]
  );
  await db.query(
    "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner') on conflict do nothing",
    [WS, UID_OWNER]
  );
  await db.query(
    "insert into public.workspace_members (workspace_id, user_id, role) values ($1, $2, 'viewer') on conflict do nothing",
    [WS, UID_VIEWER]
  );
  await db.query(
    "insert into public.briefs (id, workspace_id, title) values ($1, $2, 'Source brief') on conflict (id) do nothing",
    [BRIEF, WS]
  );

  // Non-superuser role for the RLS scenarios (verify-db.mjs harness).
  await db.exec(`
    create role nstester nologin;
    grant usage on schema public to nstester;
    grant usage on schema auth to nstester;
    grant execute on function auth.uid() to nstester;
    grant select, insert, update, delete on
      public.proposals, public.proposal_versions
      to nstester;
  `);

  await setJwt(UID_OWNER);
});

after(async () => {
  await db?.close();
});

describe("automatic version creation (proposals triggers)", () => {
  it("captures the creation state as version 1, attributed to the actor", async () => {
    await db.query(
      `insert into public.proposals
         (id, workspace_id, brief_id, title, client_name, budget_timeline, deliverables)
       values ($1, $2, $3, 'Versioned proposal A', 'Acme Co.', 'Kickoff Oct 12', $4::jsonb)`,
      [PROPOSAL_A, WS, BRIEF, JSON.stringify(D1)]
    );

    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 1);
    assert.equal(versions[0].version_number, 1);
    assert.equal(versions[0].reason, "created");
    assert.equal(versions[0].title, "Versioned proposal A");
    assert.equal(versions[0].client_name, "Acme Co.");
    assert.equal(versions[0].status, "draft");
    assert.equal(versions[0].budget_timeline, "Kickoff Oct 12");
    assert.deepEqual(versions[0].deliverables, D1);
    assert.equal(versions[0].created_by, UID_OWNER);
  });

  it("dedups the FIRST content edit against the 'created' snapshot", async () => {
    // S1 -> S2: the outgoing state is exactly the stored creation state.
    await db.query(
      "update public.proposals set status = 'sent' where id = $1",
      [PROPOSAL_A]
    );
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(
      versions.length,
      1,
      "the creation snapshot already holds the displaced state — no duplicate"
    );
    assert.equal((await proposalRow(PROPOSAL_A)).status, "sent");
  });

  it("captures the second edit as version 2 holding the PRE-change state", async () => {
    // S2 -> S3 (budget). v2 must freeze S2 (sent, original budget, D1).
    await db.query(
      "update public.proposals set budget_timeline = 'Kickoff Oct 19' where id = $1",
      [PROPOSAL_A]
    );
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 2);
    assert.equal(versions[0].version_number, 2);
    assert.equal(versions[0].reason, "edited");
    assert.equal(versions[0].status, "sent");
    assert.equal(versions[0].budget_timeline, "Kickoff Oct 12");
    assert.deepEqual(versions[0].deliverables, D1);
    assert.equal(versions[0].created_by, UID_OWNER);
  });

  it("ignores no-op updates (nothing meaningful changed)", async () => {
    await db.query(
      "update public.proposals set title = 'Versioned proposal A' where id = $1",
      [PROPOSAL_A]
    );
    await db.query(
      "update public.proposals set deliverables = $2::jsonb where id = $1",
      [PROPOSAL_A, JSON.stringify(D1)] // identical jsonb content
    );
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 2, "no version for no-op updates");
  });

  it("captures deliverable (jsonb) changes exactly", async () => {
    // S3 -> S4 (flip a checked box). v3 must freeze S3 (pre-change).
    await db.query(
      "update public.proposals set deliverables = $2::jsonb where id = $1",
      [PROPOSAL_A, JSON.stringify(D2)]
    );
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 3);
    assert.equal(versions[0].version_number, 3);
    assert.equal(versions[0].reason, "edited");
    assert.deepEqual(
      versions[0].deliverables,
      D1,
      "the snapshot holds the PRE-change deliverables"
    );
  });
});

describe("ordering + viewing a snapshot", () => {
  it("lists versions newest → oldest with gapless numbers", async () => {
    const versions = await versionsOf(PROPOSAL_A);
    assert.deepEqual(
      versions.map((v) => v.version_number),
      [3, 2, 1]
    );
    assert.deepEqual(
      versions.map((v) => v.reason),
      ["edited", "edited", "created"]
    );
  });

  it("a single version row IS the exact frozen snapshot", async () => {
    const { rows } = await db.query(
      `select title, client_name, status, budget_timeline, deliverables
         from public.proposal_versions
        where proposal_id = $1 and version_number = 2`,
      [PROPOSAL_A]
    );
    assert.deepEqual(rows[0], {
      title: "Versioned proposal A",
      client_name: "Acme Co.",
      status: "sent",
      budget_timeline: "Kickoff Oct 12",
      deliverables: D1,
    });
  });
});

describe("restore_proposal_version()", () => {
  let preRestoreState: Awaited<ReturnType<typeof proposalRow>>;
  let newVersionId: string | null = null;

  before(async () => {
    preRestoreState = await proposalRow(PROPOSAL_A); // S4
  });

  it("applies the snapshot to the proposal", async () => {
    const versions = await versionsOf(PROPOSAL_A);
    const v1 = versions.find((v) => v.version_number === 1)!;

    const { rows } = await db.query<{ new_version_id: string }>(
      "select public.restore_proposal_version($1, $2) as new_version_id",
      [PROPOSAL_A, v1.id]
    );
    newVersionId = rows[0]?.new_version_id ?? null;

    const after = await proposalRow(PROPOSAL_A);
    assert.equal(after.status, "draft");
    assert.equal(after.budget_timeline, "Kickoff Oct 12");
    assert.deepEqual(after.deliverables, D1);
  });

  it("is auditable: EXACTLY ONE new 'restored' version holds the pre-restore state", async () => {
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 4, "restore appends exactly one row");
    assert.equal(versions[0].version_number, 4);
    assert.equal(versions[0].reason, "restored");
    assert.equal(
      versions[0].id,
      newVersionId,
      "the RPC returns the id of the capture it wrote"
    );
    assert.equal(versions[0].status, preRestoreState.status);
    assert.equal(
      versions[0].budget_timeline,
      preRestoreState.budget_timeline
    );
    assert.deepEqual(versions[0].deliverables, preRestoreState.deliverables);
    assert.equal(versions[0].created_by, UID_OWNER);
  });

  it("refuses a no-op restore (that version IS the current content)", async () => {
    const [v1] = await versionsOf(PROPOSAL_A).then((vs) =>
      vs.filter((v) => v.version_number === 1)
    );
    await assert.rejects(
      db.query("select public.restore_proposal_version($1, $2)", [
        PROPOSAL_A,
        v1.id,
      ]),
      /already_current/
    );
    assert.equal((await versionsOf(PROPOSAL_A)).length, 4);
  });

  it("refuses a version that belongs to a DIFFERENT proposal", async () => {
    await db.query(
      `insert into public.proposals (id, workspace_id, brief_id, title)
       values ($1, $2, $3, 'Unrelated proposal B')`,
      [PROPOSAL_B, WS, BRIEF]
    );
    const [bV1] = await versionsOf(PROPOSAL_B);
    await assert.rejects(
      db.query("select public.restore_proposal_version($1, $2)", [
        PROPOSAL_A,
        bV1.id,
      ]),
      /version_not_found/
    );
  });

  it("keeps capturing edits after a restore (trigger not stuck in dedup)", async () => {
    // S1 (current) -> S5 (retitle). The outgoing S1 equals v1, not the
    // newest snapshot v4 — so this MUST capture a fresh v5 holding S1.
    await db.query(
      "update public.proposals set title = 'Retitled A' where id = $1",
      [PROPOSAL_A]
    );
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 5);
    assert.equal(versions[0].version_number, 5);
    assert.equal(versions[0].reason, "edited");
    assert.equal(versions[0].title, "Versioned proposal A");
    assert.deepEqual(
      versions.map((v) => v.version_number),
      [5, 4, 3, 2, 1],
      "gapless numbering through captures and restores"
    );
  });
});

describe("roles + workspace isolation (RLS via non-superuser)", () => {
  it("a viewer CAN read the full history", async () => {
    await db.query("set role nstester");
    await setJwt(UID_VIEWER);
    const { rows } = await db.query(
      "select id from public.proposal_versions where proposal_id = $1",
      [PROPOSAL_A]
    );
    assert.equal(rows.length, 5);
    await db.query("reset role");
  });

  it("a viewer CANNOT restore — the RPC re-gates on is_workspace_editor()", async () => {
    await db.query("set role nstester");
    await setJwt(UID_VIEWER);
    const [v2] = await db
      .query(
        "select id from public.proposal_versions where proposal_id = $1 and version_number = 2",
        [PROPOSAL_A]
      )
      .then((r) => r.rows as Array<{ id: string }>);
    await assert.rejects(
      db.query("select public.restore_proposal_version($1, $2)", [
        PROPOSAL_A,
        v2.id,
      ]),
      /not_authorized/
    );
    await db.query("reset role");
  });

  it("a viewer CANNOT edit the proposal either (editor write gate, so the trigger never fires for them)", async () => {
    await db.query("set role nstester");
    await setJwt(UID_VIEWER);
    const res = await db.query(
      "update public.proposals set title = 'viewer tamper' where id = $1",
      [PROPOSAL_A]
    );
    assert.equal(res.rowCount ?? res.rows.length ?? 0, 0);
    assert.equal((await proposalRow(PROPOSAL_A)).title, "Retitled A");
    const ins = await db
      .query(
        `insert into public.proposal_versions
           (workspace_id, proposal_id, version_number, reason, title, status)
         values ($1, $2, 99, 'edited', 'forged', 'draft')`,
        [WS, PROPOSAL_A]
      )
      .then(() => "ok")
      .catch(() => "blocked");
    assert.equal(ins, "blocked", "insert policy is editor-only");
    await db.query("reset role");
  });

  it("a stranger sees ZERO version rows and cannot restore (workspace isolation)", async () => {
    // Grab a real version id as superuser FIRST — after the role switch,
    // RLS hides every row from the stranger (that's the isolation).
    const versions = await versionsOf(PROPOSAL_A);
    const v1 = versions[versions.length - 1];

    await db.query("set role nstester");
    await setJwt(UID_STRANGER);
    const { rows } = await db.query(
      "select id from public.proposal_versions where proposal_id = $1",
      [PROPOSAL_A]
    );
    assert.equal(rows.length, 0);
    await assert.rejects(
      db.query("select public.restore_proposal_version($1, $2)", [
        PROPOSAL_A,
        v1.id,
      ]),
      /not_authorized/
    );
    await db.query("reset role");
  });
});

describe("append-only history", () => {
  it("has exactly one SELECT + one INSERT policy and ZERO UPDATE/DELETE policies", async () => {
    const { rows } = await db.query(
      `select cmd, count(*)::int as n from pg_policies
        where schemaname = 'public' and tablename = 'proposal_versions'
        group by cmd`
    );
    const byCmd = Object.fromEntries(
      rows.map((r) => [(r as { cmd: string }).cmd, (r as { n: number }).n])
    );
    assert.equal(byCmd.SELECT, 1);
    assert.equal(byCmd.INSERT, 1);
    assert.equal(byCmd.UPDATE, undefined);
    assert.equal(byCmd.DELETE, undefined);
  });

  it("UPDATE and DELETE touch zero rows even for the owner", async () => {
    await setJwt(UID_OWNER);
    await db.query("set role nstester");
    const upd = await db.query(
      "update public.proposal_versions set title = 'tampered' where proposal_id = $1 returning id",
      [PROPOSAL_A]
    );
    const del = await db.query(
      "delete from public.proposal_versions where proposal_id = $1 returning id",
      [PROPOSAL_A]
    );
    assert.equal(upd.rows.length, 0);
    assert.equal(del.rows.length, 0);
    await db.query("reset role");
    const versions = await versionsOf(PROPOSAL_A);
    assert.equal(versions.length, 5, "history is fully intact");
    assert.ok(versions.every((v) => v.title !== "tampered"));
  });
});
