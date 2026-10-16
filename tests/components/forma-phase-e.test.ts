/**
 * Structural tests for Forma Phase E — the financial surfaces (Invoices,
 * Contracts, Time, Reports, Search).
 *
 * Same convention as forma-phase-c/d.test.ts: the .tsx files are JSX, so
 * the zero-dependency runner reads them as text. Rendering, overflow and
 * tap targets are proven by `npm run verify:responsive` (real Chromium)
 * and the screenshots in docs/screenshots/forma-phase-e/.
 *
 * Four kinds of assertion:
 *   1. the Phase E presentation contract — lavender financial planes, one
 *      header per route, work cards with figure rows, the composer shell,
 *      the shared rail cards;
 *   2. the artwork contract — five original drawings, token colours,
 *      nothing hidden behind an animation, one meaningful drawing whose
 *      label is generated from the cents it draws;
 *   3. the financial-semantics contract — statuses keep their distinct
 *      colors (never all purple), overdue is stated in words, amounts are
 *      real formatted values;
 *   4. the preservation contract — the business wiring the redesign was
 *      not allowed to touch (queries, actions, exports, calculations,
 *      print documents, permission gates).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const PAGE_FILES = [
  "app/(app)/invoices/page.tsx",
  "app/(app)/invoices/[id]/page.tsx",
  "app/(app)/contracts/page.tsx",
  "app/(app)/contracts/[id]/page.tsx",
  "app/(app)/time/page.tsx",
  "app/(app)/reports/page.tsx",
  "app/(app)/search/page.tsx",
];

const COMPONENT_FILES = [
  "components/invoices/InvoicesList.tsx",
  "components/invoices/InvoiceComposer.tsx",
  "components/contracts/ContractsList.tsx",
  "components/contracts/ContractComposer.tsx",
  "components/time/TimeLog.tsx",
  "components/reports/ReportsView.tsx",
  "components/workflow/FinancialArt.tsx",
  "components/workflow/WorkCard.tsx",
];

const ALL_FILES = [...PAGE_FILES, ...COMPONENT_FILES];

describe("Phase E — route scoping and heading structure", () => {
  it("scopes every redesigned route to a Phase E plane", () => {
    const expected = {
      "app/(app)/invoices/page.tsx": "forma-invoices",
      "app/(app)/invoices/[id]/page.tsx": "forma-invoices",
      "app/(app)/contracts/page.tsx": "forma-contracts",
      "app/(app)/contracts/[id]/page.tsx": "forma-contracts",
      "app/(app)/time/page.tsx": "forma-time",
      "app/(app)/reports/page.tsx": "forma-reports",
      "app/(app)/search/page.tsx": "forma-search",
    };
    for (const [path, scope] of Object.entries(expected)) {
      const source = read(path);
      assert.ok(source.includes("forma-core"), `${path} is a Forma plane`);
      assert.ok(source.includes(scope), `${path} carries ${scope}`);
    }
  });

  it("gives each route exactly one h1", () => {
    // Lists and reports head with the shared PageHeader (its h1); the two
    // detail pages head with DocHeader (its h1); search keeps a single
    // sr-only h1 beside its hero band.
    for (const path of [
      "app/(app)/invoices/page.tsx",
      "app/(app)/contracts/page.tsx",
      "app/(app)/time/page.tsx",
      "app/(app)/reports/page.tsx",
    ]) {
      const source = read(path);
      assert.equal((source.match(/<PageHeader\b/g) ?? []).length, 1, `${path} PageHeader`);
      assert.equal((source.match(/<h1\b/g) ?? []).length, 0, `${path} heads with the shared header`);
    }
    for (const path of [
      "app/(app)/invoices/[id]/page.tsx",
      "app/(app)/contracts/[id]/page.tsx",
    ]) {
      const source = read(path);
      assert.equal((source.match(/<DocHeader\b/g) ?? []).length, 1, `${path} DocHeader`);
      assert.equal((source.match(/<h1\b/g) ?? []).length, 0, `${path} heads with the shared header`);
    }
    const search = read("app/(app)/search/page.tsx");
    assert.equal((search.match(/<h1\b/g) ?? []).length, 1, "search has exactly one h1");
  });

  it("uses one breakpoint language: the desk band, never lg: grids", () => {
    for (const path of PAGE_FILES) {
      const source = read(path);
      assert.ok(
        !source.includes("lg:grid-cols"),
        `${path} uses the desk band like the rest of the app`
      );
    }
    for (const path of COMPONENT_FILES) {
      const source = read(path);
      assert.ok(
        !source.includes("xl:grid-cols"),
        `${path} uses the desk band like the rest of the app`
      );
    }
    for (const path of [
      "app/(app)/invoices/[id]/page.tsx",
      "app/(app)/contracts/[id]/page.tsx",
    ]) {
      assert.ok(
        read(path).includes("desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"),
        `${path} splits document + rail from 1024px`
      );
    }
  });

  it("replaces the hand-rolled rail cards with the shared SectionCard", () => {
    for (const path of [
      "app/(app)/invoices/[id]/page.tsx",
      "app/(app)/contracts/[id]/page.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<SectionCard"), `${path} uses SectionCard`);
      assert.ok(!source.includes("CardHeader"), `${path} dropped ad-hoc Card markup`);
      assert.ok(source.includes('className="work-back"'), `${path} shared back link`);
    }
  });
});

describe("Phase E — list vocabulary", () => {
  it("filters both money lists with the shared FilterChips control", () => {
    for (const path of [
      "components/invoices/InvoicesList.tsx",
      "components/contracts/ContractsList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<FilterChips"), `${path} uses FilterChips`);
      assert.ok(!source.includes("TabsList"), `${path} dropped the overflow-prone tab strip`);
      assert.ok(source.includes("<EmptyState"), `${path} shared empty state`);
    }
  });

  it("carries the 4A toolbar contract and one shared toolbar plane", () => {
    for (const path of [
      "components/invoices/InvoicesList.tsx",
      "components/contracts/ContractsList.tsx",
      "components/time/TimeLog.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("work-toolbar"), `${path} toolbar plane`);
      assert.ok(
        source.includes("flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between"),
        `${path} stacks the toolbar on phones`
      );
    }
    for (const path of [
      "components/invoices/InvoicesList.tsx",
      "components/contracts/ContractsList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes('type="search"'), `${path} search field`);
    }
  });

  it("opens every list and the report with a lavender band built from real counts", () => {
    for (const path of [
      "components/invoices/InvoicesList.tsx",
      "components/contracts/ContractsList.tsx",
      "components/time/TimeLog.tsx",
      "components/reports/ReportsView.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<WorkBand"), `${path} band`);
      assert.ok(source.includes("stats={["), `${path} band carries stats`);
    }
    // Cards: invoices and contracts are work cards in the desk-aware grid.
    for (const path of [
      "components/invoices/InvoicesList.tsx",
      "components/contracts/ContractsList.tsx",
    ]) {
      const source = read(path);
      assert.ok(source.includes("<WorkCard"), `${path} work cards`);
      assert.ok(source.includes("work-grid"), `${path} card grid`);
      assert.ok(source.includes("sm:grid-cols-2 desk:grid-cols-3"), `${path} grid bands`);
    }
  });

  it("leads money cards with a figure row of real values", () => {
    const invoices = read("components/invoices/InvoicesList.tsx");
    assert.ok(
      invoices.includes("<CardFigure") || invoices.includes("work-card-figure"),
      "invoice cards carry a figure row"
    );
    assert.ok(
      invoices.includes("amount={formatMoney(invoice.total_cents)}"),
      "the figure amount is the row's computed total"
    );
    assert.ok(
      invoices.includes("label={invoiceNumberLabel(invoice.invoice_number)}"),
      "the figure label is the row's real number"
    );
    const contracts = read("components/contracts/ContractsList.tsx");
    assert.ok(contracts.includes("work-card-figure"), "contract cards carry a figure row");
  });

  it("states overdue in words, never only through colour", () => {
    const invoices = read("components/invoices/InvoicesList.tsx");
    assert.ok(invoices.includes("Overdue — was due"), "card copy names overdue");
    const detail = read("app/(app)/invoices/[id]/page.tsx");
    assert.ok(detail.includes("Overdue — "), "band chip names overdue");
  });
});

describe("Phase E — financial semantics preserved", () => {
  it("keeps the four invoice statuses on distinct semantic colors", () => {
    const badge = read("components/invoices/InvoiceStatusBadge.tsx");
    assert.ok(badge.includes("border-info bg-info-soft text-info"), "sent stays info-blue");
    assert.ok(badge.includes("bg-success text-success-foreground"), "paid stays success green");
    assert.ok(badge.includes("bg-muted text-muted-foreground"), "draft stays quiet");
    assert.ok(badge.includes("border-error/30"), "void stays a quiet red outline");
    // None of the money statuses were recoloured onto the brand accent.
    assert.ok(!badge.includes("bg-accent text-accent-foreground"));
  });

  it("keeps the four contract statuses distinct", () => {
    const badge = read("components/contracts/ContractStatusBadge.tsx");
    assert.ok(badge.includes("border-accent bg-accent-soft text-accent"), "sent is the accent outline");
    assert.ok(badge.includes("bg-accent text-accent-foreground"), "signed is the solid accent");
    assert.ok(badge.includes("bg-muted text-text"), "draft stays quiet");
  });

  it("computes totals through the shared pure lib, on every surface", () => {
    for (const path of [
      "app/(app)/invoices/[id]/page.tsx",
      "components/invoices/InvoiceComposer.tsx",
    ]) {
      assert.ok(
        read(path).includes('from "@/lib/invoice-totals"'),
        `${path} uses lib/invoice-totals`
      );
    }
    const detail = read("app/(app)/invoices/[id]/page.tsx");
    assert.ok(detail.includes("invoiceTotals(invoice.items, invoice.tax_percent)"), "detail computes from items + tax");
    assert.ok(detail.includes("formatMoney(totals.subtotal_cents)"), "subtotal renders");
    assert.ok(detail.includes("formatMoney(totals.tax_cents)"), "tax renders");
    assert.ok(detail.includes("formatMoney(totals.total_cents)"), "total renders");
  });

  it("keeps the ledger labelled — column headers, wrapping rows", () => {
    const detail = read("app/(app)/invoices/[id]/page.tsx");
    assert.ok(detail.includes('className="ledger-head"'), "column header row");
    assert.ok(detail.includes("ledger-row"), "wrapping rows");
  });
});

describe("Phase E — time workspace", () => {
  const log = read("components/time/TimeLog.tsx");

  it("keeps the grouping and totals logic untouched", () => {
    assert.ok(log.includes("worked_on"), "groups by the day the work happened");
    assert.ok(log.includes("localToday()"), "today is the caller's local day");
    assert.ok(log.includes("duration_minutes"), "durations are the stored minutes");
    assert.ok(log.includes("formatDuration"), "durations render through the shared formatter");
  });

  it("keeps every write wired to the existing server actions", () => {
    assert.ok(log.includes('from "@/app/(app)/time/actions"'));
    assert.ok(log.includes("logTimeAction(input)"), "create");
    assert.ok(log.includes("updateTimeAction({ id: editingId, ...input })"), "edit");
    assert.ok(log.includes("deleteTimeAction({ id })"), "delete");
  });

  it("keeps the two-step delete confirm", () => {
    assert.ok(log.includes("confirmDeleteId"), "armed state exists");
    assert.ok(log.includes('"Sure?"'), "the armed button asks before deleting");
  });

  it("renders day groups as labelled sections with real totals", () => {
    assert.ok(log.includes('className="time-day"'), "day section");
    assert.ok(log.includes("time-day-title"), "day heading");
    assert.ok(log.includes("formatDuration(group.total)"), "per-day total is the real sum");
    assert.ok(log.includes("aria-label="), "the group carries an accessible name");
  });
});

describe("Phase E — reports", () => {
  const view = read("components/reports/ReportsView.tsx");

  it("renders only computed Report values — nothing invented", () => {
    for (const field of [
      "money.collected_cents",
      "money.outstanding_cents",
      "money.draft_cents",
      "time.today_minutes",
      "time.month_minutes",
      "time.all_minutes",
      "contracts.signed_count",
      "contracts.expiring_soon_count",
    ]) {
      assert.ok(view.includes(field), `${field} renders from the computed report`);
    }
    assert.ok(!view.includes("growth"), "no invented growth percentages");
    assert.ok(!view.match(/trend/i), "no invented trend language");
  });

  it("keeps every chart value as visible text beside its rail", () => {
    assert.ok(view.includes("report-chart-title"), "bar titles are text");
    assert.ok(view.includes("report-chart-value"), "bar values are text");
    assert.ok(view.includes("formatDuration(bar.minutes)"), "the value is the real minutes");
    assert.ok(view.includes('aria-hidden="true"'), "the rail itself is decoration");
  });

  it("keeps the fixed-window promise in plain language", () => {
    assert.ok(view.includes("no date picker"), "the page says windows are fixed");
  });

  it("still computes through lib/reports.ts on the server", () => {
    const page = read("app/(app)/reports/page.tsx");
    assert.ok(page.includes("computeReport({ invoices, entries, contracts, briefs })"));
    assert.ok(page.includes('from "@/lib/reports"'));
  });
});

describe("Phase E — search", () => {
  const page = read("app/(app)/search/page.tsx");

  it("keeps the plain GET form and the normalizer", () => {
    assert.ok(page.includes('action="/search"'));
    assert.ok(page.includes('role="search"'));
    assert.ok(page.includes("normalizeSearchQuery(params.q)"));
  });

  it("keeps permission scoping before the query", () => {
    assert.ok(page.includes("canSeeMoney: context.canSeeMoney"));
    assert.ok(page.includes("searchableGroups(context.canSeeMoney)"));
  });

  it("keeps the amber highlight on matched text (the app's highlight token)", () => {
    assert.ok(page.includes("bg-highlight-soft"));
  });

  it("renders results as shared section cards with 44px hit rows", () => {
    assert.ok(page.includes("<SectionCard"));
    assert.ok(page.includes("search-hit min-h-11"));
    assert.ok(page.includes("search-more min-h-11"));
    assert.ok(page.includes("group.detailHref(hit.id)"));
  });
});

describe("Phase E — artwork", () => {
  const art = read("components/workflow/FinancialArt.tsx");

  it("draws five original SVG illustrations, not raster imagery or SMIL", () => {
    for (const name of [
      "InvoiceFlowArt",
      "ContractStagesArt",
      "TimeElapsedArt",
      "ReportSplitArt",
      "SearchArt",
    ]) {
      assert.ok(art.includes(`export function ${name}`), name);
    }
    assert.ok(!art.includes("<image"), "no raster art");
    assert.ok(!art.includes("<animate"), "no SMIL — motion belongs in reduced-motion-aware CSS");
  });

  it("hides decoration from assistive tech and labels the meaningful drawing", () => {
    const hidden = (art.match(/aria-hidden="true"/g) ?? []).length;
    assert.ok(hidden >= 4, "the four decorative drawings are aria-hidden");
    assert.ok(art.includes('role="img"'), "the money split is a real image to a screen reader");
    assert.ok(
      art.includes("Invoice money split: ${format(collectedCents)} collected"),
      "the split label is generated from the cents it draws"
    );
    assert.ok(
      art.includes("no invoices yet — nothing collected, outstanding or drafted"),
      "and it degrades honestly"
    );
  });

  it("scales the split rails to the real billed total", () => {
    assert.ok(art.includes("const billed ="), "the total is computed from the passed cents");
    // Phase F removes the former 2% / 8px minimum: it drew non-zero
    // collected/draft fills when only the outstanding bucket had money.
    // Require the exact proportional helper instead (behavior tested in
    // chart-geometry.test.ts), not the old misleading source shape.
    assert.ok(art.includes("width={proportionalWidth(rail.cents, billed, 276)}"), "rails scale to exact real shares, including zero");
    assert.ok(!art.includes("Math.max(8,") && !art.includes("Math.max(2,"), "no invented floor for zero or small buckets");
    assert.ok(art.includes("<figcaption"), "visible labels supplement the accessible money-split label");
  });

  it("uses tokens, not literal brand colours", () => {
    for (const hex of art.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      assert.fail(`FinancialArt hardcodes ${hex}`);
    }
    assert.ok(art.includes("art-surface") && art.includes("art-clock-fill"));
  });
});

describe("Phase E — motion, themes and guard rails", () => {
  const css = read("app/globals.css");
  const phaseE = css.split("/* Phase E:")[1] ?? "";

  it("ships the mandated lavender palette through scoped aliases only", () => {
    for (const value of ["#F9F7FC", "#F2EEF8", "#EFEBFF", "#EEE9F5", "#AC7DFC"]) {
      assert.ok(phaseE.includes(value), `${value} is declared once, in the stylesheet`);
    }
    assert.ok(phaseE.includes(".dark .forma-invoices"));
    for (const file of ALL_FILES) {
      const source = read(file);
      for (const hex of source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        assert.fail(`${file} hardcodes ${hex}`);
      }
    }
  });

  it("keeps motion opt-in and disabled under reduced motion", () => {
    assert.ok(phaseE.includes("prefers-reduced-motion: no-preference"));
    assert.ok(phaseE.includes("prefers-reduced-motion: reduce"));
    assert.ok(phaseE.includes("animation: none !important"));
    for (const file of ALL_FILES) {
      const source = read(file);
      assert.ok(!source.includes("animate-pulse"), `${file} avoids continuous movement`);
    }
  });

  it("never depends on an animation to be visible", () => {
    // Base states are final values; the report fill and split bars arrive
    // by transform, and the clock arc is complete at rest.
    assert.ok(css.includes(".art-clock-fill { stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 0; fill: none; }"));
    const declared = [...phaseE.matchAll(/animation-fill-mode\s*:/g)].length;
    assert.equal(declared, 0, "no fill mode can pin a drawing to its first keyframe");
  });

  it("uses transforms and opacity for movement, never layout properties", () => {
    const keyframes = [...phaseE.matchAll(/@keyframes\s+[\w-]+\s*\{[^}]*\}/g)].map((m) => m[0]);
    assert.ok(keyframes.length >= 2, "the Phase E drawings animate");
    for (const block of keyframes) {
      for (const banned of ["width:", "height:", "margin", "top:", "left:"]) {
        assert.ok(!block.includes(banned), `keyframes animate layout: ${banned}`);
      }
    }
  });

  it("carries no amber/highlight tone and no arbitrary radii in Phase E files", () => {
    for (const file of ALL_FILES) {
      const source = read(file);
      // The search page is the one sanctioned exception: the design guide
      // (tests/lib/design-guide.test.ts) pins the query-match <mark> to the
      // amber highlight token — highlights are that token's stated purpose.
      const exempt =
        file === "app/(app)/search/page.tsx" && source.includes("bg-highlight-soft");
      if (!exempt) {
        assert.ok(
          !/\b(?:bg|text|border(?:-[trbl])?)-(?:highlight|amber)(?:-[\w-]+)?(?:\/\d+)?\b/.test(source),
          `${file} uses the highlight tone`
        );
      }
      assert.ok(!/rounded-\[\d/.test(source), `${file} uses an arbitrary radius`);
    }
  });
});

describe("Phase E — functional preservation", () => {
  it("keeps the money pages' data reads and gates untouched", () => {
    const invoices = read("app/(app)/invoices/page.tsx");
    assert.ok(invoices.includes("getInvoices(context.id)"));
    assert.ok(invoices.includes("context?.canSeeMoney"));
    const contracts = read("app/(app)/contracts/page.tsx");
    assert.ok(contracts.includes("getContracts(context.id)"));
    const time = read("app/(app)/time/page.tsx");
    assert.ok(time.includes("getTimeEntries(context.id)"));
    assert.ok(time.includes("context?.canSeeMoney"));
  });

  it("keeps create-on-list wired to the existing server actions", () => {
    assert.ok(
      read("components/invoices/InvoicesList.tsx").includes('from "@/app/(app)/invoices/actions"')
    );
    assert.ok(read("components/invoices/InvoicesList.tsx").includes("createInvoice({"));
    assert.ok(
      read("components/contracts/ContractsList.tsx").includes('from "@/app/(app)/contracts/actions"')
    );
    assert.ok(read("components/contracts/ContractsList.tsx").includes("createContract({"));
  });

  it("keeps the composers wired to their save actions with the same payloads", () => {
    const invoice = read("components/invoices/InvoiceComposer.tsx");
    assert.ok(invoice.includes('from "@/app/(app)/invoices/[id]/actions"'));
    assert.ok(invoice.includes("saveInvoiceContent({"));
    assert.ok(invoice.includes("tax_percent: taxPercent"), "tax still parses and saves");
    assert.ok(invoice.includes("centsFromDollars"), "money still converts to integer cents");
    const contract = read("components/contracts/ContractComposer.tsx");
    assert.ok(contract.includes('from "@/app/(app)/contracts/[id]/actions"'));
    assert.ok(contract.includes("saveContract({"));
  });

  it("keeps every export path: PDF download, print button, print document", () => {
    const invoiceDetail = read("app/(app)/invoices/[id]/page.tsx");
    assert.ok(invoiceDetail.includes("/api/pdf/invoice/"));
    assert.ok(invoiceDetail.includes("<PrintButton />"));
    assert.ok(invoiceDetail.includes("<PrintInvoiceDocument"));
    const contractDetail = read("app/(app)/contracts/[id]/page.tsx");
    assert.ok(contractDetail.includes("/api/pdf/contract/"));
    assert.ok(contractDetail.includes("<PrintContractDocument"));
    assert.ok(read("app/(app)/time/page.tsx").includes("/api/pdf/time"));
    assert.ok(read("app/(app)/reports/page.tsx").includes("/api/pdf/reports"));
  });

  it("keeps the status controls and the public-link gate in place", () => {
    const invoiceDetail = read("app/(app)/invoices/[id]/page.tsx");
    assert.ok(invoiceDetail.includes("<InvoiceStatusSelect"));
    assert.ok(invoiceDetail.includes("<InvoiceLinkPanel"));
    const contractDetail = read("app/(app)/contracts/[id]/page.tsx");
    assert.ok(contractDetail.includes("<ContractStatusSelect"));
    assert.ok(contractDetail.includes("<CanEdit"), "the edit gate survives");
  });

  it("keeps the responsive harness sweeping every Phase E route", () => {
    const harness = read("scripts/verify-responsive.mjs");
    for (const slug of ["invoices", "contracts", "time", "reports", "search"]) {
      assert.ok(harness.includes(`{ slug: "${slug}"`), `${slug} is swept`);
    }
    assert.ok(harness.includes("phaseE: ["), "the Phase E shot set exists");
  });
});
