/**
 * Razorpay Test Mode Plan setup helper.
 *
 *   node scripts/create-razorpay-plans.mjs --dry-run --specs '[{"name":"RoduCQ Pro","amount":1499,"currency":"INR"}]'
 *   node scripts/create-razorpay-plans.mjs --interval monthly --period 1 --file razorpay-plans.local.json
 *   node scripts/create-razorpay-plans.mjs --list
 *
 * Creates the Razorpay Subscription Plans that RAZORPAY_PLANS must point at,
 * then prints the exact RAZORPAY_PLANS value to paste into .env.local /
 * Vercel. RoduCQ never guesses or invents a plan id: the id comes from
 * Razorpay's response to this call (or from --list against your dashboard).
 *
 * --catalog emits the SQL that seeds public.razorpay_plan_catalog, which is
 * what the Stage 1B checkout RPC actually reads. That table is unreachable
 * from application code by design (the migrations revoke every privilege from
 * anon, authenticated and service_role), so seeding is a deliberate operator
 * step through the Supabase SQL Editor. Skipping it makes
 * POST /api/billing/checkout answer 409 test_plan_not_available.
 *
 * TEST MODE ONLY. Like lib/razorpay.ts, this refuses rzp_live_ keys: there is
 * no flag here that enables Live Mode. Plans are per-mode — a Plan created
 * against a Test Mode key does not exist for a Live Mode key, so this script
 * must be re-run for any future Live Mode milestone.
 *
 * Credentials come from the environment only (never argv, never a committed
 * file) so they cannot land in shell history or the repo.
 *
 * Exit codes: 0 ok · 1 usage/config error · 2 Razorpay API error.
 */

import { readFileSync } from "node:fs";

const API_BASE = "https://api.razorpay.com/v1";
const ALLOWED_INTERVALS = ["minute", "hour", "day", "week", "month", "year"];
const DEFAULT_INTERVAL = "month";
const DEFAULT_PERIOD = 1;

