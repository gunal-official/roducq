/**
 * Recovery grant — server-only proof that the current session arrived
 * through a Supabase password-recovery link.
 *
 * Why this exists: exchanging a recovery code produces an ordinary
 * session cookie, so "is signed in" alone must NOT be enough to set a
 * new password on /reset-password (that would turn any stolen/live
 * session into a password-change bypass). When the auth callback
 * exchanges a code that arrived via the recovery redirect, it sets this
 * short-lived, httpOnly cookie whose value is an HMAC bound to that
 * exact session's access token. The password-update server action
 * re-verifies the HMAC against the *current* session token, so a grant
 * cannot be replayed under a different session, forged without the
 * session token, or reused after it expires. The cookie contains no
 * password, code, or token — only an expiry and its MAC.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  RECOVERY_GRANT_TTL_MS,
  sessionHasRecoveryAmr,
} from "./password-recovery.ts";

export const RECOVERY_COOKIE = "roducq-pw-recovery";

function mac(expiresAt: number, accessToken: string): string {
  return createHmac("sha256", accessToken)
    .update(`roducq-pw-recovery:${expiresAt}`)
    .digest("base64url");
}

export function createRecoveryGrantValue(
  accessToken: string,
  now: number = Date.now()
): string {
  const expiresAt = now + RECOVERY_GRANT_TTL_MS;
  return `${expiresAt}.${mac(expiresAt, accessToken)}`;
}

export function verifyRecoveryGrantValue(
  value: string | null | undefined,
  accessToken: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!value || !accessToken) return false;
  const [expiresRaw, signature, ...rest] = value.split(".");
  if (rest.length > 0 || !expiresRaw || !signature) return false;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const expected = mac(expiresAt, accessToken);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/**
 * The gate used by every server-side recovery check: a valid grant
 * cookie bound to this session, OR a session whose AMR claim shows it
 * was itself minted by a recovery/OTP link (the direct-to-/reset-password
 * and implicit-link configurations, where no callback cookie exists).
 */
export function hasRecoveryGrant(input: {
  cookieValue?: string | null;
  accessToken?: string | null;
  now?: number;
}): boolean {
  const now = input.now ?? Date.now();
  return (
    verifyRecoveryGrantValue(input.cookieValue, input.accessToken, now) ||
    sessionHasRecoveryAmr(input.accessToken, now)
  );
}

export const recoveryCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(RECOVERY_GRANT_TTL_MS / 1000),
};
