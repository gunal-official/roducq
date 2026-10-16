import Link from "next/link";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";

/**
 * Shared visual frame for /login, /signup, and /onboarding (Forma
 * Phase B): the brand, then a single raised card that holds the form.
 *
 * The card is the only thing that moves — it rises in once, and
 * everything inside it stays still so nothing competes with the task of
 * signing in.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-[420px]">
      <Link
        href="/"
        aria-label="RoduCQ home"
        className="mb-8 inline-flex min-h-11 min-w-11 items-center gap-2.5"
      >
        <RoduMark size={32} animated />
        <Wordmark className="text-xl" />
      </Link>

      <div className="relative">
        <span
          aria-hidden="true"
          className="auth-card-glow pointer-events-none absolute -top-10 inset-x-0 h-32"
        />
        <div className="relative rounded-surface border border-border bg-card p-6 shadow-card animate-forma-rise sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-text">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      {footer ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {footer}
        </p>
      ) : null}
    </div>
  );
}
