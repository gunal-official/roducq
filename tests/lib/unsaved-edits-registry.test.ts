/**
 * Unit tests for lib/ui/unsaved-edits-registry.ts — the contract that lets the
 * app shell (sign-out button, workspace switcher) ask the update composer's
 * unsaved-edits guard before it destroys a dirty draft.
 *
 * Built-in node:test only, like the rest of tests/lib: no DOM, no React, no
 * browser. The structural wiring of the components is covered by
 * tests/components/unsaved-edits-shell.test.ts; the real dialog behaviour by
 * scripts/verify-unsaved-edits.mjs.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  hasDirtyEditor,
  registerUnsavedEditor,
  requestGuardedAction,
  type GuardedActionRequest,
  type UnsavedEditorController,
} from "../../lib/ui/unsaved-edits-registry.ts";

/** A controller that records what the shell asked for. */
function controller(dirty = true) {
  const seen: GuardedActionRequest[] = [];
  const instance: UnsavedEditorController & { seen: GuardedActionRequest[] } = {
    seen,
    isDirty: () => dirty,
    confirm: (request) => {
      seen.push(request);
      return true;
    },
  };
  return instance;
}

const signOut = (ran: { count: number }): GuardedActionRequest => ({
  action: "sign-out",
  returnFocusSelector: "#account-menu-trigger",
  run: () => {
    ran.count += 1;
  },
});

describe("unsaved-edits registry — no editor mounted", () => {
  test("a clean app never holds an action and never runs it for the caller", () => {
    const ran = { count: 0 };
    assert.equal(hasDirtyEditor(), false);
    assert.equal(requestGuardedAction(signOut(ran)), "ran");
    // The registry reports; the caller performs the action exactly once.
    assert.equal(ran.count, 0);
  });

  test("a clean controller lets the caller through", () => {
    const clean = controller(false);
    const unregister = registerUnsavedEditor(clean);
    const ran = { count: 0 };
    try {
      assert.equal(hasDirtyEditor(), false);
      assert.equal(requestGuardedAction(signOut(ran)), "ran");
      assert.equal(clean.seen.length, 0, "no dialog for a clean editor");
      assert.equal(ran.count, 0, "the caller runs the action, not the registry");
    } finally {
      unregister();
    }
  });
});

describe("unsaved-edits registry — dirty editor", () => {
  test("holds the action, hands it to the dialog and never runs it", () => {
    const dirty = controller(true);
    const unregister = registerUnsavedEditor(dirty);
    const ran = { count: 0 };
    try {
      const request = signOut(ran);
      assert.equal(requestGuardedAction(request), "held");
      assert.equal(dirty.seen.length, 1);
      assert.equal(dirty.seen[0], request, "the dialog receives the original request");
      assert.equal(ran.count, 0, "nothing runs before the user confirms");
    } finally {
      unregister();
    }
  });

  test("a busy dialog drops the request instead of running it", () => {
    const dirty = controller(true);
    dirty.confirm = () => false; // an earlier decision is still open
    const unregister = registerUnsavedEditor(dirty);
    const ran = { count: 0 };
    try {
      assert.equal(requestGuardedAction(signOut(ran)), "held");
      assert.equal(ran.count, 0, "a dropped request must never sign the user out");
    } finally {
      unregister();
    }
  });

  test("a throwing controller fails open, never blocking a sign-out", () => {
    const unregister = registerUnsavedEditor({
      isDirty: () => {
        throw new Error("boom");
      },
      confirm: () => true,
    });
    try {
      assert.equal(hasDirtyEditor(), false);
      assert.equal(requestGuardedAction(signOut({ count: 0 })), "ran");
    } finally {
      unregister();
    }
  });
});

describe("unsaved-edits registry — lifecycle", () => {
  test("unregistering disarms the guard (composer unmounted)", () => {
    const dirty = controller(true);
    const unregister = registerUnsavedEditor(dirty);
    assert.equal(hasDirtyEditor(), true);
    unregister();
    assert.equal(hasDirtyEditor(), false);
    assert.equal(requestGuardedAction(signOut({ count: 0 })), "ran");
  });

  test("the last mount wins and an older unmount cannot clear it", () => {
    const first = controller(true);
    const second = controller(true);
    const unregisterFirst = registerUnsavedEditor(first);
    const unregisterSecond = registerUnsavedEditor(second);
    try {
      unregisterFirst();
      assert.equal(hasDirtyEditor(), true, "the newer registration survives");
      const ran = { count: 0 };
      assert.equal(requestGuardedAction(signOut(ran)), "held");
      assert.equal(second.seen.length, 1);
      assert.equal(first.seen.length, 0);
    } finally {
      unregisterSecond();
    }
  });

  test("unregistering twice is harmless", () => {
    const unregister = registerUnsavedEditor(controller(true));
    unregister();
    unregister();
    assert.equal(hasDirtyEditor(), false);
  });
});
