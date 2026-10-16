import { NextResponse } from "next/server";

import { sessionHasRecoveryAmr } from "@/lib/auth/password-recovery";
import {
  RECOVERY_COOKIE,
  createRecoveryGrantValue,
  recoveryCookieOptions,
} from "@/lib/auth/recovery-grant";
import { createClient } from "@/lib/supabase/server";

/**
 * Mints a recovery-grant cookie for sessions that were established in
 * the browser (implicit `#type=recovery` links, or a PKCE code the
 * operator's Supabase redirect configuration sends straight to
 * /reset-password). It only succeeds when the verified session's AMR
 * claim proves the session itself came from a recovery/OTP link — a
 * normal password/OAuth session gets a 403 and no cookie.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ recovery: false }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || !sessionHasRecoveryAmr(session.access_token)) {
    return NextResponse.json({ recovery: false }, { status: 403 });
  }

  const response = NextResponse.json({ recovery: true });
  response.cookies.set(
    RECOVERY_COOKIE,
    createRecoveryGrantValue(session.access_token),
    {
      ...recoveryCookieOptions,
      secure: new URL(request.url).protocol === "https:",
    }
  );
  return response;
}
