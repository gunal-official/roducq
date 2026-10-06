/**
 * Unit tests for lib/proposal-versions.ts — the pure helpers behind the
 * proposal detail page's Version history card and the read-only snapshot
 * view (Queue #7).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PROPOSAL_VERSION_REASONS,
  versionMatchesCurrent,
  versionReasonLabel,
} from "../../lib/proposal-versions.ts";

describe("versionReasonLabel", () => {
  it("labels every reason the table CHECK allows", () => {
    assert.deepEqual(PROPOSAL_VERSION_REASONS, [
      "created",
      "edited",
      "restored",
    ]);
    assert.equal(versionReasonLabel("created"), "Initial snapshot");
    assert.equal(versionReasonLabel("edited"), "Before an edit");
    assert.equal(versionReasonLabel("restored"), "Before a restore");
  });
});

describe("versionMatchesCurrent", () => {
  const current = {
    title: "Brightloop Co. — Brand Refresh",
    client_name: "Brightloop Co.",
    status: "sent" as const,
    budget_timeline: "Kickoff Oct 19",
    deliverables: [
      { id: "d1", text: "Logo suite", checked: true },
      { id: "d2", text: "Brand guide", checked: false },
    ],
  };

  it("is true when every snapshot field equals the live proposal", () => {
    assert.equal(versionMatchesCurrent({ ...current }, current), true);
  });

  it("treats null and empty deliverables arrays as equal (jsonb default)", () => {
    assert.equal(
      versionMatchesCurrent(
        { ...current, deliverables: null as never },
        { ...current, deliverables: [] }
      ),
      true
    );
  });

  it("is false when any single content field differs", () => {
    assert.equal(
      versionMatchesCurrent({ ...current, title: "Old title" }, current),
      false,
      "title"
    );
    assert.equal(
      versionMatchesCurrent({ ...current, client_name: null }, current),
      false,
      "client_name"
    );
    assert.equal(
      versionMatchesCurrent({ ...current, status: "draft" }, current),
      false,
      "status"
    );
    assert.equal(
      versionMatchesCurrent(
        { ...current, budget_timeline: null },
        current
      ),
      false,
      "budget_timeline"
    );
    assert.equal(
      versionMatchesCurrent(
        {
          ...current,
          deliverables: [
            { id: "d1", text: "Logo suite", checked: false }, // flip
            { id: "d2", text: "Brand guide", checked: false },
          ],
        },
        current
      ),
      false,
      "a checked flip inside deliverables"
    );
  });

  it("a structurally identical deep copy still matches (no reference equality)", () => {
    assert.equal(
      versionMatchesCurrent(
        JSON.parse(JSON.stringify(current)),
        JSON.parse(JSON.stringify(current))
      ),
      true
    );
  });

  it("deliverable ARRAY order is content: reordered items do not match", () => {
    assert.equal(
      versionMatchesCurrent(
        { ...current, deliverables: [...current.deliverables].reverse() },
        current
      ),
      false
    );
  });
});
