/**
 * Tests for scripts/bundle-migrations.mjs.
 *
 * The bundle exists because a project was found whose database had none of the
 * Stage 1B RPCs applied — the migrations were committed and CI-green, but never
 * deployed. Operators applying them through the Supabase SQL Editor need one
 * paste-able file.
 *
 * These tests pin the properties that make it safe to paste: correct contents,
 * correct dependency order, and an explicit warning that it is not re-runnable.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { RAZORPAY_BUNDLE as RAW_BUNDLE } from "../../scripts/bundle-migrations.mjs";

/** The generator is plain ESM, so its export arrives untyped. */
const RAZORPAY_BUNDLE: string[] = RAW_BUNDLE as string[];

const SCRIPT = resolve(process.cwd(), "scripts/bundle-migrations.mjs");
const MIGRATIONS = resolve(process.cwd(), "supabase/migrations");

function bundle() {
  const dir = mkdtempSync(join(tmpdir(), "migbundle-"));
  const out = join(dir, "bundle.sql");
  const result = spawnSync(process.execPath, [SCRIPT, "--out", out], { encoding: "utf8" });
  const text = result.status === 0 ? readFileSync(out, "utf8") : "";
  rmSync(dir, { recursive: true, force: true });
  return { status: result.status, out: text, stderr: result.stderr ?? "" };
}

describe("bundle-migrations", () => {
  it("emits every Razorpay migration, in dependency order", () => {
    const { status, out } = bundle();
    assert.equal(status, 0);
    assert.ok(out.length > 50_000, "bundle should contain real SQL, not a stub");

    // Each migration's header must appear, in the declared order.
    let cursor = -1;
    for (const name of RAZORPAY_BUNDLE) {
      const at = out.indexOf(name);
      assert.ok(at > -1, `missing ${name}`);
      assert.ok(at > cursor, `${name} emitted out of order`);
      cursor = at;
    }
  });

  it("declares the order the database actually requires", () => {
    // Stage 1A adds foreign keys to columns created by the first file, and
    // Stage 1B calls a function created by the second. If this order regresses,
    // applying the bundle fails on a fresh project.
    const idx = (name: string) => RAZORPAY_BUNDLE.indexOf(name);
    assert.ok(idx("20261016000000_razorpay_billing.sql") < idx("20261030100000_razorpay_stage1a_schema_foundation.sql"));
    assert.ok(idx("20261016120000_razorpay_atomic_ledger_entitlements.sql") < idx("20261104100000_razorpay_stage1b_rpcs.sql"));
    assert.ok(idx("20261030100000_razorpay_stage1a_schema_foundation.sql") < idx("20261104100000_razorpay_stage1b_rpcs.sql"));
    assert.ok(idx("20261030100000_razorpay_stage1a_schema_foundation.sql") < idx("20261105100000_billing_stage2_seat_limits.sql"));
  });

  it("contains the RPC whose absence caused the 409", () => {
    const { out } = bundle();
    assert.match(out, /create or replace function public\.reserve_razorpay_checkout_intent/);
    assert.match(out, /create or replace function public\.start_razorpay_checkout_create/);
    assert.match(out, /create or replace function public\.razorpay_minor_to_major/);
  });

  it("carries the not-re-runnable warning, because the SQL is not idempotent", () => {
    // Stage 1A/1B use plain `create table` / `create function`; a second run
    // stops at the first existing object. Operators must know that up front.
    const { out } = bundle();
    assert.match(out, /NOT RE-RUNNABLE/);
    assert.match(out, /already exists/);
    assert.match(out, /create table public\.razorpay_plan_catalog \(/);
  });

  it("warns that seeding is a separate step", () => {
    const { out } = bundle();
    assert.match(out, /does NOT seed razorpay_plan_catalog/);
    assert.match(out, /290000/);
    assert.match(out, /790000/);
  });

  it("is byte-for-byte a concatenation of the canonical migration files", () => {
    // Guards against the generator drifting from supabase/migrations/.
    const { out } = bundle();
    for (const name of RAZORPAY_BUNDLE) {
      const body = readFileSync(join(MIGRATIONS, name), "utf8").replace(/\s+$/, "");
      assert.ok(out.includes(body), `${name} body not reproduced verbatim`);
    }
  });

  it("rejects an unknown argument instead of writing a partial file", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--nope"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown argument/);
  });

  it("--list reports the bundle without writing anything", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "--list"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    for (const name of RAZORPAY_BUNDLE) assert.ok(result.stdout.includes(name), name);
  });
});
