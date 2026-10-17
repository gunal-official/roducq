"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

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
 */
const NAV = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/vs", label: "Compare" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    <header className="sticky top-0 z-40 border-b border-lm-border-soft bg-lm-header-wash backdrop-blur-md">
      <div className="lm-shell flex h-16 items-center gap-3 md:h-18">
        <Link
          href="/"
          aria-label="roducq home"
          className="inline-flex min-h-11 shrink-0 items-center gap-2"
        >
          <RoduMark size={28} />
          {/* The shared wordmark, re-toned to the landing ink. `cn` inside
              Wordmark resolves the conflicts, so the landing size and colour
              win without the app's own lockup changing anywhere else. */}
          <Wordmark className="font-lm-bold text-lm-18 tracking-[-0.02em] text-lm-ink" />
        </Link>

        <nav
          aria-label="Main navigation"
          className="ml-3.5 hidden items-center gap-1 lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 min-w-11 items-center rounded-lm-control px-3.5 text-lm-14 transition-colors",
                active(item.href)
                  ? "font-lm-semibold text-lm-ink-accent"
                  : "font-lm-regular text-lm-muted-readable hover:bg-lm-surface-accent hover:text-lm-ink"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          <Link
            href="/login"
            className="hidden min-h-11 items-center rounded-lm-control px-3.5 text-lm-14 font-lm-semibold text-lm-ink transition-colors hover:bg-lm-surface-accent hover:text-lm-ink-accent sm:inline-flex"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="hidden h-11 items-center rounded-lm-control bg-lm-accent px-5 text-lm-14 font-lm-semibold text-lm-on-accent shadow-lm-sm transition-colors hover:bg-lm-accent-strong sm:inline-flex"
          >
            Start free
          </Link>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lm-control text-lm-ink transition-colors hover:bg-lm-surface-accent lg:hidden"
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
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
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
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lm-control bg-lm-accent px-5 text-lm-14 font-lm-semibold text-lm-on-accent transition-colors hover:bg-lm-accent-strong"
                  >
                    Create your workspace
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-12 items-center justify-center rounded-lm-control border border-lm-hairline bg-lm-card px-5 text-lm-14 font-lm-semibold text-lm-ink transition-colors hover:border-lm-border"
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
