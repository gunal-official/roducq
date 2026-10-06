/**
 * Route-handler tests for POST /api/intake/extract (Queue item #6).
 *
 * The request logic is framework-free (lib/intake/handler.ts) and takes
 * an injected auth gate, so these tests drive the REAL handler the Next
 * route uses, with only the session stubbed — no server, no network, no
 * Supabase. Undici's Request/FormData stand in for the wire.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  handleExtractRequest,
  type ExtractAuthGate,
} from "../../lib/intake/handler.ts";
import {
  MAX_OUTPUT_CHARS,
  MAX_UPLOAD_BYTES,
  PDF_REFUSAL_MESSAGE,
  TOO_LARGE_MESSAGE,
} from "../../lib/intake/shared.ts";
import { buildDocx, documentXml, p, t } from "./file-intake-zip.ts";

const authed: ExtractAuthGate = { isAuthenticated: async () => true };
const anon: ExtractAuthGate = { isAuthenticated: async () => false };

const URL_ = "http://test.local/api/intake/extract";

function formWithFile(
  bytes: Uint8Array,
  name: string,
  type: string
): FormData {
  const form = new FormData();
  // Copy → own exactly-sized ArrayBuffer (File parts require
  // ArrayBuffer-backed views under the generic typed-array lib typings).
  const copy = bytes.slice();
  form.append("file", new File([copy.buffer as ArrayBuffer], name, { type }));
  return form;
}

function post(body: BodyInit): Request {
  return new Request(URL_, { method: "POST", body });
}

const enc = new TextEncoder();

describe("POST /api/intake/extract — auth", () => {
  test("unauthenticated requests are rejected with 401 before any parsing", async () => {
    const res = await handleExtractRequest(
      post(formWithFile(enc.encode("hello there"), "notes.txt", "text/plain")),
      anon
    );
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, "auth");
  });

  test("unauthenticated + garbage content type still 401s (auth first)", async () => {
    const res = await handleExtractRequest(
      new Request(URL_, { method: "POST", body: "not multipart at all" }),
      anon
    );
    assert.equal(res.status, 401);
  });
});

describe("POST /api/intake/extract — happy path", () => {
  test("a .txt upload returns text + minimal metadata, nothing stored", async () => {
    const source = "Hi Maya — let's kick off the rebrand next Tuesday.\nBudget: $5k.";
    const res = await handleExtractRequest(
      post(formWithFile(enc.encode(source), "kickoff notes.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text, source);
    assert.equal(body.meta.filename, "kickoff notes.txt");
    assert.equal(body.meta.mime, "text/plain");
    assert.equal(body.meta.bytes, enc.encode(source).length);
    assert.equal(body.meta.chars, source.length);
    assert.equal(body.meta.format, "text");
    assert.equal(body.meta.truncated, false);
  });

  test("a .docx upload is walked and returned as plain text", async () => {
    const docx = buildDocx(
      documentXml(
        p(t("Kickoff summary")) +
          `<w:tbl><w:tr><w:tc>${p(t("Scope"))}</w:tc><w:tc>${p(t("Rebrand"))}</w:tc></w:tr></w:tbl>`
      )
    );
    const res = await handleExtractRequest(
      post(
        formWithFile(
          docx,
          "brief.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ),
      authed
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text, "Kickoff summary\nScope\tRebrand");
    assert.equal(body.meta.format, "docx");
  });

  test("detection is by magic bytes: a docx named notes.txt still works", async () => {
    const docx = buildDocx(documentXml(p(t("Mislabeled but readable."))));
    const res = await handleExtractRequest(
      post(formWithFile(docx, "notes.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.format, "docx");
    assert.equal(body.meta.filename, "notes.txt");
  });

  test("a missing file field is a 400", async () => {
    const form = new FormData();
    form.append("note", "text value, not a file");
    const res = await handleExtractRequest(post(form), authed);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "bad_request");
  });
});

describe("POST /api/intake/extract — PDF refusal", () => {
  test("PDF bytes are refused with the exact locked message (415)", async () => {
    const fakePdf = enc.encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const res = await handleExtractRequest(
      post(formWithFile(fakePdf, "contract.pdf", "application/pdf")),
      authed
    );
    assert.equal(res.status, 415);
    const body = await res.json();
    assert.equal(body.code, "pdf");
    assert.equal(body.error, PDF_REFUSAL_MESSAGE);
  });

  test("…even when the browser mislabels the part as application/octet-stream", async () => {
    const fakePdf = enc.encode("%PDF-1.7\n%âã\n");
    const res = await handleExtractRequest(
      post(formWithFile(fakePdf, "blob.bin", "application/octet-stream")),
      authed
    );
    assert.equal(res.status, 415);
    assert.equal((await res.json()).code, "pdf");
  });
});

describe("POST /api/intake/extract — limits", () => {
  test("an upload over 5 MB is refused with 413", async () => {
    const tooBig = new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0x61); // "a"
    const res = await handleExtractRequest(
      post(formWithFile(tooBig, "huge.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.code, "too_large");
    assert.equal(body.error, TOO_LARGE_MESSAGE);
  });

  test("an oversized declared Content-Length is refused without parsing", async () => {
    // The handler is typed against Request but exercises only
    // request.headers + request.formData(); a headers-only stub isolates
    // the declared-length pre-check (an honest multipart Request rewrites
    // its own Content-Length from the actual body).
    const stub = {
      headers: new Headers({
        "content-length": String(MAX_UPLOAD_BYTES * 4),
      }),
      formData: async () => {
        throw new Error("formData() must never run past the 413 gate");
      },
    } as unknown as Request;
    const res = await handleExtractRequest(stub, authed);
    assert.equal(res.status, 413);
    assert.equal((await res.json()).code, "too_large");
  });

  test("a real 5 MB text file at the ceiling still succeeds", async () => {
    const atCeiling = new Uint8Array(MAX_UPLOAD_BYTES).fill(0x61);
    const res = await handleExtractRequest(
      post(formWithFile(atCeiling, "at-ceiling.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.meta.bytes, MAX_UPLOAD_BYTES);
    assert.equal(body.meta.chars, MAX_OUTPUT_CHARS); // output cap kicks in
    assert.equal(body.meta.truncated, true);
  });

  test("output is capped at 100k characters and flagged", async () => {
    const long = "x".repeat(MAX_OUTPUT_CHARS + 50_000);
    const res = await handleExtractRequest(
      post(formWithFile(enc.encode(long), "long.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text.length, MAX_OUTPUT_CHARS);
    assert.equal(body.meta.truncated, true);
    assert.equal(body.meta.chars, MAX_OUTPUT_CHARS);
  });

  test("the cap never splits a surrogate pair", async () => {
    const emoji = "🙂"; // 2 UTF-16 units
    const prefix = "y".repeat(MAX_OUTPUT_CHARS - 1);
    const long = prefix + emoji + "z".repeat(10_000);
    const res = await handleExtractRequest(
      post(formWithFile(enc.encode(long), "emoji.txt", "text/plain")),
      authed
    );
    const body = await res.json();
    assert.equal(res.status, 200);
    // Either the emoji fits whole (…<cap>… no), or the half-pair is dropped.
    assert.ok(body.text.length <= MAX_OUTPUT_CHARS);
    const code = body.text.charCodeAt(body.text.length - 1);
    assert.ok(!(code >= 0xd800 && code <= 0xdbff), "no dangling high surrogate");
  });
});

describe("POST /api/intake/extract — damaged/unsupported content", () => {
  test("a corrupt .docx is a 422, not a 500", async () => {
    const zip = buildDocx(documentXml(p(t("Broken"))), {
      corruptDeflate: true,
    });
    const res = await handleExtractRequest(
      post(
        formWithFile(
          zip,
          "broken.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ),
      authed
    );
    assert.equal(res.status, 422);
    assert.equal((await res.json()).code, "corrupt");
  });

  test("binary garbage is a 422 with a readable message", async () => {
    const garbage = new Uint8Array(512);
    for (let i = 0; i < garbage.length; i++) garbage[i] = (i * 37) % 256;
    const res = await handleExtractRequest(
      post(formWithFile(garbage, "scan.bin", "application/octet-stream")),
      authed
    );
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.code, "not_text");
  });

  test("a whitespaces-only file is 422-empty", async () => {
    const res = await handleExtractRequest(
      post(formWithFile(enc.encode("   \n\n  \t "), "empty.txt", "text/plain")),
      authed
    );
    assert.equal(res.status, 422);
    assert.equal((await res.json()).code, "empty");
  });
});
