import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("WorkspaceSwitcher", () => {
  it("renders a real control and a plain name when only one workspace", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    assert.ok(src.includes("export function WorkspaceSwitcher"));
    assert.ok(src.includes("SwitcherWorkspace"));
    assert.ok(src.includes("workspaces.length <= 1"));
    assert.ok(src.includes('role="combobox"') || src.includes("SelectValue") || src.includes("SelectTrigger"));
  });

  it("names the static compact monogram without pretending it is a control", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    const start = src.indexOf('if (variant === "compact")');
    const end = src.indexOf('if (variant === "panel")', start);
    const singleCompact = src.slice(start, end);
    assert.match(singleCompact, /role="img"/);
    assert.match(singleCompact, /aria-label=\{`Workspace: \$\{activeName\}`\}/);
    assert.match(singleCompact, /aria-hidden="true"/);
    assert.doesNotMatch(singleCompact, /<button|<SelectTrigger|tabIndex=/);
  });

  it("switching is wired through the server action", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    assert.ok(src.includes("setActiveWorkspaceAction"));
    assert.ok(src.includes('aria-label="Switch workspace"'));
  });
});
