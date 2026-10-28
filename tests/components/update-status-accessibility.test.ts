import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("Update status accessibility", () => {
  it("keeps the pending trigger focusable while guarding all repeat changes", () => {
    const src = read("components/updates/UpdateStatusSelect.tsx");
    assert.match(src, /aria-label="Update status"/);
    assert.match(src, /aria-disabled=\{pending\}/);
    assert.doesNotMatch(src, /(?:^|\s)disabled=\{pending\}/m);
    assert.match(src, /pendingRef\.current \|\| nextStatus === value/);
    assert.match(src, /if \(!next \|\| !pendingRef\.current\) setOpen\(next\)/);
    assert.match(src, /onPointerDown/);
    assert.match(src, /event\.key !== "Tab"/);
  });

  it("preserves optimistic updates, rollback, and the accessible error", () => {
    const src = read("components/updates/UpdateStatusSelect.tsx");
    assert.match(src, /setValue\(nextStatus\)/);
    assert.match(src, /setValue\(previous\)/);
    assert.match(src, /updateUpdateStatus\(\{/);
    assert.match(src, /role="alert"/);
    assert.doesNotMatch(src, /\.focus\(/, "completion must not steal deliberately moved focus");
  });

  it("requires axe and focus regressions to pass in the retained fixture harness", () => {
    const src = read("scripts/verify-phase1-trust-attention.mjs");
    assert.match(src, /assert\.deepEqual\(result\.violations, \[\]/);
    assert.match(src, /assert\.equal\(focus\.label, "Update status"/);
    assert.doesNotMatch(src, /focus\.tag === "BODY"/);
    assert.match(src, /incomplete: report\.incomplete/);
  });
});
