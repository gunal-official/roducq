#!/usr/bin/env node
/**
 * bundle-migrations — concatenate an ordered set of migrations into ONE
 * paste-able .sql file, for applying through the Supabase SQL Editor when the
 * CLI is not available (e.g. a browser-only operator).
 *
 *   npm run migrations:bundle                 # writes the Razorpay bundle
 *   npm run migrations:bundle -- --out /tmp/x.sql
 *   npm run migrations:bundle -- --list       # show the bundle contents
 *
 * WHY THIS EXISTS
 *   supabase/migrations/ is the single source of truth. Copying migration files
 *   into docs/ would drift: the copies would silently go stale the next time a
 *   migration changes, and a stale paste is worse than no paste. This script
 *   reads the canonical files at run time instead.
 *
 * ORDERING
 *   Files are emitted in the explicit order below, not by filename sort, so the
 *   dependency chain is reviewable in one place. The order is the same one
 *   Supabase applies (timestamp order) — see docs/razorpay-migrations-runbook.md
 *   for why each step depends on the previous one.
 *
 * The bundle is NOT idempotent: Stage 1A/1B use plain `create table` and plain
 * `create function`, so a second run stops at the first existing object. The
 * header written into the output says so.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";

/**
 * The Razorpay stack, in dependency order.
 * 1 → adds the razorpay_* columns and provider/billing_webhook_events that
 *     everything below assumes.
 * 2 → apply_razorpay_subscription_event, which Stage 1B calls.
 * 3 → the four razorpay_* tables (plain create table: not re-runnable).
 * 4 → the checkout/webhook RPCs, incl. reserve_razorpay_checkout_intent.
 * 5 → runtime replacements for the webhook/apply functions.
 * 6 → seat-limit RPCs that read razorpay_plan_catalog.
 */
/** Everything from Stage 1B onward — for projects where 1A already applied. */
export const RAZORPAY_RPC_BUNDLE = [
  "20261104100000_razorpay_stage1b_rpcs.sql",
  "20261104120000_razorpay_stage1c_runtime.sql",
  "20261105100000_billing_stage2_seat_limits.sql",
];

/** The full stack, from the first Razorpay migration. */
export const RAZORPAY_BUNDLE = [
  "20261016000000_razorpay_billing.sql",
  "20261016120000_razorpay_atomic_ledger_entitlements.sql",
  "20261030100000_razorpay_stage1a_schema_foundation.sql",
  "20261104100000_razorpay_stage1b_rpcs.sql",
  "20261104120000_razorpay_stage1c_runtime.sql",
  "20261105100000_billing_stage2_seat_limits.sql",
];

const SETS = {
  full: RAZORPAY_BUNDLE,
  rpcs: RAZORPAY_RPC_BUNDLE,
};
const DEFAULT_OUT = {
  full: "razorpay-migrations.bundle.sql",
  rpcs: "razorpay-rpc-migrations.bundle.sql",
};

