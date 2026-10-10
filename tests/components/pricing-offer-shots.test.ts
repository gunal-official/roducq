/**
 * Guards that the strings used by scripts/build-pricing-screenshots.py
 * match the live TypeScript sources, so the PNG evidence in docs/screenshots
 * can't silently drift from what /pricing actually renders.
 *
 * Source-level, node:test, zero deps — same approach as
 * tests/components/pricing.test.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("docs/screenshots copy stays in sync with /pricing source", () => {
  // Import the live modules through jiti (same trick as the screenshot
  // script uses at build time).
  const jiti = require(resolve(ROOT, "node_modules/jiti"))(__filename);
  const plans = jiti(resolve(ROOT, "app/(marketing)/pricing/plans.ts"));
  const stripe = jiti(resolve(ROOT, "lib/stripe.ts"));

  it("offer defaults in lib/stripe.ts match defaults used by the screenshots", () => {
    assert.equal(stripe.DEFAULT_OFFER_BADGE, "LAUNCH OFFER");
    assert.equal(stripe.DEFAULT_OFFER_CODE, "LAUNCH20");
    assert.match(stripe.DEFAULT_OFFER_TEXT, /Save 20%/);
    assert.match(stripe.DEFAULT_OFFER_TEXT, /3 months/);
  });

  it("hero + footer copy in plans.ts match the values baked into the screenshots", () => {
    assert.equal(plans.HERO.eyebrow, "Pricing");
    assert.equal(plans.HERO.title, "Plans that scale with how your team works.");
    assert.match(plans.HERO.intro, /no feature paywalls/);
    assert.match(plans.FOOTER_NOTE, /Stripe/);
    assert.ok(plans.FOOTER_NOTE.includes("usage limit"), "footer should call out there's no usage limit");
  });

  it("three tiers in the exact order the screenshots render", () => {
    assert.deepEqual(plans.PLAN_TIERS.map((t: { slug: string }) => t.slug), ["starter", "team", "studio"]);
    assert.equal(plans.PLAN_TIERS[1].badge, "Most popular");
  });

  it("billing note is still per-workspace and not per-seat", () => {
    const team = plans.PLAN_TIERS.find((t: { slug: string }) => t.slug === "team");
    assert.match(team.billingNote, /per workspace/i);
    assert.match(team.billingNote, /not per seat/i);
  });

  it("Checkout session still enables promotion codes (no hardcoded coupon)", () => {
    const stripeSrc = read("lib/stripe.ts");
    assert.match(stripeSrc, /\["allow_promotion_codes", "true"\]/);
  });

  it("all three screenshot PNGs exist on disk", () => {
    for (const name of ["pricing-light.png", "pricing-dark.png", "pricing-no-billing.png"]) {
      const buf = readFileSync(resolve(ROOT, "docs/screenshots", name));
      assert.ok(buf.length > 10_000, `${name} should be a real PNG, got ${buf.length} bytes`);
      assert.equal(buf.slice(0, 8).toString("hex"), "89504e470d0a1a0a", `${name} PNG header`);
    }
  });
});
