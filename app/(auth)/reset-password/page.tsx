"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import { updatePasswordAction } from "@/app/(auth)/reset-password/actions";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { ConfigNotice } from "@/components/auth/ConfigNotice";
import { Button } from "@/components/ui/button";
import {
  PASSWORD_REQUIREMENTS,
  hashDeclaresRecovery,
  parseRecoveryLinkError,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Phase =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "link-error"; message: string }
  | { kind: "done" };

const EXPIRED_MESSAGE =
  "This reset link has expired or has already been used. Request a new one and try again.";
const INVALID_MESSAGE =
  "This reset link isn't valid. Request a new one and try again.";
const MISSING_MESSAGE =
  "We couldn't confirm a password reset for this browser. Open the link from your reset email in this browser, or request a new one.";

/**
 * Reset password. A new password can only be submitted after a valid
 * recovery session is established, in whichever shape Supabase delivered
 * it:
 *  - PKCE via /auth/callback (primary): session + grant cookie exist;
 *    confirmed through GET /auth/recovery/status.
 *  - Implicit `#type=recovery` links and codes sent straight here:
 *    the browser client establishes the session, then POST
 *    /auth/recovery/claim mints the grant (the server only accepts
 *    sessions whose AMR proves a recovery sign-in).
 * The final update runs in a server action that re-checks the grant, so
 * editing client state can never unlock the update. Link fragments and
 * codes are stripped from the address bar and never logged.
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const configured = isSupabaseConfigured();
  const [phase, setPhase] = useState<Phase>(() => {
    if (!configured) return { kind: "link-error", message: MISSING_MESSAGE };
    if (searchParams.get("error")) {
      return {
        kind: "link-error",
        message:
          searchParams.get("error") === "expired"
            ? EXPIRED_MESSAGE
            : INVALID_MESSAGE,
      };
    }
    return { kind: "checking" };
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const settled = useRef(false);

  useEffect(() => {
    if (!configured) return;

    const linkError = parseRecoveryLinkError({
      search: window.location.search,
      hash: window.location.hash,
    });

    const supabase = createClient();
    const fromHash = hashDeclaresRecovery(window.location.hash);
    if (fromHash) {
      // Never leave recovery material in the address bar / history.
      window.history.replaceState(null, "", window.location.pathname);
    }

    const settle = (next: Phase) => {
      if (!settled.current) {
        settled.current = true;
        setPhase(next);
      }
    };

    async function confirmGrant(): Promise<boolean> {
      try {
        const status = await fetch("/auth/recovery/status");
        const body = (await status.json()) as { recovery?: boolean };
        if (body.recovery) return true;
        const claim = await fetch("/auth/recovery/claim", { method: "POST" });
        const claimed = (await claim.json().catch(() => ({}))) as {
          recovery?: boolean;
        };
        return Boolean(claimed.recovery);
      } catch {
        return false;
      }
    }

    async function resolveSession() {
      if (linkError) {
        settle({
          kind: "link-error",
          message: linkError === "expired" ? EXPIRED_MESSAGE : INVALID_MESSAGE,
        });
        return;
      }
      // A code delivered straight to this page (operator redirect
      // configuration) is exchanged here, then claimed server-side.
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        window.history.replaceState(null, "", window.location.pathname);
        if (exchangeError) {
          settle({ kind: "link-error", message: EXPIRED_MESSAGE });
          return;
        }
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        settle({ kind: "link-error", message: MISSING_MESSAGE });
        return;
      }
      const granted = await confirmGrant();
      settle(
        granted
          ? { kind: "ready" }
          : { kind: "link-error", message: MISSING_MESSAGE }
      );
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        void confirmGrant().then((granted) =>
          settle(
            granted
              ? { kind: "ready" }
              : { kind: "link-error", message: MISSING_MESSAGE }
          )
        );
      }
    });

    // Implicit links may take a tick to become a session; the auth event
    // above covers that case, while a direct resolve covers the rest.
    const timer = window.setTimeout(() => void resolveSession(), fromHash ? 600 : 0);
    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
    // searchParams is read once on mount; the link shape never changes.
  }, [configured]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || phase.kind !== "ready") return;

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    const confirmationError = validatePasswordConfirmation(
      password,
      confirmation
    );
    if (confirmationError) {
      setError(confirmationError);
      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await updatePasswordAction({ password, confirmation });
      if ("error" in result) {
        setError(result.error);
        setPending(false);
        return;
      }
      // End the recovery session: the user signs in fresh with the new
      // password, so a lingering recovery session grants nothing further.
      try {
        await createClient().auth.signOut();
      } catch {
        // The password is already updated; a failed sign-out only means
        // the login page may bounce an existing session into the app.
      }
      setPhase({ kind: "done" });
      setPending(false);
    } catch {
      setError(
        "We couldn't update your password. Check your connection and try again."
      );
      setPending(false);
    }
  }

  if (phase.kind === "done") {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Your new password is ready to use."
        footer={
          <Link
            href="/login"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <p role="status" className="text-sm leading-relaxed text-text">
            Your password has been updated. Sign in with your new password
            to continue.
          </p>
          <Button asChild size="lg" className="h-12 w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (phase.kind === "link-error") {
    return (
      <AuthCard
        title="Reset link problem"
        subtitle="That password reset link can't be used."
        footer={
          <Link
            href="/login"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <p
            role="alert"
            className="rounded-control border border-border bg-muted px-3 py-2.5 text-sm text-error"
          >
            {phase.message}
          </p>
          <Button asChild size="lg" className="h-12 w-full">
            <Link href="/forgot-password">Request another reset link</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a new password for your account."
      footer={
        <Link
          href="/login"
          className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {!configured && <ConfigNotice />}

      {phase.kind === "checking" ? (
        <p role="status" className="text-sm text-muted-foreground">
          Confirming your reset link…
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <AuthField
              id="new-password"
              label="New password"
              icon={Lock}
              type="password"
              required
              autoComplete="new-password"
              placeholder="8+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="password-requirements"
            />
            <p
              id="password-requirements"
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {PASSWORD_REQUIREMENTS}
            </p>
          </div>

          <AuthField
            id="confirm-password"
            label="Confirm new password"
            icon={Lock}
            type="password"
            required
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />

          {password && confirmation && password !== confirmation ? (
            <p role="alert" className="text-sm text-error">
              Passwords don&apos;t match.
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-control border border-border bg-muted px-3 py-2.5 text-sm text-error"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={pending || !configured}
          >
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
