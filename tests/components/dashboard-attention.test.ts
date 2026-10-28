/** Structural guards for Pipeline attention; the fixture browser test checks
 * real rendered states, date boundaries and roles. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../../app/(app)/dashboard/page.tsx", import.meta.url), "utf8");

describe("dashboard attention when the pipeline is empty", () => {
  it("renders the same attention card before the empty state only when needed", () => {
    assert.equal((page.match(/title="Needs you"/g) ?? []).length, 1);
    const emptyStart = page.indexOf("{!hasWork ? (");
    const populatedStart = page.indexOf('desk:grid-cols-[minmax(0,1fr)_20rem]', emptyStart);
    const emptyBranch = page.slice(emptyStart, populatedStart);
    assert.match(emptyBranch, /attention\.length > 0 && needsYou/);
    assert.ok(emptyBranch.indexOf("attention.length > 0 && needsYou") < emptyBranch.indexOf("<EmptyState"));
    assert.match(emptyBranch, /title="Your pipeline is empty"/);
    const populatedBranch = page.slice(populatedStart);
    assert.match(populatedBranch, /\{needsYou\}/);
    assert.match(page, /attention\.length === 0 \? \(/);
    assert.match(page, /Nothing pressing — everything is moving on schedule\./);
  });

  it("retains the existing data access, invoice role guard and date/status windows", () => {
    assert.match(page, /canSeeMoney && context\s*\? await Promise\.all\(\[getInvoices\(context\.id\), getTimeEntries\(context\.id\)\]\)/);
    assert.match(page, /getContracts\(context\.id\)/);
    assert.match(page, /c\.status !== "signed"/);
    assert.match(page, /c\.status !== "void"/);
    assert.match(page, /c\.expires_on >= clock\.today/);
    assert.match(page, /c\.expires_on <= clock\.soon/);
    assert.match(page, /i\.status === "sent" && i\.due_date && i\.due_date < clock\.today/);
    assert.match(page, /canSeeMoney &&\s*overdue > 0/);
    assert.match(page, /href: "\/contracts"/);
    assert.match(page, /href: "\/invoices"/);
  });

  it("does not redefine standalone invoices or contracts as pipeline documents", () => {
    const condition = page.slice(page.indexOf("const hasWork ="), page.indexOf("const needsYou ="));
    for (const item of ["briefs.length", "proposals.length", "plans.length", "updates.length", "threads"]) {
      assert.ok(condition.includes(item), item);
    }
    assert.doesNotMatch(condition, /invoices|contracts/);
    assert.match(page, /Start with a client message to create a brief and begin your pipeline\./);
  });

  it("treats update activity as status and last update, not delivery", () => {
    assert.match(page, /Status: marked sent/);
    assert.match(page, /Updated \$\{timeAgo\(u\.updated_at\)\}/);
    assert.match(page, /marked as draft/);
    assert.doesNotMatch(page, /detail: u\.status === "sent" \? "Update sent"/);
  });
});
