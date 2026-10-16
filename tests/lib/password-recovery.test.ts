/**
 * Password recovery helpers (lib/auth/password-recovery.ts +
 * lib/auth/recovery-grant.ts). Supabase is mocked — no real reset emails.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  NEUTRAL_CONFIRMATION,
  buildPasswordResetRedirectTo,
  hashDeclaresRecovery,
  isSafeSameSitePath,
  mapPasswordUpdateError,
  mapResetRequestError,
  parseRecoveryLinkError,
  requestPasswordReset,
  safeSameSitePath,
  sessionHasRecoveryAmr,
  validateNewPassword,
  validatePasswordConfirmation,
  validateRecoveryEmail,
} from "../../lib/auth/password-recovery.ts";
import {
  createRecoveryGrantValue,
  hasRecoveryGrant,
  verifyRecoveryGrantValue,
} from "../../lib/auth/recovery-grant.ts";

function fakeClient(result: unknown) {
  const calls: unknown[] = [];
  const client = {
    auth: {
      resetPasswordForEmail(...args: unknown[]) {
        calls.push(args);
        return Promise.resolve(result);
      },
    },
  };
  return { client, calls };
}

function jwt(payload: Record<string, unknown>): string {
  const enc = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.signature`;
}

describe("forgot-password validation", () => {
  it("requires an email and rejects malformed addresses", () => {
    assert.match(validateRecoveryEmail("")!, /Enter your email/);
    assert.match(validateRecoveryEmail("not-an-email")!, /valid email/);
    assert.match(validateRecoveryEmail("a@b")!, /valid email/);
    assert.equal(validateRecoveryEmail("  user@example.com "), null);
  });
});

describe("neutral confirmation (no account enumeration)", () => {
  it("uses the exact neutral wording", () => {
    assert.equal(
      NEUTRAL_CONFIRMATION,
      "If an account exists for that email, you'll receive a password reset link."
    );
  });
  it("collapses unknown provider errors to sent (neutral)", () => {
    assert.deepEqual(mapResetRequestError({ message: "User not found" }), {
      kind: "sent",
    });
    assert.deepEqual(mapResetRequestError(null), { kind: "sent" });
  });
  it("surfaces rate limiting and network failure without leaking existence", () => {
    assert.equal(
      mapResetRequestError({ status: 429, message: "rate limit" }).kind,
      "rate_limited"
    );
    assert.equal(
      mapResetRequestError({ message: "Failed to fetch" }).kind,
      "unavailable"
    );
  });
});

describe("Supabase reset request + redirect URL construction", () => {
  it("calls resetPasswordForEmail with the callback redirectTo", async () => {
    const { client, calls } = fakeClient({ data: {}, error: null });
    await requestPasswordReset(
      client as never,
      " user@example.com ",
      "https://roducq.nanexi.com"
    );
    assert.deepEqual(calls, [
      [
        "user@example.com",
        {
          redirectTo:
            "https://roducq.nanexi.com/auth/callback?next=%2Freset-password&recovery=1",
        },
      ],
    ]);
  });
  it("builds the redirect from the caller's origin, never localhost by default", () => {
    assert.match(
      buildPasswordResetRedirectTo("https://roducq.nanexi.com")!,
      /^https:\/\/roducq\.nanexi\.com\/auth\/callback\?/
    );
    assert.match(
      buildPasswordResetRedirectTo("http://localhost:3000")!,
      /^http:\/\/localhost:3000\/auth\/callback\?/
    );
  });
  it("rejects unsafe origins", () => {
    assert.equal(buildPasswordResetRedirectTo("not a url"), null);
    assert.equal(buildPasswordResetRedirectTo("javascript:alert(1)"), null);
    assert.equal(buildPasswordResetRedirectTo("https://user@example.com"), null);
  });
});

describe("redirect allowlisting (open-redirect prevention)", () => {
  it("only allows same-site absolute paths", () => {
    assert.equal(isSafeSameSitePath("/reset-password"), true);
    assert.equal(isSafeSameSitePath("//evil.example.com"), false);
    assert.equal(isSafeSameSitePath("https://evil.example.com"), false);
    assert.equal(isSafeSameSitePath("/\\evil"), false);
    assert.equal(safeSameSitePath("//evil.example.com"), "/login");
    assert.equal(safeSameSitePath("/intake"), "/intake");
  });
});

describe("password strength + confirmation", () => {
  it("enforces length, letter+number, and the 72-char ceiling", () => {
    assert.match(validateNewPassword("")!, /Enter a new/);
    assert.match(validateNewPassword("abc123")!, /at least 8/);
    assert.match(validateNewPassword("abcdefgh")!, /letter and a number/);
    assert.match(validateNewPassword("12345678")!, /letter and a number/);
    assert.match(validateNewPassword(`a1${"x".repeat(71)}`)!, /72/);
    assert.equal(validateNewPassword("correct-horse-9"), null);
  });
  it("requires a matching confirmation", () => {
    assert.match(validatePasswordConfirmation("abcd1234", "")!, /Confirm/);
    assert.match(validatePasswordConfirmation("abcd1234", "abcd1235")!, /match/);
    assert.equal(validatePasswordConfirmation("abcd1234", "abcd1234"), null);
  });
  it("maps update errors to safe messages", () => {
    assert.match(
      mapPasswordUpdateError({ message: "Password should be stronger" }),
      /too weak/
    );
    assert.match(
      mapPasswordUpdateError({ message: "New password should be different from the old password." }),
      /different/
    );
    assert.doesNotMatch(
      mapPasswordUpdateError({ message: "internal stack xyz" }),
      /internal stack/
    );
  });
});

describe("expired / invalid recovery links", () => {
  it("detects otp_expired in query and fragment", () => {
    assert.equal(
      parseRecoveryLinkError({ search: "?error_code=otp_expired" }),
      "expired"
    );
    assert.equal(
      parseRecoveryLinkError({ hash: "#error=access_denied&error_code=otp_expired" }),
      "expired"
    );
    assert.equal(parseRecoveryLinkError({ search: "?error=access_denied" }), "invalid");
    assert.equal(parseRecoveryLinkError({ search: "?next=/x" }), null);
    assert.equal(parseRecoveryLinkError({}), null);
  });
  it("recognises implicit recovery fragments without reading tokens", () => {
    assert.equal(hashDeclaresRecovery("#access_token=secret&type=recovery"), true);
    assert.equal(hashDeclaresRecovery("#type=magiclink"), false);
    assert.equal(hashDeclaresRecovery(null), false);
  });
});

describe("recovery session validation", () => {
  const now = 1_760_000_000_000;
  it("accepts a fresh OTP/recovery AMR claim and rejects password sessions", () => {
    const recovery = jwt({ amr: [{ method: "otp", timestamp: now / 1000 }] });
    const password = jwt({
      amr: [{ method: "password", timestamp: now / 1000 }],
    });
    assert.equal(sessionHasRecoveryAmr(recovery, now), true);
    assert.equal(sessionHasRecoveryAmr(password, now), false);
    assert.equal(sessionHasRecoveryAmr("not-a-jwt", now), false);
    assert.equal(sessionHasRecoveryAmr(null, now), false);
  });
  it("rejects stale recovery AMR claims", () => {
    const stale = jwt({
      amr: [{ method: "otp", timestamp: now / 1000 - 3600 }],
    });
    assert.equal(sessionHasRecoveryAmr(stale, now), false);
  });

  it("grant cookie is bound to the session token and expires", () => {
    const value = createRecoveryGrantValue("token-a", now);
    assert.equal(verifyRecoveryGrantValue(value, "token-a", now), true);
    // A different (normal) session cannot reuse the grant.
    assert.equal(verifyRecoveryGrantValue(value, "token-b", now), false);
    // Tampering and expiry fail closed.
    assert.equal(
      verifyRecoveryGrantValue(value.replace(/\d+/, "99999999999999"), "token-a", now),
      false
    );
    assert.equal(
      verifyRecoveryGrantValue(value, "token-a", now + 31 * 60 * 1000),
      false
    );
    assert.equal(verifyRecoveryGrantValue(null, "token-a", now), false);
  });

  it("hasRecoveryGrant accepts grant or recovery-AMR, nothing else", () => {
    const grant = createRecoveryGrantValue("token-a", now);
    assert.equal(
      hasRecoveryGrant({ cookieValue: grant, accessToken: "token-a", now }),
      true
    );
    const recoveryJwt = jwt({
      amr: [{ method: "recovery", timestamp: now / 1000 }],
    });
    assert.equal(
      hasRecoveryGrant({ cookieValue: null, accessToken: recoveryJwt, now }),
      true
    );
    const passwordJwt = jwt({
      amr: [{ method: "password", timestamp: now / 1000 }],
    });
    assert.equal(
      hasRecoveryGrant({ cookieValue: null, accessToken: passwordJwt, now }),
      false
    );
    // Unauthenticated: no session at all.
    assert.equal(
      hasRecoveryGrant({ cookieValue: null, accessToken: null, now }),
      false
    );
  });
});
