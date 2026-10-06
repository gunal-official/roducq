/**
 * Unit tests for the TXT/Markdown branch of file intake (Queue item #6):
 * strict UTF-8 decode, newline normalization, and the magic-byte dispatch
 * in lib/intake/extract.ts — including the explicit PDF refusal.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  extractPlainText,
  extractUploadText,
} from "../../lib/intake/extract.ts";
import {
  ExtractError,
  PDF_REFUSAL_MESSAGE,
} from "../../lib/intake/shared.ts";

const enc = new TextEncoder();

describe("extractPlainText — TXT / Markdown", () => {
  test("plain UTF-8 is returned verbatim", () => {
    const note = "Hi Maya — kick off the rebrand next Tuesday? © roducq";
    assert.equal(extractPlainText(enc.encode(note)), note);
  });

  test("CRLF and lone CR are normalized to LF", () => {
    const mixed = "one\r\ntwo\rthree\nfour";
    assert.equal(
      extractPlainText(enc.encode(mixed)),
      "one\ntwo\nthree\nfour"
    );
  });

  test("a UTF-8 byte-order mark is stripped exactly once", () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const callNotes = enc.encode("call notes");
    const withBom = new Uint8Array(bom.length + callNotes.length);
    withBom.set(bom, 0);
    withBom.set(callNotes, bom.length);
    assert.equal(extractPlainText(withBom), "call notes");
    // An inner BOM is content, not a mark — preserved as U+FEFF.
    assert.equal(extractPlainText(enc.encode("a﻿b")), "a﻿b");
  });

  test("markdown structure passes through untouched", () => {
    const md = "# Kickoff\n\n- Scope: rebrand\n- Budget: $5k\n\n> let's chat";
    assert.equal(extractPlainText(enc.encode(md)), md);
  });

  test("invalid UTF-8 is rejected as not_text (no mojibake pass-through)", () => {
    // Lone continuation bytes; fatal decoder must throw.
    assert.throws(
      () => extractPlainText(new Uint8Array([0x68, 0x80, 0x69])),
      (err: unknown) =>
        err instanceof ExtractError && (err as ExtractError).code === "not_text"
    );
  });

  test("NUL/control bytes mark the file as binary, not text", () => {
    const binaryish = new Uint8Array([0x41, 0x00, 0x42, 0x07]);
    assert.throws(
      () => extractPlainText(binaryish),
      (err: unknown) =>
        err instanceof ExtractError && (err as ExtractError).code === "not_text"
    );
    // tabs are legitimate text
    assert.equal(extractPlainText(enc.encode("a\tb")), "a\tb");
  });
});

describe("extractUploadText — magic-byte dispatch", () => {
  test("empty file → \"empty\" before anything else", () => {
    assert.throws(
      () => extractUploadText(new Uint8Array(0)),
      (err: unknown) =>
        err instanceof ExtractError && (err as ExtractError).code === "empty"
    );
  });

  test("%PDF- magic is refused with the exact locked message", () => {
    const pdf = enc.encode("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< >>\nendobj\n");
    assert.throws(
      () => extractUploadText(pdf),
      (err: unknown) => {
        assert.ok(err instanceof ExtractError);
        assert.equal((err as ExtractError).code, "pdf");
        assert.equal((err as ExtractError).message, PDF_REFUSAL_MESSAGE);
        return true;
      }
    );
    // The refusal wording is part of the contract — guard it verbatim.
    assert.equal(
      PDF_REFUSAL_MESSAGE,
      "PDF upload isn’t supported yet — open it, copy the text, " +
        "paste it (scanned PDFs won’t work)."
    );
  });

  test("PK\\x03\\x04 magic dispatches to the DOCX branch (no extension consulted)", () => {
    // A PK-prefixed blob must be handled by the DOCX branch and fail
    // there as "format"/"corrupt" — never silently read as text.
    const pkBlob = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x61, 0x62, 0x63]);
    assert.throws(
      () => extractUploadText(pkBlob),
      (err: unknown) =>
        err instanceof ExtractError &&
        ["format", "corrupt"].includes((err as ExtractError).code)
    );
  });

  test("plain text returns format \"text\"; dispatcher ignores names entirely", () => {
    const result = extractUploadText(enc.encode("just notes"));
    assert.equal(result.format, "text");
    assert.equal(result.text, "just notes");
  });
});
