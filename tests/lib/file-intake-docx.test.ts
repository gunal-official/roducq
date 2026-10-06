/**
 * Unit tests for the zero-dependency DOCX reader (Queue item #6,
 * lib/intake/docx.ts). Every fixture is built byte-by-byte by
 * ./file-intake-zip.ts — real ZIP directories, real deflate streams,
 * real CRCs; nothing binary is committed.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";

import {
  extractDocxText,
  extractWordprocessingText,
} from "../../lib/intake/docx.ts";
import { ExtractError } from "../../lib/intake/shared.ts";
import {
  buildDocx,
  buildZip,
  documentXml,
  p,
  t,
} from "./file-intake-zip.ts";

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

describe("extractWordprocessingText — paragraphs and runs", () => {
  test("paragraphs become newlines; runs inside a paragraph join", () => {
    const xml = documentXml(
      p(t("First paragraph.")) +
        p(t("Second") + t(", joined") + t(" runs.")) +
        p(t("Third."))
    );
    assert.equal(
      extractWordprocessingText(xml),
      "First paragraph.\nSecond, joined runs.\nThird."
    );
  });

  test("a run split across many <w:t> elements stays contiguous", () => {
    const xml = documentXml(p(t("Cl") + t("ien") + t("t")));
    assert.equal(extractWordprocessingText(xml), "Client");
  });

  test("entities and numeric character references are decoded", () => {
    const xml = documentXml(
      p(t("Fish &amp; Chips &lt;$5k&gt; &#8212; &#x201C;quoted&#x201D;"))
    );
    assert.equal(
      extractWordprocessingText(xml),
      "Fish & Chips <$5k> — “quoted”"
    );
  });

  test("<w:br/> is a newline and <w:tab/> a tab", () => {
    const xml = documentXml(
      p(
        `<w:r><w:t>line one</w:t><w:br/><w:t>line two</w:t>` +
          `<w:tab/><w:t>indented</w:t></w:r>`
      )
    );
    assert.equal(
      extractWordprocessingText(xml),
      "line one\nline two\tindented"
    );
  });

  test("blank paragraphs (self-closing <w:p/>) survive as blank lines", () => {
    const xml = documentXml(p(t("Above")) + "<w:p/>" + p(t("Below")));
    assert.equal(extractWordprocessingText(xml), "Above\n\nBelow");
  });
});

describe("extractWordprocessingText — skip rules", () => {
  test("field codes (<w:instrText>) are skipped, surrounding text kept", () => {
    const xml = documentXml(
      p(
        t("Report") +
          `<w:fldSimple w:instr=" PAGE ">` +
          t("4") +
          `</w:fldSimple>`
      ) +
        p(
          `<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h </w:instrText></w:r>` +
            t("Contents follow")
        )
    );
    // PAGE field renders its cached value (4) sans instr attr; the TOC
    // instruction vanishes but the run that follows stays.
    assert.equal(extractWordprocessingText(xml), "Report4\nContents follow");
  });

  test("tracked deletions (<w:delText>) are skipped; insertions kept", () => {
    const xml = documentXml(
      p(
        t("We ") +
          `<w:del><w:r><w:delText>won't ever</w:delText></w:r></w:del>` +
          `<w:ins><w:r><w:t>start Monday</w:t></w:r></w:ins>` +
          t(".")
      )
    );
    assert.equal(extractWordprocessingText(xml), "We start Monday.");
  });

  test("AlternateContent fallbacks don't duplicate drawing text", () => {
    const xml = documentXml(
      p(t("Intro.")) +
        `<mc:AlternateContent>` +
        `<mc:Choice>` +
        p(t("Drawing title")) +
        `</mc:Choice>` +
        `<mc:Fallback>` +
        p(t("Drawing title")) +
        `</mc:Fallback>` +
        `</mc:AlternateContent>`
    );
    assert.equal(
      extractWordprocessingText(xml),
      "Intro.\nDrawing title"
    );
  });
});

describe("extractWordprocessingText — tables", () => {
  test("w:tbl/w:tr/w:tc become tab-joined rows in document order", () => {
    // THE regression guard: cells must join with tabs and rows end with
    // newlines — no mangling, no order flip, no missing separators.
    const xml = documentXml(
      p(t("Before.")) +
        `<w:tbl>` +
        `<w:tr>` +
        `<w:tc>${p(t("Scope"))}</w:tc>` +
        `<w:tc>${p(t("Rebrand &amp; site"))}</w:tc>` +
        `<w:tc>${p(t("Signed"))}</w:tc>` +
        `</w:tr>` +
        `<w:tr>` +
        `<w:tc>${p(t("Budget"))}</w:tc>` +
        `<w:tc>${p(t("$5k"))}</w:tc>` +
        `<w:tc>${p(t("Pending"))}</w:tc>` +
        `</w:tr>` +
        `</w:tbl>` +
        p(t("After."))
    );
    assert.equal(
      extractWordprocessingText(xml),
      "Before.\n" +
        "Scope\tRebrand & site\tSigned\n" +
        "Budget\t$5k\tPending\n" +
        "After."
    );
  });

  test("a multi-paragraph cell stays on its row's single line", () => {
    const xml = documentXml(
      `<w:tbl><w:tr>` +
        `<w:tc>${p(t("First."))}${p(t("Second."))}</w:tc>` +
        `<w:tc>${p(t("Other cell"))}</w:tc>` +
        `</w:tr></w:tbl>`
    );
    assert.equal(
      extractWordprocessingText(xml),
      "First. Second.\tOther cell"
    );
  });
});

describe("extractDocxText — ZIP container handling", () => {
  const body = documentXml(p(t("Byte-built archive round trip.")));

  test("deflated fixture extracts (real central directory, real stream)", () => {
    assert.equal(
      extractDocxText(buildDocx(body)),
      "Byte-built archive round trip."
    );
  });

  test("stored (uncompressed) document.xml extracts", () => {
    assert.equal(
      extractDocxText(buildDocx(body, { method: 0 })),
      "Byte-built archive round trip."
    );
  });

  test("entries are resolved from the CENTRAL DIRECTORY — zeroed local-header sizes survive", () => {
    // Streaming writers legally leave local-header sizes at 0. A reader
    // that trusts local headers breaks on this; ours must not.
    assert.equal(
      extractDocxText(buildDocx(body, { zeroLocalSizes: true })),
      "Byte-built archive round trip."
    );
  });

  test("a genuinely corrupted deflate stream → clean \"corrupt\" error", () => {
    const zip = buildDocx(body, { corruptDeflate: true });

    // Prove the fixture is honestly broken: the corrupted payload in the
    // archive cannot be inflated by ANY caller (the block-type bits are
    // deliberately invalid). Locate the document.xml local header, jump
    // over name/extra, and hand inflate the claimed compressed range.
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const sig = view.getUint32(0, true);
    assert.equal(sig, 0x04034b50, "first entry is a local header");
    const nameLen0 = view.getUint16(26, true);
    const compressed0 = view.getUint32(18, true);
    const secondEntryAt = 30 + nameLen0 + compressed0;
    assert.equal(
      view.getUint32(secondEntryAt, true),
      0x04034b50,
      "second entry is a local header"
    );
    const nameLen1 = view.getUint16(secondEntryAt + 26, true);
    const compressed1 = view.getUint32(secondEntryAt + 18, true);
    const thirdEntryAt = secondEntryAt + 30 + nameLen1 + compressed1;
    assert.equal(
      view.getUint32(thirdEntryAt, true),
      0x04034b50,
      "third entry (document.xml) is a local header"
    );
    const nameLen2 = view.getUint16(thirdEntryAt + 26, true);
    const extraLen2 = view.getUint16(thirdEntryAt + 28, true);
    const claim2 = view.getUint32(thirdEntryAt + 18, true);
    const payload = zip.subarray(
      thirdEntryAt + 30 + nameLen2 + extraLen2,
      thirdEntryAt + 30 + nameLen2 + extraLen2 + claim2
    );
    assert.equal(
      new TextDecoder().decode(
        zip.subarray(thirdEntryAt + 30, thirdEntryAt + 30 + nameLen2)
      ),
      "word/document.xml"
    );
    // The stream itself is corrupted — inflate rejects it outright.
    assert.throws(() => inflateRawSync(payload));

    // …and our reader turns that into a user-safe \"corrupt\" error,
    // never garbage text and never a crash.
    const err = expectExtractError(() => extractDocxText(zip), "corrupt");
    assert.match(err.message, /decompress|damaged/i);
  });

  test("an archive without document.xml is \"format\", not a crash", () => {
    const zip = buildZip([
      { name: "readme.txt", content: "no word part here" },
    ]);
    const err = expectExtractError(() => extractDocxText(zip), "format");
    assert.match(err.message, /not a Word document/i);
  });

  test("a truncated archive is a clean error, not an exception", () => {
    const zip = buildDocx(body);
    const truncated = zip.subarray(0, Math.floor(zip.length / 2));
    expectExtractError(
      () => extractDocxText(truncated.slice()),
      "format" // EOCD gone → no central directory
    );
  });

  test("a deflate payload cut mid-stream (directory lies) is \"corrupt\"", () => {
    const zip = buildDocx(body, { truncatePayload: true });
    assert.throws(
      () => extractDocxText(zip),
      (err: unknown) => err instanceof ExtractError
    );
  });

  test("an empty document.xml is \"empty\", not a crash", () => {
    const zip = buildDocx(documentXml(""));
    expectExtractError(() => extractDocxText(zip), "empty");
  });
});
