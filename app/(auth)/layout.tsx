import Link from "next/link";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { AuthArtwork } from "@/components/auth/AuthArtwork";

/**
 * The auth shell (Forma Phase B).
 *
 * On a wide screen the routes are split: a plum brand panel carrying
 * the original pipeline artwork on the left, and the form on the right.
 * Below 1024px the panel is dropped entirely and the form takes the
 * full width — the artwork is an atmosphere, never a prerequisite.
 */
const STAGES = ["Intake", "Briefs", "Proposals", "Plans", "Invoices"] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[1.08fr_minmax(0,1fr)]">
      {/* Brand panel */}
      <aside className="auth-panel relative hidden overflow-hidden lg:block">
        {/* The artwork bleeds past the panel edge on purpose. It lives in
            its own clipping layer so the panel itself never reports
            horizontal overflow, and it sits in the upper right so the
            headline below it keeps a clean column of plum. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <AuthArtwork className="absolute -right-24 -top-24 h-[560px] w-[560px] opacity-90" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Link
            href="/"
            aria-label="RoduCQ home"
            className="inline-flex min-h-11 items-center gap-2.5"
          >
            <RoduMark size={32} animated />
            <Wordmark className="text-lg text-white" />
          </Link>

          <div className="max-w-md">
            <p className="font-display text-3xl font-extrabold leading-[1.14] tracking-[-0.03em] text-white xl:text-4xl">
              Every client project, from first brief to final invoice.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              RoduCQ keeps intake, briefs, proposals, plans, updates,
              contracts and invoices in one workspace — so the follow-up
              never falls through.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {STAGES.map((stage) => (
                <li
                  key={stage}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm"
                >
                  {stage}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Form column */}
      <main id="main" tabIndex={-1} className="flex min-h-dvh items-center justify-center px-4 py-12 sm:px-8">
        {children}
      </main>
    </div>
  );
}
