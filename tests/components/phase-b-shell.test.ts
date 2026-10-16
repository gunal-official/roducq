/**
 * Structural gates for the Forma Phase B application shell and the
 * authentication screens.
 *
 * These are not snapshot tests: they assert the decisions Phase B made
 * that a future edit could quietly undo — the shell grid living in CSS
 * (so the load-bearing wrapper class names stay untouched), the brand
 * mark's per-instance gradient ids, the entrance animations never being
 * able to hide content, and every auth screen keeping its business
 * logic while wearing the new skin.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("Forma Phase B — application shell", () => {
  it("ships the new shell surfaces", () => {
    assert.ok(read("components/app-shell/RoduMark.tsx").includes("export function RoduMark"));
    assert.ok(read("components/app-shell/AppearanceSwitch.tsx").includes("export function AppearanceSwitch"));
    assert.ok(read("components/app-shell/AccountPanel.tsx").includes("export function AccountPanel"));
  });

  it("keeps the app-shell hooks and the asserted wrapper class names verbatim", () => {
    const layout = read("app/(app)/layout.tsx");
    assert.ok(layout.includes('<div className="app-topbar col-span-2 print:hidden">'));
    assert.ok(layout.includes('<div className="app-sidebar hidden print:hidden tab:block">'));
    assert.ok(layout.includes("app-shell"));
    assert.ok(layout.includes("app-main"));
    assert.ok(layout.includes("getInitials"));
  });

  it("lays the full-height rail out in CSS rather than by editing the wrappers", () => {
    const css = read("app/globals.css");
    assert.ok(css.includes("@media screen and (min-width: 600px)"));
    assert.ok(css.includes("@media screen and (min-width: 1024px)"));
    assert.ok(css.includes(".app-sidebar"));
    assert.ok(css.includes(".app-topbar"));
    assert.ok(css.includes("grid-template-columns: 256px"));
    assert.ok(css.includes("grid-column: 2"));
    assert.ok(css.includes("grid-row: 1 / span 2"));
  });

  it("fades the bottom of a long section list so it reads as scrollable", () => {
    const css = read("app/globals.css");
    assert.ok(css.includes(".app-rail-nav::after"));
    assert.ok(css.includes("position: sticky"));
    assert.ok(css.includes("linear-gradient"));
  });

  it("gives the brand mark per-instance gradient ids", () => {
    const src = read("components/app-shell/RoduMark.tsx");
    assert.ok(src.includes("useId()"));
    assert.ok(src.includes("linearGradient"));
    assert.ok(src.includes("radialGradient"));
    // A shared id would let a copy inside a display:none subtree become
    // the paint server for every visible copy, and the plate would vanish.
    assert.ok(src.includes("roducq-plate-${uid}"));
    assert.doesNotMatch(src, /#[0-9a-f]{3,8}\b/i, "the mark must use tokens, not palette literals");
  });

  it("keeps the phone drawer above the floating timer", () => {
    const nav = read("components/app-shell/MobileNav.tsx");
    assert.ok(nav.includes("z-[70]"), "the drawer must outrank the z-50 timer");
    assert.ok(read("components/time/TimeTimer.tsx").includes("z-50"));
  });

  it("offers the theme switch in the rail and in the phone drawer", () => {
    assert.ok(read("components/app-shell/Sidebar.tsx").includes("AccountPanel"));
    assert.ok(read("components/app-shell/MobileNav.tsx").includes("AccountPanel"));
    assert.ok(read("components/app-shell/AccountPanel.tsx").includes("AppearanceSwitch"));
    const sw = read("components/app-shell/AppearanceSwitch.tsx");
    for (const value of ["light", "dark", "system"]) {
      assert.ok(sw.includes(`value: "${value}"`));
    }
  });
});

describe("Forma Phase B — motion", () => {
  it("never lets a stalled entrance animation hide content", () => {
    const css = read("app/globals.css");
    // A `both` fill pins an element to the keyframe's `from` state while
    // the animation has not started — and an animation inside a
    // display:none subtree never starts. That is how a real card or the
    // brand glyph can end up invisible.
    for (const cls of [".animate-forma-rise", ".animate-forma-stagger-in", ".forma-draw", ".forma-flow"]) {
      const at = css.indexOf(cls);
      assert.notEqual(at, -1, `${cls} is missing from app/globals.css`);
      const block = css.slice(at, css.indexOf("}", at));
      assert.doesNotMatch(block, /\bboth\b/, `${cls} must not use animation-fill-mode: both`);
    }
  });

  it("keeps the draw dash inside the keyframes so a still mark is still drawn", () => {
    const css = read("app/globals.css");
    const at = css.indexOf("@keyframes forma-draw");
    assert.notEqual(at, -1);
    const block = css.slice(at, css.indexOf("}", css.indexOf("}", at)));
    assert.ok(block.includes("stroke-dasharray"));
    assert.ok(block.includes("stroke-dashoffset"));
  });

  it("kills every Phase B movement under prefers-reduced-motion", () => {
    const css = read("app/globals.css");
    const at = css.indexOf("@media (prefers-reduced-motion: reduce)", css.indexOf(".forma-drift-node"));
    assert.notEqual(at, -1);
    const block = css.slice(at, css.indexOf("}", css.indexOf(".forma-pulse-ring", at)));
    for (const cls of [".animate-forma-rise", ".forma-draw", ".forma-flow", ".forma-drift-node"]) {
      assert.ok(block.includes(cls), `${cls} must be reduced`);
    }
  });
});

describe("Forma Phase B — authentication", () => {
  it("uses the shared card and field on every auth screen", () => {
    for (const rel of [
      "app/(auth)/login/page.tsx",
      "app/(auth)/signup/page.tsx",
      "app/(auth)/onboarding/page.tsx",
    ]) {
      const src = read(rel);
      assert.ok(src.includes("AuthCard"), rel);
      assert.ok(src.includes("AuthField"), rel);
    }
  });

  it("preserves the login next-guard, the invite flow and the onboarding action", () => {
    const login = read("app/(auth)/login/page.tsx");
    assert.ok(login.includes("next"));
    assert.ok(login.includes("/intake"));
    assert.ok(read("components/auth/GoogleSignInButton.tsx").includes("signInWithGoogle"));

    const signup = read("app/(auth)/signup/page.tsx");
    assert.ok(signup.includes("invite"));

    const onboarding = read("app/(auth)/onboarding/page.tsx");
    assert.ok(onboarding.includes("createWorkspaceAction"));
  });

  it("keeps the auth panel decorative and hidden below the split band", () => {
    const layout = read("app/(auth)/layout.tsx");
    assert.ok(layout.includes("auth-panel"));
    assert.ok(layout.includes("AuthArtwork"));
    assert.match(layout, /className="auth-panel[^"]*hidden[^"]*"/);

    const artwork = read("components/auth/AuthArtwork.tsx");
    assert.ok(artwork.includes('aria-hidden="true"'));
    assert.ok(artwork.includes("useId()"));
    assert.doesNotMatch(artwork, /#[0-9a-f]{3,8}\b/i, "the artwork must use tokens, not palette literals");
  });

  it("keeps the config notice and the Google button wired", () => {
    assert.ok(read("components/auth/ConfigNotice.tsx").includes("rounded-surface"));
    assert.ok(read("components/auth/GoogleSignInButton.tsx").includes("Google"));
  });
});
