/** Structural checks for PDF v2 settings, routes, and workspace logo wiring. */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const routeFiles = [
  "app/api/pdf/time/route.ts",
  "app/api/pdf/reports/route.ts",
];

describe("PDF v2 routes", () => {
  it("adds update and plan to the authenticated document route", () => {
    const src = read("app/api/pdf/[kind]/[id]/route.ts");
    assert.match(src, /const KINDS = \[[^\]]*"update"[^\]]*"plan"/);
    assert.ok(src.includes("getUpdateById"));
    assert.ok(src.includes("getPlanById"));
    assert.ok(src.includes("buildUpdatePdf"));
    assert.ok(src.includes("buildPlanPdf"));
    assert.ok(src.includes("return pdfResponse(result)"));
    assert.ok(src.includes("!context.canSeeMoney"));
  });

  for (const route of routeFiles) {
    it(`${route} exists, is authenticated, and returns the shared PDF response`, () => {
      assert.equal(existsSync(new URL(`../../${route}`, import.meta.url)), true);
      const src = read(route);
      assert.match(src, /export async function GET\(/);
      assert.ok(src.includes("isSupabaseConfigured()"));
      assert.ok(src.includes("getWorkspaceContext()"));
      assert.ok(src.includes("getWorkspaceBranding"));
      assert.ok(src.includes("build"));
      assert.ok(src.includes("return pdfResponse(result)"));
      assert.ok(src.includes("!context?.canSeeMoney"));
    });
  }

  it("all four missing exports use the explicit Download PDF affordance", () => {
    for (const page of [
      "app/(app)/updates/[id]/page.tsx",
      "app/(app)/plans/[id]/page.tsx",
      "app/(app)/time/page.tsx",
      "app/(app)/reports/page.tsx",
    ]) {
      assert.ok(read(page).includes('label="Download PDF"'), `${page} lacks the download label`);
    }
  });

  it("time and reports builders keep their workspace-level data sources", () => {
    const time = read("app/api/pdf/time/route.ts");
    assert.ok(time.includes("getTimeEntries(context.id)"));
    assert.ok(time.includes("getBriefs(context.id)"));
    assert.ok(time.includes("buildTimePdf"));

    const reports = read("app/api/pdf/reports/route.ts");
    assert.ok(reports.includes("getInvoices(context.id)"));
    assert.ok(reports.includes("getTimeEntries(context.id)"));
    assert.ok(reports.includes("getContracts(context.id)"));
    assert.ok(reports.includes("computeReport"));
    assert.ok(reports.includes("buildReportsPdf"));
  });
});

describe("workspace PDF branding", () => {
  it("settings exposes upload and remove controls only to owners", () => {
    const component = read("components/settings/WorkspaceBrandingCard.tsx");
    assert.ok(component.includes('"use client"'));
    assert.ok(component.includes("Branding &amp; logo"));
    assert.ok(component.includes('accept="image/png,image/jpeg"'));
    assert.ok(component.includes("Replace logo"));
    assert.ok(component.includes("Remove logo"));
    assert.ok(component.includes("updateWorkspaceLogo"));
    assert.ok(component.includes("{isOwner && ("));

    const settings = read("app/(app)/settings/page.tsx");
    assert.ok(settings.includes("<WorkspaceBrandingCard"));
    assert.ok(settings.includes("getWorkspaceBranding(workspace.id)"));
  });

  it("the action rechecks the owner role and validates the complete image", () => {
    const actions = read("app/(app)/settings/actions.ts");
    assert.ok(actions.includes("export async function updateWorkspaceLogo"));
    assert.ok(actions.includes('membership.role !== "owner"'));
    assert.ok(actions.includes("decodeLogoDataUrl(input.logoDataUrl)"));
    assert.ok(actions.includes("logo_data_url: input.logoDataUrl"));
  });

  it("the migration stores a bounded logo and exposes it to shared invoice PDFs", () => {
    const migration = read("supabase/migrations/20261010010000_workspace_logo.sql");
    assert.ok(migration.includes("add column logo_data_url text"));
    assert.ok(migration.includes("workspaces_logo_data_url_check"));
    assert.ok(migration.includes("logo_data_url text"));
    assert.ok(migration.includes("w.logo_data_url"));

    const sharedRoute = read("app/api/pdf/shared/invoice/[token]/route.ts");
    assert.ok(sharedRoute.includes("logoDataUrl: invoice.logo_data_url"));
  });
});
