/**
 * Unsaved-edits guard — pure decision helpers (UX audit P2-02).
 *
 * The update composer keeps explicit saving: local state holds the edits and
 * the server props are the last SUCCESSFULLY saved state. Everything below is
 * a pure function of that state or of a plain descriptor object, so the rules
 * are unit-testable with the repo's zero-dependency `node:test` runner — no
 * DOM, no React, no browser.
 *
 * Two rules live here:
 *   1. `isEditorDirty` — the single definition of "there are unsaved edits".
 *      Comparing against the last saved state means reverting a change makes
 *      the editor clean again, and a failed save can never clear it (the
 *      props only change after a successful save + revalidation).
 *   2. `shouldGuardAnchorClick` — exactly which in-app link clicks must be
 *      intercepted. The predicate is deliberately narrow: anything that does
 *      not navigate the current document (downloads, new tabs, modified
 *      clicks, hash-only links, the same URL) and anything outside the app
 *      (other origins, mailto/tel, API routes) is left entirely alone.
 */

export interface EditorSnapshot {
  title: string;
  body: string;
}

/** True when the editor content differs from the last saved content. */
export function isEditorDirty(
  current: EditorSnapshot,
  saved: EditorSnapshot
): boolean {
  return current.title !== saved.title || current.body !== saved.body;
}

/** The parts of a click (or keyboard activation) the guard needs to decide. */
export interface AnchorClickDescriptor {
  /** Raw `href` attribute; `null` when the element has no href. */
  href: string | null;
  /** `window.location.href` at the time of the click. */
  currentHref: string;
  /** Raw `target` attribute. */
  target?: string | null;
  /** The anchor carries `download` — a download, not a navigation. */
  download?: boolean;
  /** MouseEvent.button (keyboard activation reports 0). */
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  /** Another handler already cancelled the click. */
  defaultPrevented?: boolean;
  /** The anchor opts out via `data-skip-unsaved-guard`. */
  optedOut?: boolean;
}

/**
 * Should this click be held until the user decides about unsaved edits?
 * Only plain, unmodified, same-window, same-origin navigation to a DIFFERENT
 * app URL qualifies. Everything else returns false and behaves exactly as
 * before the guard existed.
 */
export function shouldGuardAnchorClick(
  descriptor: AnchorClickDescriptor
): boolean {
  if (descriptor.defaultPrevented) return false;
  if (descriptor.optedOut) return false;
  if ((descriptor.button ?? 0) !== 0) return false;
  if (
    descriptor.metaKey ||
    descriptor.ctrlKey ||
    descriptor.shiftKey ||
    descriptor.altKey
  ) {
    return false;
  }
  if (descriptor.target && descriptor.target !== "_self") return false;
  if (descriptor.download) return false;
  if (!descriptor.href) return false;

  let destination: URL;
  let current: URL;
  try {
    current = new URL(descriptor.currentHref);
    destination = new URL(descriptor.href, current);
  } catch {
    return false;
  }

  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    return false;
  }
  if (destination.origin !== current.origin) return false;
  // Same page (the hash-only "Skip to content" link, or a link to this URL):
  // the document — and the edits — survive, so nothing to warn about.
  if (
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    return false;
  }
  // GET routes that stream bytes (PDF export) are not app pages and cannot be
  // rendered by the client router; `download` already covers the shipped
  // affordances, this keeps the rule true for any future non-download link.
  if (destination.pathname === "/api" || destination.pathname.startsWith("/api/")) {
    return false;
  }
  return true;
}

/** A decided navigation the guard must perform after the user confirms. */
export type GuardedNavigation =
  | { kind: "push"; href: string }
  | { kind: "traverse"; key: string; url: string };

// ── Navigation API (Back/Forward) ─────────────────────────────────────────
// TypeScript 5.9's lib.dom declares NavigationHistoryEntry but not the
// Navigation interface or NavigateEvent, so the shapes the guard relies on
// are declared here — structurally, with no dependency and no `any`.

export type NavigationTypeLike = "push" | "replace" | "reload" | "traverse";

export interface NavigationDestinationLike {
  url: string;
  key: string;
}

export interface NavigateEventLike {
  readonly canIntercept: boolean;
  readonly navigationType: NavigationTypeLike;
  readonly hashChange: boolean;
  readonly downloadRequest: string | null;
  readonly destination: NavigationDestinationLike;
  preventDefault(): void;
}

export interface NavigationResultLike {
  readonly committed: Promise<void>;
  readonly finished: Promise<void>;
}

export interface NavigationLike {
  addEventListener(
    type: "navigate",
    listener: (event: NavigateEventLike) => void
  ): void;
  removeEventListener(
    type: "navigate",
    listener: (event: NavigateEventLike) => void
  ): void;
  traverseTo(key: string): NavigationResultLike;
}

/** Feature detection: undefined in browsers without the Navigation API. */
export function asNavigation(candidate: unknown): NavigationLike | null {
  if (candidate === null || typeof candidate !== "object") return null;
  const nav = candidate as Partial<NavigationLike>;
  if (typeof nav.addEventListener !== "function") return null;
  if (typeof nav.traverseTo !== "function") return null;
  return candidate as NavigationLike;
}

/**
 * Back/Forward is the only navigate-event type the guard holds: pushes and
 * replaces from the app router are already decided, reloads are covered by
 * `beforeunload`, and non-interceptable or fragment-only traversals cannot
 * lose the editor's state.
 */
export function isTraversalToGuard(
  event: Pick<
    NavigateEventLike,
    "navigationType" | "canIntercept" | "hashChange" | "downloadRequest"
  >
): boolean {
  return (
    event.navigationType === "traverse" &&
    event.canIntercept &&
    !event.hashChange &&
    !event.downloadRequest
  );
}
