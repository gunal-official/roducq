/**
 * Unit tests for the zero-dependency PDF reader (Queue item #6,
 * lib/intake/pdf.ts). Every fixture is assembled byte-by-byte by
 * ./file-intake-pdf.ts (plain objects, real `node:zlib` deflate for the
 * compressed-stream cases) — nothing binary is committed.
 *
 * A round-trip against the repo's OWN PDF writer (lib/pdf/writer.ts) is
 * included too: a user re-uploading a roducq-exported invoice/contract
 * must come back as readable text, not a dead end.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { extractPdfText } from "../../lib/intake/pdf.ts";
import { extractUploadText } from "../../lib/intake/extract.ts";
import { ExtractError } from "../../lib/intake/shared.ts";
import {
  createPage,
  drawText,
  renderPdf,
} from "../../lib/pdf/writer.ts";
import {
  assemblePdf,
  buildDifferencesPdf,
  buildObjStmPdf,
  buildSimplePdf,
  buildType0Pdf,
  dictObject,
  streamObject,
} from "./file-intake-pdf.ts";

function expectExtractError(fn: () => unknown, code: string): ExtractError {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof ExtractError, "throws ExtractError");
    assert.equal((err as ExtractError).code, code);
    return err as ExtractError;
  }
  assert.fail(`expected ExtractError(${code})`);
}

describe("extractPdfText — our own writer's output (round-trip)", () => {
  test("a renderPdf() document reads back as its drawn text", () => {
    const page = createPage({ width: 612, height: 792 });
    drawText(page, 72, 700, "Kickoff summary", { font: "Helvetica", size: 14 });
    drawText(page, 72, 680, "Scope: rebrand the homepage.", {
      font: "Helvetica",
      size: 11,
    });
    const bytes = renderPdf([page], {
      title: "Brief",
      author: "roducq",
      createdAt: new Date("2026-10-06T00:00:00Z"),
    });

    const text = extractPdfText(bytes);
    assert.ok(text.includes("Kickoff summary"));
    assert.ok(text.includes("Scope: rebrand the homepage."));
    assert.equal(text.indexOf("Kickoff"), 0);
    assert.ok(text.indexOf("Kickoff") < text.indexOf("Scope"));
  });

  test("two pages come back in order, separated by a blank line", () => {
    const page1 = createPage({ width: 612, height: 792 });
    drawText(page1, 72, 700, "Page one text", { font: "Helvetica", size: 12 });
    const page2 = createPage({ width: 612, height: 792 });
    drawText(page2, 72, 700, "Page two text", { font: "Helvetica", size: 12 });
    const bytes = renderPdf([page1, page2], {
      title: "Two pager",
      author: "roducq",
      createdAt: new Date("2026-10-06T00:00:00Z"),
    });

    const text = extractPdfText(bytes);
    assert.equal(text, "Page one text\n\nPage two text");
  });

  test("an em dash and curly quotes (WinAnsi) round-trip intact", () => {
    const page = createPage({ width: 612, height: 792 });
    drawText(page, 72, 700, "Hi Maya \u2014 \u201Ckickoff\u201D?", {
      font: "Helvetica",
      size: 12,
    });
    const bytes = renderPdf([page], {
      title: "Punctuation",
      author: "roducq",
      createdAt: new Date("2026-10-06T00:00:00Z"),
    });
    assert.equal(extractPdfText(bytes), "Hi Maya \u2014 \u201Ckickoff\u201D?");
  });
});

describe("extractPdfText — simple fonts, hand-built PDFs", () => {
  test("literal-string Tj across several lines, newline per Td", () => {
    const ops =
      "BT /F1 12 Tf 72 700 Td (Line one) Tj " +
      "0 -14 Td (Line two) Tj " +
      "0 -14 Td (Line three) Tj ET";
    const bytes = buildSimplePdf(ops);
    assert.equal(extractPdfText(bytes), "Line one\nLine two\nLine three");
  });

  test("hex-string Tj decodes the same as literal", () => {
    // "(Hi)" as a hex string: 48 69
    const ops = "BT /F1 12 Tf 72 700 Td <4869> Tj ET";
    const bytes = buildSimplePdf(ops);
    assert.equal(extractPdfText(bytes), "Hi");
  });

  test("TJ arrays join strings; large negative kerning becomes a space", () => {
    const ops =
      'BT /F1 12 Tf 72 700 Td [(Hello) -400 (world) -50 (!)] TJ ET';
    const bytes = buildSimplePdf(ops);
    // -400 (<= -120 threshold) inserts a space; -50 does not.
    assert.equal(extractPdfText(bytes), "Hello world!");
  });

  test("the apostrophe operator (') moves to a new line and shows text", () => {
    const ops = "BT /F1 12 Tf 72 700 Td (First) Tj (Second) ' ET";
    const bytes = buildSimplePdf(ops);
    assert.equal(extractPdfText(bytes), "First\nSecond");
  });

  test("a FlateDecode-compressed content stream decodes correctly", () => {
    const ops = "BT /F1 12 Tf 72 700 Td (Compressed content) Tj ET";
    const bytes = buildSimplePdf(ops, { flate: true });
    assert.equal(extractPdfText(bytes), "Compressed content");
  });

  test("/Differences overlay resolves named glyphs outside ASCII", () => {
    // Map byte 0x80 -> emdash, 0x81 -> quotedblleft, 0x82 -> quotedblright.
    const ops =
      "BT /F1 12 Tf 72 700 Td (Ship it \\200 \\201today\\202) Tj ET";
    const bytes = buildDifferencesPdf(
      ops,
      "128 /emdash /quotedblleft /quotedblright"
    );
    assert.equal(
      extractPdfText(bytes),
      "Ship it \u2014 \u201Ctoday\u201D"
    );
  });
});

describe("extractPdfText — Type0/Identity-H composite fonts", () => {
  test("a /ToUnicode CMap decodes 2-byte glyph codes", () => {
    // Arbitrary glyph ids (as a real subset font would assign) mapped to
    // "Hi" via the embedded ToUnicode CMap.
    const ops = "BT /F1 12 Tf 72 700 Td <00010002> Tj ET";
    const bytes = buildType0Pdf(ops, [
      [0x0001, "H"],
      [0x0002, "i"],
    ]);
    assert.equal(extractPdfText(bytes), "Hi");
  });

  test("a Type0 font with no /ToUnicode contributes no text (not a crash)", () => {
    const ops = "BT /F1 12 Tf 72 700 Td <00010002> Tj ET";
    const bytes = assemblePdf([
      dictObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
      dictObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
      dictObject(
        3,
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
          "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
      ),
      dictObject(4, "<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /DescendantFonts [6 0 R] >>"),
      dictObject(6, "<< /Type /Font /Subtype /CIDFontType2 >>"),
      streamObject(5, ops),
    ]);
    expectExtractError(() => extractPdfText(bytes), "empty");
  });
});

describe("extractPdfText — compressed object streams (ObjStm)", () => {
  test("Catalog/Pages/Page/Font compressed into one ObjStm still resolve", () => {
    const ops = "BT /F1 12 Tf 72 700 Td (From inside an ObjStm) Tj ET";
    const bytes = buildObjStmPdf(ops);
    assert.equal(extractPdfText(bytes), "From inside an ObjStm");
  });
});

describe("extractPdfText — refusals and edge cases", () => {
  test("an encrypted PDF is refused with a clear \"format\" error", () => {
    const bytes = assemblePdf([
      dictObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
      dictObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
      dictObject(3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"),
      streamObject(4, "BT /F1 12 Tf 72 700 Td (secret) Tj ET"),
      dictObject(5, "<< /Encrypt 6 0 R >>"),
    ]);
    const err = expectExtractError(() => extractPdfText(bytes), "format");
    assert.match(err.message, /password|encrypt/i);
  });

  test("a PDF with no pages at all is a clear \"format\" error", () => {
    const bytes = assemblePdf([dictObject(1, "<< /Type /Catalog >>")]);
    expectExtractError(() => extractPdfText(bytes), "format");
  });

  test("a page with no text operators (e.g. a scanned image) is \"empty\"", () => {
    // A filled rectangle, no BT/Tj anywhere — the shape a scanned page's
    // content stream takes (one full-page image XObject, drawn with `Do`).
    const ops = "q 1 0 0 RG 0 0 612 792 re f Q";
    const bytes = buildSimplePdf(ops);
    expectExtractError(() => extractPdfText(bytes), "empty");
  });

  test("a genuinely empty byte stream for Contents is \"empty\", not a crash", () => {
    const bytes = buildSimplePdf("");
    expectExtractError(() => extractPdfText(bytes), "empty");
  });

  test("pathologically deep nesting is caught as \"corrupt\", never a crash", () => {
    const deep = "[".repeat(200_000);
    const bytes = assemblePdf([dictObject(1, `<< /Type /Catalog /Bad ${deep} >>`)]);
    expectExtractError(() => extractPdfText(bytes), "corrupt");
  });

  test("garbage bytes after the %PDF- magic never throw a raw exception", () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\n" + "\x00\x01\x02".repeat(50));
    assert.throws(() => extractPdfText(bytes), ExtractError);
  });
});

describe("extractUploadText — PDFs dispatch through the magic-byte router", () => {
  test("a real PDF upload is extracted, not refused", () => {
    const ops = "BT /F1 12 Tf 72 700 Td (Routed correctly) Tj ET";
    const bytes = buildSimplePdf(ops);
    const result = extractUploadText(bytes);
    assert.equal(result.format, "pdf");
    assert.equal(result.text, "Routed correctly");
  });
});
