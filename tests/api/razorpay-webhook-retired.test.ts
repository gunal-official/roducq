/**
 * Route-level regression test for the RETIRED /api/razorpay/webhook ingress.
 *
 * The route used to process Razorpay webhooks synchronously. It is now a
 * tombstone that answers 410 Gone and names the canonical endpoint, so an
 * operator reading the Razorpay dashboard sees a clear, terminal error
 * instead of a silent duplicate-write surface.
 *
 * This imports the route module directly (it has no next/* imports, so it
 * runs under plain `node --test` like tests/api/billing-webhook.test.ts).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { GET, POST } from "../../app/api/razorpay/webhook/route.ts";

const REQUESTS: Array<[string, () => Promise<Response>]> = [
  ["POST", () => POST()],
  ["GET", () => GET()],
];

describe("POST/GET /api/razorpay/webhook (retired)", () => {
  for (const [method, call] of REQUESTS) {
    it(`${method} answers 410 Gone with the canonical endpoint named`, async () => {
      const response = await call();
      assert.equal(response.status, 410);
      assert.deepEqual(await response.json(), {
        error: "Deprecated. Use /api/billing/webhook",
      });
    });

    it(`${method} is never cached`, async () => {
      const response = await call();
      assert.equal(response.headers.get("cache-control"), "no-store");
    });
  }

  it("accepts no payload: a signed, well-formed body is still refused", async () => {
    // The handler takes no arguments at all, so there is no code path by
    // which a body could be parsed, verified or applied.
    const response = await POST();
    assert.equal(response.status, 410);
    assert.equal(POST.length, 0, "handler must not read a request");
  });
});
