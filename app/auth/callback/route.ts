import { NextResponse } from "next/server";

import { parseRecoveryLinkError } from "@/lib/auth/password-recovery";
import {
  isTrustedAppRequestOrigin,
  safeSameOriginPath,
  trustedAppOriginForRequest,
} from "@/lib/auth/redirects";
import {
  RECOVERY_COOKIE,
  createRecoveryGrantValue,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-grant";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + password-recovery return leg. `signInWithGoogle`
 * (lib/auth/oauth.ts) and the recovery email (lib/auth/password-recovery.ts)
 * both send the browser here — never at a bare page — because the PKCE
 * code in `?code=` has to be exchanged for a session server-side before
 * any page load can see a logged-in user.
 *
 * Recovery: the reset email's redirectTo carries `recovery=1&next=
 * /reset-password`. After a successful exchange this route sets the
 * recovery-grant cookie (lib/auth/recovery-grant.ts) — the proof the
 * reset page's server action requires before it will update a password —
 * and lands on /reset-password. Expired/already-used links (Supabase
 * appends error/error_code instead of a code) land on /reset-password
 * with a generic expired flag; no code or token is ever logged.
 *
 * `next` is the same-origin landing path the caller wants after a
 * successful exchange. It is validated against a deployment-configured
 * origin; request Host is only accepted when it matches a configured
 * application origin. A recovery request always lands on /reset-password
 * regardless of `next`.
 */

export const dynamic = "force-dynamic";

function callbackRedirect(
  origin: string,
  pathname: string,
  error?: "oauth" | "expired" | "invalid"
) {
  const destination = new URL(pathname, origin);
  if (error) destination.searchParams.set("error", error);
  return NextResponse.redirect(destination);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // request.url may reflect a client-controlled Host header. The helper only
  // accepts its origin when it matches deployment-controlled configuration.
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];
  const fallbackOrigin = getSiteUrl();
  const origin = trustedAppOriginForRequest(
    request.url,
    configuredOrigins,
    fallbackOrigin
  );
  const isRecovery = url.searchParams.get("recovery") === "1";
  if (
    !isTrustedAppRequestOrigin(request.url, configuredOrigins, fallbackOrigin)
  ) {
    return isRecovery
      ? callbackRedirect(origin, "/reset-password", "invalid")
      : callbackRedirect(origin, "/login", "oauth");
  }

  // Recovery routing has priority over the untrusted `next` query parameter.
  const next = isRecovery
    ? "/reset-password"
    : safeSameOriginPath(url.searchParams.get("next"), origin, "/dashboard");

  // The provider's own cancel/deny path, and expired/used recovery links,
  // land here without a code.
  if (url.searchParams.get("error") || url.searchParams.get("error_code")) {
    if (isRecovery || parseRecoveryLinkError({ search: url.search })) {
      const kind = parseRecoveryLinkError({ search: url.search }) ?? "invalid";
      return callbackRedirect(
        origin,
        "/reset-password",
        kind === "expired" ? "expired" : "invalid"
      );
    }
    return callbackRedirect(origin, "/login", "oauth");
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return isRecovery
      ? callbackRedirect(origin, "/reset-password", "invalid")
      : callbackRedirect(origin, "/login", "oauth");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return isRecovery
      ? callbackRedirect(origin, "/reset-password", "expired")
      : callbackRedirect(origin, "/login", "oauth");
  }

  const response = NextResponse.redirect(new URL(next, origin));

  // Bind the grant to this exact recovery session (see recovery-grant.ts).
  if (isRecovery && data.session?.access_token) {
    response.cookies.set(
      RECOVERY_COOKIE,
      createRecoveryGrantValue(data.session.access_token),
      {
        ...recoveryCookieOptions,
        secure: new URL(origin).protocol === "https:",
      }
    );
  }

  // Session cookies are set. If the user has no workspace yet (brand new
  // Google sign-up), the (app) layout redirects to /onboarding itself —
  // this route doesn't need to know which case it is.
  return response;
}
