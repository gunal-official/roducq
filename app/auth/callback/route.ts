import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth return leg (Google today; any future provider goes through the
 * same seam). `signInWithGoogle` (lib/auth/oauth.ts) sends the browser to
 * Google with `redirectTo` pointed HERE — never at a bare page — because
 * the PKCE code in `?code=` has to be exchanged for a session server-side
 * before any page load can see a logged-in user. Land the code on an
 * ordinary page instead and the browser client never redeems it: the
 * request has no session yet, the proxy's `isAppPath` guard (see
 * lib/supabase/middleware.ts) treats the visitor as signed out, and it
 * bounces straight back to /login — the infinite loop this route exists
 * to prevent.
 *
 * `next` is the same-site landing path the caller wants after a
 * successful exchange (e.g. `/intake`, or an `/invite/:token` deep link);
 * it is re-validated here (defense in depth — the query string is
 * attacker-controlled even though every caller already guards it before
 * building the redirect URL).
 */

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeNext(url.searchParams.get("next"));

  // The provider's own cancel/deny path lands here without a code.
  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Session cookies are set. If the user has no workspace yet (brand new
  // Google sign-up), the (app) layout redirects to /onboarding itself —
  // this route doesn't need to know which case it is.
  return NextResponse.redirect(`${origin}${next}`);
}
