/**
 * Content-Security-Policy regression guard for Razorpay Checkout.
 *
 * WHY THIS TEST EXISTS. The production CSP used to omit Razorpay entirely,
 * while lib/razorpay-client.ts injects https://checkout.razorpay.com/v1/checkout.js
 * at runtime and Razorpay renders its payment surfaces in an iframe. The
 * header ships in production only (next.config.mjs returns no headers when
 * NODE_ENV=development), so the checkout silently failed for every real user
 * while working perfectly in local development. This pins the three
 * directives that broke: script-src, connect-src and frame-src.
 *
 * The config is imported as a module and `headers()` is called directly, so
 * this asserts the REAL emitted header string rather than a hand-copied one.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import nextConfig from "../../next.config.mjs";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com";
const RAZORPAY_API = "https://api.razorpay.com";
const RAZORPAY_LUMBERJACK = "https://lumberjack.razorpay.com";

/** NODE_ENV is typed readonly; go through a mutable view for the override. */
function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  env.NODE_ENV = value;
}

/** The production CSP value, or a clear failure if the header vanished. */
async function productionCsp(): Promise<string> {
  const saved = process.env.NODE_ENV;
  // headers() is a no-op in development by design; force production here.
  setNodeEnv("production");
  try {
    const rules = await nextConfig.headers!();
    for (const rule of rules) {
      const header = rule.headers?.find(
        (h: { key: string }) => h.key.toLowerCase() === "content-security-policy",
      );
      if (header) return header.value;
    }
    assert.fail("no Content-Security-Policy header was emitted in production");
  } finally {
    setNodeEnv(saved);
  }
}

/** Extract one directive's source list from a CSP string. */
function directive(csp: string, name: string): string[] {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  return found ? found.split(/\s+/).slice(1) : [];
}

describe("production CSP allows Razorpay Checkout", () => {
  it("script-src permits the checkout.js origin that lib/razorpay-client injects", async () => {
    const sources = directive(await productionCsp(), "script-src");
    assert.ok(
      sources.includes(RAZORPAY_SCRIPT),
      `script-src must include ${RAZORPAY_SCRIPT} (got: ${sources.join(" ")})`,
    );
  });

  it("connect-src permits the Razorpay API and telemetry endpoints", async () => {
    const sources = directive(await productionCsp(), "connect-src");
    for (const origin of [RAZORPAY_API, RAZORPAY_SCRIPT, RAZORPAY_LUMBERJACK]) {
      assert.ok(
        sources.includes(origin),
        `connect-src must include ${origin} (got: ${sources.join(" ")})`,
      );
    }
  });

  it("frame-src permits the Razorpay checkout iframe", async () => {
    const sources = directive(await productionCsp(), "frame-src");
    assert.ok(
      sources.includes(RAZORPAY_SCRIPT),
      "frame-src must include the Razorpay checkout origin",
    );
    assert.ok(sources.includes(RAZORPAY_API), "frame-src must include api.razorpay.com");
  });

  it("the hardening that already existed is not regressed", async () => {
    const csp = await productionCsp();
    assert.deepEqual(directive(csp, "frame-ancestors"), ["'none'"]);
    assert.deepEqual(directive(csp, "base-uri"), ["'self'"]);
    assert.deepEqual(directive(csp, "form-action"), ["'self'"]);
    assert.ok(
      directive(csp, "connect-src").some((s) => s.endsWith("supabase.co")),
      "Supabase auth/PostgREST must stay reachable",
    );
    // Third-party script injection stays limited to the one payment origin.
    assert.deepEqual(
      directive(csp, "script-src").filter((s) => s.startsWith("http")),
      [RAZORPAY_SCRIPT],
      "Razorpay must remain the ONLY third-party script origin",
    );
  });

  it("development still ships no CSP, so HMR keeps working", async () => {
    const saved = process.env.NODE_ENV;
    setNodeEnv("development");
    try {
      assert.deepEqual(await nextConfig.headers!(), []);
    } finally {
      setNodeEnv(saved);
    }
  });
});
