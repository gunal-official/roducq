import Link from "next/link";

import { FOOTER } from "@/app/(marketing)/home/content";
import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";

/**
 * Marketing footer — the reference's quiet closing band.
 *
 * The reference footer is deliberately small: a mark, a one-line tagline,
 * a couple of short link columns and a legal line. It is not a sitemap.
 * This matches that, with two roducq-specific additions that stay because
 * they carry information rather than bulk:
 *
 *   • the limits line, so the "no e-signature, no payment collection"
 *     contract appears at the bottom of the page too, not only in the
 *     closing band;
 *   • the stack line, which the repo's existing footer already published.
 *
 * EVERY LINK RESOLVES. The columns come from FOOTER.columns, which
 * tests/components/home.test.ts checks against the routes the app router
 * actually serves — a footer is the easiest place on a site to ship a 404.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-lm-border-soft bg-lm-canvas">
      <div className="lm-shell py-12 md:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          <div className="max-w-xs">
            <Link
              href="/"
              aria-label="roducq home"
              className="inline-flex min-h-11 items-center gap-2"
            >
              <RoduMark size={26} />
              <Wordmark className="font-lm-bold text-lm-18 tracking-[-0.02em] text-lm-ink" />
            </Link>
            <p className="mt-3.5 text-lm-12 leading-relaxed text-lm-muted-readable">
              {FOOTER.tagline}
            </p>
          </div>

          {FOOTER.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
                {column.title}
              </p>
              <ul className="mt-3.5 flex flex-col">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 min-w-11 items-center text-lm-14 text-lm-muted-readable transition-colors hover:text-lm-ink-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
              Limits
            </p>
            <p className="mt-3.5 text-lm-12 leading-relaxed text-lm-muted-readable">
              {FOOTER.limits}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-1.5 border-t border-lm-border-soft pt-6.5 text-lm-12 text-lm-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{FOOTER.legal}</p>
          <p>{FOOTER.built}</p>
        </div>
      </div>
    </footer>
  );
}
