import Link from "next/link";

/**
 * Shared marketing footer (Step 13): small and unobtrusive — logo, the
 * public route set, and a one-line tagline restate.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex min-h-11 min-w-11 items-center font-display text-sm font-bold text-text">
            rodu<span className="text-accent">cq</span>
          </Link>
          <Link href="/about" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-text">
            About
          </Link>
          <Link href="/pricing" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-text">
            Pricing
          </Link>
          <Link href="/vs" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-text">
            Compare
          </Link>
          <Link href="/login" className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-text">
            Log in
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 roducq — client-work writing studio: intake → briefs →
          proposals → plans → updates.
        </p>
      </div>
    </footer>
  );
}
