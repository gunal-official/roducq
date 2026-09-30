/**
 * Structural tests for the Step-35 invoice detail page rebuild:
 *   - status badge redesign (Draft/Sent/Paid/Void each get a distinct
 *     color, "Sent" on the new --info/--info-soft tokens)
 *   - the new --info/--info-soft CSS tokens exist (light + dark) and are
 *     wired into the Tailwind color palette
 *   - print layout: the on-screen editor is print:hidden and a dedicated
 *     PrintInvoiceDocument (hidden print:block) is the only thing that
 *     prints
 *
 * Source-string assertions, same convention as nav.test.ts / doc-detail.
 * test.ts / StatusBadge.test.ts: the .tsx/.css/.ts files are read as text
 * so the zero-dep `node --test` runner needs no JSX/DOM environment.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("InvoiceStatusBadge — Draft/Sent/Paid/Void redesign", () => {
  const src = read("components/invoices/InvoiceStatusBadge.tsx");

  it("keeps the STATUS_STYLES contract", () => {
    assert.ok(src.includes("STATUS_STYLES"));
    for (const label of ["Draft", "Sent", "Paid", "Void"]) {
      assert.ok(src.includes(`"${label}"`), label);
    }
  });

  it("Sent uses the new info blue tokens, not accent orange", () => {
    assert.ok(
      src.includes("border-info bg-info-soft text-info"),
      "sent status should use --info/--info-soft"
    );
  });

  it("Paid is a solid success green (terminal, good-news state)", () => {
    assert.ok(
      src.includes("bg-success text-white"),
      "paid status should use --success, not accent"
    );
  });

  it("Draft and Void stay visually distinct from Sent/Paid", () => {
    assert.ok(src.includes("bg-muted text-muted-foreground"), "draft");
    assert.ok(src.includes("border-error/30"), "void reads as a quiet red outline");
  });

  it("every status resolves to a different className (no accidental reuse)", () => {
    const classNames = Array.from(
      src.matchAll(/className:\s*"([^"]+)"/g)
    ).map((m) => m[1]);
    assert.equal(classNames.length, 4, "one className per status");
    assert.equal(
      new Set(classNames).size,
      4,
      "all four status classNames must be distinct"
    );
  });
});

describe("--info / --info-soft design tokens", () => {
  const css = read("app/globals.css");
  const tw = read("tailwind.config.ts");

  it("are defined for both light (:root) and dark (.dark)", () => {
    const rootBlock = css.slice(css.indexOf(":root"), css.indexOf(".dark"));
    const darkBlock = css.slice(css.indexOf(".dark"));
    assert.match(rootBlock, /--info:\s*#[0-9a-fA-F]{3,6}/);
    assert.match(rootBlock, /--info-soft:\s*color-mix/);
    assert.match(darkBlock, /--info:\s*#[0-9a-fA-F]{3,6}/);
    assert.match(darkBlock, /--info-soft:\s*color-mix/);
  });

  it("are wired into the Tailwind color palette as `info`/`info-soft`", () => {
    assert.match(tw, /info:\s*{\s*DEFAULT:\s*"var\(--info\)"/);
    assert.ok(tw.includes('soft: "var(--info-soft)"'));
  });
});

describe("invoice detail page — print layout (only the document prints)", () => {
  const page = read("app/(app)/invoices/[id]/page.tsx");
  const printDoc = read("components/invoices/PrintInvoiceDocument.tsx");

  it("wraps the on-screen editor/rail/stat-tiles in print:hidden", () => {
    assert.ok(
      page.includes('<div className="print:hidden">'),
      "on-screen UI must be wrapped in a print:hidden container"
    );
  });

  it("renders PrintInvoiceDocument outside the print:hidden wrapper", () => {
    assert.ok(page.includes("import { PrintInvoiceDocument }"));
    assert.ok(
      page.includes("<PrintInvoiceDocument invoice={invoice} workspaceName={context.name} />")
    );
    const wrapperClose = page.lastIndexOf('<div className="print:hidden">');
    const printUsage = page.indexOf("<PrintInvoiceDocument");
    assert.ok(
      printUsage > wrapperClose,
      "PrintInvoiceDocument must be rendered after (outside) the print:hidden wrapper"
    );
  });

  it("PrintInvoiceDocument is invisible on screen and print:block only", () => {
    assert.ok(
      printDoc.includes('className="hidden max-w-3xl print:block"'),
      "print document must be hidden on screen and shown only for print"
    );
  });

  it("PrintInvoiceDocument renders the same computed totals as the on-screen paper", () => {
    assert.ok(printDoc.includes("invoiceTotals(invoice.items, invoice.tax_percent)"));
    for (const field of ["subtotal_cents", "tax_cents", "total_cents"]) {
      assert.ok(printDoc.includes(field), field);
    }
  });

  it("the (app) chrome (topbar/sidebar) is print:hidden at the layout level", () => {
    const layout = read("app/(app)/layout.tsx");
    assert.ok(
      layout.includes('<div className="col-span-2 print:hidden">'),
      "topbar wrapper must be print:hidden"
    );
    assert.ok(
      layout.includes('<div className="hidden print:hidden tab:block">'),
      "sidebar wrapper must be print:hidden"
    );
  });
});
