import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const css = read("app/globals.css");
const menu = read("components/ui/menu.tsx");
const harness = read("scripts/verify-unsaved-edits.mjs");

describe("mobile account-menu obstruction regression", () => {
  it("raises the topbar only when its account menu is open and reserves mobile scroll space", () => {
    assert.match(css, /header\.app-topbar:has\(\.account-menu\)\s*\{\s*z-index:\s*60;/);
    assert.match(css, /@media screen and \(max-width:\s*599\.98px\)\s*\{[\s\S]*?\.account-menu\s*\{[^}]*max-height:[^}]*100dvh[^}]*safe-area-inset-bottom/);
    assert.match(menu, /account-menu[^"\n]*overflow-y-auto/);
  });

  it("checks the actual pointer target for every menu item without forcing clicks", () => {
    assert.match(harness, /async function auditAccountMenuTargets/);
    assert.match(harness, /document\.elementFromPoint\(/);
    assert.match(harness, /target\.receivesPointer, true/);
    assert.match(harness, /targets\.some\(\(target\) => target\.label\.includes\("Log out"\)\)/);
    const audit = harness.slice(harness.indexOf("async function auditAccountMenuTargets"), harness.indexOf("async function cleanShellMatrixProbe"));
    assert.doesNotMatch(audit, /\.click\(\{[^}]*force:\s*true/);
  });
});
