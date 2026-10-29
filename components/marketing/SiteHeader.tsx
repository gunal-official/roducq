"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { AnnouncementBar } from "@/components/marketing/landing/AnnouncementBar";
import { ThemeIconToggle, ThemeToggle } from "@/components/theme-toggle";
import { clsx as cn } from "clsx";

/**
 * Marketing header — ONE header for the whole marketing route group.
 *
 * WHAT IT IS. The approved /solutions header, measured on the reference
 * (docs/FORMA_SOLUTIONS_REFERENCE.md §9 and the capture DOM): an opaque card
 * plane with no hairline, the rod mark and wordmark at the display size, the
 * route list centred in the viewport with an active-page underline, one icon
 * theme button and the purple "Get started" action pinned right.
 *
 * WHY THERE IS NO PER-ROUTE VARIANT ANY MORE. Until this pass the component
 * switched two chromes on pathname: /solutions, /features, /integrations and
 * /changelog rendered the reference plane, while /, /about, /pricing and /vs
 * kept a pre-redesign wash bar with a three-button theme group and a
 * "Log in / Start free" pair. That split was introduced to keep each page
 * milestone surgical, not because the two chromes were each measured — and
 * the site-wide consistency pass (docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md)
 * made it a defect: the same marketing shell changed appearance and
 * destination list from one route to the next, and /features, /integrations
 * and /changelog rendered the reference chrome over the old four-item list,
 * so those three pages had no link to Features, Solutions or Integrations and
 * no active item at all.
 *
 * So the pathname gate is gone. Every marketing route renders exactly this
 * header; the route list lives in one constant; the active state is the only
 * thing that varies. The destinations are roducq's, not the reference's —
 * About and Compare are appended to the reference's five (see NAV below).
 *
 * PROPORTIONS. 64px tall on phones, 72px from the md band, the shared
 * `--lm-container` shell and the same `--lm-*` gutters every band uses, so the
 * header's content lines up with the hero's instead of sitting on its own
 * grid.
 *
 * ONE NAV MODEL AT EVERY WIDTH. The complete row appears from 1024px; below
 * that the same destinations move into a real modal dialog, with focus
 * trapping, Escape, background isolation and focus return handled by Radix.
 * Duplicating the list into a second component is how a nav ends up shipping a
 * route on desktop that the phone menu forgot.
 *
 * ROUTES ARE THE REAL ONES. /features, /solutions, /integrations, /pricing,
 * /changelog, /about and /vs all exist under app/(marketing); /login and
 * /signup exist under app/(auth). Nothing here points at a page the router
 * does not serve (asserted by tests/components/home.test.ts).
 *
 * THE 1024–1199 BAND. Seven destinations do not fit at the reference's 12px
 * link padding on a 1024px viewport: measured in Chromium the row is 627px
 * wide there, the centred column leaves 599px between the wordmark and the
 * actions, and the row ended ~2.5px inside the theme button. The reference never rendered that band
 * (its tablet preset stops at 1199 and the capture skipped 1024 —
 * docs/FORMA_SOLUTIONS_REFERENCE.md §9.5), so the row tightens to 10px of
 * horizontal padding below 1200px and holds the measured 12px from 1200px up.
 * That keeps the five measured steps and every destination visible rather
 * than collapsing the nav into the menu on tablets.
 */
/**
 * ONE ROUTE LIST, THE REFERENCE'S ORDER, RODUCQ'S ROUTES.
 *
 * The first five entries are the reference header's route list, measured on
 * the live site (docs/FORMA_SOLUTIONS_REFERENCE.md §9, the capture DOM):
 * Features, Solutions, Integrations, Pricing, Changelog. The reference
 * publishes the first and third as in-page anchors because those pages do not
 * exist there; roducq ships both as real routes, so the header points at
 * `/features` and `/integrations` and each page can light its own item.
 *
 * About and Compare follow, because both are real, working destinations that
 * the marketing shell has always exposed. Dropping them to make the header
 * byte-identical to the reference's five would have removed two shipped
 * routes from the primary navigation, so they are appended instead — the
 * only product-driven difference, recorded in
 * docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md §4.
 */
