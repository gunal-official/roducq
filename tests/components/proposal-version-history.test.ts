/**
 * Structural tests for the proposal version history UI (Queue #7) —
 * source-string assertions, same convention as doc-detail.test.ts /
 * nav.test.ts: the .tsx files are JSX, so the zero-dep runner reads them.
 * The DB behaviour these components sit on is proven for real in
 * tests/db/proposal-versions.test.ts and scripts/verify-db.mjs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(rel: string): string {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

const history = read("components/proposals/ProposalVersionHistory.tsx");
const restoreBtn = read("components/proposals/RestoreVersionButton.tsx");
const content = read("components/proposals/ProposalContent.tsx");
const versionPage = read(
  "app/(app)/proposals/[id]/versions/[versionId]/page.tsx"
);
const detailPage = read("app/(app)/proposals/[id]/page.tsx");
const actions = read("app/(app)/proposals/[id]/actions.ts");
const dataLib = read("lib/data/proposals.ts");

describe("ProposalVersionHistory card", () => {
  it("renders the 'Version history' card from passed-in versions", () => {
    assert.ok(history.includes("export function ProposalVersionHistory"));
    assert.ok(history.includes("Version history"));
    assert.ok(history.includes("versionReasonLabel"));
    assert.ok(history.includes("versionMatchesCurrent"));
  });

  it("links every row to the read-only snapshot view", () => {
    assert.ok(
      history.includes(
        "href={`/proposals/${proposalId}/versions/${version.id}`}"
      )
    );
  });

  it("gates Restore behind CanEdit (viewers get no affordance)", () => {
    assert.ok(history.includes("<CanEdit>"));
    assert.ok(history.includes("<RestoreVersionButton"));
    // Restore is hidden — not disabled — when the snapshot IS current.
    assert.ok(history.includes("!isCurrent"));
  });

  it("marks the snapshot that equals the live proposal as Current", () => {
    assert.ok(history.includes("Current"));
  });

  it("states the append-only rule in the footer copy", () => {
    assert.ok(
      history.includes("can’t") && history.includes("edited or deleted")
    );
  });
});

describe("RestoreVersionButton", () => {
  it("is a client component calling the restoreProposalVersion action", () => {
    assert.ok(restoreBtn.startsWith('"use client"'));
    assert.ok(
      restoreBtn.includes("restoreProposalVersion") &&
        restoreBtn.includes("@/app/(app)/proposals/[id]/actions")
    );
  });

  it("uses the house two-click inline confirm (no window.confirm)", () => {
    assert.ok(restoreBtn.includes("setConfirming(true)"));
    assert.ok(restoreBtn.includes("Cancel"));
    assert.ok(!restoreBtn.includes("window.confirm"));
    // The confirm copy promises the pre-restate capture (auditability).
    // (Asserted in two fragments — the JSX wraps the sentence.)
    assert.ok(
      restoreBtn.includes("content is saved as a new") &&
        restoreBtn.includes("version first"),
      "confirm copy states the current content is versioned first"
    );
  });

  it("refreshes the route after a successful restore", () => {
    assert.ok(restoreBtn.includes("router.refresh()"));
  });
});

describe("read-only snapshot view (/proposals/:id/versions/:versionId)", () => {
  it("renders the frozen document through the shared ProposalContent", () => {
    assert.ok(versionPage.includes("<ProposalContent"));
    assert.ok(versionPage.includes("version.budget_timeline"));
    assert.ok(versionPage.includes("version.deliverables"));
  });

  it("is explicitly read-only: banner + no status select + no PDF export", () => {
    assert.ok(versionPage.includes("Read-only snapshot"));
    assert.ok(!versionPage.includes("ProposalStatusSelect"));
    assert.ok(!versionPage.includes("DownloadPdfButton"));
    assert.ok(versionPage.includes("PDF export always uses the"));
  });

  it("verifies the version belongs to the URL's proposal (no cross-URL reads)", () => {
    assert.ok(versionPage.includes("version.proposal_id !== proposal.id"));
  });

  it("renders Restore editors-only, and never for the current content", () => {
    assert.ok(versionPage.includes("<CanEdit>"));
    assert.ok(versionPage.includes("<RestoreVersionButton"));
    assert.ok(versionPage.includes("!isCurrent"));
  });
});

describe("proposal detail page wiring", () => {
  it("fetches history and mounts the card", () => {
    assert.ok(detailPage.includes("getProposalVersions(proposal.id)"));
    assert.ok(detailPage.includes("<ProposalVersionHistory"));
  });

  it("renders the live document through the same shared ProposalContent", () => {
    assert.ok(detailPage.includes("<ProposalContent"));
    assert.ok(detailPage.includes("proposal.budget_timeline"));
    assert.ok(detailPage.includes("proposal.deliverables"));
  });
});

describe("data + action layer", () => {
  it("lists versions newest first (version_number desc)", () => {
    assert.ok(
      dataLib.includes(
        '.order("version_number", { ascending: false })'
      )
    );
  });

  it("reads single snapshots via maybeSingle (null, not error, when absent)", () => {
    assert.ok(dataLib.includes("getProposalVersionById"));
    assert.ok(dataLib.includes(".maybeSingle()"));
  });

  it("the restore action re-gates editors and calls the RPC", () => {
    assert.ok(actions.includes("export async function restoreProposalVersion"));
    assert.ok(actions.includes("requireEditor"));
    assert.ok(actions.includes('"restore_proposal_version"'));
    // Friendly mappings for every refusal the RPC can raise.
    for (const token of [
      "already_current",
      "not_authorized",
      "version_not_found",
    ]) {
      assert.ok(actions.includes(token), token);
    }
  });
});
