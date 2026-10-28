"use client";

/**
 * Composer-scoped unsaved-edits guard (UX audit P2-02).
 *
 * Mounted by the update composer and active ONLY while the editor differs
 * from its last saved state. It adds three listeners for that window and
 * removes them the moment the editor is clean:
 *
 *   1. `beforeunload` — refresh, tab close, and any cross-document navigation
 *      get the browser's native confirmation (the only mechanism browsers
 *      offer; the prompt text itself is not customisable).
 *   2. A capture-phase `click` listener — plain in-app link clicks (sidebar,
 *      topbar, drawer, tab bar, page links) are held behind an accessible
 *      dialog BEFORE the Next.js router sees them, so no route change and no
 *      RSC request happens until the user decides. Confirming navigates with
 *      `router.push`; staying leaves the editor exactly as it was.
 *   3. A Navigation API `navigate` listener (feature-detected) — the browser
 *      Back/Forward buttons are cancelled with `preventDefault()` for
 *      `traverse` navigations, so the URL never moves while the dialog is
 *      open. Confirming re-issues the traversal with `traverseTo(key)`.
 *
 * Deliberately NOT a global blocker: no provider, no history-entry traps, no
 * patching of `next/navigation`. Next 16 owns the `__NA` history state and
 * reloads on foreign entries, so this hook never writes to history at all.
 *
 * Browsers without the Navigation API (Safari ≤ 26.1, Firefox ≤ 146) cannot
 * have Back/Forward cancelled; clicks and unloads are still guarded there.
 * Programmatic router calls (sign out, workspace switch, server-action
 * redirects) cannot be intercepted without a global blocker and are out of
 * scope — documented in docs/RODUCQ_UNSAVED_EDITS_GUARD.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  asNavigation,
  isTraversalToGuard,
  shouldGuardAnchorClick,
  type GuardedNavigation,
  type NavigationLike,
  type NavigateEventLike,
} from "@/lib/ui/unsaved-changes";

const ANCHOR_SELECTOR = "a[href]";
const SKIP_ATTRIBUTE = "data-skip-unsaved-guard";
/** The composer's first field — where focus lands when the invoker is gone. */
const DEFAULT_FALLBACK_FOCUS = "#update-composer input, #update-composer textarea";

function getNavigation(): NavigationLike | null {
  if (typeof window === "undefined") return null;
  return asNavigation((window as unknown as { navigation?: unknown }).navigation);
}

function hrefForRouter(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

export function useUnsavedChangesGuard({
  dirty,
  fallbackFocusSelector = DEFAULT_FALLBACK_FOCUS,
}: {
  /** True while the editor differs from the last successfully saved state. */
  dirty: boolean;
  /** Focus target when the dialog was opened without a focused invoker. */
  fallbackFocusSelector?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<GuardedNavigation | null>(null);

  const pendingRef = useRef<GuardedNavigation | null>(null);
  const busyRef = useRef(false); // a dialog is open (or its discard is in flight)
  const bypassRef = useRef(false); // the confirmed navigation must not re-trigger
  const invokerRef = useRef<HTMLElement | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  const request = useCallback((next: GuardedNavigation) => {
    if (busyRef.current) return; // one decision at a time — never stack dialogs
    busyRef.current = true;
    pendingRef.current = next;
    invokerRef.current =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    setPending(next);
  }, []);

  const stay = useCallback(() => {
    pendingRef.current = null;
    busyRef.current = false;
    setPending(null);
  }, []);

  const discard = useCallback(() => {
    const next = pendingRef.current;
    setPending(null);
    if (!next) {
      busyRef.current = false;
      return;
    }
    bypassRef.current = true;

    if (next.kind === "push") {
      router.push(next.href);
      return;
    }

    const fallbackHref = (() => {
      try {
        return hrefForRouter(new URL(next.url));
      } catch {
        return "/";
      }
    })();
    const resumeGuard = () => {
      // Still on the same entry (e.g. a duplicate history URL): keep guarding.
      bypassRef.current = false;
      busyRef.current = false;
    };
    const navigation = getNavigation();
    try {
      const result = navigation?.traverseTo(next.key);
      if (!result) throw new Error("Navigation API unavailable");
      result.finished.then(resumeGuard).catch(() => {
        bypassRef.current = false;
        router.push(fallbackHref);
      });
    } catch {
      bypassRef.current = false;
      router.push(fallbackHref);
    }
  }, [router]);

  // Clean editors keep no listeners at all; a completed save also re-arms the
  // guard for whatever the user does next.
  useEffect(() => {
    if (dirty) return;
    pendingRef.current = null;
    busyRef.current = false;
    bypassRef.current = false;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;

    const onClick = (event: MouseEvent) => {
      if (bypassRef.current) return;
      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest(ANCHOR_SELECTOR);
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (
        !shouldGuardAnchorClick({
          href: anchor.getAttribute("href"),
          currentHref: window.location.href,
          target: anchor.getAttribute("target"),
          download: anchor.hasAttribute("download"),
          button: event.button,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          defaultPrevented: event.defaultPrevented,
          optedOut: anchor.hasAttribute(SKIP_ATTRIBUTE),
        })
      ) {
        return;
      }
      // Runs at document capture, before React's root delegation: cancelling
      // here means the Next <Link> handler never routes.
      event.preventDefault();
      event.stopPropagation();
      request({
        kind: "push",
        href: hrefForRouter(new URL(anchor.href, window.location.href)),
      });
    };

    const onNavigate = (event: NavigateEventLike) => {
      if (bypassRef.current) return;
      if (!isTraversalToGuard(event)) return;
      event.preventDefault();
      request({
        kind: "traverse",
        key: event.destination.key,
        url: event.destination.url,
      });
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current) return;
      event.preventDefault();
      // Legacy trigger for older browsers; modern ones ignore the text.
      event.returnValue = "";
    };

    const navigation = getNavigation();
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    navigation?.addEventListener("navigate", onNavigate);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigation?.removeEventListener("navigate", onNavigate);
    };
  }, [dirty, request]);

  // `open` is derived, never stored: a successful save (dirty → false) closes
  // the dialog without an extra state write.
  const open = dirty && pending !== null;

  const dialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Escape, the close button and the overlay all mean "keep editing".
        if (!next) stay();
      }}
    >
      <DialogContent
        role="alertdialog"
        onOpenAutoFocus={(event) => {
          // Land on the safe action, not the dismiss control.
          event.preventDefault();
          keepButtonRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (invokerRef.current?.isConnected) return; // shared wrapper restores it
          event.preventDefault();
          document.querySelector<HTMLElement>(fallbackFocusSelector)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            Your edits to this update haven’t been saved. If you leave now,
            they’ll be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={keepButtonRef}
            type="button"
            variant="secondary"
            onClick={stay}
          >
            Keep editing
          </Button>
          <Button type="button" variant="destructive" onClick={discard}>
            Discard changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { dialog };
}