function fail(message, code = 1) {
  process.stderr.write(`\n✗ ${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { dryRun: false, list: false, catalog: false, interval: DEFAULT_INTERVAL, period: DEFAULT_PERIOD, specs: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--list") args.list = true;
    else if (a === "--catalog") args.catalog = true;
    else if (a === "--interval") args.interval = argv[++i];
    else if (a === "--period") args.period = Number(argv[++i]);
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--specs") args.specs = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
    else fail(`Unknown argument: ${a}. Try --help.`);
  }
  return args;
}

/** Same rule as lib/razorpay.ts → razorpayKeyMode + ALLOWED_RAZORPAY_MODES. */
function resolveCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    fail(
      "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET first (Test Mode keys: rzp_test_...). " +
        "See docs/RAZORPAY_TEST_MODE_SETUP.md §1. Use --dry-run to validate specs without credentials.",
    );
  }
  if (keyId.startsWith("rzp_live_")) {
    fail(
      "Refusing to run against a Razorpay LIVE key. RoduCQ is Test Mode only — " +
        "production payments are not enabled. Use an rzp_test_ key.",
    );
  }
  if (!keyId.startsWith("rzp_test_")) {
    fail("RAZORPAY_KEY_ID must start with rzp_test_ (or rzp_live_, which this script refuses).");
  }
  const declared = (process.env.RAZORPAY_MODE ?? "").trim().toLowerCase();
  if (declared && declared !== "test") {
    fail(`RAZORPAY_MODE=${declared} is not allowed. RoduCQ is Test Mode only (RAZORPAY_MODE=test).`);
  }
  return { keyId, keySecret };
}

function loadSpecs(args) {
  const raw = args.specs ?? (args.file ? readSpecFile(args.file) : null);
  if (!raw) {
    fail(
      "No plan specs. Pass --specs '[...]' or --file razorpay-plans.local.json.\n" +
        '  Each spec: {"name":"RoduCQ Pro","amount":1499,"currency":"INR"}\n' +
        "  amount is in MAJOR units (1499 = ₹1,499).",
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    fail(`Plan specs are not valid JSON: ${e.message}`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) fail("Plan specs must be a non-empty array.");

  const out = [];
  for (let i = 0; i < parsed.length; i++) {
    const s = parsed[i];
    if (!s || typeof s !== "object") fail(`Spec ${i} is not an object.`);
    if (typeof s.name !== "string" || !s.name.trim()) fail(`Spec ${i}.name must be a non-empty string.`);
    if (typeof s.currency !== "string" || !/^[A-Z]{3}$/.test(s.currency)) {
      fail(`Spec ${i}.currency must be an uppercase 3-letter ISO-4217 code (e.g. "INR").`);
    }
    if (typeof s.amount !== "number" || !Number.isFinite(s.amount) || s.amount <= 0) {
      fail(`Spec ${i}.amount must be a positive number in major units (e.g. 1499).`);
    }
    const tier = resolveTier(s, i);
    // RAZORPAY_PLANS (the legacy single-plan-per-currency config) is the only
    // thing that cannot express two plans in one currency. The Stage 1B
    // catalog keys on tier, and legitimately holds starter AND team in USD,
    // so uniqueness is enforced per tier here and reported separately below.
    if (out.some((o) => o.tier === tier)) {
      fail(`Two plan specs both target tier "${tier}"; one plan per tier is expected.`);
    }
    out.push({ name: s.name.trim(), amount: s.amount, currency: s.currency, tier, planId: null });
  }
  return out;
}

/**
 * razorpay_plan_catalog requires a tier, and its check constraint pins the seat
 * count per tier (`starter`=1, `team`=5, `pro`=NULL, ENUM_SEATS). A spec that
 * omits `tier` is inferred from its name so the common
 * 'RoduCQ Starter' / 'RoduCQ Team' case needs no extra flags, but an ambiguous
 * name fails loudly rather than silently seeding the wrong catalog row.
 */
const TIER_SEATS = { starter: 1, team: 5 };
function resolveTier(spec, i) {
  const explicit = typeof spec.tier === "string" ? spec.tier.trim().toLowerCase() : null;
  if (explicit) {
    if (!(explicit in TIER_SEATS)) {
      fail(`Spec ${i}.tier must be one of ${Object.keys(TIER_SEATS).join(", ")} (got "${spec.tier}").`);
    }
    return explicit;
  }
  // Only the two sellable catalog tiers are inferable. "pro" is deliberately
  // excluded: it is not a catalog tier, and matching that substring would
  // silently accept a name like "RoduCQ Pro".
  const lower = spec.name.toLowerCase();
  const matches = Object.keys(TIER_SEATS).filter((t) => lower.includes(t));
  if (matches.length === 1) return matches[0];
  fail(
    `Spec ${i} ("${spec.name}") does not identify a tier. Add "tier":"starter" or "tier":"team" ` +
      `(used only when seeding razorpay_plan_catalog).`,
  );
}

/**
 * The approved USD price list, mirrored from lib/razorpay.ts
 * (TIER_CATALOG_RULES). Seeding a catalog row whose amount disagrees with what
 * the app shows would charge a different price than the pricing page renders,
 * so a mismatch is refused rather than silently written.
 */
const APPROVED_TIERS = {
  starter: { currency: "USD", amountMinor: 2900, includedSeats: 1 },
  team: { currency: "USD", amountMinor: 7900, includedSeats: 5 },
};
function assertApproved(spec, i) {
  const rule = APPROVED_TIERS[spec.tier];
  if (!rule) return;
  const minor = Math.round(spec.amount * 100);
  if (spec.currency !== rule.currency || minor !== rule.amountMinor) {
    fail(
      `Spec ${i} ("${spec.name}") is ${spec.amount} ${spec.currency}, but the approved ` +
        `${spec.tier} price is ${rule.amountMinor / 100} ${rule.currency}. ` +
        `Seeding it would charge a different amount than /pricing shows. ` +
        `Update lib/razorpay.ts TIER_CATALOG_RULES first if the price really changed.`,
    );
  }
}

function readSpecFile(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    fail(`Could not read spec file: ${file}`);
  }
}

function authHeader(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function rzp(path, { keyId, keySecret }, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: authHeader(keyId, keySecret), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Razorpay error descriptions only — never echo the credentials.
    fail(data?.error?.description ?? `Razorpay error (HTTP ${res.status}) on ${path}.`, 2);
  }
  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      "Usage:\n" +
        "  node scripts/create-razorpay-plans.mjs --dry-run --specs '[{\"name\":\"RoduCQ Pro\",\"amount\":1499,\"currency\":\"INR\"}]'\n" +
        "  node scripts/create-razorpay-plans.mjs --interval month --period 1 --file razorpay-plans.local.json\n" +
        "  node scripts/create-razorpay-plans.mjs --catalog --specs '...'\n" +
        "  node scripts/create-razorpay-plans.mjs --list\n\n" +
        "Options:\n  --dry-run   validate specs, call nothing\n  --list      list existing Test Mode plans from Razorpay\n" +
        "  --interval  minute|hour|day|week|month|year (default month)\n" +
        "  --period    billing period length (default 1)\n" +
        "  --specs     inline JSON array of plan specs\n  --file      path to a JSON array of plan specs\n",
    );
    return;
  }

  if (!ALLOWED_INTERVALS.includes(args.interval)) {
    fail(`--interval must be one of ${ALLOWED_INTERVALS.join(", ")}.`);
  }
  if (!Number.isInteger(args.period) || args.period < 1) fail("--period must be a positive integer.");

  if (args.list) {
    const creds = resolveCredentials();
    const data = await rzp("/plans?count=100", creds);
    const items = data.items ?? [];
    process.stdout.write(`\nRazorpay Test Mode plans for ${creds.keyId} (${items.length}):\n`);
    if (items.length === 0) process.stdout.write("  (none — create them with this script)\n");
    for (const p of items) {
      process.stdout.write(`  ${p.id}  ${p.item?.name ?? "?"}  ${p.item?.amount ?? "?"} ${p.item?.currency ?? "?"} / ${p.period} ${p.interval}\n`);
    }
    process.stdout.write("\n");
    return;
  }

  const specs = loadSpecs(args);
  // Validate the tier and the approved price up front, for every run. These
  // used to be checked only when --catalog was passed, which let a mismatched
  // or tier-less spec reach Razorpay and only fail later at seeding time.
  for (const [i, spec] of specs.entries()) assertApproved(spec, i);

  if (args.dryRun) {
    process.stdout.write("\nDry run — nothing was sent to Razorpay.\n");
    process.stdout.write(`Would create ${specs.length} Test Mode plan(s), each ${args.period} ${args.interval}(s):\n`);
    for (const s of specs) {
      process.stdout.write(`  ${s.name}  ${s.amount} ${s.currency}  (amount_paise=${s.amount * 100})\n`);
    }
    process.stdout.write("\nRe-run without --dry-run with RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET set to create them.\n");
    if (args.catalog) {
      // Real ids do not exist yet; show the shape with clearly-marked placeholders.
      const preview = specs.map((s, i) => ({ ...s, planId: `<plan id ${i + 1} from --list>` }));
      process.stdout.write(
        "\n-- PREVIEW ONLY: replace each <plan id …> with a real plan_ id from `--list`.\n" +
          catalogSql(preview, { mode: "test", interval: args.interval, period: args.period }) +
          "\n\n",
      );
    }
    process.stdout.write("\n");
    return;
  }

  const creds = resolveCredentials();
  process.stdout.write(`\nCreating ${specs.length} Test Mode plan(s) against ${creds.keyId}...\n`);

  for (const s of specs) {
    const created = await rzp("/plans", creds, {
      method: "POST",
      body: JSON.stringify({
        period: args.interval,
        interval: args.period,
        item: { name: s.name, amount: Math.round(s.amount * 100), currency: s.currency },
      }),
    });
    if (typeof created?.id !== "string" || !created.id.startsWith("plan_")) {
      fail("Razorpay returned an unexpected plan response — no plan id. Nothing recorded.", 2);
    }
    s.planId = created.id;
    process.stdout.write(`  ✓ ${created.id}  ${s.name}  ${s.amount} ${s.currency} / ${args.period} ${args.interval}\n`);
  }

  const envValue = JSON.stringify(
    specs.map((s) => ({ currency: s.currency, planId: s.planId, amount: s.amount })),
  );
  process.stdout.write("\nPaste this into .env.local and Vercel as RAZORPAY_PLANS:\n\n");
  process.stdout.write(`RAZORPAY_PLANS='${envValue}'\n\n`);
  process.stdout.write("amount must match the Razorpay Plan exactly — RoduCQ shows it as the display price\n");
  process.stdout.write("and Razorpay charges the Plan's own amount. Verify with --list.\n\n");

  // RAZORPAY_PLANS only drives the legacy settings checkout. The Stage 1B
  // checkout reads razorpay_plan_catalog, so a deploy with the env var set and
  // an empty catalog still answers 409. Print the seeding SQL unless the
  // operator explicitly opted out.
  if (args.catalog) {
    process.stdout.write("Run this in the Supabase SQL Editor (production and staging) to enable\n");
    process.stdout.write("POST /api/billing/checkout. It is not runnable by the app by design.\n\n");
    process.stdout.write(
      catalogSql(specs, { mode: "test", interval: args.interval, period: args.period }) + "\n\n",
    );
  } else {
    process.stdout.write("NOTE: Stage 1B checkout reads public.razorpay_plan_catalog. Re-run with\n");
    process.stdout.write("--catalog to print the SQL that seeds it, or POST /api/billing/checkout\n");
    process.stdout.write("will answer 409 test_plan_not_available.\n\n");
  }
}

/**
 * The SQL an operator pastes into the Supabase SQL Editor to make
 * POST /api/billing/checkout work.
 *
 * Why SQL and not an API call: the Stage 1A/1B migrations revoke ALL
 * privileges on razorpay_plan_catalog from public, anon, authenticated AND
 * service_role, and the guard trigger refuses to create a row in any state
 * other than 'inactive'. Application code therefore cannot seed it even with
 * the service-role key — this is a deliberate operator step.
 *
 * Emitted in two statements because the trigger allows only inactive -> active
 * and makes provider_plan_id/amount immutable once the row exists.
 */
function catalogSql(specs, { mode, interval, period }) {
  const sqlString = (v) => `'${String(v).replace(/'/g, "''")}'`;
  const rows = specs.map((s) => {
    const seats = APPROVED_TIERS[s.tier]?.includedSeats ?? "null";
    return `  (${sqlString(mode)}, ${sqlString(s.planId)}, ${sqlString(s.tier)}, ${sqlString(s.currency)}, ` +
      `${Math.round(s.amount * 100)}, ${seats}, ${sqlString(interval)}, ${period})`;
  });
  const ids = specs.map((s) => sqlString(s.planId)).join(", ");
  return [
    "-- 1. Insert as 'inactive' (the guard trigger rejects any other initial state),",
    "--    then 2. promote to 'active' (the only permitted state transition).",
    "insert into public.razorpay_plan_catalog",
    "  (provider_mode, provider_plan_id, tier, currency, amount_minor, included_seats,",
    "   interval_unit, interval_count)",
    "values",
    rows.join(",\n"),
    "on conflict (provider_mode, provider_plan_id) do nothing;",
    "",
    "update public.razorpay_plan_catalog",
    "   set state = 'active'",
    ` where provider_mode = ${sqlString(mode)}`,
    `   and provider_plan_id in (${ids});`,
    "",
    "-- Verify: exactly one active row per tier.",
    "select tier, provider_mode, currency, amount_minor, included_seats, state",
    "  from public.razorpay_plan_catalog",
    " order by tier;",
  ].join("\n");
}

main().catch((e) => fail(e?.message ?? String(e), 2));
