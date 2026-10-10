/**
 * Test-only PDF fixture builder (Queue item #6) — no binary fixtures are
 * committed; every PDF in the suite is assembled byte-by-byte here.
 *
 * `lib/intake/pdf.ts` deliberately never trusts `xref`/`trailer` (it
 * brute-force scans for "N G obj"), so fixtures don't need a correct
 * cross-reference table or even a trailer — just object bodies and a
 * `%PDF-` header. That keeps these fixtures tiny and easy to read.
 */

import { deflateSync } from "node:zlib";

const enc = new TextEncoder();

export interface PdfStreamOptions {
  /** Extra dict entries before `/Length`, e.g. `/Filter /FlateDecode`. */
  extraDict?: string;
  flate?: boolean;
}

/** One `"N 0 obj << ... >> stream ... endstream endobj"` object, as bytes. */
export function streamObject(id: number, content: string, options: PdfStreamOptions = {}): string {
  const raw = options.flate ? deflateSync(Buffer.from(content, "latin1")) : Buffer.from(content, "latin1");
  const rawLatin1 = raw.toString("latin1");
  const filter = options.flate ? " /Filter /FlateDecode" : "";
  const extra = options.extraDict ?? "";
  return (
    `${id} 0 obj\n<< /Length ${rawLatin1.length}${filter}${extra} >>\nstream\n${rawLatin1}\nendstream\nendobj\n`
  );
}

/** One `"N 0 obj << ... >> endobj"` dictionary (or bare value) object. */
export function dictObject(id: number, body: string): string {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

/** Assemble a minimal PDF: header + objects, no xref/trailer needed. */
export function assemblePdf(objects: string[]): Uint8Array {
  const text = "%PDF-1.7\n%\u00e2\u00e3\u00cf\u00d3\n" + objects.join("") + "%%EOF\n";
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * A single-page PDF with one simple Helvetica/WinAnsi font (object 4) and
 * a content stream built from the given operators (object 5). Objects:
 * 1 Catalog, 2 Pages, 3 Page, 4 Font, 5 Contents.
 */
export function buildSimplePdf(contentOps: string, options: { flate?: boolean } = {}): Uint8Array {
  return assemblePdf([
    dictObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    dictObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    dictObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    ),
    dictObject(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    streamObject(5, contentOps, { flate: options.flate }),
  ]);
}

/** Build a `/ToUnicode` CMap stream body for a list of [code, text] pairs
 *  using `bfchar` entries (2-byte codes, Identity-H composite fonts). */
export function toUnicodeCMap(pairs: [number, string][]): string {
  const entries = pairs
    .map(([code, text]) => {
      const codeHex = code.toString(16).padStart(4, "0");
      let destHex = "";
      for (const ch of text) destHex += ch.charCodeAt(0).toString(16).padStart(4, "0");
      return `<${codeHex}> <${destHex}>`;
    })
    .join("\n");
  return (
    "/CIDInit /ProcSet findresource begin\n" +
    "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n" +
    `${pairs.length} beginbfchar\n${entries}\nendbfchar\n` +
    "endcmap"
  );
}

/** A single-page PDF whose font is a Type0/Identity-H composite with a
 *  `/ToUnicode` CMap — the shape embedded-subset-font exporters (Chrome
 *  "Print to PDF", LibreOffice, Word) produce. `codeToText` maps each
 *  2-byte glyph code used in `contentOps` to the Unicode it represents. */
export function buildType0Pdf(contentOps: string, codeToText: [number, string][]): Uint8Array {
  return assemblePdf([
    dictObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    dictObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    dictObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>"
    ),
    dictObject(
      4,
      "<< /Type /Font /Subtype /Type0 /BaseFont /Subset+Embedded " +
        "/Encoding /Identity-H /DescendantFonts [7 0 R] /ToUnicode 5 0 R >>"
    ),
    streamObject(5, toUnicodeCMap(codeToText)),
    dictObject(
      7,
      "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Subset+Embedded " +
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>"
    ),
    streamObject(6, contentOps),
  ]);
}

/** A single-page PDF with a simple font carrying a `/Differences` overlay
 *  on top of WinAnsiEncoding — the shape a hand-tuned subset font uses for
 *  typographic punctuation outside ASCII. */
export function buildDifferencesPdf(contentOps: string, differences: string): Uint8Array {
  return assemblePdf([
    dictObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    dictObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    dictObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    ),
    dictObject(
      4,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding " +
        `<< /BaseEncoding /WinAnsiEncoding /Differences [${differences}] >> >>`
    ),
    streamObject(5, contentOps),
  ]);
}

/** A two-object-stream PDF: the Page, Font and Catalog dictionaries all
 *  live inside a compressed `/Type /ObjStm`, never appearing as top-level
 *  "N G obj" headers — the shape PDF-1.5+ writers use to shrink files. */
export function buildObjStmPdf(contentOps: string): Uint8Array {
  // Objects 1 (Catalog), 2 (Pages), 3 (Page), 4 (Font) go inside the
  // ObjStm; only the ObjStm itself (10) and the content stream (5) are
  // top-level.
  const catalog = "<< /Type /Catalog /Pages 2 0 R >>";
  const pages = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  const page =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
    "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
  const font = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  const bodies = [catalog, pages, page, font];
  const ids = [1, 2, 3, 4];
  let offsetCursor = 0;
  const offsets: number[] = [];
  let bodyText = "";
  for (const body of bodies) {
    offsets.push(offsetCursor);
    bodyText += body + " ";
    offsetCursor = bodyText.length;
  }
  const header = ids.map((id, i) => `${id} ${offsets[i]}`).join(" ") + " ";
  const objStmContent = header + bodyText;

  return assemblePdf([
    streamObject(10, objStmContent, {
      extraDict: ` /Type /ObjStm /N ${ids.length} /First ${header.length}`,
    }),
    streamObject(5, contentOps),
  ]);
}

export { deflateSync };
export const utf8 = enc;
