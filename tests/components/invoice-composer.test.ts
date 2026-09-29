import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

// Two regressions guarded here, both reported as "first line item looks
// disabled/uneditable on load":
//
// 1. STALE BINDING — line-item inputs used to read their value from the
//    motion snapshot (`item` out of useMotionItems). That hook only
//    re-syncs entries when the id SET changes (add/remove row); a pure
//    content edit leaves `display` holding the pre-keystroke snapshot,
//    so a snapshot-bound controlled input re-renders with the stale
//    value and swallows every keystroke — the field appears uneditable
//    (while totals still move, because they derive from `items` state).
//    Note: the `disabled:cursor-not-allowed disabled:opacity-50` classes
//    seen in DevTools are on EVERY Input (base styles in ui/input.tsx)
//    and only apply when a real `disabled` attribute is set.
//
// 2. DISABLED SCOPE — `disabled` may only ever be set on a row that is
//    genuinely animating out (its id already left `items`). On load
//    nothing is leaving, so nothing renders disabled.

test("line-item inputs bind to live items state, not motion snapshots", () => {
  const src = read("components/invoices/InvoiceComposer.tsx");
  assert.ok(
    src.includes("const live = index !== -1 ? items[index] : item;"),
    "each row must resolve the current item from `items` by id"
  );
  for (const field of ["description", "quantity", "unit_amount"]) {
    assert.ok(
      src.includes(`value={live.${field}}`),
      `${field} input must read the live item`
    );
    assert.ok(
      !src.includes(`value={item.${field}}`),
      `${field} input must not read the motion snapshot`
    );
  }
});

test("only genuinely-leaving rows are disabled — never rows on load", () => {
  const src = read("components/invoices/InvoiceComposer.tsx");

  // Every `disabled` in the composer is scoped: the three line-item
  // inputs disable only while their row collapses out, and the Save
  // button only while a save is pending/row-clean.
  const disableds = (src.match(/disabled=\{[^}]*\}/g) ?? []).sort();
  assert.deepEqual(disableds, [
    "disabled={leaving || undefined}",
    "disabled={leaving || undefined}",
    "disabled={leaving || undefined}",
    "disabled={pending || !dirty}",
  ]);

  // Hook contract that makes "on load ⇒ not disabled" true:
  // useMotionItems seeds every initial entry as NOT leaving, and an
  // entry only flips to leaving once its id disappears from the items
  // array (a removal). The diff is keyed on the id join, so re-running
  // it (e.g. React StrictMode's double effect-run) with the same ids is
  // idempotent — a pre-existing row can never be marked leaving on load.
  const hook = read("components/ui/motion-rows.tsx");
  assert.ok(
    hook.includes("items.map((item) => ({ item, leaving: false }))"),
    "initial entries must be seeded leaving: false"
  );
  assert.ok(
    hook.includes("if (byId.has(e.item.id)) next.push({ item: byId.get(e.item.id)!, leaving: false });"),
    "an id present in the current items must never be leaving"
  );
  assert.ok(
    hook.includes("else if (!e.leaving) next.push({ item: e.item, leaving: true });"),
    "leaving is set only for ids that left the items array"
  );
  assert.ok(hook.includes("[idKey]"), "the diff effect must key on the id set");
});

test("edits and removals target the live index and are no-ops on leaving rows", () => {
  const src = read("components/invoices/InvoiceComposer.tsx");
  assert.ok(src.includes("const index = items.findIndex((x) => x.id === item.id);"));
  // Leaving rows are gone from `items` (findIndex → -1): typing/removing
  // must be skipped, and the row falls back to the snapshot so it keeps
  // its content while collapsing out.
  assert.ok(src.includes("if (index !== -1) updateItem(index"));
  assert.ok(src.includes("if (index !== -1) removeItem(index);"));
});

test("row motion choreography is unchanged (useMotionItems + rise/collapse)", () => {
  const src = read("components/invoices/InvoiceComposer.tsx");
  assert.ok(src.includes("useMotionItems(items)"));
  assert.ok(src.includes("animate-rise-in"));
  assert.ok(src.includes("animate-row-out"));
  assert.ok(src.includes("aria-hidden={leaving || undefined}"));
});
