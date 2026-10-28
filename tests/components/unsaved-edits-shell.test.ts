/**
 * Structural wiring checks for the sign-out / workspace-switch half of the
 * unsaved-edits guard. Same convention as update-unsaved-guard.test.ts: the
 * .tsx files are JSX, so the zero-dependency runner reads them as text. The
 * real behaviour — dialog, stay/discard, exactly-once actions, focus — is
 * proven by scripts/verify-unsaved-edits.mjs.
 *
 * Four contracts:
 *   1. the shell asks the guard BEFORE it calls supabase.auth.signOut or
 *      setActiveWorkspaceAction, and the original handlers are intact;
 *   2. a clean editor behaves exactly as before (the guard answers "ran");
 *   3. the existing dialog is reused, and no second navigation-blocking
 *      system (provider, router patch, history writes) is introduced;
 *   4. the dirty draft is dropped on discard, so nothing crosses workspaces,
 *      and auth / actions / RLS are untouched.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const guard = read("components/ui/unsaved-changes-guard.tsx");
const registry = read("lib/ui/unsaved-edits-registry.ts");
const composer = read("components/updates/UpdateComposer.tsx");
const logout = read("components/auth/logout-button.tsx");
const switcher = read("components/app-shell/WorkspaceSwitcher.tsx");
const topbar = read("components/app-shell/Topbar.tsx");
const mobileNav = read("components/app-shell/MobileNav.tsx");
const tabBar = read("components/app-shell/MobileTabBar.tsx");
const accountPanel = read("components/app-shell/AccountPanel.tsx");

const before = (source: string, first: string, second: string) => {
  const firstIndex = source.indexOf(first);
  assert.ok(firstIndex >= 0, `missing: ${first}`);
  const secondIndex = source.indexOf(second);
  assert.ok(secondIndex >= 0, `missing: ${second}`);
  assert.ok(
    firstIndex < secondIndex,
    `expected "${first}" before "${second}"`
  );
};

describe("unsaved-edits guard — sign-out is held until confirmed", () => {
  it("consults the guard before it touches the session", () => {
    assert.ok(
      logout.includes('import { requestGuardedAction } from "@/lib/ui/unsaved-edits-registry"'),
      "the sign-out button asks the registry"
    );
    // Exactly one real sign-out call, and the guard is consulted before it.
    assert.equal(
      (logout.match(/await supabase\.auth\.signOut\(/g) ?? []).length,
      1,
      "one sign-out call site"
    );
    // The only route to the sign-out call is the guarded handler.
    assert.match(
      logout,
      /const outcome = requestGuardedAction\(\{\s*action: "sign-out",\s*returnFocusSelector,\s*run: performSignOut,\s*\}\);\s*if \(outcome === "ran"\) \{\s*void performSignOut\(\);\s*return;\s*\}/,
      "a clean editor performs the original handler immediately"
    );
  });

  it("keeps the original sign-out handler byte-for-byte", () => {
    assert.match(
      logout,
      /await supabase\.auth\.signOut\(\{ scope: "local" \}\);/
    );
    assert.match(logout, /router\.replace\("\/login"\);/);
    assert.match(logout, /router\.refresh\(\);/);
    assert.match(logout, /disabled=\{pending\}/);
    assert.match(logout, /title="Log out"/);
    // pending is only set inside the handler that actually signs out.
    assert.match(logout, /async function performSignOut\(\) \{\s*setPending\(true\);/);
    assert.doesNotMatch(
      logout,
      /function handleLogout\(\) \{\s*setPending/,
      "the button never disables itself before confirmation"
    );
  });

  it("closes the menu or drawer that held the button when the guard takes over", () => {
    assert.match(logout, /dismissSurface\?\.\(\);/);
    assert.match(topbar, /dismissSurface=\{close\}/);
    assert.match(topbar, /returnFocusSelector="#account-menu-trigger"/);
    assert.match(topbar, /triggerId="account-menu-trigger"/);
    assert.match(accountPanel, /dismissSurface=\{signOutDismissSurface\}/);
    assert.match(accountPanel, /returnFocusSelector=\{signOutReturnFocusSelector\}/);
    assert.match(mobileNav, /signOutDismissSurface=\{onClose\}/);
    assert.match(
      mobileNav,
      /signOutReturnFocusSelector="\[data-app-menu-trigger\]"/
    );
    assert.ok(topbar.includes('data-app-menu-trigger=""'), "topbar menu button");
    assert.ok(tabBar.includes('data-app-menu-trigger=""'), "dock More button");
  });
});

describe("unsaved-edits guard — workspace switching is held until confirmed", () => {
  it("consults the guard before the server action", () => {
    assert.ok(
      switcher.includes('import { requestGuardedAction } from "@/lib/ui/unsaved-edits-registry"')
    );
    assert.equal(
      (switcher.match(/await setActiveWorkspaceAction\(/g) ?? []).length,
      1,
      "one server-action call site"
    );
    assert.match(
      switcher,
      /requestGuardedAction\(\{\s*action: "switch-workspace",\s*returnFocusSelector: `#\$\{triggerId\}`,\s*run: \(\) => applySwitch\(workspaceId\),\s*\}\);/
    );
    assert.match(switcher, /action: "switch-workspace"/);
    assert.match(
      switcher,
      /if \(workspaceId === activeWorkspaceId\) return;/,
      "selecting the current workspace stays a no-op"
    );
    assert.match(
      switcher,
      /if \(outcome === "ran"\) void applySwitch\(workspaceId\);/
    );
  });

  it("keeps the server action, its error surface and the single refresh", () => {
    assert.match(switcher, /const result = await setActiveWorkspaceAction\(\{ workspaceId \}\);/);
    assert.match(switcher, /if \(result\?\.error\) \{\s*setError\(result\.error\);/);
    assert.equal(
      (switcher.match(/router\.refresh\(\)/g) ?? []).length,
      1,
      "exactly one refresh, after a successful switch"
    );
    assert.match(switcher, /disabled=\{pending\}/);
    assert.ok(switcher.includes('aria-label="Switch workspace"'));
  });

  it("gives each switcher instance a focus-return target", () => {
    assert.match(switcher, /returnFocusSelector: `#\$\{triggerId\}`/);
    assert.match(switcher, /const triggerId = `workspace-trigger-\$\{/);
    assert.equal(
      (switcher.match(/id=\{triggerId\}/g) ?? []).length,
      3,
      "all three control variants carry the id"
    );
  });
});

describe("unsaved-edits guard — one dialog, one decision", () => {
  it("registers with the registry only while the editor is dirty", () => {
    assert.match(guard, /if \(!dirty\) return undefined;/);
    assert.match(guard, /registerUnsavedEditor\(\{/);
    assert.match(guard, /isDirty: \(\) => dirtyRef\.current/);
    assert.match(guard, /return \(\) => \{\s*dirtyRef\.current = false;\s*unregister\(\);/);
  });

  it("runs the confirmed action exactly once", () => {
    assert.match(guard, /if \(firedRef\.current\) return;\s*firedRef\.current = true;/);
    assert.match(guard, /onDiscardRef\.current\?\.\(\);/);
    assert.match(
      guard,
      /settled = next\.request\.run\(\);/,
      "the original handler is invoked, not a re-implementation"
    );
    assert.match(guard, /firedRef\.current = false;\s*busyRef\.current = false;/);
  });

  it("labels the destructive button with the action it performs", () => {
    assert.ok(guard.includes('"sign-out": "Discard and sign out"'));
    assert.ok(
      guard.includes('"switch-workspace": "Discard and switch workspace"')
    );
    // The shared dialog, its copy and its accessible semantics are unchanged.
    assert.ok(guard.includes('role="alertdialog"'));
    assert.ok(guard.includes("<DialogTitle>Discard unsaved changes?</DialogTitle>"));
    assert.ok(guard.includes("Keep editing"));
    assert.match(guard, /keepButtonRef\.current\?\.focus\(\)/);
    assert.match(guard, /if \(!next\) stay\(\);/);
  });

  it("returns focus to the shell control, then to the composer", () => {
    assert.match(guard, /focusFirstVisible\(returnSelector\)/);
    assert.match(guard, /document\.querySelector<HTMLElement>\(fallbackFocusSelector\)\?\.focus\(\)/);
    assert.match(
      guard,
      /if \(element\.getClientRects\(\)\.length > 0\)/,
      "the first VISIBLE trigger wins (the other one is display:none)"
    );
  });

  it("is still not a global blocker", () => {
    for (const source of [guard, registry]) {
      assert.doesNotMatch(source, /history\.(?:pushState|replaceState|back|go)\(/);
      assert.doesNotMatch(source, /createContext\(|Provider\b/);
      assert.doesNotMatch(source, /unstable_/);
      assert.doesNotMatch(source, /next\/navigation.*signOut|signOut.*next\/navigation/);
    }
    assert.doesNotMatch(guard, /router\.(?:replace|refresh|back|forward)\(/);
    assert.ok(!registry.includes('"use client"'), "the registry stays importable by tests");
    assert.doesNotMatch(registry, /window\.|document\./, "the registry stays DOM-free");
  });
});

describe("unsaved-edits guard — draft never follows the user", () => {
  it("drops the composer's draft when the user discards", () => {
    assert.match(composer, /onDiscard: \(\) => \{/);
    assert.match(composer, /setTitle\(initialTitle\);/);
    assert.match(composer, /setBody\(initialBody\);/);
    assert.match(composer, /\{unsavedChangesDialog\}/);
  });

  it("leaves auth, the server action and the data layer untouched", () => {
    const action = read("app/(app)/actions.ts");
    assert.ok(action.includes("setActiveWorkspaceAction"));
    assert.ok(!action.includes("unsaved"), "no guard logic in the server action");
    const updateAction = read("app/(app)/updates/[id]/actions.ts");
    assert.ok(updateAction.includes("saveUpdateContent"));
    assert.ok(!updateAction.includes("unsaved"));
    // Sign-out still lives in exactly one client component, still "local".
    const signOutScopes = [
      read("components/auth/logout-button.tsx"),
      read("app/(auth)/reset-password/page.tsx"),
    ];
    assert.ok(signOutScopes[0].includes('scope: "local"'));
    // The recovery flow's security-driven sign-out is deliberately unguarded.
    assert.match(
      signOutScopes[1],
      /await createClient\(\)\.auth\.signOut\(\);/
    );
    assert.ok(
      !signOutScopes[1].includes("requestGuardedAction"),
      "password recovery never waits on a draft"
    );
  });
});
