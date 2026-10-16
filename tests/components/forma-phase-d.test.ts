/**
 * Structural tests for Forma Phase D — the client-work surfaces (Briefs,
 * Proposals, Plans, Updates, and the proposal version snapshot).
 *
 * Same convention as forma-phase-c.test.ts and phase4a-pages.test.ts: the
 * .tsx files are JSX, so the zero-dependency runner reads them as text.
 * Rendering, overflow and tap targets are proven by
 * `npm run verify:responsive` (real Chromium) and the screenshots in
 * docs/screenshots/forma-phase-d/.
 *
 * Three kinds of assertion:
 *   1. the Phase D presentation contract — lavender work planes, one header
 *      per route, work cards, rails, grouped tasks, the composer shell;
 *   2. the artwork contract — original SVG, token colours, nothing hidden
 *      behind an animation, one meaningful drawing with a real label;
 *   3. the preservation contract — the business wiring the redesign was not
 *      allowed to touch (queries, actions, exports, versions).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const PAGE_FILES = [
  "app/(app)/briefs/page.tsx",
  "app/(app)/briefs/[id]/page.tsx",
  "app/(app)/proposals/page.tsx",
  "app/(app)/proposals/[id]/page.tsx",
  "app/(app)/proposals/[id]/versions/[versionId]/page.tsx",
  "app/(app)/plans/page.tsx",
  "app/(app)/plans/[id]/page.tsx",
  "app/(app)/updates/page.tsx",
  "app/(app)/updates/[id]/page.tsx",
];

const COMPONENT_FILES = [
  "components/briefs/BriefsList.tsx",
  "components/proposals/ProposalsList.tsx",
  "components/plans/PlansList.tsx",
  "components/plans/TaskChecklist.tsx",
  "components/updates/UpdatesList.tsx",
  "components/updates/UpdateComposer.tsx",
  "components/proposals/ProposalContent.tsx",
  "components/proposals/ProposalVersionHistory.tsx",
  "components/workflow/WorkCard.tsx",
];

const ALL_FILES = [...PAGE_FILES, ...COMPONENT_FILES];

describe("Phase D — route scoping and heading structure", () => {
  it("scopes every redesigned route to a Phase D plane", () => {
    const expected: Record<string, string> = {
      "app/(app)/briefs/page.tsx": "forma-briefs",
      "app/(app)/briefs/[id]/page.tsx": "forma-briefs",
      "app/(app)/proposals/page.tsx": "forma-proposals",
      "app/(app)/proposals/[id]/page.tsx": "forma-proposals",
      "app/(app)/proposals/[id]/versions/[versionId]/page.tsx": "forma-proposals",
      "app/(app)/plans/page.tsx": "forma-plans",
      "app/(app)/plans/[id]/page.tsx": "forma-plans",
      "app/(app)/updates/page.tsx": "forma-updates",
      "app/(app)/updates/[id]/page.tsx": "forma-updates",
    };
    for (const [path, scope] of Object.entries(expected)) {
      const source = read(path);
      assert.ok(source.includes("forma-core"), `${path} is a Forma plane`);
      assert.ok(source.includes(scope), `${path} carries ${scope}`);
      assert.equal((source.match(/<h1\b/g) ?? []).length, 0, `${path} heads with the shared header`);
    }
  });

  it("gives each route exactly one shared page header", () => {
    const listRoutes = [
      "app/(app)/briefs/page.tsx",
      "app/(app)/proposals/page.tsx",
      "app/(app)/plans/page.tsx",
      "app/(app)/updates/page.tsx",
    ];
    for (const path of listRoutes) {
      const source = read(path);
      assert.equal((source.match(/<PageHeader\b/g) ?? []).length, 1, `${path} PageHeader`);
    }
    const detailRoutes = [
      "app/(app)/briefs/[id]/page.tsx",
      "app/(app)/proposals/[id]/page.tsx",
      "app/(app)/proposals/[id]/versions/[versionId]/page.tsx",
      "app/(app)/plans/[id]/page.tsx",
      "app/(app)/updates/[id]/page.tsx",
    ];
    for (const path of detailRoutes) {
      const source = read(path);
      assert.equal((source.match(/<DocHeader\b/g) ?? []).length, 1, `${path} DocHeader`);
    }
  });

  it("uses one breakpoint language: the desk band, never lg: grids", () => {
    for (const path of PAGE_FILES) {
      const source = read(path);
      assert.ok(
        !source.includes("lg:grid-cols"),
        `${path} uses the desk band like the rest of the app`
      );
    }
    for (const path of [
      "app/(app)/briefs/[id]/page.tsx",
      "app/(app)/proposals/[id]/page.tsx",
      "app/(app)/proposals/[id]/versions/[versionId]/page.tsx",
      "app/(app)/plans/[id]/page.tsx",
      "app/(app)/updates/[id]/page.tsx",
    ]) {
      assert.ok(
        read(path).includes("desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"),
        `${path} splits document + rail from 1024px`
      );
    }
  });

  it("keeps the document outline logical (h2 sections, h3 task groups)", () => {
    const brief = read("app/(app)/briefs/[id]/page.tsx");
    for (const id of ["brief-objective", "brief-deliverables", "brief-budget"]) {
      assert.ok(brief.includes(`id="${id}"`), id);
      assert.ok(brief.includes(`aria-labelledby="${id}"`), `${id} labels its section`);
    }
    const tasks = read("components/plans/TaskChecklist.tsx");
    assert.ok(tasks.includes('<h3 id="tasks-open"'));
    assert.ok(tasks.includes('<h3 id="tasks-done"'));
    assert.ok(read("app/(app)/plans/[id]/page.tsx").includes('aria-labelledby="plan-tasks"'));
  });
});

describe("Phase D — list vocabulary", () => {
  it("filters every list with the shared FilterChips control", () => {
    for (const path of [
      "components/briefs/BriefsList.tsx",
      "components/proposals/ProposalsList.tsx",
      "components/plans/PlansList.tsx",
      "components/updates/UpdatesList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<FilterChips"), `${path} uses FilterChips`);
      assert.ok(!source.includes("TabsList"), `${path} dropped the overflow-prone tab strip`);
    }
  });

  it("carries the 4A toolbar contract and one shared toolbar plane", () => {
    for (const path of [
      "components/briefs/BriefsList.tsx",
      "components/proposals/ProposalsList.tsx",
      "components/plans/PlansList.tsx",
      "components/updates/UpdatesList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("work-toolbar"), `${path} toolbar plane`);
      assert.ok(
        source.includes("flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between"),
        `${path} stacks the toolbar on phones`
      );
      assert.ok(source.includes('type="search"'), `${path} search field`);
      assert.ok(source.includes("<EmptyState"), `${path} shared empty state`);
    }
  });

  it("opens each list with a lavender band built from real counts", () => {
    for (const path of [
      "components/briefs/BriefsList.tsx",
      "components/proposals/ProposalsList.tsx",
      "components/plans/PlansList.tsx",
      "components/updates/UpdatesList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<WorkBand"), `${path} band`);
      assert.ok(source.includes("<WorkCard"), `${path} work cards`);
      assert.ok(source.includes("work-grid"), `${path} card grid`);
    }
  });

  it("renders a progress rail only where the record has a real fraction", () => {
    for (const [path, token] of [
      ["components/proposals/ProposalsList.tsx", "deliverablesTotal > 0"],
      ["components/plans/PlansList.tsx", "tasksTotal > 0"],
    ] as const) {
      const source = read(path);
      assert.ok(source.includes(token), `${path} gates on a real count`);
      assert.ok(source.includes("done:"), `${path} passes the real fraction`);
    }
    const briefs = read("components/briefs/BriefsList.tsx");
    assert.ok(!briefs.includes("progress={"), "brief cards count questions, not a fraction");
    const updates = read("components/updates/UpdatesList.tsx");
    assert.ok(!updates.includes("progress={"), "update cards carry an excerpt, not a count");
  });

  it("keeps every empty state honest about where the record comes from", () => {
    assert.ok(read("components/proposals/ProposalsList.tsx").includes("Open briefs"));
    assert.ok(read("components/plans/PlansList.tsx").includes("Open proposals"));
    assert.ok(read("components/updates/UpdatesList.tsx").includes("Open plans"));
    assert.ok(read("components/briefs/BriefsList.tsx").includes("Create your first brief"));
  });
});

describe("Phase D — artwork", () => {
  const art = read("components/workflow/ClientWorkArt.tsx");

  it("draws four original SVG illustrations, not raster imagery or icon fonts", () => {
    for (const name of [
      "BriefSourceArt",
      "ProposalDocumentArt",
      "PlanProgressArt",
      "UpdateTimelineArt",
    ]) {
      assert.ok(art.includes(`export function ${name}`), name);
    }
    assert.ok(!art.includes("<image"), "no raster art");
    assert.ok(!art.includes("<animate"), "no SMIL — motion belongs in reduced-motion-aware CSS");
  });

  it("hides decoration from assistive tech and labels the meaningful drawing", () => {
    const hidden = (art.match(/aria-hidden="true"/g) ?? []).length;
    assert.ok(hidden >= 3, "the three decorative drawings are aria-hidden");
    assert.ok(art.includes('role="img"'), "the task rail is a real image to a screen reader");
    assert.ok(
      art.includes("Task progress: ${done} of ${total} tasks ticked off"),
      "the rail label is generated from the counts it draws"
    );
    assert.ok(art.includes("Task progress: no tasks yet"), "and it degrades honestly");
  });

  it("never depends on an animation to be visible", () => {
    const css = read("app/globals.css");
    assert.ok(css.includes(".art-connector { stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 0; fill: none; }"));
    assert.ok(css.includes(".art-track-fill { stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 0; fill: none; }"));
    // The stylesheet mentions fill modes only to explain why it avoids them.
    const phaseDCss = css.split("/* Phase D:")[1] ?? "";
    const declared = [...phaseDCss.matchAll(/animation-fill-mode\s*:/g)].length;
    assert.equal(declared, 0, "no fill mode can pin a drawing to its first keyframe");
  });

  it("uses tokens, not literal brand colours", () => {
    for (const hex of art.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      assert.fail(`ClientWorkArt hardcodes ${hex}`);
    }
    assert.ok(art.includes("art-surface") && art.includes("art-track"));
  });
});

describe("Phase D — task workspace and composer", () => {
  it("keeps the task toggle wired to the existing server action", () => {
    const tasks = read("components/plans/TaskChecklist.tsx");
    assert.ok(tasks.includes('import { toggleTask } from "@/app/(app)/plans/[id]/actions"'));
    assert.ok(tasks.includes("onClick={() => handleToggle(task)}"), "the row calls the handler");
    assert.ok(tasks.includes('type="button"'));
    assert.ok(tasks.includes("disabled={pending || readOnly}"));
    assert.ok(tasks.includes("aria-pressed={task.checked}"));
    assert.ok(tasks.includes("// optimistic flip"));
    assert.ok(tasks.includes("// rollback"));
    assert.ok(tasks.includes("<WorkProgress label=\"Tasks ticked off\""));
  });

  it("says plainly that progress is a person's click, not automation", () => {
    const tasks = read("components/plans/TaskChecklist.tsx");
    assert.ok(tasks.includes("Nothing is marked done for you."));
    assert.ok(tasks.includes("You have view access — tasks are ticked off by editors."));
    assert.ok(read("components/plans/PlansList.tsx").includes("is a task someone completed"));
  });

  it("preserves the composer's save flow, template insert and error surface", () => {
    const composer = read("components/updates/UpdateComposer.tsx");
    assert.ok(composer.includes('import { saveUpdateContent } from "@/app/(app)/updates/[id]/actions"'));
    assert.ok(composer.includes("Unsaved changes"));
    assert.ok(composer.includes("All changes saved"));
    assert.ok(composer.includes('aria-label="Title"'));
    assert.ok(composer.includes('aria-label="Body (markdown)"'));
    assert.ok(composer.includes('aria-label="Insert template"'));
    assert.ok(composer.includes("current.trim() ==="));
    assert.ok(composer.includes('role="alert"'));
    assert.ok(composer.includes("disabled={pending || !dirty || !title.trim()}"));
  });
});

describe("Phase D — preserved business wiring", () => {
  it("keeps brief actions, queries and the permission gates", () => {
    const brief = read("app/(app)/briefs/[id]/page.tsx");
    for (const token of [
      "getBriefById(id)",
      "isUuid(id)",
      "<StatusSelect briefId={brief.id}",
      "<ResolveQuestionDialog",
      "<GenerateProposalButton briefId={brief.id}",
      "<AddSourceForm briefId={brief.id}",
      "<CanEdit",
      "<HistoryList",
      "Brief not found",
    ]) {
      assert.ok(brief.includes(token), `missing: ${token}`);
    }
  });

  it("keeps proposal versions, restore and the current-proposal PDF export", () => {
    const detail = read("app/(app)/proposals/[id]/page.tsx");
    const version = read("app/(app)/proposals/[id]/versions/[versionId]/page.tsx");
    const history = read("components/proposals/ProposalVersionHistory.tsx");
    const content = read("components/proposals/ProposalContent.tsx");
    assert.ok(detail.includes("<ProposalVersionHistory"));
    assert.ok(detail.includes("getProposalVersions(proposal.id)"));
    assert.ok(detail.includes("<DownloadPdfButton href={`/api/pdf/proposal/${proposal.id}`} />"));
    assert.ok(!version.includes("DownloadPdfButton"));
    assert.ok(version.includes("versionMatchesCurrent(version, proposal)"));
    assert.ok(version.includes("version.proposal_id !== proposal.id"), "cross-proposal reads stay blocked");
    assert.ok(history.includes("<RestoreVersionButton"));
    assert.ok(history.includes("!isCurrent"));
    assert.ok(content.includes('aria-labelledby="proposal-scope"'));
    assert.ok(content.includes('aria-labelledby="proposal-budget"'));
  });

  it("keeps plan actions, exports and the update share surface", () => {
    const plan = read("app/(app)/plans/[id]/page.tsx");
    for (const token of [
      "getPlanById(id)",
      "<TaskChecklist planId={plan.id}",
      "readOnly",
      "<ComposeUpdateButton planId={plan.id}",
      "<ExportMarkdownButton",
      "<PlanStatusSelect planId={plan.id}",
      "<DownloadPdfButton",
    ]) {
      assert.ok(plan.includes(token), `plan missing: ${token}`);
    }
    const update = read("app/(app)/updates/[id]/page.tsx");
    for (const token of [
      "getUpdateById(id)",
      "getShareLinkForUpdate(id)",
      "getTemplates(context.id)",
      "<ShareLinkPanel updateId={update.id}",
      "<UpdateComposer",
      "<ExportUpdateMarkdownButton",
      "<UpdateStatusSelect updateId={update.id}",
    ]) {
      assert.ok(update.includes(token), `update missing: ${token}`);
    }
  });
});

describe("Phase D — motion, themes and guard rails", () => {
  const css = read("app/globals.css");
  const phaseD = css.split("/* Phase D:")[1] ?? "";

  it("ships the mandated lavender palette through scoped aliases only", () => {
    for (const value of ["#F9F7FC", "#F2EEF8", "#EFEBFF", "#EEE9F5", "#AC7DFC"]) {
      assert.ok(phaseD.includes(value), `${value} is declared once, in the stylesheet`);
    }
    assert.ok(phaseD.includes(".dark .forma-briefs"));
    for (const file of ALL_FILES) {
      const source = read(file);
      for (const hex of source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        assert.fail(`${file} hardcodes ${hex}`);
      }
    }
  });

  it("keeps motion opt-in and disabled under reduced motion", () => {
    assert.ok(phaseD.includes("prefers-reduced-motion: no-preference"));
    assert.ok(phaseD.includes("prefers-reduced-motion: reduce"));
    assert.ok(phaseD.includes("animation: none !important"));
    for (const file of ALL_FILES) {
      const source = read(file);
      assert.ok(!source.includes("animate-pulse"), `${file} avoids continuous movement`);
    }
  });

  it("uses transforms and opacity for movement, never layout properties", () => {
    const keyframes = [...phaseD.matchAll(/@keyframes\s+[\w-]+\s*\{[^}]*\}/g)].map((m) => m[0]);
    assert.ok(keyframes.length >= 4, "the drawings animate");
    for (const block of keyframes) {
      for (const banned of ["width:", "height:", "margin", "top:", "left:"]) {
        assert.ok(!block.includes(banned), `keyframes animate layout: ${banned}`);
      }
    }
  });

  it("carries no amber/highlight tone and no arbitrary radii", () => {
    for (const file of ALL_FILES) {
      const source = read(file);
      assert.ok(
        !/\b(?:bg|text|border(?:-[trbl])?)-(?:highlight|amber)(?:-[\w-]+)?(?:\/\d+)?\b/.test(source),
        `${file} uses the highlight tone`
      );
      assert.ok(!/rounded-\[\d/.test(source), `${file} uses an arbitrary radius`);
    }
  });

  it("replaces the hand-rolled rail cards with the shared SectionCard", () => {
    for (const path of [
      "app/(app)/plans/[id]/page.tsx",
      "app/(app)/updates/[id]/page.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<SectionCard"), `${path} uses SectionCard`);
      assert.ok(!source.includes("CardHeader"), `${path} dropped ad-hoc Card markup`);
    }
  });
});

describe("Phase D — measured contrast on the tinted surfaces", () => {
  /** Relative luminance / contrast, WCAG 2.x definitions. */
  const srgb = (hex: string) => {
    const h = hex.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  const luminance = (hex: string) =>
    srgb(hex)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  /** The 90/10 secondary/text mix the Phase D scope declares. */
  const mix = (a: string, b: string, w: number) => {
    const pa = srgb(a);
    const pb = srgb(b);
    return (
      "#" +
      pa
        .map((v, i) => Math.round((v * (1 - w) + pb[i] * w) * 255).toString(16).padStart(2, "0"))
        .join("")
    );
  };

  const LIGHT = { secondary: "#687083", text: "#1B1426" };
  const DARK = { secondary: "#b7adca", text: "#f3eef9" };

  it("the supplied secondary tone is carried through a documented mix", () => {
    const css = read("app/globals.css").split("/* Phase D:")[1] ?? "";
    assert.ok(css.includes("--secondary-text: color-mix(in srgb, var(--forma-secondary-text) 90%, var(--forma-text));"));
    assert.ok(css.includes("--forma-secondary-text: #687083"), "the supplied tone is still declared");
  });

  it("clears 4.5:1 for body copy on every Phase D surface, both themes", () => {
    const light = [["bg", "#F9F7FC"], ["surface", "#FFFFFF"], ["lavender", "#EFEBFF"], ["muted", "#EEE9F5"]] as const;
    const dark = [["bg", "#17121e"], ["surface", "#1f1828"], ["lavender", "#312447"], ["muted", "#251d31"]] as const;
    const lightSecondary = mix(LIGHT.secondary, LIGHT.text, 0.1);
    const darkSecondary = mix(DARK.secondary, DARK.text, 0.1);
    for (const [name, hex] of light) {
      assert.ok(ratio(lightSecondary, hex) >= 4.5, `light secondary on ${name}: ${ratio(lightSecondary, hex).toFixed(2)}`);
      assert.ok(ratio(LIGHT.text, hex) >= 4.5, `light text on ${name}`);
    }
    for (const [name, hex] of dark) {
      assert.ok(ratio(darkSecondary, hex) >= 4.5, `dark secondary on ${name}: ${ratio(darkSecondary, hex).toFixed(2)}`);
      assert.ok(ratio(DARK.text, hex) >= 4.5, `dark text on ${name}`);
    }
    for (const [name, hex] of light) {
      assert.ok(ratio("#5B3FE0", hex) >= 4.5, `light accent on ${name}`);
    }
    for (const [name, hex] of dark) {
      assert.ok(ratio("#b9a0ff", hex) >= 4.5, `dark accent on ${name}`);
    }
    assert.ok(ratio("#FFFFFF", "#5B3FE0") >= 4.5, "white on the light accent");
    assert.ok(ratio("#21162d", "#b9a0ff") >= 4.5, "dark on-accent on the dark accent");
  });
});
