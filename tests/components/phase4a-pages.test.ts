/**
 * Structural tests for Ember Studio Phase 4A — Briefs and Proposals.
 *
 * Source-string assertions, same convention as phase3-pages.test.ts: the
 * .tsx files are JSX, so the zero-dependency runner reads them as text.
 * Real rendering is proven by `npm run verify:responsive` (browser audit)
 * and the screenshots in docs/screenshots/.
 *
 * Two kinds of assertion live here:
 *   1. the redesign contract — shared vocabulary, desk breakpoints, no
 *      wrapping-unsafe tab strip, one history vocabulary;
 *   2. the business wiring that must survive the redesign untouched —
 *      server actions, PDF route, restore/resolve/status flows.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const ui = read("components/ui/page.tsx");

const briefsPage = read("app/(app)/briefs/page.tsx");
const briefsList = read("components/briefs/BriefsList.tsx");
const briefBadge = read("components/briefs/StatusBadge.tsx");
const briefDetail = read("app/(app)/briefs/[id]/page.tsx");

const proposalsPage = read("app/(app)/proposals/page.tsx");
const proposalsList = read("components/proposals/ProposalsList.tsx");
const proposalBadge = read("components/proposals/ProposalStatusBadge.tsx");
const proposalDetail = read("app/(app)/proposals/[id]/page.tsx");
const proposalVersion = read(
  "app/(app)/proposals/[id]/versions/[versionId]/page.tsx"
);
const proposalContent = read("components/proposals/ProposalContent.tsx");
const proposalHistory = read("components/proposals/ProposalVersionHistory.tsx");

const PHASE_4A_FILES = [
  briefsPage,
  briefsList,
  briefBadge,
  briefDetail,
  proposalsPage,
  proposalsList,
  proposalBadge,
  proposalDetail,
  proposalVersion,
  proposalContent,
  proposalHistory,
];

describe("shared vocabulary additions (components/ui/page.tsx)", () => {
  it("exports the history list used by both audit trails", () => {
    assert.ok(ui.includes("export function HistoryList"));
    assert.ok(ui.includes("export function HistoryItem"));
  });

  it("history rows keep a dot rail, a title, a meta line and a 44px action row", () => {
    assert.ok(ui.includes("rounded-full"), "dot rail");
    assert.ok(ui.includes("flex flex-wrap items-center gap-1.5"), "action row");
    assert.ok(ui.includes("pb-5 last:pb-0"), "rail spacing");
  });

  it("the list is an ordered list with an accessible name", () => {
    assert.ok(ui.includes("<ol aria-label={label}"));
  });
});

describe("Briefs (/briefs) — list", () => {
  it("heads the page with the shared PageHeader and the workspace eyebrow", () => {
    assert.ok(briefsPage.includes("<PageHeader"));
    assert.ok(briefsPage.includes("eyebrow={context?.name}"));
    assert.ok(briefsPage.includes('href="/intake"'), "New brief still goes to intake");
  });

  it("filters with the shared wrapping FilterChips, not the overflow-prone tab strip", () => {
    assert.ok(briefsList.includes("<FilterChips"));
    assert.ok(!briefsList.includes("TabsList"), "no underline tab strip");
    assert.ok(!briefsList.includes("@/components/ui/tabs"));
  });

  it("uses the shared EmptyState for both the no-match and no-briefs states", () => {
    assert.ok(briefsList.includes("<EmptyState"));
    assert.ok(briefsList.includes("No matching briefs"));
    assert.ok(briefsList.includes("No briefs yet"));
    assert.ok(briefsList.includes("Clear filters"));
    assert.ok(briefsList.includes("Create your first brief"));
  });

  it("keeps the search labelled and the title link at a 44px target", () => {
    assert.ok(briefsList.includes('aria-label="Search briefs"'));
    assert.ok(briefsList.includes("inline-flex min-h-11 min-w-11 items-center"));
  });

  it("stacks search under the chips on phones and beside them from 600px", () => {
    assert.ok(
      briefsList.includes("flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between")
    );
  });
});

describe("Briefs — status and detail", () => {
  it("status badges: draft muted, in review accent, approved success", () => {
    assert.ok(briefBadge.includes("bg-muted"));
    assert.ok(briefBadge.includes("bg-accent-soft text-accent"));
    assert.ok(briefBadge.includes("bg-success text-success-foreground"));
  });

  it("detail page uses the shared DocHeader and SectionCard, with a desk-band split", () => {
    assert.ok(briefDetail.includes("<DocHeader"));
    assert.ok(briefDetail.includes("<SectionCard"));
    assert.ok(briefDetail.includes("desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"));
    assert.ok(!briefDetail.includes("lg:grid-cols"), "one breakpoint language: desk");
  });

  it("brief history renders through the shared HistoryList, newest first", () => {
    assert.ok(briefDetail.includes("<HistoryList"));
    assert.ok(briefDetail.includes("<HistoryItem"));
    assert.ok(briefDetail.includes("newest first"));
  });

  it("open questions stay on the accent tint, not amber (design guard allowlist)", () => {
    assert.ok(briefDetail.includes("border-accent bg-accent-soft"));
    assert.ok(!briefDetail.includes("highlight"));
  });

  it("keeps the business wiring: actions, data reads and the not-found guard", () => {
    for (const token of [
      "getBriefById(id)",
      "isUuid(id)",
      "<StatusSelect briefId={brief.id}",
      "<ResolveQuestionDialog",
      "<GenerateProposalButton briefId={brief.id}",
      "<AddSourceForm briefId={brief.id}",
      "<CanEdit",
      "Brief not found",
    ]) {
      assert.ok(briefDetail.includes(token), `missing: ${token}`);
    }
  });
});

describe("Proposals (/proposals) — list", () => {
  it("heads the page with PageHeader and keeps the 'Open briefs' action", () => {
    assert.ok(proposalsPage.includes("<PageHeader"));
    assert.ok(proposalsPage.includes('href="/briefs"'));
    assert.ok(proposalsPage.includes("Open briefs"));
  });

  it("filters with FilterChips and uses the shared EmptyState", () => {
    assert.ok(proposalsList.includes("<FilterChips"));
    assert.ok(!proposalsList.includes("TabsList"));
    assert.ok(proposalsList.includes("<EmptyState"));
    assert.ok(proposalsList.includes("No proposals yet"));
    assert.ok(proposalsList.includes("No matching proposals"));
  });

  it("status badges mirror the invoice vocabulary: sent = info, accepted = success", () => {
    assert.ok(proposalBadge.includes("border-info bg-info-soft text-info"));
    assert.ok(proposalBadge.includes("bg-success text-success-foreground"));
    assert.ok(proposalBadge.includes("bg-error/10 text-error"), "declined keeps error tint");
  });
});

describe("Proposals — document and rail", () => {
  it("the live and snapshot pages both render the shared ProposalContent", () => {
    assert.ok(proposalDetail.includes("<ProposalContent"));
    assert.ok(proposalVersion.includes("<ProposalContent"));
  });

  it("document body is two named sections: scope of work and budget & timeline", () => {
    assert.ok(proposalContent.includes("Scope of work"));
    assert.ok(proposalContent.includes("Budget & timeline"));
    assert.ok(proposalContent.includes('aria-labelledby="proposal-scope"'));
    assert.ok(proposalContent.includes('aria-labelledby="proposal-budget"'));
    assert.ok(proposalContent.includes("whitespace-pre-line"));
  });

  it("keeps the PDF export wired to the current proposal (not the snapshot)", () => {
    assert.ok(
      proposalDetail.includes("<DownloadPdfButton href={`/api/pdf/proposal/${proposal.id}`} />")
    );
    assert.ok(!proposalVersion.includes("DownloadPdfButton"));
  });

  it("the rail moves to the desk band and uses SectionCard panels", () => {
    assert.ok(proposalDetail.includes("desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"));
    assert.ok(proposalVersion.includes("desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"));
    assert.ok(!proposalDetail.includes("lg:grid-cols"));
    assert.ok(!proposalVersion.includes("lg:grid-cols"));
    assert.ok(proposalDetail.includes("<SectionCard"));
    assert.ok(proposalVersion.includes("<SectionCard"));
  });

  it("version history renders through the shared HistoryList and keeps its guards", () => {
    assert.ok(proposalHistory.includes("<HistoryList"));
    assert.ok(proposalHistory.includes("<HistoryItem"));
    assert.ok(proposalHistory.includes("<CanEdit>"));
    assert.ok(proposalHistory.includes("!isCurrent"));
    assert.ok(proposalHistory.includes("<RestoreVersionButton"));
  });
});

describe("Phase 4A guard rails", () => {
  it("no 4A file introduces amber (the design guard allowlist stays intact)", () => {
    for (const source of PHASE_4A_FILES) {
      assert.ok(!/\b(?:bg|text|border)-(?:highlight|amber)/.test(source));
    }
  });

  it("no 4A file hardcodes a hex colour", () => {
    for (const source of PHASE_4A_FILES) {
      assert.ok(!/#[0-9a-fA-F]{6}\b/.test(source), "use a token");
    }
  });

  it("radii use the semantic tokens (control 8px / surface 12px), never arbitrary pixels", () => {
    // Rounded corners in the 4A files should use the semantic radii (or the
    // existing Card primitive), not arbitrary pixel values.
    for (const source of PHASE_4A_FILES) {
      assert.ok(!/rounded-\[\d/.test(source), "no arbitrary radius");
    }
  });
});
