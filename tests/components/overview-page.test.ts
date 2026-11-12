import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
const page = read("app/(app)/overview/page.tsx");
const plans = read("lib/data/plans.ts");

describe("Workspace Overview page", () => {
  it("is registered as a navigable page without replacing the Pipeline route", () => {
    const nav = read("components/app-shell/nav-items.ts");
    assert.match(nav, /label: "Overview", href: "\/overview"/);
    assert.match(nav, /label: "Pipeline", href: "\/"/);
  });

  it("uses live workspace data for metrics, weekly time, checklist items, and attention", () => {
    for (const dataSource of ["getBriefs", "getPlans", "getUpdates", "getContracts", "getInvoices", "getTimeEntries", "getOpenPlanTasks"]) {
      assert.ok(page.includes(dataSource), dataSource);
    }
    assert.match(page, /weekMinutes\(timeEntries, clock\.weekDays\)/);
    assert.match(page, /role="img"[\s\S]*Time tracked in the last seven days/);
    assert.match(page, /title="Next on your list"/);
    assert.match(page, /title="Needs attention"/);
  });

  it("does not invent task due dates or time-saved figures", () => {
    assert.doesNotMatch(page, /Due today|Time saved|by automations/i);
    assert.match(plans, /export async function getOpenPlanTasks/);
    assert.match(plans, /\.neq\("status", "done"\)/);
    assert.match(plans, /\.filter\(\(task\) => !task\.checked\)/);
  });
});
