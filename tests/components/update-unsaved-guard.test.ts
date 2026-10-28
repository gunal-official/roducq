/**
 * Structural wiring checks for the update-editor unsaved-changes guard
 * (UX audit P2-02). Same convention as update-trust.test.ts and
 * forma-phase-d.test.ts: the .tsx files are JSX, so the zero-dependency
 * runner reads them as text. The real behaviour — dialog focus, Escape,
 * Back/Forward, refresh, save success and failure — is proven in Chromium by
 * scripts/verify-unsaved-edits.mjs.
 *
 * Three contracts:
 *   1. the guard is scoped to the composer and inert while the editor is clean;
 *   2. interception is narrow (links + traverse + unload) and never rewrites
 *      Next.js history state or adds a global blocker;
 *   3. the existing save flow, error surface and test-asserted copy are intact.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const guard = read("components/ui/unsaved-changes-guard.tsx");
const rules = read("lib/ui/unsaved-changes.ts");
const composer = read("components/updates/UpdateComposer.tsx");

describe("unsaved-changes guard — scope and dirty lifecycle", () => {
  it("mounts only in the update composer, driven by the saved-state comparison", () => {
    assert.ok(
      composer.includes(
        'import { useUnsavedChangesGuard } from "@/components/ui/unsaved-changes-guard"'
      ),
      "the composer mounts the guard"
    );
    assert.ok(
      composer.includes(
        'import { isEditorDirty } from "@/lib/ui/unsaved-changes"'
      ),
      "dirty is defined by the shared pure rule"
    );
    assert.match(
      composer,
      /const dirty = isEditorDirty\(\s*\{ title, body \},\s*\{ title: initialTitle, body: initialBody \}\s*\)/
    );
    // Same contract as before, with the discard hook the shell actions need.
    assert.match(
      composer,
      /const \{ dialog: unsavedChangesDialog \} = useUnsavedChangesGuard\(\{\s*dirty,\s*onDiscard:/
    );
    assert.ok(composer.includes("{unsavedChangesDialog}"), "the dialog renders");
  });

  it("registers its listeners only while dirty and removes all of them", () => {
    assert.match(guard, /if \(!dirty\) return undefined;/);
    assert.match(guard, /document\.addEventListener\("click", onClick, true\)/);
    assert.match(guard, /window\.addEventListener\("beforeunload", onBeforeUnload\)/);
    assert.match(guard, /navigation\?\.addEventListener\("navigate", onNavigate\)/);
    assert.match(guard, /document\.removeEventListener\("click", onClick, true\)/);
    assert.match(guard, /window\.removeEventListener\("beforeunload", onBeforeUnload\)/);
    assert.match(guard, /navigation\?\.removeEventListener\("navigate", onNavigate\)/);
    // Clean editors must not keep any interception alive.
    assert.match(guard, /if \(dirty\) return;\s*pendingRef\.current = null;/);
  });

  it("derives open state so a successful save closes the dialog", () => {
    assert.match(guard, /const open = dirty && pending !== null;/);
    assert.doesNotMatch(
      guard,
      /useEffect\(\(\) => \{\s*setPending\(/,
      "no setState-in-effect to paper over derived state"
    );
  });
});

describe("unsaved-changes guard — interception strategy", () => {
  it("reuses the shared dialog and its focus behaviour", () => {
    assert.ok(
      guard.includes('from "@/components/ui/dialog"'),
      "the shared accessible dialog is reused"
    );
    assert.ok(guard.includes('role="alertdialog"'));
    assert.ok(guard.includes("<DialogTitle>Discard unsaved changes?</DialogTitle>"));
    assert.ok(guard.includes("<DialogDescription>"));
    assert.ok(guard.includes("Keep editing"));
    assert.ok(guard.includes("Discard changes"));
    // The safe action receives focus; the invoker (or the editor) gets it back.
    assert.match(guard, /keepButtonRef\.current\?\.focus\(\)/);
    assert.match(guard, /invokerRef\.current\?\.isConnected/);
    assert.match(guard, /fallbackFocusSelector/);
    // Escape/close/overlay all resolve to "keep editing".
    assert.match(guard, /if \(!next\) stay\(\);/);
  });

  it("cancels the click before the Next.js router sees it", () => {
    assert.match(guard, /event\.preventDefault\(\);\s*event\.stopPropagation\(\);/);
    assert.ok(
      rules.includes("export function shouldGuardAnchorClick"),
      "the narrow predicate lives in the pure module"
    );
    assert.match(guard, /router\.push\(next\.href\)/);
  });

  it("uses the Navigation API for Back/Forward and the native prompt for unloads", () => {
    assert.match(guard, /asNavigation\(/);
    assert.match(guard, /event\.preventDefault\(\);[\s\S]*?kind: "traverse"/);
    assert.match(guard, /navigation\?\.traverseTo\(next\.key\)/);
    assert.match(guard, /event\.returnValue = ""/);
    assert.ok(
      rules.includes("event.navigationType === \"traverse\""),
      "only traversals are held"
    );
  });

  it("never rewrites history, patches the router or installs a global blocker", () => {
    for (const source of [guard, rules]) {
      assert.doesNotMatch(source, /history\.(?:pushState|replaceState|back|go)\(/);
      assert.doesNotMatch(source, /createContext\(|Provider\b/);
      assert.doesNotMatch(source, /unstable_/);
    }
    // The only router surface used is the public push() for confirmed clicks.
    assert.ok((guard.match(/router\.push\(/g) ?? []).length >= 1);
    assert.doesNotMatch(guard, /router\.(?:replace|refresh|back|forward)\(/);
    assert.ok(guard.includes('"use client"'));
    assert.ok(!rules.includes('"use client"'), "the rules stay pure and server-safe");
  });
});

describe("unsaved-changes guard — existing editor behaviour preserved", () => {
  it("keeps every save-flow assertion the earlier suites rely on", () => {
    assert.ok(
      composer.includes(
        'import { saveUpdateContent } from "@/app/(app)/updates/[id]/actions"'
      )
    );
    assert.ok(composer.includes("Unsaved changes"));
    assert.ok(composer.includes("All changes saved"));
    assert.ok(composer.includes('aria-label="Title"'));
    assert.ok(composer.includes('aria-label="Body (markdown)"'));
    assert.ok(composer.includes('aria-label="Insert template"'));
    assert.ok(composer.includes("current.trim() ==="));
    assert.ok(composer.includes('role="alert"'));
    assert.ok(composer.includes("disabled={pending || !dirty || !title.trim()}"));
  });

  it("announces the saved/unsaved transition as a polite live region", () => {
    assert.ok(composer.includes('role="status" aria-live="polite"'));
  });

  it("does not touch the server action, the page or other composers", () => {
    const page = read("app/(app)/updates/[id]/page.tsx");
    assert.ok(!page.includes("unsaved-changes-guard"), "the page is untouched");
    const actions = read("app/(app)/updates/[id]/actions.ts");
    assert.ok(actions.includes("saveUpdateContent"));
    assert.ok(!actions.includes("unsaved"));
  });
});
