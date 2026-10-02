/**
 * The shared "can this invoice be shared?" rule — lib/invoice-sharing.ts.
 *
 * This is the single source of truth both the UI (InvoiceLinkPanel) and
 * the server actions import, and it has to stay aligned with the
 * `i.status in ('sent','paid')` filter inside get_shared_invoice().
 * tests/db/invoice-share-link.test.ts proves the DB half against real
 * Postgres; this file pins the TS half.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canShareInvoice,
  INVOICE_SHARE_HELP,
  invoiceShareBlockedError,
  SHAREABLE_INVOICE_STATUSES,
} from "../../lib/invoice-sharing.ts";

describe("canShareInvoice", () => {
  it("allows exactly the statuses the public RPC renders", () => {
    assert.equal(canShareInvoice("sent"), true);
    assert.equal(canShareInvoice("paid"), true);
  });

  it("blocks draft — the bug this module exists for", () => {
    assert.equal(canShareInvoice("draft"), false);
  });

  it("blocks void", () => {
    assert.equal(canShareInvoice("void"), false);
  });

  it("blocks junk, null and undefined rather than defaulting open", () => {
    assert.equal(canShareInvoice(null), false);
    assert.equal(canShareInvoice(undefined), false);
    assert.equal(canShareInvoice(""), false);
    assert.equal(canShareInvoice("SENT"), false, "status compare is exact-case");
    assert.equal(canShareInvoice("sent "), false);
  });

  it("SHAREABLE_INVOICE_STATUSES is exactly ['sent','paid']", () => {
    assert.deepEqual([...SHAREABLE_INVOICE_STATUSES], ["sent", "paid"]);
  });
});

describe("INVOICE_SHARE_HELP", () => {
  it("is the exact spec wording shown under the disabled button", () => {
    assert.equal(
      INVOICE_SHARE_HELP,
      "Public links are available after the invoice is marked Sent."
    );
  });
});

describe("invoiceShareBlockedError", () => {
  it("names the blocking status and repeats the helper sentence", () => {
    const draft = invoiceShareBlockedError("draft");
    assert.ok(draft.includes("draft"), draft);
    assert.ok(draft.endsWith(INVOICE_SHARE_HELP), draft);

    const voided = invoiceShareBlockedError("void");
    assert.ok(voided.includes("void"), voided);
    assert.ok(voided.endsWith(INVOICE_SHARE_HELP), voided);
  });

  it("still returns a usable sentence for an unexpected status", () => {
    const unknown = invoiceShareBlockedError("banana");
    assert.ok(unknown.endsWith(INVOICE_SHARE_HELP), unknown);
  });
});
