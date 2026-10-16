"use client";
// marketing nav includes href="/vs"

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Menu, X } from "lucide-react";

import { RoduMark, Wordmark } from "@/components/app-shell/RoduMark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/vs", label: "Compare" },
];

/** One navigation model at every width. The complete desktop row only
 * appears when it fits; the phone/tablet menu is a real modal, with focus
 * trapping, Escape, background isolation and focus return handled by Radix. */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    <header className="site-header sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-8 lg:gap-6 lg:px-10">
        <Link
          href="/"
          aria-label="RoduCQ home"
          className="inline-flex min-h-11 shrink-0 items-center gap-2"
        >
          <RoduMark size={28} />
          <Wordmark className="text-lg" />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className="inline-flex min-h-11 min-w-11 items-center rounded-control px-3 transition-colors hover:bg-muted hover:text-text aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="hidden lg:inline-flex">
            <Link href="/signup">Sign up</Link>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-muted hover:text-text lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="forma-scrim fixed inset-0 z-[70] backdrop-blur-[3px] animate-fade-in" />
              <Dialog.Content
                onCloseAutoFocus={(event) => {
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    event.preventDefault();
                    document
                      .getElementById("main")
                      ?.focus({ preventScroll: true });
                  }
                }}
                className="site-menu fixed inset-y-0 right-0 z-[70] flex w-[min(24rem,100%)] flex-col gap-6 overflow-y-auto border-l border-border bg-card p-5 shadow-shell animate-menu-in"
              >
                <div className="flex min-h-11 items-center justify-between gap-3">
                  <Dialog.Title className="font-display text-lg font-bold tracking-tight">
                    Explore RoduCQ
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-text"
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
                  className="flex flex-col gap-2"
                >
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active(item.href) ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-surface bg-muted/50 px-4 text-sm font-semibold hover:bg-accent-soft hover:text-accent aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
                    >
                      {item.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border pt-5">
                  <p className="mb-3 text-sm font-semibold">Appearance</p>
                  <ThemeToggle />
                </div>
                <div className="mt-auto flex flex-col gap-3 border-t border-border pt-5">
                  <Button asChild size="lg">
                    <Link href="/signup" onClick={() => setOpen(false)}>
                      Create your workspace
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
