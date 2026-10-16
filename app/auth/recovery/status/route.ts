import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  RECOVERY_COOKIE,
  hasRecoveryGrant,
} from "@/lib/auth/recovery-grant";
import { createClient } from "@/lib/supabase/server";

/**
 * Answers one boolean for the reset page: does the current session carry
 * recovery proof (grant cookie or recovery AMR)? Returns no user data,
 * no tokens, and is useless for enumeration (signed-out = false).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ recovery: false });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const cookieStore = await cookies();

  return NextResponse.json({
    recovery: hasRecoveryGrant({
      cookieValue: cookieStore.get(RECOVERY_COOKIE)?.value,
      accessToken: session?.access_token,
    }),
  });
}
