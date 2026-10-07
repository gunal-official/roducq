/**
 * Structural tests (built-in node:test — zero test deps) locking the
 * global-search wiring against the real source files: the topbar form,
 * the /search page contract and the data layer's scoping rules
 * (tests/components/nav.test.ts precedent).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("Global search", () => {
  it("topbar: the search box is a real GET form to /search", () => {
    const src = read("components/app-shell/Topbar.tsx");
    assert.ok(src.includes('action="/search"'));
    assert.ok(src.includes('role="search"'));
    assert.ok(src.includes('name="q"'));
    assert.ok(src.includes('type="search"'));
    // The load-bearing mobile-row classes survive the div→form swap.
    assert.ok(src.includes("order-last w-full sm:order-none"));
    assert.ok(src.includes("sr-only")); // the input keeps its label
  });

  it("page: renders grouped, highlighted, RLS-scoped results", () => {
    const src = read("app/(app)/search/page.tsx");
    // Query handling goes through the normalizer — never raw params.
    assert.ok(src.includes("normalizeSearchQuery(params.q)"));
    // Viewer money-hiding is applied before querying.
    assert.ok(src.includes("canSeeMoney: context.canSeeMoney"));
    // Highlighting is segment-based — no dangerouslySetInnerHTML anywhere.
    assert.ok(src.includes("<mark"));
    assert.ok(!src.includes("dangerouslySetInnerHTML"));
    // House rules: 44px tap targets, relative timestamps, entity links.
    assert.ok(src.includes("min-h-11"));
    assert.ok(src.includes("timeAgo"));
    assert.ok(src.includes("group.detailHref(hit.id)"));
    assert.ok(src.includes("View all"));
    // The six "View all →" links are 44px tap targets in their own right,
    // not bare inline anchors — the generic min-h-11 check above is already
    // satisfied by the hit rows, so pin the link itself.
    const viewAllJsx = src.indexOf("View all {group.label");
    const viewAllLink = src.slice(src.lastIndexOf("<Link", viewAllJsx), viewAllJsx);
    assert.ok(viewAllLink.includes("min-h-11"));
    // The refine box is the same plain GET form.
    assert.ok(src.includes('action="/search"'));
  });

  it("harness: /search is swept by the responsive audit", () => {
    const src = read("scripts/verify-responsive.mjs");

    const complexStart = src.indexOf("const COMPLEX");
    const complexLine = src.slice(complexStart, src.indexOf("\n", complexStart));
    assert.ok(complexLine.includes('"search"'));
    // "Harbor" matches every fixture group, so all six cards — and their
    // six "View all →" links — render under the tap-target metric.
    assert.ok(
      src.includes('{ slug: "search", url: "/search?q=Harbor", auth: true }'),
    );
  });

  it("data layer: one scoped, capped, error-throwing query per group", () => {
    const src = read("lib/data/search.ts");
    assert.ok(src.includes('"server-only"')); // never imported client-side
    // Step 16 pin — RLS is the gate, the filter keeps workspaces unmerged.
    assert.ok(src.includes('.eq("workspace_id", input.workspaceId)'));
    assert.ok(src.includes(".or(pattern)"));
    assert.ok(src.includes(".limit(SEARCH_GROUP_LIMIT)"));
    assert.ok(src.includes("if (error) throw error")); // house convention
    // Viewer money groups are dropped BEFORE querying.
    assert.ok(src.includes("searchableGroups(input.canSeeMoney)"));
    // Table names come from the registry (key == table).
    assert.ok(src.includes(".from(group.key)"));
    assert.ok(src.includes("invoiceNumberLabel")); // INV-000N chip
  });
});