export const NAV = [
  { href: "/features", label: "Features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/integrations", label: "Integrations" },
  { href: "/pricing", label: "Pricing" },
  { href: "/changelog", label: "Changelog" },
  { href: "/about", label: "About" },
  { href: "/vs", label: "Compare" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV;

  // A phone menu left open while the window grows past the desktop band
  // would leave a modal over a nav that is already visible.
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open]);

  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <AnnouncementBar homepage={pathname === "/"} />
      <header className="lm-header sticky top-0 z-40 bg-lm-card backdrop-blur-md">
      <div className="lm-shell relative flex h-16 items-center gap-3 md:h-18">
        <Link
          href="/"
          aria-label="roducq home"
          className="inline-flex min-h-11 shrink-0 items-center gap-2"
        >
          <RoduMark size={30} solid />
          {/* The shared wordmark, re-toned to the landing ink. `cn` inside
              Wordmark resolves the conflicts, so the landing size and colour
              win without the app's own lockup changing anywhere else. */}
          <Wordmark className="font-lm-bold text-lm-22 tracking-[-0.06em] text-lm-ink md:text-lm-28" monochrome />
        </Link>

        <nav
          aria-label="Main navigation"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 lg:flex"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                // The measured 12px padding returns at 1200px, the
                // reference's own desktop boundary; the 1024–1199 band it
                // never rendered holds 10px so all seven destinations fit.
                "group relative inline-flex min-h-11 min-w-11 items-center rounded-lm-control px-2.5 text-lm-15 font-lm-regular transition-colors duration-200 ease-lm-nav min-[1200px]:px-3",
                active(item.href)
                  ? "text-lm-ink"
                  : "text-lm-muted-slate hover:text-lm-ink",
              )}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2.5 bottom-2 h-0.5 origin-left rounded-full bg-lm-ink transition-transform duration-200 ease-lm-nav motion-reduce:transition-none min-[1200px]:inset-x-3",
                  active(item.href)
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden min-[360px]:block">
            <ThemeIconToggle />
          </div>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center rounded-lm-button bg-lm-accent-strong px-4 text-lm-14 font-lm-semibold text-lm-on-accent transition-colors duration-200 hover:bg-lm-ink-accent"
          >
            Get started
          </Link>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                // 44×44: the marketing surface's own touch-target floor (the
                // audit measured a 40px square here and brought it up to the
                // same minimum every other control carries).
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lm-button border border-lm-surface-muted bg-lm-card text-lm-ink shadow-lm-sm transition-colors duration-200 hover:bg-lm-card lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[70] bg-lm-scrim backdrop-blur-[3px] animate-fade-in" />
              <Dialog.Content
                onCloseAutoFocus={(event) => {
                  // At the desktop band the menu closes itself on resize; in
                  // that case there is no trigger to return focus to, so
                  // focus goes back to the page instead of nowhere.
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    event.preventDefault();
                    document
                      .getElementById("main")
                      ?.focus({ preventScroll: true });
                  }
                }}
                className="fixed inset-y-0 right-0 z-[70] flex w-[min(24rem,100%)] flex-col gap-6 overflow-y-auto border-l border-lm-border-soft bg-lm-card p-5 shadow-lm-lg animate-slide-in"
              >
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <Dialog.Title className="font-lm-bold text-lm-18 tracking-tight text-lm-ink">
                    Explore roducq
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lm-control text-lm-muted-readable hover:bg-lm-surface-accent hover:text-lm-ink"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Browse the product, choose an appearance, or sign in to your
                  workspace.
                </Dialog.Description>

                <nav
                  aria-label="Main navigation"
                  className="flex flex-col gap-1.5"
                >
                  {items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      aria-current={active(item.href) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-lm-row bg-lm-canvas-alt px-4 text-lm-14 font-lm-semibold text-lm-ink transition-colors hover:bg-lm-surface-accent hover:text-lm-ink-accent aria-[current=page]:bg-lm-surface-accent aria-[current=page]:text-lm-ink-accent"
                    >
                      {item.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ))}
                </nav>

                <div className="border-t border-lm-border-soft pt-5">
                  <p className="mb-3 text-lm-14 font-lm-semibold text-lm-ink">
                    Appearance
                  </p>
                  <ThemeToggle />
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-lm-border-soft pt-5">
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lm-button bg-lm-accent px-5 text-lm-14 font-lm-regular text-lm-on-accent transition-colors duration-200 hover:bg-lm-accent-strong"
                  >
                    Create your workspace
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-12 items-center justify-center rounded-lm-button border border-lm-hairline bg-lm-card px-5 text-lm-14 font-lm-regular text-lm-ink transition-colors duration-200 hover:border-lm-border"
                  >
                    Log in
                  </Link>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      </header>
    </>
  );
}
