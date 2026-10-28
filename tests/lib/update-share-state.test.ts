import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getUpdateShareState,
  UPDATE_SHARE_PRESENTATION,
} from "../../lib/ui/update-share-state.ts";

describe("update share-link presentation", () => {
  it("distinguishes no link, an active link and a revoked link", () => {
    assert.equal(getUpdateShareState(null), "none");
    assert.equal(getUpdateShareState({ revoked_at: null }), "active");
    assert.equal(getUpdateShareState({ revoked_at: "2026-10-28T00:00:00Z" }), "revoked");
    // Preserve the existing strict null check, not mere link truthiness.
    assert.equal(getUpdateShareState({ revoked_at: "" }), "revoked");
  });

  it("uses mutually consistent, truthful labels for each state", () => {
    assert.deepEqual(UPDATE_SHARE_PRESENTATION.none, {
      chip: "No public link",
      value: "No link",
      hint: "No public link has been created.",
    });
    assert.deepEqual(UPDATE_SHARE_PRESENTATION.active, {
      chip: "Public link live",
      value: "Live",
      hint: "Anyone with the link can view the latest saved update.",
    });
    assert.deepEqual(UPDATE_SHARE_PRESENTATION.revoked, {
      chip: "Public link revoked",
      value: "Revoked",
      hint: "This link no longer works.",
    });
    for (const presentation of Object.values(UPDATE_SHARE_PRESENTATION)) {
      assert.doesNotMatch(Object.values(presentation).join(" "), /delivered|opened|received/i);
    }
  });
});
