"use client";

/**
 * Composer-scoped unsaved-edits guard (UX audit P2-02, extended for the
 * sign-out / workspace-switch follow-up).
 *
 * Mounted by the update composer and active ONLY while the editor differs
 * from its last saved state. It adds its listeners for that window and
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
 *   4. A registration with `lib/ui/unsaved-edits-registry` — the two shell
 *      buttons that cannot be intercepted as clicks (sign out, and the
 *      workspace switch that is a server action plus a refresh) ask the guard
 *      first. They are buttons, so the click listener above ignores them;
 *      instead their handlers call `requestGuardedAction()` and never run the
 *      action until the user confirms. Same dialog, same decision, same
 *      lifecycle — no second confirmation system.
 *
 * Deliberately NOT a global blocker: no provider, no history-entry traps, no
 * patching of `next/navigation`. Next 16 owns the `__NA` history state and
 * reloads on foreign entries, so this hook never writes to history at all.
 * Server-side redirects (session expiry, forced sign-out) never pass through
 * this code and are unaffected.
 *
 * Browsers without the Navigation API (Safari ≤ 26.1, Firefox ≤ 146) cannot
 * have Back/Forward cancelled; clicks, unloads and the shell actions are still
 * guarded there.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
import {
  registerUnsavedEditor,
  type GuardedActionRequest,
  type GuardedShellAction,
} from "@/lib/ui/unsaved-edits-registry";

const ANCHOR_SELECTOR = "a[href]";
const SKIP_ATTRIBUTE = "data-skip-unsaved-guard";
/** The composer's first field — where focus lands when the invoker is gone. */
const DEFAULT_FALLBACK_FOCUS = "#update-composer input, #update-composer textarea";

/**
 * A decision the dialog is asking for: a navigation the user clicked, or a
 * shell action (sign out / switch workspace) whose handler asked first.
 */
type PendingDecision =
  | GuardedNavigation
  | { kind: "action"; request: GuardedActionRequest };

/** The destructive button names the action it will perform, exactly once. */
const DESTRUCTIVE_LABEL: Record<GuardedShellAction, string> = {
  "sign-out": "Discard and sign out",
  "switch-workspace": "Discard and switch workspace",
};

function getNavigation(): NavigationLike | null {
  if (typeof window === "undefined") return null;
  return asNavigation((window as unknown as { navigation?: unknown }).navigation);
}

