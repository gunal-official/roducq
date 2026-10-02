/**
 * Draft invoices must not be able to mint a public link.
 *
 * The public route /invoice/[token] reads through get_shared_invoice(),
 * which filters `status in ('sent','paid')` — so a token minted on a
 * DRAFT invoice opens as "This link is invalid or has been revoked".
 * The fix blocks creation instead of widening the RPC, in two places:
 *
 *   - InvoiceLinkPanel disables Create/Regenerate + shows helper text
 *   - the server actions re-check the live status before writing
 *
 * Source-string assertions, same convention as invoice-detail-page.
 * test.ts / nav.test.ts: the .tsx files are read as text so the
 * zero-dep `node --test` runner needs no JSX/DOM environment.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { INVOICE_SHARE_HELP } from "../../lib/invoice-sharing.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("InvoiceLinkPanel — blocked while draft/void", () => {
  const src = read("components/invoices/InvoiceLinkPanel.tsx");

  it("takes the invoice status as a prop (the gate's input)", () => {
    assert.ok(src.includes("invoiceStatus"), "needs an invoiceStatus prop");
    assert.ok(
      /invoiceStatus:\s*InvoiceStatus/.test(src),
      "invoiceStatus should be typed as InvoiceStatus"
    );
  });

  it("derives the gate from the shared rule, not a local status list", () => {
    assert.ok(
      src.includes('from "@/lib/invoice-sharing"'),
      "must import the single source of truth"
    );
    assert.ok(src.includes("canShareInvoice(invoiceStatus)"));
    assert.ok(
      !/["']sent["']\s*\|\|/.test(src) && !src.includes('status === "sent"'),
      "no ad-hoc status comparison — use canShareInvoice"
    );
  });

  it("disables BOTH the create and the regenerate button", () => {
    const disabled = src.match(/disabled=\{pending \|\| !shareable\}/g) ?? [];
    assert.equal(
      disabled.length,
      2,
      "create + regenerate must both be gated on `shareable`"
    );
  });

  it("leaves Revoke enabled — killing a live link is always allowed", () => {
    assert.ok(
      src.includes("Revoke link"),
      "revoke button should still be rendered"
    );
    // The revoke button's disabled is plain `pending`, un-gated.
    assert.ok(
      /disabled=\{pending\}/.test(src),
      "revoke stays gated only on `pending`"
    );
  });

  it("renders the helper text from the shared constant", () => {
    assert.ok(src.includes("{INVOICE_SHARE_HELP}"));
    assert.ok(
      !src.includes("Public links are available after"),
      "the sentence must not be re-typed in the component — import it"
    );
  });

  it("ties the explanation to the disabled button for screen readers", () => {
    assert.ok(src.includes("aria-describedby"));
    assert.ok(src.includes("HELP_ID"));
  });
});

describe("helper text wording (acceptance criteria, verbatim)", () => {
  it("is exactly the sentence the spec asks for", () => {
    assert.equal(
      INVOICE_SHARE_HELP,
      "Public links are available after the invoice is marked Sent."
    );
  });
});

describe("invoice detail page wires the status through", () => {
  const src = read("app/(app)/invoices/[id]/page.tsx");

  it("passes invoice.status into the link panel", () => {
    assert.ok(
      /invoiceStatus=\{invoice\.status\}/.test(src),
      "page must hand the panel the live status"
    );
  });
});

describe("server actions enforce the same rule (bypass-proof)", () => {
  const src = read("app/(app)/invoices/[id]/actions.ts");

  it("imports the shared rule rather than hardcoding statuses", () => {
    assert.ok(src.includes('from "@/lib/invoice-sharing"'));
    assert.ok(src.includes("canShareInvoice"));
    assert.ok(src.includes("invoiceShareBlockedError"));
  });

  it("guards create AND regenerate", () => {
    const guards =
      src.match(/if \(!canShareInvoice\(invoice\.status\)\) \{/g) ?? [];
    assert.equal(
      guards.length,
      2,
      "createInvoiceLink and regenerateInvoiceLink must both guard"
    );
  });

  it("reads the status from the DB, not from client input", () => {
    assert.ok(
      src.includes('.select("workspace_id, status")'),
      "create reads the live status alongside workspace_id"
    );
    assert.ok(
      src.includes('.select("status")'),
      "regenerate reads the live status"
    );
    assert.ok(
      !/canShareInvoice\(input\./.test(src),
      "never trust a status supplied by the caller"
    );
  });

  it("guards before the write in createInvoiceLink", () => {
    const body = src.slice(
      src.indexOf("export async function createInvoiceLink"),
      src.indexOf("export async function revokeInvoiceLink")
    );
    const guardAt = body.indexOf("canShareInvoice");
    const insertAt = body.indexOf('.from("invoice_links").insert');
    assert.ok(guardAt > -1 && insertAt > -1, "both markers present");
    assert.ok(guardAt < insertAt, "the guard must run before the insert");
  });

  it("guards before the write in regenerateInvoiceLink", () => {
    const body = src.slice(
      src.indexOf("export async function regenerateInvoiceLink")
    );
    const guardAt = body.indexOf("canShareInvoice");
    const updateAt = body.indexOf("crypto.randomUUID()");
    assert.ok(guardAt > -1 && updateAt > -1, "both markers present");
    assert.ok(guardAt < updateAt, "the guard must run before the token swap");
  });
});
