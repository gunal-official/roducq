import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

describe("Forma Phase C presentation contracts", () => {
  it("scopes every redesigned route without modifying the public homepage", () => {
    for (const path of ["app/(app)/dashboard/page.tsx", "components/intake/IntakeClient.tsx", "app/(app)/intake/inbox/page.tsx", "app/(app)/settings/page.tsx"]) {
      const source = read(path);
      assert.ok(source.includes("forma-core"));
      assert.equal((source.match(/<PageHeader\b/g) ?? []).length, 1);
      assert.equal((source.match(/<h1\b/g) ?? []).length, 0);
    }
    assert.ok(!read("app/(marketing)/page.tsx").includes("forma-core"));
  });
  it("workflow has an accessible, non-automatic progression description", () => {
    const art = read("components/workflow/WorkflowArt.tsx");
    assert.ok(art.includes('role="img"'));
    assert.ok(art.includes("Each stage requires your review and action"));
    for (const stage of ["Intake", "Brief", "Proposal", "Plan", "Update"]) assert.ok(art.includes(`"${stage}"`));
    assert.ok(!art.includes("<animate"), "motion belongs in reduced-motion-aware CSS");
  });
  it("workflow supplements rather than replaces functional stage links", () => {
    const dashboard = read("app/(app)/dashboard/page.tsx");
    assert.ok(dashboard.includes("<WorkflowArt />"));
    assert.ok(dashboard.includes("FLOW_STAGES.map"));
    assert.ok(dashboard.includes("{flowCounts[i]}"));
    assert.ok(dashboard.includes("href={stage.href}"));
  });
  it("intake guidance only replaces the initial empty preview", () => {
    const intake = read("components/intake/IntakeClient.tsx");
    assert.ok(intake.includes('phase === "input" ? <IntakeGuide /> : <BriefForm'));
    for (const handler of ["handleSave", "handleGenerate", "handleReset"]) assert.ok(intake.includes(handler));
    const composer = read("components/intake/SourcePanel.tsx");
    assert.ok(composer.includes('htmlFor="intake-context"'));
    assert.ok(composer.includes('id="intake-context"'));
    assert.ok(composer.includes('role="alert"'));
  });
  it("inbox counts are derived from filtered threads and retains filter semantics", () => {
    const list = read("components/intake/InboxThreadList.tsx");
    assert.ok(list.includes("{visible.length} of {threads.length}"));
    assert.ok(list.includes("<AddSourceForm briefId={thread.briefId}"));
    assert.ok(read("components/ui/filter-chips.tsx").includes("aria-pressed={selected}"));
  });
  it("settings retains permission-derived anchor navigation", () => {
    const settings = read("app/(app)/settings/page.tsx");
    assert.ok(settings.includes("workspace && isOwner"));
    assert.ok(settings.includes("<SettingsNav sections={sections}"));
    assert.ok(read("components/settings/SettingsNav.tsx").includes('href={`#${section.id}`}'));
  });
  it("motion is opt-in, has no hidden base content, and is disabled when reduced", () => {
    const css = read("app/globals.css").split("/* Phase C:")[1];
    assert.ok(css.includes("prefers-reduced-motion: no-preference"));
    assert.ok(css.includes("prefers-reduced-motion: reduce"));
    assert.ok(css.includes("animation: none !important"));
    assert.ok(!css.includes("animation-fill-mode"));
    assert.ok(!css.includes("opacity: 0;") || css.includes(".workflow-pulse { opacity: 0; }"));
    assert.ok(css.includes(".dark .forma-core"));
    assert.ok(css.includes(":focus-visible"));
  });
});
