/**
 * Unit tests for lib/webhooks.ts — the outbound webhook pure core: HMAC
 * scheme (cross-checked against node:crypto directly), tamper/stale
 * rejection, the SSRF URL guard, the retry schedule, and the delivery
 * envelope shape consumers rely on.
 */

import { createHmac } from "node:crypto";
import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  backoffForAttempt,
  buildDeliveryBody,
  buildDeliveryHeaders,
  computeSignature,
  normalizeWebhookUrl,
  RETRY_BACKOFF_MS,
  signPayload,
  verifySignedPayload,
} from "../../lib/webhooks.ts";

const SECRET = "whsec_test_secret";
const RAW = JSON.stringify({ id: "e1", event_type: "invoice.paid" });
const NOW = 1_764_000_000;

describe("HMAC scheme (Stripe-style t/v1 over `${ts}.${body}`)", () => {
  test("computeSignature matches a direct node:crypto HMAC", () => {
    const expected = createHmac("sha256", SECRET)
      .update(`${NOW}.${RAW}`)
      .digest("hex");
    assert.equal(computeSignature(SECRET, NOW, RAW), expected);
  });

  test("signPayload/verify round-trips", () => {
    const header = signPayload(SECRET, NOW, RAW);
    assert.match(header, /^t=\d+,v1=[0-9a-f]{64}$/);
    assert.deepEqual(
      verifySignedPayload({ secret: SECRET, header, raw: RAW, nowSec: NOW }),
      { ok: true }
    );
  });

  test("verify rejects tampered bodies and wrong secrets", () => {
    const header = signPayload(SECRET, NOW, RAW);
    assert.deepEqual(
      verifySignedPayload({ secret: SECRET, header, raw: RAW + "x", nowSec: NOW }),
      { ok: false, reason: "mismatch" }
    );
    assert.deepEqual(
      verifySignedPayload({ secret: "whsec_other", header, raw: RAW, nowSec: NOW }),
      { ok: false, reason: "mismatch" }
    );
  });

  test("verify rejects stale timestamps outside the tolerance", () => {
    const header = signPayload(SECRET, NOW, RAW);
    assert.deepEqual(
      verifySignedPayload({
        secret: SECRET,
        header,
        raw: RAW,
        nowSec: NOW + 301,
      }),
      { ok: false, reason: "stale" }
    );
    assert.deepEqual(
      verifySignedPayload({
        secret: SECRET,
        header,
        raw: RAW,
        nowSec: NOW + 299,
      }),
      { ok: true }
    );
  });

  test("verify accepts any matching v1 among rotation candidates", () => {
    const good = computeSignature(SECRET, NOW, RAW);
    const header = `t=${NOW},v1=deadbeef,v1=${good}`;
    assert.deepEqual(
      verifySignedPayload({ secret: SECRET, header, raw: RAW, nowSec: NOW }),
      { ok: true }
    );
  });

  test("verify rejects malformed headers", () => {
    for (const header of ["", "v1=abc", "t=notanumber,v1=abc", "garbage"]) {
      const result = verifySignedPayload({
        secret: SECRET,
        header,
        raw: RAW,
        nowSec: NOW,
      });
      assert.deepEqual(result, { ok: false, reason: "malformed" }, header);
    }
  });
});

