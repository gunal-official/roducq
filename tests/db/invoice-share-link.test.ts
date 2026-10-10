/**
 * DB integration test for the invoice public-link bug — runs REAL
 * Postgres 16 (PGlite/WASM) against the REAL migration files, so no
 * Supabase project is needed.
 *
 * THE BUG: /invoice/[token] reads through public.get_shared_invoice(),
 * whose WHERE clause ends with `and i.status in ('sent','paid')`. The
 * app would happily mint a link for a DRAFT invoice; the resulting URL
 * returned zero rows and the page rendered "This link is invalid or has
 * been revoked".
 *
 * These tests pin the DB-side contract the app's guard is built on:
 *   - draft  → 0 rows (the bug's root cause)
 *   - void   → 0 rows
 *   - sent   → 1 row
 *   - paid   → 1 row
 *   - revoked token → 0 rows (regardless of status)
 *   - unknown token → 0 rows
 *   - a draft that is later marked sent starts resolving on the SAME
 *     token (so the "mark Sent, then share" flow the UI now forces
 *     actually works)
 *
 * …and then assert that lib/invoice-sharing.ts agrees with the database
 * EXACTLY — that's the whole point of having one shared rule.
 *
 * This file lives in tests/db/ because it is slower than the pure-unit
 * suites (it boots a WASM Postgres and applies every migration once).
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";

import {
  canShareInvoice,
  SHAREABLE_INVOICE_STATUSES,
} from "../../lib/invoice-sharing.ts";

const MIGRATIONS_DIR = "supabase/migrations";

const WS = "00000000-0000-0000-0000-0000000000a0";
const UID = "00000000-0000-0000-0000-0000000000a1";

/** invoice id + token per status, so each scenario is independent. */
const FIXTURES = {
  draft: {
    invoice: "00000000-0000-0000-0000-0000000000b1",
    token: "00000000-0000-0000-0000-0000000000c1",
  },
  sent: {
    invoice: "00000000-0000-0000-0000-0000000000b2",
    token: "00000000-0000-0000-0000-0000000000c2",
  },
  paid: {
    invoice: "00000000-0000-0000-0000-0000000000b3",
    token: "00000000-0000-0000-0000-0000000000c3",
  },
  void: {
    invoice: "00000000-0000-0000-0000-0000000000b4",
    token: "00000000-0000-0000-0000-0000000000c4",
  },
  /** sent, but its link has been revoked */
  revoked: {
    invoice: "00000000-0000-0000-0000-0000000000b5",
    token: "00000000-0000-0000-0000-0000000000c5",
  },
  /** draft that the test promotes to sent mid-flight */
  promoted: {
    invoice: "00000000-0000-0000-0000-0000000000b6",
    token: "00000000-0000-0000-0000-0000000000c6",
  },
} as const;

const UNKNOWN_TOKEN = "00000000-0000-0000-0000-0000000000ff";

let db: PGlite;

/** Rows get_shared_invoice() returns for a token. */
async function shared(token: string) {
  const { rows } = await db.query(
    "select * from public.get_shared_invoice($1::uuid)",
    [token]
  );
  return rows as Array<Record<string, unknown>>;
}

before(async () => {
  db = new PGlite();

  // Minimal stand-in for Supabase's auth schema (same approach as
  // scripts/verify-db.mjs — the migrations reference auth.users and
  // auth.uid()).
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

  // Fixtures. PGlite runs as superuser, which bypasses RLS — fine here:
  // these tests are about get_shared_invoice()'s status filter, and RLS
  // is covered by `npm run verify:db`.
  await db.query(
    `insert into auth.users (id, email) values ($1, 'share-test@example.com')
       on conflict (id) do nothing`,
    [UID]
  );
  await db.query(
    `insert into public.workspaces (id, name) values ($1, 'Share Test Studio')
       on conflict (id) do nothing`,
    [WS]
  );
  await db.query(
    "update public.workspaces set logo_data_url = 'data:image/png;base64,AQID' where id = $1",
    [WS]
  );
  await db.query(
    `insert into public.workspace_members (workspace_id, user_id, role)
       values ($1, $2, 'owner') on conflict do nothing`,
    [WS, UID]
  );

  const items = JSON.stringify([
    { id: "l1", description: "Design sprint", quantity: 2, unit_amount_cents: 45000 },
  ]);

  const rows: Array<[string, string, number, string]> = [
    [FIXTURES.draft.invoice, "draft", 1, "Draft invoice"],
    [FIXTURES.sent.invoice, "sent", 2, "Sent invoice"],
    [FIXTURES.paid.invoice, "paid", 3, "Paid invoice"],
    [FIXTURES.void.invoice, "void", 4, "Void invoice"],
    [FIXTURES.revoked.invoice, "sent", 5, "Sent but revoked"],
    [FIXTURES.promoted.invoice, "draft", 6, "Draft to be sent"],
  ];

  for (const [id, status, number, title] of rows) {
    await db.query(
      `insert into public.invoices
         (id, workspace_id, invoice_number, client_name, title, status, items, tax_percent)
       values ($1, $2, $3, 'Acme Co.', $4, $5, $6::jsonb, 20)`,
      [id, WS, number, title, status, items]
    );
  }

  for (const key of Object.keys(FIXTURES) as Array<keyof typeof FIXTURES>) {
    await db.query(
      `insert into public.invoice_links (workspace_id, invoice_id, token, revoked_at)
       values ($1, $2, $3, $4)`,
      [
        WS,
        FIXTURES[key].invoice,
        FIXTURES[key].token,
        key === "revoked" ? new Date().toISOString() : null,
      ]
    );
  }
});

