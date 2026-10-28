/**
 * Unit tests for lib/ui/unsaved-changes.ts — the pure rules behind the
 * update-editor unsaved-changes guard (UX audit P2-02).
 *
 * Built-in node:test only (same convention as the other tests/lib suites):
 * no DOM, no React, no browser. The structural wiring of the hook itself is
 * covered by tests/components/update-unsaved-guard.test.ts, and the real
 * dialog/navigation behaviour by scripts/verify-unsaved-edits.mjs.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  asNavigation,
  isEditorDirty,
  isTraversalToGuard,
  shouldGuardAnchorClick,
  type AnchorClickDescriptor,
} from "../../lib/ui/unsaved-changes.ts";

const CURRENT = "https://roducq.example/updates/11111111-1111-4111-8111-111111111111";

const click = (
  overrides: Partial<AnchorClickDescriptor> = {}
): AnchorClickDescriptor => ({
  href: "/briefs",
  currentHref: CURRENT,
  target: null,
  download: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  optedOut: false,
  ...overrides,
});

describe("isEditorDirty — unsaved means 'differs from the last saved state'", () => {
  const saved = { title: "Week 2 update", body: "Milestone is on track." };

  test("an untouched editor is clean", () => {
    assert.equal(isEditorDirty({ ...saved }, saved), false);
  });

  test("a title edit or a body edit is dirty", () => {
    assert.equal(isEditorDirty({ ...saved, title: "Week 2 update!" }, saved), true);
    assert.equal(isEditorDirty({ ...saved, body: "Milestone slipped." }, saved), true);
  });

  test("reverting an edit makes the editor clean again", () => {
    const edited = { title: "Week 2 update!", body: saved.body };
    assert.equal(isEditorDirty(edited, saved), true);
    assert.equal(isEditorDirty({ title: saved.title, body: saved.body }, saved), false);
  });

  test("whitespace changes are real differences until a save normalises them", () => {
    assert.equal(isEditorDirty({ ...saved, body: "Milestone is on track. " }, saved), true);
    // The save action trims the title, so the revalidated props match and the
    // editor becomes clean without the guard ever deciding on its own.
    const savedTrimmed = { title: "Week 2 update", body: saved.body };
    assert.equal(isEditorDirty({ ...savedTrimmed }, savedTrimmed), false);
  });
});

describe("shouldGuardAnchorClick — narrow, predictable interception", () => {
  test("guards plain in-app link navigation", () => {
    assert.equal(shouldGuardAnchorClick(click()), true);
    assert.equal(shouldGuardAnchorClick(click({ href: "updates" })), true);
    assert.equal(shouldGuardAnchorClick(click({ href: "/updates?status=draft" })), true);
    assert.equal(shouldGuardAnchorClick(click({ href: "/plans/22222222-2222-4222-8222-222222222222" })), true);
  });

  test("never guards navigation that keeps the document alive", () => {
    assert.equal(shouldGuardAnchorClick(click({ href: "#main" })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: `${CURRENT}#update-composer` })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: CURRENT })), false);
  });

  test("never guards downloads, new tabs, modified clicks or other buttons", () => {
    assert.equal(shouldGuardAnchorClick(click({ download: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "/api/pdf/update/11111111-1111-4111-8111-111111111111" })), false);
    assert.equal(shouldGuardAnchorClick(click({ target: "_blank" })), false);
    assert.equal(shouldGuardAnchorClick(click({ target: "_self" })), true);
    assert.equal(shouldGuardAnchorClick(click({ metaKey: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ ctrlKey: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ shiftKey: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ altKey: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ button: 1 })), false);
    assert.equal(shouldGuardAnchorClick(click({ button: 2 })), false);
  });

  test("never guards other origins or non-http protocols", () => {
    assert.equal(shouldGuardAnchorClick(click({ href: "https://example.com/briefs" })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "//example.com/briefs" })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "mailto:client@example.test" })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "tel:+10000000000" })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "javascript:void(0)" })), false);
  });

  test("respects an explicit opt-out and already-cancelled clicks", () => {
    assert.equal(shouldGuardAnchorClick(click({ optedOut: true })), false);
    assert.equal(shouldGuardAnchorClick(click({ defaultPrevented: true })), false);
  });

  test("fails closed on unusable input instead of throwing", () => {
    assert.equal(shouldGuardAnchorClick(click({ href: null })), false);
    assert.equal(shouldGuardAnchorClick(click({ href: "" })), false);
    assert.equal(
      shouldGuardAnchorClick(click({ currentHref: "not a url" })),
      false
    );
  });
});

describe("Navigation API feature detection", () => {
  test("accepts only objects that can listen and traverse", () => {
    const real = {
      addEventListener() {},
      removeEventListener() {},
      traverseTo() {
        return { committed: Promise.resolve(), finished: Promise.resolve() };
      },
    };
    assert.equal(asNavigation(real), real);
  });

  test("returns null where the API is missing or partial", () => {
    assert.equal(asNavigation(undefined), null);
    assert.equal(asNavigation(null), null);
    assert.equal(asNavigation("navigation"), null);
    assert.equal(asNavigation({}), null);
    assert.equal(asNavigation({ addEventListener() {} }), null);
    assert.equal(asNavigation({ traverseTo() {} }), null);
  });
});

describe("isTraversalToGuard — only real Back/Forward traversals", () => {
  const base = {
    navigationType: "traverse" as const,
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
  };

  test("guards an interceptable Back/Forward traversal", () => {
    assert.equal(isTraversalToGuard(base), true);
  });

  test("leaves pushes, replaces, reloads and non-interceptable traversals alone", () => {
    assert.equal(isTraversalToGuard({ ...base, navigationType: "push" }), false);
    assert.equal(isTraversalToGuard({ ...base, navigationType: "replace" }), false);
    assert.equal(isTraversalToGuard({ ...base, navigationType: "reload" }), false);
    assert.equal(isTraversalToGuard({ ...base, canIntercept: false }), false);
  });

  test("ignores fragment-only and download traversals", () => {
    assert.equal(isTraversalToGuard({ ...base, hashChange: true }), false);
    assert.equal(isTraversalToGuard({ ...base, downloadRequest: "file.pdf" }), false);
  });
});
