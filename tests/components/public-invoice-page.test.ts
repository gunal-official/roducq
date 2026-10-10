import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

/**
 * Public invoice page redesign (Step 35) + print layout. These are
 * source-inspection tests in the house style: they pin the structural
 * decisions of the redesign so a refactor can't silently drop the
 * security shape-check, the print affordances, or the document anatomy.
 */
describe("PublicInvoicePage (app/invoice/[token]/page.tsx)", () => {
  const src = read("app/invoice/[token]/page.tsx");

  it("shape-checks the token before any database access", () => {
    // isUuid guard must run before getSharedInvoiceByToken so garbage
    // paths never reach the RPC.
    const guard = src.indexOf("isUuid(token)");
    const fetch = src.indexOf("await getSharedInvoiceByToken(token)");
    assert.ok(guard !== -1, "isUuid guard present");
    assert.ok(fetch !== -1, "RPC call present");
    assert.ok(guard < fetch, "guard runs before the RPC call");
  });

  it("renders every failure mode through the same generic InvalidState", () => {
    // Invalid, revoked, draft and error tokens must be indistinguishable.
    const occurrences = src.split("<InvalidState />").length - 1;
    assert.ok(occurrences >= 3, "InvalidState used for all failure paths");
    assert.ok(src.includes("invalid or has been revoked"));
  });

  it("keeps the invoice anatomy: identity grid, amount-due band, ledger, totals", () => {
    for (const marker of [
      "From",
      "Billed to",
      "Amount due",
      "Amount paid",
      "Subtotal",
      "Tax (",
    ]) {
      assert.ok(src.includes(marker), `document shows "${marker}"`);
    }
    // Ledger column headers introduced by the redesign.
    for (const col of ["Description", "Qty", "Unit", "Amount"]) {
      assert.ok(src.includes(`>${col}</p>`), `column header "${col}"`);
    }
  });

  it("computes totals from line items instead of trusting stored values", () => {
    assert.ok(src.includes("invoiceTotals(invoice.items, invoice.tax_percent)"));
    assert.ok(src.includes("totals.total_cents"));
    assert.ok(src.includes("item.quantity * item.unit_amount_cents"));
  });

  it("hides the chrome and loosens the sheet for print", () => {
    // Brand bar + share footer disappear on paper.
    assert.ok(src.includes("print:hidden"), "chrome is print:hidden");
    // The on-screen 2xl column opens up for the printed sheet.
    assert.ok(src.includes("print:max-w-none"), "paper width loosens in print");
    // Ledger rows and the totals block never split across a page break.
    assert.ok(src.includes("break-inside-avoid"), "rows avoid page breaks");
  });

  it("only offers the PDF download once the token resolved", () => {
    // InvalidState renders <Brand /> without a token, so the chrome
    // must gate the download link on token presence.
    assert.ok(src.includes("token && ("), "DownloadPdfButton gated on token");
    assert.ok(src.includes("/api/pdf/shared/invoice/${token}"));
  });
});

describe("print layout (app/globals.css)", () => {
  const css = read("app/globals.css");

  it("declares a print stylesheet with page margins", () => {
    assert.ok(css.includes("@media print"), "@media print block exists");
    assert.ok(css.includes("@page"), "@page rule sets margins");
  });

  it("forces the light token set so dark mode never prints dark ink", () => {
    const printBlock = css.slice(css.indexOf("@media print"));
    assert.ok(printBlock.includes(".dark"), "dark tokens overridden in print");
    assert.ok(
      printBlock.includes("--card: #fffffe"),
      "card prints on (near) white — the light --card token"
    );
    assert.ok(
      printBlock.includes("--text: #16100f"),
      "ink prints espresso (the light --text token)"
    );
  });

  it("flattens elevation and motion on paper", () => {
    const printBlock = css.slice(css.indexOf("@media print"));
    assert.ok(printBlock.includes("box-shadow: none"), "shadows dropped");
    assert.ok(printBlock.includes("animation: none"), "animations dropped");
  });

  it("provides the print-exact opt-in used by status badges", () => {
    const printBlock = css.slice(css.indexOf("@media print"));
    assert.ok(printBlock.includes(".print-exact"));
    assert.ok(printBlock.includes("print-color-adjust: exact"));
  });
});

describe("InvoiceStatusBadge print fix", () => {
  const src = read("components/invoices/InvoiceStatusBadge.tsx");

  it("opts into exact color printing", () => {
    assert.ok(src.includes("print-exact"), "badge carries print-exact");
  });

  it("every status has an outline fallback for stripped backgrounds", () => {
    // Solid fills vanish when the browser strips backgrounds; each
    // status must go transparent with a printable border/text color.
    const matches = src.match(/print:bg-transparent/g) ?? [];
    assert.equal(matches.length, 4, "all four statuses fall back");
    // The worst offender: Paid is white-on-success (Step 35 redesign
    // moved it off accent onto the success/green token) → must not
    // print white-on-white.
    assert.ok(
      src.includes("print:border-success") && src.includes("print:text-success"),
      "paid falls back to a success outline"
    );
  });

  it("keeps the shared STATUS_STYLES contract", () => {
    assert.ok(src.includes("STATUS_STYLES"));
    for (const label of ["Draft", "Sent", "Paid", "Void"]) {
      assert.ok(src.includes(`"${label}"`), `label ${label} intact`);
    }
  });
});