function parseArgs(argv) {
  const args = { out: null, list: false, help: false, set: "full" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--set") args.set = argv[++i];
    else if (a === "--list") args.list = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else {
      process.stderr.write(`\n✗ Unknown argument: ${a}. Try --help.\n`);
      process.exit(1);
    }
  }
  if (!(args.set in SETS)) {
    process.stderr.write(`\n✗ --set must be one of ${Object.keys(SETS).join(", ")}.\n`);
    process.exit(1);
  }
  args.out = args.out ?? DEFAULT_OUT[args.set];
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(
      "Usage:\n" +
        "  npm run migrations:bundle                        # full stack (--set full)\n" +
        "  npm run migrations:bundle -- --set rpcs          # Stage 1B-2 only\n" +
        "  npm run migrations:bundle -- --out /tmp/x.sql\n" +
        "  npm run migrations:bundle -- --list\n\n" +
        "Concatenates Razorpay migrations, in dependency order, into one file that\n" +
        "can be pasted into the Supabase SQL Editor in a single query. Reads\n" +
        "supabase/migrations/ directly so the output cannot go stale.\n\n" +
        "--set full : all six, from the first Razorpay migration\n" +
        "--set rpcs : only 1B/1C/2, for when the razorpay_* tables already exist\n",
    );
    return;
  }

  const files = SETS[args.set];

  if (args.list) {
    process.stdout.write(`\nRazorpay bundle --set ${args.set} (${files.length} files):\n`);
    for (const [i, name] of files.entries()) {
      process.stdout.write(`  ${i + 1}. ${name}\n`);
    }
    process.stdout.write("\n");
    return;
  }

  const bodies = [];
  let totalBytes = 0;
  for (const name of files) {
    const path = resolve(MIGRATIONS_DIR, name);
    let text;
    try {
      text = readFileSync(path, "utf8");
    } catch {
      process.stderr.write(`\n✗ Missing migration: ${path}\n`);
      process.exit(1);
    }
    totalBytes += Buffer.byteLength(text);
    bodies.push({ name, text });
  }

  const header = [
    "-- ============================================================================",
    "-- roducq — Razorpay migrations, COMBINED (apply once)",
    "-- ============================================================================",
    "-- GENERATED FILE — do not edit. Regenerate with:",
    `--   npm run migrations:bundle -- --set ${args.set}`,
    "-- Source of truth: supabase/migrations/",
    "--",
    "-- Contains, in dependency order:",
    ...files.map((n, i) => `--   ${i + 1}. ${n}`),
    "--",
    ...(args.set === "rpcs"
      ? ["-- USE WHEN: the razorpay_* tables already exist (Stage 1A applied) but the",
         "-- checkout/webhook RPCs do not, e.g.",
         "--   select ... where proname = 'reserve_razorpay_checkout_intent'  -> 0 rows",
         "-- which makes POST /api/billing/checkout answer 409."]
      : ["-- USE WHEN: the Stage 1B RPCs are missing, e.g.",
         "--   select ... where proname = 'reserve_razorpay_checkout_intent'  -> 0 rows",
         "-- which makes POST /api/billing/checkout answer 409."]),
    "--",
    "-- SAFETY: additive only — new tables, `add column if not exists`, new",
    "-- functions. Nothing is dropped and no rows are deleted. The one",
    "-- destructive-looking step re-adds a CHECK constraint on",
    "-- billing_subscriptions.status, and fails safely (without applying) if an",
    "-- existing row has an unexpected status.",
    "--",
    "-- IMPORTANT: NOT RE-RUNNABLE. These migrations use plain `create table`,",
    "-- plain `create function`, plain `create index`/`create trigger`, and",
    "-- `add column` without IF NOT EXISTS, so a second run stops at the first",
    "-- existing object — typically:",
    "--   ERROR: relation \"razorpay_plan_catalog\" already exists",
    "--   ERROR: column \"candidate_workspace_hint_id\" ... already exists",
    "-- That is safe — nothing is damaged. See",
    "-- docs/razorpay-migrations-runbook.md for the recovery path.",
    "--",
    "-- AFTER RUNNING: this does NOT seed razorpay_plan_catalog. Checkout still",
    "-- needs one active INR row per tier (starter 290000 paise, team 790000).",
    "--",
    "-- HOW TO RUN: Supabase -> SQL Editor -> New query -> paste all -> Run.",
    "-- ============================================================================",
    "",
    "",
  ].join("\n");

  const parts = [header];
  for (const [i, { name, text }] of bodies.entries()) {
    const bar = "=".repeat(74);
    parts.push(
      `\n\n-- ${bar}\n-- ${i + 1}/${bodies.length}  ${name}\n-- ${bar}\n\n` +
        text.replace(/\s+$/, "") +
        "\n",
    );
  }

  const out = parts.join("");
  writeFileSync(args.out, out, "utf8");

  const kb = (Buffer.byteLength(out) / 1024).toFixed(0);
  process.stdout.write(
    `\n✓ Wrote ${args.out}\n` +
      `  ${files.length} migrations (--set ${args.set}), ${kb} KB, ` +
      `${(totalBytes / 1024).toFixed(0)} KB of migration SQL\n` +
      `  Paste the whole file into the Supabase SQL Editor and run it once.\n` +
      `  It is not re-runnable after a partial failure — see docs/razorpay-migrations-runbook.md\n\n`,
  );
}

main();
