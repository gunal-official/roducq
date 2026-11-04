import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleBillingWebhook } from "../../lib/billing/webhook-handler.ts";

const SECRET = "test-webhook-secret";
const raw = JSON.stringify({ event: "subscription.activated", payload: { subscription: { entity: { id: "sub_test" } } } });
const signature = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

function req(body: string, sig: string | null = signature(body)) {
  return new Request("https://example.test/api/billing/webhook", {
    method: "POST",
    headers: sig ? { "x-razorpay-signature": sig, "x-razorpay-event-id": "evt_123" } : {},
    body,
  });
}

describe("POST /api/billing/webhook", () => {
  it("reads and forwards the exact raw text and event headers before acknowledging queue ingestion", async () => {
    let received: unknown;
    const response = await handleBillingWebhook(req(raw), async (input) => {
      received = input;
      return { ok: true, value: { inserted: true, bodySha256: "a".repeat(64), state: "received" } };
    });
    assert.equal(response.status, 200);
    assert.deepEqual(received, { rawBody: raw, signature: signature(raw), eventIdHeader: "evt_123" });
    assert.deepEqual(await response.json(), { received: true });
  });

  it("returns 401 when raw-body HMAC verification fails", async () => {
    let called = false;
    const response = await handleBillingWebhook(req(raw, "wrong-signature"), async () => {
      called = true;
      return { ok: false, code: "invalid_webhook_signature" };
    });
    assert.equal(response.status, 401);
    assert.equal(called, true);
  });

  it("returns 400 for malformed signed payloads and 500 for transient queue failures", async () => {
    const malformed = await handleBillingWebhook(req("{oops"), async () => ({ ok: false, code: "invalid_webhook_payload" }));
    assert.equal(malformed.status, 400);
    const failed = await handleBillingWebhook(req(raw), async () => ({ ok: false, code: "database_rpc_failed", retryable: true }));
    assert.equal(failed.status, 500);
  });

  it("rejects oversized bodies before attempting ingestion", async () => {
    let called = false;
    const response = await handleBillingWebhook(req("x".repeat(512 * 1024 + 1)), async () => {
      called = true;
      return { ok: true, value: { inserted: true, bodySha256: "b".repeat(64), state: "received" } };
    });
    assert.equal(response.status, 413);
    assert.equal(called, false);
  });
});
