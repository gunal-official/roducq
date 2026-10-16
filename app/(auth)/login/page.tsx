"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Lock, Mail } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { ConfigNotice } from "@/components/auth/ConfigNotice";
import { GoogleSignInButton, OAuthDivider } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Reads ?next=, so it must sit behind a Suspense boundary (Next 14
 * prerendering rule) — the exported page is just the wrapper.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Surfaces a failed /auth/callback exchange (expired/replayed code,
  // provider denial) instead of silently dropping the user back here.
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "oauth"
      ? "Google sign-in didn’t complete — please try again."
      : null
  );
  const passwordUpdated = searchParams.get("reset") === "success";
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  // Where to land after login — used by the /invite flow (Step 15).
  // Open-redirect guard: same-site absolute paths only, never "//host".
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/intake";

  // If we got here from an invite link, keep the token on the way to
  // signup so a brand-new invitee doesn't lose it.
  const inviteMatch = next.match(/^\/invite\/([0-9a-f-]{36})$/i);
  const signupHref = inviteMatch
    ? `/signup?invite=${inviteMatch[1]}`
    : "/signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;

    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    // Session cookie is already set by the browser client; middleware and
    // server components will pick it up.
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back to your workspace."
      footer={
        <>
          Don’t have an account?{" "}
          <Link
            href={signupHref}
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      {!configured && <ConfigNotice />}

      <div className="mb-6">
        <GoogleSignInButton next={next} />
        <div className="mt-4">
          <OAuthDivider />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          required
          autoComplete="email"
          placeholder="you@studio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <AuthField
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1 flex justify-end">
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {passwordUpdated ? (
          <p
            role="status"
            className="rounded-control border border-border bg-muted px-3 py-2.5 text-sm text-text"
          >
            Password updated — sign in with your new password.
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
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
