"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { ConfigNotice } from "@/components/auth/ConfigNotice";
import { Button } from "@/components/ui/button";
import {
  NEUTRAL_CONFIRMATION,
  mapResetRequestError,
  requestPasswordReset,
  validateRecoveryEmail,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Forgot password: asks Supabase to email a recovery link. The response
 * is deliberately neutral — whether or not the address is registered,
 * the same confirmation shows (no account enumeration). Supabase owns
 * token generation, expiry, single-use, and its own rate limits; nothing
 * about the account, and no credential, is logged here.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured || pending) return;

    const validationError = validateRecoveryEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setPending(true);

    try {
      const { error: resetError } = await requestPasswordReset(
        createClient(),
        email,
        window.location.origin
      );
      const outcome = mapResetRequestError(resetError);
      if (outcome.kind === "rate_limited" || outcome.kind === "unavailable") {
        setError(outcome.message);
      } else {
        setSent(true);
      }
    } catch {
      setError(
        "We couldn't reach the sign-in service. Check your connection and try again."
      );
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="Password reset"
        footer={
          <>
            Remembered it?{" "}
            <Link
              href="/login"
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
            >
              Back to sign in
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <p role="status" className="text-sm leading-relaxed text-text">
            {NEUTRAL_CONFIRMATION}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The link expires after a short time and can be used once. If it
            doesn&apos;t arrive, check spam, then request another link.
          </p>
          <Button asChild size="lg" className="h-12 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="min-h-11 w-full text-sm font-semibold text-accent hover:underline"
          >
            Use a different email
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your account email and we'll send you a secure reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-semibold text-accent hover:underline"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      {!configured && <ConfigNotice />}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "forgot-email-error" : undefined}
        />

        {error ? (
          <p
            id="forgot-email-error"
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
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
