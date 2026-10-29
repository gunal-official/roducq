import Link from "next/link";
import { ArrowUp } from "lucide-react";

import { FOOTER } from "@/app/(marketing)/home/content";
import { HOME_FOOTER_CTA } from "@/app/(marketing)/home/chrome-content";
import { FooterAccountCta } from "@/components/marketing/FooterAccountCta";
import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { Reveal } from "@/components/marketing/landing/Reveal";

/**
 * Marketing footer — the reference's closing band:
 * - Minimal white surface (`bg-lm-card`)
 * - Small Roducq logo, tagline, and purple primary CTA button
 * - Multiple navigation columns (`FOOTER.columns.map`)
 * - Bottom legal links + very large pale Roducq wordmark (`lm-footer-wordmark`)
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto overflow-hidden border-t border-lm-border-soft bg-lm-card">
      <div className="lm-shell py-12 md:py-16">
        <Reveal className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Link
              href="/"
              aria-label="roducq home"
              className="inline-flex min-h-11 items-center gap-2"
            >
              <RoduMark size={26} solid />
              <Wordmark className="font-lm-bold text-lm-18 tracking-[-0.02em] text-lm-ink" monochrome />
            </Link>
            <p className="mt-3.5 text-lm-12 leading-relaxed text-lm-muted-readable">
              {FOOTER.tagline}
            </p>
            <div className="mt-4.5">
              <FooterAccountCta
                href={FOOTER.cta.href}
                homepageLabel={HOME_FOOTER_CTA.label}
              />
            </div>
            <p className="mt-4 text-lm-12 leading-relaxed text-lm-muted-readable">
              {FOOTER.limits}
            </p>
          </div>

          {FOOTER.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted-label">
                {column.title}
              </p>
              <ul className="mt-3.5 flex flex-col">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 min-w-11 items-center text-lm-14 text-lm-muted-readable transition-colors duration-200 hover:text-lm-ink-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </Reveal>

        <div className="mt-10 flex flex-col gap-1.5 border-t border-lm-border-soft pt-6.5 text-lm-12 text-lm-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p>{FOOTER.legal}</p>
          <Link
            href="#top"
            className="inline-flex min-h-11 items-center gap-1.5 text-lm-12 text-lm-muted-readable transition-colors duration-200 hover:text-lm-ink-accent"
          >
            Back to top
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Very large pale Roducq wordmark matching the Forma footer */}
        <div
          aria-hidden="true"
          className="mt-8 select-none overflow-hidden text-center"
        >
          <svg
            viewBox="0 0 1120 210"
            aria-hidden="true"
            className="lm-footer-wordmark mx-auto block h-auto w-full max-w-[64rem]"
          >
            <text
              x="560"
              y="174"
              textAnchor="middle"
              fill="currentColor"
              fontSize="196"
              fontWeight="700"
              letterSpacing="-8"
            >
              {FOOTER.wordmark}
            </text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
