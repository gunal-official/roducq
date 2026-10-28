/**
 * Unsaved-edits guard — shell-action registry.
 *
 * The update composer owns the unsaved-edits dialog, but the two controls that
 * can destroy its draft live in the app shell, in a different part of the tree:
 * the sign-out button (topbar account menu, phone drawer) and the workspace
 * switcher (topbar, rail, phone drawer). React context would force a provider
 * around the whole shell; a global navigation blocker was explicitly rejected
 * when the guard shipped. So the guard publishes itself here while the editor
 * is dirty, and the shell asks before it runs a destructive action.
 *
 * Three rules, all pure:
 *   1. Registering is only meaningful while the editor is dirty — the guard
 *      unregisters the moment the editor is clean or unmounts, so a stale
 *      controller can never hold an action (no stale callbacks).
 *   2. `requestGuardedAction` NEVER runs the action while an editor is dirty.
 *      It hands it to the open dialog and reports "held"; the dialog runs it
 *      exactly once if the user confirms.
 *   3. With no registered editor (every other page, and every clean editor)
 *      the caller gets "ran" and behaves exactly as it did before the guard
 *      existed.
 *
 * This module is DOM-free on purpose: no React, no `window`, no `document`, so
 * the rules above are unit-testable in the repo's zero-dependency runner.
 */

/** The shell actions that can discard an in-progress update draft. */
export type GuardedShellAction = "sign-out" | "switch-workspace";

/** What the shell asks the guard to hold. */
export interface GuardedActionRequest {
  /** Which action this is — the dialog labels its destructive button. */
  action: GuardedShellAction;
  /**
   * Where focus returns after "Keep editing" when the invoking control is
   * gone (a menu item or a drawer button that closed itself). Optional and
   * best-effort; the guard falls back to the composer's first field.
   */
  returnFocusSelector?: string;
  /** The real work: the existing sign-out / workspace-switch handler. */
  run: () => void | Promise<void>;
}

/** The contract the mounted guard publishes while the editor is dirty. */
export interface UnsavedEditorController {
  isDirty(): boolean;
  /**
   * Open the existing confirmation dialog for this request.
   * Returns false when another decision is already pending, in which case the
   * request is dropped rather than queued (one decision at a time).
   */
  confirm(request: GuardedActionRequest): boolean;
}

/** "ran" → the caller runs its handler now. "held" → the dialog owns it. */
export type GuardedActionOutcome = "ran" | "held";

let controller: UnsavedEditorController | null = null;

/**
 * Publish the mounted editor's guard. Returns an idempotent unregister
 * function; a controller may only replace its own registration, never a newer
 * one (last mount wins, first unmount cannot clear it).
 */
export function registerUnsavedEditor(
  next: UnsavedEditorController
): () => void {
  controller = next;
  return () => {
    if (controller === next) controller = null;
  };
}

/** True while a dirty editor is mounted somewhere in the app shell. */
export function hasDirtyEditor(): boolean {
  if (!controller) return false;
  try {
    return controller.isDirty();
  } catch {
    // A throwing controller must never block a sign-out.
    return false;
  }
}

/**
 * Ask the guard before running a destructive shell action.
 * Never runs anything itself while an editor is dirty.
 */
export function requestGuardedAction(
  request: GuardedActionRequest
): GuardedActionOutcome {
  if (!hasDirtyEditor()) return "ran";
  // Dirty: the action is never run here, even if the dialog is busy with an
  // earlier decision — a dropped request means the user clicks again, never
  // that sign-out happens unconfirmed.
  controller?.confirm(request);
  return "held";
}