describe("normalizeWebhookUrl (SSRF guard)", () => {
  test("https everywhere; http only for loopback", () => {
    assert.deepEqual(normalizeWebhookUrl("https://example.com/h"), {
      ok: true,
      url: "https://example.com/h",
    });
    assert.equal(normalizeWebhookUrl("http://localhost:8787/h").ok, true);
    assert.equal(normalizeWebhookUrl("http://127.0.0.1/h").ok, true);
    assert.equal(normalizeWebhookUrl("http://[::1]:8787/h").ok, true);
    assert.equal(normalizeWebhookUrl("http://example.com/h").ok, false);
    assert.equal(normalizeWebhookUrl("ftp://example.com/h").ok, false);
    assert.equal(normalizeWebhookUrl("not a url").ok, false);
    assert.equal(normalizeWebhookUrl("  ").ok, false);
  });

  // The registrant is a workspace OWNER, so this guard is the only thing
  // between a customer and the server's private network / cloud metadata.
  test("cloud metadata endpoints are rejected over https and http", () => {
    for (const url of [
      "https://169.254.169.254/latest/meta-data",
      "http://169.254.169.254/latest/meta-data",
      "https://metadata.google.internal/computeMetadata/v1/",
      "https://METADATA.GOOGLE.INTERNAL./x",
      "https://instance-data/x",
      "https://[::ffff:169.254.169.254]/x",
    ]) {
      assert.equal(normalizeWebhookUrl(url).ok, false, url);
    }
  });

  test("private network ranges are rejected", () => {
    for (const url of [
      "https://10.0.0.1/h",
      "https://10.255.255.254/h",
      "https://172.16.0.1/h",
      "https://172.31.255.255/h",
      "https://192.168.1.10/h",
      "https://100.64.0.1/h", // CGNAT
      "https://[fc00::1]/x", // unique local
      "https://[fd12:3456::1]/x",
      "https://[fe80::1]/x", // link-local
    ]) {
      assert.equal(normalizeWebhookUrl(url).ok, false, url);
    }
  });

  test("loopback and unspecified addresses are rejected over https", () => {
    for (const url of [
      "https://localhost/x",
      "https://127.0.0.1:8080/x",
      "https://[::1]/x",
      "https://[::ffff:127.0.0.1]/x",
      "https://0.0.0.0/x",
      "https://[::]/x",
    ]) {
      assert.equal(normalizeWebhookUrl(url).ok, false, url);
    }
  });

  test("the boundary just outside the private ranges is still allowed", () => {
    assert.equal(normalizeWebhookUrl("https://172.32.0.1/h").ok, true);
    assert.equal(normalizeWebhookUrl("https://[2606:4700::1111]/x").ok, true);
    assert.equal(normalizeWebhookUrl("https://11.0.0.1/h").ok, true);
  });

  test("single-label internal hostnames are rejected", () => {
    assert.equal(normalizeWebhookUrl("https://intranet/h").ok, false);
  });

  test("the rejection names the reason so the Settings card can explain it", () => {
    const metadata = normalizeWebhookUrl("https://169.254.169.254/x");
    assert.equal(metadata.ok, false);
    assert.match(
      metadata.ok ? "" : metadata.error,
      /cloud metadata/i,
      "metadata rejection must be self-explanatory"
    );

    const loopback = normalizeWebhookUrl("https://[::1]/x");
    assert.equal(loopback.ok, false);
    assert.match(loopback.ok ? "" : loopback.error, /loopback/i);

    const priv = normalizeWebhookUrl("https://10.0.0.1/x");
    assert.equal(priv.ok, false);
    assert.match(priv.ok ? "" : priv.error, /private or internal/i);
  });
});

describe("retry schedule + delivery envelope", () => {
  test("3 attempts: immediate, +15s, +60s, then done", () => {
    assert.deepEqual([...RETRY_BACKOFF_MS], [15_000, 60_000]);
    assert.equal(backoffForAttempt(1), 15_000);
    assert.equal(backoffForAttempt(2), 60_000);
    assert.equal(backoffForAttempt(3), null);
  });

  test("buildDeliveryBody is the documented envelope", () => {
    const body = buildDeliveryBody({
      id: "e1",
      event_type: "invoice.paid",
      payload: { invoice_id: "i1" },
      created_at: "2026-09-26T10:00:00Z",
    });
    assert.deepEqual(JSON.parse(body), {
      id: "e1",
      event_type: "invoice.paid",
      payload: { invoice_id: "i1" },
      created_at: "2026-09-26T10:00:00Z",
    });
  });

  test("buildDeliveryHeaders signs the body and stamps ids", () => {
    const headers = buildDeliveryHeaders(RAW, SECRET, NOW, "d1", "invoice.paid");
    assert.equal(headers["content-type"], "application/json");
    assert.equal(headers["x-roducq-event"], "invoice.paid");
    assert.equal(headers["x-roducq-delivery"], "d1");
    assert.equal(headers["x-roducq-signature"], signPayload(SECRET, NOW, RAW));
  });
});
