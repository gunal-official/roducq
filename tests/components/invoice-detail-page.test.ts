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
      printDoc.includes('className="print-document hidden print:block"'),
      "print document must be hidden on screen and shown only for print"
    );
  });

  it("PrintInvoiceDocument carries no max-w-* cap of its own", () => {
    // The page box is the only thing that should bound the sheet; a
    // leftover max-w-3xl would fight .print-document's max-width:none.
    assert.ok(
      !/className="[^"]*\bmax-w-\w+[^"]*"/.test(
        printDoc.slice(printDoc.indexOf("<div className="), printDoc.indexOf("</div>"))
      ),
      "root print container must not pin its own max-width"
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
      layout.includes('<div className="app-topbar col-span-2 print:hidden">'),
      "topbar wrapper must be print:hidden"
    );
    assert.ok(
      layout.includes('<div className="app-sidebar hidden print:hidden tab:block">'),
      "sidebar wrapper must be print:hidden"
    );
  });
});

/**
 * Regression: print preview of /invoices/:id collapsed into a narrow
 * left column. The shell grid kept its sidebar tracks in print, and with
 * the chrome display:none'd <main> auto-placed into the 64px `tab:`
 * track (print media queries resolve against the ~710px page box, not
 * the viewport). Tailwind print: variants tie on specificity with the
 * grid-template-columns utilities, so the flattening lives in the print
 * stylesheet behind stable class hooks.
 */
describe("print layout — app shell must flatten (narrow-column regression)", () => {
  const layout = read("app/(app)/layout.tsx");
  const css = read("app/globals.css");
  const printBlock = css.slice(css.indexOf("@media print"));

  /** Body of a rule inside the print block, by selector list. Anchored to
   *  a line start so prose mentions of `.app-shell` in the explanatory
   *  comment above the rules are not mistaken for the rules themselves. */
  const rule = (selectors: string) => {
    const pattern = new RegExp(
      `^[ \\t]*${selectors.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*{([^}]*)}`,
      "m"
    );
    const match = printBlock.match(pattern);
    assert.ok(match, `expected a \`${selectors}\` rule inside @media print`);
    return match[1];
  };

  it("the shell exposes stable .app-shell / .app-main hooks", () => {
    assert.match(
      layout,
      /className="app-shell grid /,
      "grid wrapper must carry .app-shell"
    );
    assert.match(
      layout,
      /className="app-main /,
      "<main> must carry .app-main"
    );
  });

  it("the shell grid is hard-overridden to block in print", () => {
    const shell = rule(".app-shell");
    assert.match(shell, /display:\s*block\s*!important/, "display:block");
    assert.match(
      shell,
      /grid-template-columns:\s*none\s*!important/,
      "sidebar tracks removed"
    );
  });

  it("main is released from the track, the viewport clamp and the scroller", () => {
    const main = rule(".app-main");
    assert.match(main, /width:\s*100%\s*!important/, "full width");
    assert.match(main, /max-width:\s*none\s*!important/, "no max-width cap");
    assert.match(main, /overflow:\s*visible\s*!important/, "no clipping");
  });

  it("h-dvh + overflow-hidden cannot clip a multi-page invoice", () => {
    // Without these the printed document is truncated to one sheet.
    const shell = rule(".app-shell");
    assert.match(shell, /height:\s*auto\s*!important/, "height released");
    assert.match(shell, /overflow:\s*visible\s*!important/, "overflow released");
  });

  it("topbar and sidebar are forced off the page", () => {
    assert.match(
      rule(".app-topbar,\n  .app-sidebar"),
      /display:\s*none\s*!important/,
      "chrome display:none !important in print"
    );
  });

  it("the print document container cannot be width-constrained", () => {
    const doc = rule(".print-document");
    assert.match(doc, /width:\s*100%\s*!important/);
    assert.match(doc, /max-width:\s*none\s*!important/);
  });
});