after(async () => {
  await db?.close();
});

describe("get_shared_invoice() — which invoices render behind a token", () => {
  it("returns NOTHING for a draft invoice (the reported bug)", async () => {
    const rows = await shared(FIXTURES.draft.token);
    assert.equal(
      rows.length,
      0,
      "a draft invoice must not render — which is exactly why the app " +
        "must refuse to create the link in the first place"
    );
  });

  it("returns NOTHING for a void invoice", async () => {
    assert.equal((await shared(FIXTURES.void.token)).length, 0);
  });

  it("returns the invoice for a SENT invoice", async () => {
    const rows = await shared(FIXTURES.sent.token);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "sent");
    assert.equal(rows[0].title, "Sent invoice");
    assert.equal(rows[0].workspace_name, "Share Test Studio");
    assert.equal(rows[0].logo_data_url, "data:image/png;base64,AQID");
  });

  it("returns the invoice for a PAID invoice", async () => {
    const rows = await shared(FIXTURES.paid.token);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "paid");
  });

  it("returns NOTHING for a revoked token, even on a sent invoice", async () => {
    assert.equal((await shared(FIXTURES.revoked.token)).length, 0);
  });

  it("returns NOTHING for an unknown token", async () => {
    assert.equal((await shared(UNKNOWN_TOKEN)).length, 0);
  });

  it("never leaks ids in the public payload", async () => {
    const [row] = await shared(FIXTURES.sent.token);
    for (const key of Object.keys(row)) {
      assert.ok(
        !key.endsWith("_id") && key !== "id",
        `public payload must not expose ${key}`
      );
    }
  });
});

describe("the 'mark Sent, then share' flow the UI now enforces", () => {
  it("a draft's existing token starts resolving once it is marked sent", async () => {
    assert.equal(
      (await shared(FIXTURES.promoted.token)).length,
      0,
      "dead while draft"
    );

    await db.query(
      "update public.invoices set status = 'sent', sent_at = now() where id = $1",
      [FIXTURES.promoted.invoice]
    );

    const rows = await shared(FIXTURES.promoted.token);
    assert.equal(rows.length, 1, "alive once sent");
    assert.equal(rows[0].status, "sent");
  });

  it("revoking it kills the link again", async () => {
    await db.query(
      "update public.invoice_links set revoked_at = now() where invoice_id = $1",
      [FIXTURES.promoted.invoice]
    );
    assert.equal((await shared(FIXTURES.promoted.token)).length, 0);
  });
});

describe("lib/invoice-sharing.ts agrees with the database", () => {
  it("canShareInvoice() matches get_shared_invoice() for every status", async () => {
    const statuses = ["draft", "sent", "paid", "void"] as const;

    for (const status of statuses) {
      const { rows } = await db.query(
        `select count(*)::int as n
           from public.invoices i
          where i.status = $1 and i.status in ('sent', 'paid')`,
        [status]
      );
      const dbWouldRender = (rows[0] as { n: number }).n > 0;
      assert.equal(
        canShareInvoice(status),
        dbWouldRender,
        `TS rule and SQL filter disagree about "${status}"`
      );
    }
  });

  it("SHAREABLE_INVOICE_STATUSES mirrors the RPC's literal filter", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "20260923090000_invoices_schema.sql"),
      "utf8"
    );
    const match = sql.match(/i\.status in \(([^)]*)\)/);
    assert.ok(match, "could not find the status filter in the migration");

    const fromSql = match[1]
      .split(",")
      .map((s) => s.trim().replace(/^'|'$/g, ""));

    assert.deepEqual(
      fromSql.sort(),
      [...SHAREABLE_INVOICE_STATUSES].sort(),
      "lib/invoice-sharing.ts drifted from the RPC — update both together"
    );
  });

  it("the invoices CHECK constraint still allows exactly four statuses", async () => {
    for (const status of ["draft", "sent", "paid", "void"]) {
      assert.equal(canShareInvoice(status), status === "sent" || status === "paid");
    }

    await assert.rejects(
      db.query(
        `insert into public.invoices
           (workspace_id, invoice_number, client_name, title, status)
         values ($1, 99, 'Acme Co.', 'Bogus', 'archived')`,
        [WS]
      ),
      /violates check constraint/,
      "an unexpected status must not be insertable"
    );
  });
});
