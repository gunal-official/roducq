"use server";

import { cookies } from "next/headers";

import {
  mapPasswordUpdateError,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/password-recovery";
import {
  RECOVERY_COOKIE,
  hasRecoveryGrant,
} from "@/lib/auth/recovery-grant";
import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordResult = { error: string } | { success: true };

/**
 * Sets a new password — only behind recovery proof. A normal signed-in
 * session is NOT enough: the request must carry the recovery-grant
 * cookie bound to this session (set by the auth callback when it
 * exchanged a recovery code), or a session whose AMR claim shows it was
 * minted by a recovery link. The password goes straight to Supabase
 * (`updateUser`); it is never stored or logged by RoduCQ, and the grant
 * is consumed on success so it cannot be replayed.
 */
export async function updatePasswordAction(input: {
  password: string;
  confirmation: string;
}): Promise<UpdatePasswordResult> {
  const passwordError = validateNewPassword(input.password ?? "");
  if (passwordError) return { error: passwordError };
  const confirmationError = validatePasswordConfirmation(
    input.password,
    input.confirmation ?? ""
  );
  if (confirmationError) return { error: confirmationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "This reset link has expired. Request a new one and try again.",
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const cookieStore = await cookies();
  const granted = hasRecoveryGrant({
    cookieValue: cookieStore.get(RECOVERY_COOKIE)?.value,
    accessToken: session?.access_token,
  });
  if (!granted) {
    return {
      error:
        "This page needs a password reset link. Request one from the sign-in page and open the link in this browser.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.password,
  });
  if (error) return { error: mapPasswordUpdateError(error) };

  // Single-purpose grant: consume it so the same link/session cannot
  // change the password twice.
  cookieStore.delete(RECOVERY_COOKIE);
  return { success: true };
}