function hrefForRouter(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

function focusedElement(): HTMLElement | null {
  return typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement &&
    document.activeElement !== document.body
    ? document.activeElement
    : null;
}

/**
 * Best-effort focus return to the shell control that opened the dialog.
 * Several triggers can share a selector (the phone's menu button and the
 * dock's "More" tab), so the first VISIBLE match wins — the hidden one must
 * not swallow focus.
 */
function focusFirstVisible(selector: string): boolean {
  if (typeof document === "undefined") return false;
  for (const element of Array.from(
    document.querySelectorAll<HTMLElement>(selector)
  )) {
    if (element.getClientRects().length > 0) {
      element.focus();
      return true;
    }
  }
  return false;
}

export function useUnsavedChangesGuard({
  dirty,
  fallbackFocusSelector = DEFAULT_FALLBACK_FOCUS,
  onDiscard,
}: {
  /** True while the editor differs from the last successfully saved state. */
  dirty: boolean;
  /** Focus target when the dialog was opened without a focused invoker. */
  fallbackFocusSelector?: string;
  /**
   * Runs when the user confirms "Discard…", BEFORE the requested action.
   * The composer uses it to drop its draft, so unsaved content can never
   * follow the user into another workspace.
   */
  onDiscard?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingDecision | null>(null);

  const pendingRef = useRef<PendingDecision | null>(null);
  const busyRef = useRef(false); // a dialog is open (or its discard is in flight)
  const bypassRef = useRef(false); // the confirmed navigation must not re-trigger
  const firedRef = useRef(false); // the confirmed shell action ran already
  const dirtyRef = useRef(dirty);
  const invokerRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<string | undefined>(undefined);
  const keepButtonRef = useRef<HTMLButtonElement>(null);

  // The composer's reset must never be called through a stale render closure.
  const onDiscardRef = useRef(onDiscard);
  useEffect(() => {
    onDiscardRef.current = onDiscard;
  }, [onDiscard]);

  const request = useCallback(
    (next: PendingDecision, returnFocusSelector?: string) => {
      if (busyRef.current) return; // one decision at a time — never stack dialogs
      busyRef.current = true;
      pendingRef.current = next;
      returnFocusRef.current = returnFocusSelector;
      invokerRef.current = focusedElement();
      setPending(next);
    },
    []
  );

  const stay = useCallback(() => {
    pendingRef.current = null;
    busyRef.current = false;
    setPending(null);
  }, []);

  const discard = useCallback(() => {
    const next = pendingRef.current;
    setPending(null);
    pendingRef.current = null;
    if (!next) {
      busyRef.current = false;
      return;
    }

    // Shell action (sign out / switch workspace): drop the draft first, then
    // perform the ORIGINAL action exactly once.
    if (next.kind === "action") {
      if (firedRef.current) return;
      firedRef.current = true;
      returnFocusRef.current = undefined;
      onDiscardRef.current?.();
      let settled: void | Promise<void>;
      try {
        settled = next.request.run();
      } catch {
        settled = undefined;
      }
      void Promise.resolve(settled)
        .catch(() => {
          /* the action surfaces its own errors */
        })
        .finally(() => {
          firedRef.current = false;
          busyRef.current = false;
        });
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

  // Clean editors keep no listeners and no registry entry; a completed save
  // also re-arms the guard for whatever the user does next.
  useEffect(() => {
    if (dirty) return;
    pendingRef.current = null;
    busyRef.current = false;
    bypassRef.current = false;
    firedRef.current = false;
    returnFocusRef.current = undefined;
    dirtyRef.current = false;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    dirtyRef.current = true;

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

    // The shell's sign-out button and workspace switcher consult this while
    // the editor is dirty. Unregistered on unmount and the moment the editor
    // is clean, so no stale callback can ever hold an action.
    const unregister = registerUnsavedEditor({
      isDirty: () => dirtyRef.current,
      confirm: (actionRequest) => {
        if (busyRef.current) return false;
        request(
          { kind: "action", request: actionRequest },
          actionRequest.returnFocusSelector
        );
        return true;
      },
    });

    return () => {
      dirtyRef.current = false;
      unregister();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      navigation?.removeEventListener("navigate", onNavigate);
    };
  }, [dirty, request]);

  // `open` is derived, never stored: a successful save (dirty → false) closes
  // the dialog without an extra state write.
  const open = dirty && pending !== null;

  const destructiveLabel =
    pending?.kind === "action"
      ? DESTRUCTIVE_LABEL[pending.request.action]
      : "Discard changes";

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
        // The shared zoom keyframes otherwise replace the centering transform
        // during motion, briefly moving this dialog outside the viewport.
        style={{
          "--tw-enter-translate-x": "-50%",
          "--tw-enter-translate-y": "-50%",
          "--tw-exit-translate-x": "-50%",
          "--tw-exit-translate-y": "-50%",
        } as CSSProperties}
        onOpenAutoFocus={(event) => {
          // Land on the safe action, not the dismiss control.
          event.preventDefault();
          keepButtonRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (invokerRef.current?.isConnected) return; // shared wrapper restores it
          event.preventDefault();
          // The invoking control may have closed with its menu or drawer
          // (shell actions do), so fall back to the surface that owns it —
          // then to the composer's first field, never to <body>.
          const returnSelector = returnFocusRef.current;
          if (returnSelector && focusFirstVisible(returnSelector)) return;
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
            {destructiveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { dialog };
}
