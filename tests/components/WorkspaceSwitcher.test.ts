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

  it("suppresses Enter's second activation after an option is selected on every switcher surface", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    const handler = src.slice(src.indexOf("function preventWorkspaceOptionEnterDefault"), src.indexOf("/** First letter"));
    assert.match(handler, /event\.key === "Enter"/);
    assert.match(handler, /event\.target\.getAttribute\("role"\) === "option"/);
    assert.match(handler, /event\.preventDefault\(\)/);
    assert.equal((src.match(/<SelectContent\b[^>]*onKeyDown=\{preventWorkspaceOptionEnterDefault\}/g) ?? []).length, 3);
  });

  it("keeps the phone panel's option list above the drawer and below the guard", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    const panel = src.slice(src.lastIndexOf('if (variant === "panel")'), src.indexOf("// inline —"));
    assert.match(panel, /<SelectContent className="z-\[75\] tab:z-50"/);
  });

  it("switching is wired through the server action", () => {
    const src = read("components/app-shell/WorkspaceSwitcher.tsx");
    assert.ok(src.includes("setActiveWorkspaceAction"));
    assert.ok(src.includes('aria-label="Switch workspace"'));
  });
});
