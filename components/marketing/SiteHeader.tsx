"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { ThemeIconToggle, ThemeToggle } from "@/components/theme-toggle";
import { clsx as cn } from "clsx";

/**
 * Marketing header — the reference's chrome, on roducq's routes.
 *
 * COMPOSITION. Mark + wordmark on the left, the route list beside it, and
 * the two funnel actions pinned right. It sticks, sits on a translucent
 * wash of the landing canvas, and closes with the same brand hairline the
 * cards use — no solid block, no drop shadow, which is what keeps the hero
 * reading as one continuous surface under it.
 *
 * PROPORTIONS. 64px tall, 1200px container, 20/32/40px gutters — the same
 * `--lm-*` layout tokens every band uses, so the header's content lines up
 * with the hero's instead of sitting on its own grid.
 *
 * ONE NAV MODEL AT EVERY WIDTH. The complete row only appears when it fits;
 * below the desktop band the same destinations move into a real modal
 * dialog, with focus trapping, Escape, background isolation and focus
 * return handled by Radix. Duplicating the list into a second component is
 * how a nav ends up shipping a route on desktop that the phone menu forgot.
 *
 * ROUTES ARE THE REAL ONES. /about, /pricing and /vs exist under
 * app/(marketing); /login and /signup exist under app/(auth). Nothing here
 * points at a page the router does not serve (asserted by
 * tests/components/home.test.ts).
 *
 * SOLUTIONS VARIANT. `/solutions` is matched against the Forma reference's
 * header (measured in docs/FORMA_SOLUTIONS_REFERENCE.md §9 and the capture
 * DOM): white bar with no hairline, the route list centred in the viewport,
 * a single icon theme button, and a purple "Get started" action. Every other
 * marketing page keeps the header it has always had; the variant is switched
 * on pathname here so the shared component stays the one place the header
 * lives.
 *
 * FEATURES EXTENSION. `/features` recreates the same reference family and
 * renders that same white chrome: a second pathname boolean (`features`)
 * feeds the `showcase` gate every visual branch below reads. The nav-data
 * ternary on the next lines is deliberately untouched — an assertion in
 * tests/components/vs-comparisons.test.ts locks its exact form — so only the
 * two showcase routes change appearance, and /, /about, /pricing and /vs
 * keep their original header.
 */
const NAV = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/vs", label: "Compare" },
];

/**
 * The Forma reference's route list, mapped onto roducq's real destinations.
 * `hash` targets a section on the home page. Forma's "Changelog" is omitted:
 * roducq serves no public changelog route, and /updates is the signed-in
 * client-updates app, not a marketing page.
 */
const SOLUTIONS_NAV: { href: string; label: string; hash?: string }[] = [
  { href: "/", label: "Features", hash: "features" },
  { href: "/solutions", label: "Solutions" },
  { href: "/", label: "Integrations", hash: "integrations" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const solutions = pathname === "/solutions" || pathname.startsWith("/solutions/");
  // /features recreates the same reference page family, so it reuses the
  // white showcase chrome below. The nav-DATA selection stays on the
  // `solutions` ternary exactly as it was (a test locks that line);
  // `showcase` only drives the visual variant, so /, /about, /pricing and
  // /vs render byte-identical headers and /solutions is unchanged.
  const features = pathname === "/features" || pathname.startsWith("/features/");
  // /integrations joins the same reference page family (measured against
  // forma-visuvate.framer.website/integrations — docs/FORMA_INTEGRATIONS_REFERENCE.md),
  // so it renders the identical white showcase chrome. This is the smallest
  // possible extension: one pathname boolean feeds the `showcase` gate every
  // visual branch below already reads, and the nav-data ternary on the next
  // line is deliberately untouched — tests/components/vs-comparisons.test.ts
  // locks its exact form. /integrations therefore keeps the same route list
  // /features renders today, and /, /about, /pricing and /vs do not move.
  const integrations =
    pathname === "/integrations" || pathname.startsWith("/integrations/");
  const showcase = solutions || features || integrations;
  const items = solutions ? SOLUTIONS_NAV : NAV;

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
  const hrefOf = (item: { href: string; hash?: string }) =>
    item.hash ? `${item.href}#${item.hash}` : item.href;

  return (
    <header
      className={cn(
        "lm-header sticky top-0 z-40 backdrop-blur-md",
        showcase
          ? "bg-lm-card"
          : "border-b border-lm-border-soft bg-lm-header-wash"
      )}
    >
      <div
        className={cn(
          "lm-shell flex h-16 items-center gap-3 md:h-18",
          showcase && "relative"
        )}
      >
        <Link
          href="/"
          aria-label="roducq home"
          className="inline-flex min-h-11 shrink-0 items-center gap-2"
        >
          <RoduMark size={showcase ? 30 : 28} />
          {/* The shared wordmark, re-toned to the landing ink. `cn` inside
              Wordmark resolves the conflicts, so the landing size and colour
              win without the app's own lockup changing anywhere else. */}
          <Wordmark
            className={cn(
              "font-lm-bold text-lm-ink",
              showcase
                ? "text-lm-22 tracking-[-0.06em] md:text-lm-28"
                : "text-lm-18 tracking-[-0.02em]"
            )}
          />
        </Link>

        <nav
          aria-label="Main navigation"
          className={cn(
            "hidden items-center lg:flex",
            showcase
              ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-0.5"
              : "ml-3.5 gap-1"
          )}
        >
          {items.map((item) => (
            <Link
              key={item.label}
              href={hrefOf(item)}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "group relative inline-flex min-h-11 min-w-11 items-center rounded-lm-control transition-colors duration-200 ease-lm-nav",
                showcase
                  ? "px-3 text-lm-15 font-lm-regular"
                  : "px-3.5 text-lm-15",
                showcase && active(item.href)
                  ? "text-lm-ink"
                  : showcase
                    ? "text-lm-muted-slate hover:text-lm-ink"
                    : active(item.href)
                      ? "font-lm-semibold text-lm-ink-accent"
                      : "font-lm-regular text-lm-muted-readable hover:bg-lm-surface-accent hover:text-lm-ink"
              )}
            >
              {item.label}
              {showcase ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 bottom-2 h-0.5 origin-left rounded-full bg-lm-ink transition-transform duration-200 ease-lm-nav motion-reduce:transition-none",
                    active(item.href)
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  )}
                />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showcase ? (
            <>
              <div className="hidden min-[360px]:block">
                <ThemeIconToggle />
              </div>
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-lm-button bg-lm-accent-strong px-4 text-lm-14 font-lm-semibold text-lm-on-accent transition-colors duration-200 hover:bg-lm-ink-accent"
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>

              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-lm-control px-3.5 text-lm-14 font-lm-regular text-lm-ink transition-colors duration-200 hover:bg-lm-surface-accent hover:text-lm-ink-accent sm:inline-flex"
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="hidden h-11 items-center rounded-lm-button bg-lm-accent px-5 text-lm-14 font-lm-regular text-lm-on-accent shadow-lm-sm transition-colors duration-200 hover:bg-lm-accent-strong sm:inline-flex"
              >
                Start free
              </Link>
            </>
          )}

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className={cn(
                  "flex min-h-11 min-w-11 items-center justify-center rounded-lm-control text-lm-ink transition-colors duration-200 hover:bg-lm-surface-accent lg:hidden",
                  showcase &&
                    "min-h-10 min-w-10 rounded-lm-button border border-lm-surface-muted bg-lm-card shadow-lm-sm hover:bg-lm-card"
                )}
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
                      href={hrefOf(item)}
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
  );
}
