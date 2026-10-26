import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isTrustedAppRequestOrigin,
  normalizeTrustedOrigin,
  safeSameOriginPath,
  trustedAppOriginForRequest,
} from "../../lib/auth/redirects.ts";

const APP_ORIGIN = "https://roducq.nanexi.com";
const FALLBACK = "/intake";

describe("same-origin redirect validation", () => {
  it("preserves safe internal paths, query strings, fragments, and invite links", () => {
    for (const path of [
      "/intake",
      "/dashboard?tab=activity#recent",
      "/invite/01234567-89ab-cdef-0123-456789abcdef",
    ]) {
      assert.equal(safeSameOriginPath(path, APP_ORIGIN, FALLBACK), path);
    }
  });

  it("rejects external, scheme-relative, and literal backslash destinations", () => {
    for (const path of [
      "https://attacker.example/login",
      "//attacker.example/login",
      "/\\attacker.example/login",
      "/\\\\attacker.example/login",
      "javascript:alert(1)",
      "",
    ]) {
      assert.equal(safeSameOriginPath(path, APP_ORIGIN, FALLBACK), FALLBACK, path);
    }
  });

  it("rejects encoded and multiply-encoded backslashes after query parsing", () => {
    const queryValue = new URLSearchParams(
      "next=%2F%5C%5Cattacker.example%2Flogin"
    ).get("next");
    assert.equal(queryValue, "/" + "\\\\" + "attacker.example/login");
    assert.equal(safeSameOriginPath(queryValue, APP_ORIGIN, FALLBACK), FALLBACK);

    assert.equal(
      safeSameOriginPath("/%5c%5cattacker.example", APP_ORIGIN, FALLBACK),
      FALLBACK
    );
    assert.equal(
      safeSameOriginPath("/%255c%255cattacker.example", APP_ORIGIN, FALLBACK),
      FALLBACK
    );
    assert.equal(
      safeSameOriginPath("/%255c%zz", APP_ORIGIN, FALLBACK),
      FALLBACK,
      "malformed escapes must not conceal a multiply-encoded backslash"
    );
  });

  it("requires a valid trusted HTTP(S) origin and verifies the normalized destination origin", () => {
    assert.equal(normalizeTrustedOrigin("https://roducq.nanexi.com/path"), APP_ORIGIN);
    assert.equal(normalizeTrustedOrigin("roducq.nanexi.com"), APP_ORIGIN);
    assert.equal(normalizeTrustedOrigin("javascript:alert(1)"), null);
    assert.equal(normalizeTrustedOrigin("https://user@roducq.nanexi.com"), null);
    assert.equal(
      safeSameOriginPath("/\\attacker.example", "not a trusted origin", FALLBACK),
      FALLBACK
    );
  });
});

describe("trusted application origin selection", () => {
  const configured = [
    "https://roducq.nanexi.com",
    "preview-123.vercel.app",
  ];

  it("accepts a request origin only when deployment configuration allowlists it", () => {
    assert.equal(
      isTrustedAppRequestOrigin(
        "https://preview-123.vercel.app/auth/callback",
        configured,
        APP_ORIGIN
      ),
      true
    );
    assert.equal(
      trustedAppOriginForRequest(
        "https://preview-123.vercel.app/auth/callback?code=secret",
        configured,
        APP_ORIGIN
      ),
      "https://preview-123.vercel.app"
    );
  });

  it("does not trust an unconfigured client-supplied Host origin", () => {
    assert.equal(
      isTrustedAppRequestOrigin(
        "https://attacker.example/auth/callback",
        configured,
        APP_ORIGIN
      ),
      false
    );
    assert.equal(
      trustedAppOriginForRequest(
        "https://attacker.example/auth/callback?code=secret",
        configured,
        APP_ORIGIN
      ),
      APP_ORIGIN
    );
    assert.equal(
      trustedAppOriginForRequest("not a URL", configured, APP_ORIGIN),
      APP_ORIGIN
    );
  });
});
