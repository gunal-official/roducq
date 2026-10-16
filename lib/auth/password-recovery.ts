/**
 * Password recovery (Supabase Auth) — pure, testable helpers.
 *
 * RoduCQ never implements its own reset tokens and never stores passwords:
 * Supabase emails a recovery link, the existing PKCE callback
 * (app/auth/callback) exchanges its code for a session, and the new
 * password is set with `supabase.auth.updateUser({ password })` from a
 * server action that first proves a recovery grant (see
 * lib/auth/recovery-grant.ts). This module holds only the decisions that
 * can be unit-tested without a network: validation, redirect-URL
 * construction/allowlisting, neutral (anti-enumeration) messaging,
 * recovery-link error parsing, and recovery-session (AMR) detection.
 *
 * SECURITY: nothing here logs or returns passwords, codes, or tokens.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Shown after every well-formed reset request, registered or not. */
export const NEUTRAL_CONFIRMATION =
  "If an account exists for that email, you'll receive a password reset link.";

export const RESET_PASSWORD_PATH = "/reset-password";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** How long a recovery grant (and a recovery AMR claim) stays usable. */
export const RECOVERY_GRANT_TTL_MS = 30 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;

export const PASSWORD_REQUIREMENTS =
  "Use at least 8 characters, including a letter and a number.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecoveryEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (value.length > 254 || !EMAIL_RE.test(value)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (!password) return "Enter a new password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 72) return "Password must be 72 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return PASSWORD_REQUIREMENTS;
  }
  return null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): string | null {
  if (!confirmation) return "Confirm your new password.";
  if (confirmation !== password) return "Passwords don't match.";
  return null;
}

/** Same-site absolute paths only — never `//host`, never a scheme. */
export function isSafeSameSitePath(value: string | null): boolean {
  return Boolean(
    value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
  );
}

export function safeSameSitePath(
  value: string | null,
  fallback = "/login"
): string {
  return isSafeSameSitePath(value) ? (value as string) : fallback;
}

/**
 * The `redirectTo` handed to Supabase for the recovery email. Built from
 * the caller's own origin (never hardcoded, so production mail never
 * points at localhost) and always lands on the server callback, which
 * exchanges the PKCE code before any page sees a session, then forwards
 * to /reset-password with a recovery grant cookie. The operator must
 * allowlist this exact URL shape in Supabase (see
 * docs/password-recovery-implementation.md).
 */
export function buildPasswordResetRedirectTo(origin: string): string | null {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const base = `${url.protocol}//${url.host}`;
  const callback = new URL(AUTH_CALLBACK_PATH, base);
  callback.searchParams.set("next", RESET_PASSWORD_PATH);
  callback.searchParams.set("recovery", "1");
  return callback.toString();
}

/** The Supabase call, isolated so tests can assert its exact shape. */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  origin: string
) {
  const redirectTo = buildPasswordResetRedirectTo(origin);
  if (!redirectTo) {
    return {
      data: {},
      error: { message: "Invalid application origin.", code: "invalid_origin" },
    };
  }
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
}

export type ResetRequestOutcome =
  | { kind: "sent" }
  | { kind: "rate_limited"; message: string }
  | { kind: "unavailable"; message: string };

/**
 * Maps a Supabase reset-request error to what the UI may say. Deliberately
 * never reveals whether the address is registered: ordinary failures
 * still end at the neutral confirmation upstream; only rate limiting and
 * transport failure get distinct (existence-agnostic) messages.
 */
export function mapResetRequestError(
  error: { message?: string; code?: string; status?: number } | null
): ResetRequestOutcome {
  if (!error) return { kind: "sent" };
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (
    error.status === 429 ||
    text.includes("rate") ||
    text.includes("too many")
  ) {
    return {
      kind: "rate_limited",
      message:
        "Too many reset requests right now. Please wait a few minutes and try again.",
    };
  }
  if (
    text.includes("fetch") ||
    text.includes("network") ||
    text.includes("failed to")
  ) {
    return {
      kind: "unavailable",
      message:
        "We couldn't reach the sign-in service. Check your connection and try again.",
    };
  }
  // Unknown provider errors collapse to the neutral confirmation so the
  // response can never be used to enumerate accounts.
  return { kind: "sent" };
}

/** Maps a failed updateUser call to a safe, user-facing message. */
export function mapPasswordUpdateError(
  error: { message?: string; code?: string } | null
): string {
  if (!error) return "Your password has been updated.";
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (text.includes("different from the old") || text.includes("same_password")) {
    return "Choose a password that's different from your current one.";
  }
  if (
    text.includes("weak") ||
    text.includes("password should") ||
    text.includes("at least")
  ) {
    return `That password is too weak. ${PASSWORD_REQUIREMENTS}`;
  }
  if (text.includes("session") || text.includes("not authenticated")) {
    return "This reset link has expired. Request a new one and try again.";
  }
  return "We couldn't update your password. Request a new reset link and try again.";
}

export type RecoveryLinkError = "expired" | "invalid" | null;

/**
 * Interprets the error parameters Supabase appends when a recovery link
 * is expired, already used, or denied — from either the query string
 * (PKCE/server flow) or the fragment (implicit flow). Values only; token
 * parameters in the same URL are never read or returned.
 */
export function parseRecoveryLinkError(input: {
  search?: string | null;
  hash?: string | null;
}): RecoveryLinkError {
  const collect = (raw: string | null | undefined) => {
    if (!raw) return new URLSearchParams();
    try {
      return new URLSearchParams(raw.replace(/^[?#]/, ""));
    } catch {
      return new URLSearchParams();
    }
  };
  for (const params of [collect(input.search), collect(input.hash)]) {
    const code = params.get("error_code");
    const error = params.get("error");
    if (code === "otp_expired" || code === "otp_disabled") return "expired";
    if (error || code) return "invalid";
  }
  return null;
}

/** True when a URL fragment is a Supabase recovery payload. */
export function hashDeclaresRecovery(hash: string | null): boolean {
  if (!hash) return false;
  return new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
}

type AmrEntry = { method?: string; timestamp?: number };

/**
 * Detects a session that was minted by a recovery (OTP) link rather than
 * by a password/OAuth sign-in, from the access token's AMR claim. The
 * token itself is only decoded (its authenticity is established by the
 * caller's `supabase.auth.getUser()`), never logged or returned.
 */
export function sessionHasRecoveryAmr(
  accessToken: string | null | undefined,
  now: number = Date.now()
): boolean {
  if (!accessToken) return false;
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json =
      typeof atob === "function"
        ? decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
              .join("")
          )
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { amr?: AmrEntry[] };
    if (!Array.isArray(payload.amr)) return false;
    return payload.amr.some((entry) => {
      if (entry.method !== "otp" && entry.method !== "recovery") return false;
      if (typeof entry.timestamp !== "number") return true;
      const claimedAt = entry.timestamp * 1000;
      return claimedAt <= now && now - claimedAt <= RECOVERY_GRANT_TTL_MS;
    });
  } catch {
    return false;
  }
}
