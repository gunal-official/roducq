/**
 * File intake (Queue item #6) — zero-dependency DOCX reader.
 *
 * A .docx is a ZIP archive of XML parts. This module:
 *   1. parses the archive's CENTRAL DIRECTORY (never the local headers'
 *      size fields — those may legally be zero/wrong when a writer streams
 *      with data descriptors; the central directory is the source of truth
 *      for compressed size, uncompressed size, CRC and entry list),
 *   2. pulls word/document.xml out of it (stored entries pass through,
 *      deflated entries go through node:zlib's inflateRawSync with an
 *      output cap so a hostile "zip bomb" dies at the claimed size), and
 *   3. walks the WordprocessingML with a tiny purpose-built tokenizer —
 *      no XML dependency, but the rules a brief-grade document needs:
 *        - runs of <w:t> join contiguously, entities decoded;
 *        - paragraph ends (</w:p> and <w:p/>) become newlines, <w:br/> is
 *          a newline, <w:tab/> a tab;
 *        - tables keep their structure: cells joined by tabs, rows ended
 *          by newlines, in document order;
 *        - field codes (<w:instrText>), tracked deletions (<w:delText>)
 *          and AlternateContent fallbacks (duplicated drawing text) are
 *          skipped; tracked INSERTIONS stay (they are current text).
 *
 * Server-side only: imports node:zlib. The client never sees this module.
 */

import { inflateRawSync } from "node:zlib";

import { ExtractError } from "./shared.ts";

/* ------------------------------------------------------------------ */
/* 1. ZIP container                                                    */
/* ------------------------------------------------------------------ */

const EOCD_SIG = 0x06054b50;
const CD_ENTRY_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const EOCD_MIN_LEN = 22;
const MAX_COMMENT_LEN = 0xffff;
/** Absolute inflate ceiling, beyond (and independent of) the per-entry
 *  claimed size: under the 5 MB upload cap no brief document legitimately
 *  inflates past this. */
const MAX_INFLATED_BYTES = 64 * 1024 * 1024;

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function corrupt(message: string): ExtractError {
  return new ExtractError(
    "corrupt",
    `${message} The file looks damaged — try re-saving it in Word, or open it and paste the text.`
  );
}

function findEndOfCentralDirectory(view: DataView): number {
  const min = Math.max(0, view.byteLength - EOCD_MIN_LEN - MAX_COMMENT_LEN);
  for (let i = view.byteLength - EOCD_MIN_LEN; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD_SIG) return i;
  }
  throw new ExtractError(
    "format",
    "That ZIP archive has no end-of-central-directory record — roducq " +
      "reads DOCX (Word) files, and this container is incomplete."
  );
}

/** Parse the central directory → the authoritative entry list. */
function readZipEntries(bytes: Uint8Array, view: DataView): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(view);

  const disk = view.getUint16(eocd + 4, true);
  const cdDisk = view.getUint16(eocd + 6, true);
  if (disk !== 0 || cdDisk !== 0) {
    throw new ExtractError(
      "format",
      "Multi-disk ZIP archives aren’t supported — re-save the document."
    );
  }

  const countOnDisk = view.getUint16(eocd + 8, true);
  const count = view.getUint16(eocd + 10, true);
  const cdSize = view.getUint32(eocd + 12, true);
  const cdOffset = view.getUint32(eocd + 16, true);
  if (count !== countOnDisk) throw corrupt("Split archive directory.");
  if (
    cdOffset === 0xffffffff ||
    cdSize === 0xffffffff ||
    cdOffset + cdSize > bytes.length
  ) {
    throw corrupt("Archive directory points outside the file.");
  }

  const entries: ZipEntry[] = [];
  let pos = cdOffset;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > bytes.length) throw corrupt("Archive directory is truncated.");
    if (view.getUint32(pos, true) !== CD_ENTRY_SIG) {
      throw corrupt("Archive directory entry has a bad signature.");
    }
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const diskStart = view.getUint16(pos + 34, true);
    const localOffset = view.getUint32(pos + 42, true);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      // ZIP64 carries real values in the extra field — pointless under the
      // 5 MB cap, so refuse plainly rather than half-parse it.
      throw new ExtractError(
        "format",
        "ZIP64 archives aren’t supported — a document that large belongs " +
          "in the paste box anyway."
      );
    }
    if (diskStart !== 0) {
      throw new ExtractError(
        "format",
        "Multi-disk ZIP archives aren’t supported — re-save the document."
      );
    }
    const nameStart = pos + 46;
    if (nameStart + nameLen > bytes.length) {
      throw corrupt("Archive directory is truncated.");
    }
    const name = new TextDecoder("utf-8").decode(
      bytes.subarray(nameStart, nameStart + nameLen)
    );
    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    pos = nameStart + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Slice one entry's payload out of the archive and decompress it. Sizes
 *  come from the CENTRAL DIRECTORY; the local header is only consulted for
 *  the name/extra lengths that locate where the payload begins. */
function readZipEntry(
  bytes: Uint8Array,
  view: DataView,
  entry: ZipEntry
): Uint8Array {
  if (entry.localOffset + 30 > bytes.length) {
    throw corrupt("Entry header points outside the archive.");
  }
  if (view.getUint32(entry.localOffset, true) !== LOCAL_SIG) {
    throw corrupt(`Entry "${entry.name}" has a bad local-header signature.`);
  }
  const nameLen = view.getUint16(entry.localOffset + 26, true);
  const extraLen = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > bytes.length || end < start) {
    throw corrupt(`Entry "${entry.name}" runs past the end of the file.`);
  }
  const payload = bytes.subarray(start, end);

  if (entry.method === 0) {
    if (entry.uncompressedSize !== entry.compressedSize) {
      throw corrupt(`Stored entry "${entry.name}" has inconsistent sizes.`);
    }
    return payload.slice();
  }

  if (entry.method === 8) {
    let inflated: Buffer;
    try {
      inflated = inflateRawSync(payload, {
        // Zip-bomb guard: never allocate past what the directory claims
        // (and never past the absolute ceiling).
        maxOutputLength: Math.min(
          entry.uncompressedSize + 1024,
          MAX_INFLATED_BYTES
        ),
      });
    } catch {
      throw corrupt(
        `Entry "${entry.name}" couldn’t be decompressed — its deflate stream is broken.`
      );
    }
    if (inflated.length !== entry.uncompressedSize) {
      throw corrupt(
        `Entry "${entry.name}" decompressed to a different size than the directory claims.`
      );
    }
    return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.length);
  }

  throw new ExtractError(
    "format",
    `Entry "${entry.name}" uses compression method ${entry.method} — only ` +
      "stored and deflated entries are readable. Re-save the document in Word."
  );
}

/* ------------------------------------------------------------------ */
/* 2. WordprocessingML walker                                          */
/* ------------------------------------------------------------------ */

/** `<` at `lt` starts a markup construct: return the index one past its
 *  closing `>`, respecting quoted attribute values. -1 when unterminated. */
function tagEnd(xml: string, lt: number): number {
  let quote: string | null = null;
  for (let i = lt + 1; i < xml.length; i++) {
    const c = xml[i];
    if (quote !== null) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i + 1;
    }
  }
  return -1;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(
    /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const code =
          body[1] === "x" || body[1] === "X"
            ? parseInt(body.slice(2), 16)
            : parseInt(body.slice(1), 10);
        if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
          try {
            return String.fromCodePoint(code);
          } catch {
            return match;
          }
        }
        return match;
      }
      return NAMED_ENTITIES[body] ?? match;
    }
  );
}

/** Element local-names (matched WITH the conventional `w:` prefix Word
 *  always writes) that delimit the structure we preserve. */
const SKIP_CONTENT_ELEMENTS = new Set(["w:instrText", "w:delText", "mc:Fallback"]);

/**
 * Walk word/document.xml as a flat tag stream. Returns the document text:
 * runs joined, paragraphs as newlines, table rows as tab-joined cell runs.
 */
export function extractWordprocessingText(xml: string): string {
  let out = "";
  let pos = 0;

  /** > 0 while inside w:instrText / w:delText / mc:Fallback — text and
   *  structure in there are skipped (field codes, tracked deletions,
   *  duplicated fallback drawings). */
  let skipDepth = 0;
  /** > 0 while inside a table cell — paragraph ends become spaces so the
   *  cell stays one tab-separated field. */
  let cellDepth = 0;
  /** Start of character data after an opening <w:t>, else -1. */
  let captureFrom = -1;

  const emit = (s: string) => {
    if (skipDepth === 0) out += s;
  };
  const emitStructure = (s: string) => {
    if (skipDepth === 0 && captureFrom === -1) out += s;
  };

  while (pos < xml.length) {
    const lt = xml.indexOf("<", pos);
    if (lt === -1) break;

    // Comments, CDATA and processing instructions: skip wholesale.
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      pos = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9);
      pos = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2);
      pos = end === -1 ? xml.length : end + 2;
      continue;
    }
    // `<!DOCTYPE …>` / other declarations: skip to '>'.
    if (xml.startsWith("<!", lt)) {
      const end = tagEnd(xml, lt);
      pos = end === -1 ? xml.length : end;
      continue;
    }

    const end = tagEnd(xml, lt);
    if (end === -1) break; // unterminated tag: take what we have
    const inner = xml.slice(lt + 1, end - 1);
    pos = end;

    const closing = inner.startsWith("/");
    const body = closing ? inner.slice(1) : inner;
    const selfClosing = !closing && body.trimEnd().endsWith("/");
    const nameMatch = /^[^\s/>]+/.exec(body);
    if (!nameMatch) continue;
    const name = nameMatch[0];

    // Character data being captured from <w:t>: everything up to THIS tag
    // is text as long as the tag closes that run.
    if (captureFrom !== -1) {
      if (closing && name === "w:t") {
        emit(decodeEntities(xml.slice(captureFrom, lt)));
        captureFrom = -1;
        continue;
      }
      // Any other tag before </w:t> — malformed; drop the partial capture
      // and treat this tag normally. Real Word output never nests here.
      captureFrom = -1;
    }

    if (SKIP_CONTENT_ELEMENTS.has(name)) {
      if (!closing && !selfClosing) skipDepth++;
      else if (closing) skipDepth = Math.max(0, skipDepth - 1);
      continue;
    }
    if (skipDepth > 0) continue;

    if (!closing && !selfClosing && name === "w:t") {
      captureFrom = pos;
      continue;
    }
    if (!closing && name === "w:tc") {
      cellDepth++;
      continue;
    }
    if (closing && name === "w:tc") {
      cellDepth = Math.max(0, cellDepth - 1);
      emitStructure("\t");
      continue;
    }
    if (closing && name === "w:tr") {
      // Rows end with a newline; the cleanup step removes the trailing
      // cell separator so rows render as clean tab-joined lines.
      emitStructure("\n");
      continue;
    }
    if (!closing && (name === "w:br" || name === "w:cr")) {
      emitStructure("\n");
      continue;
    }
    if (!closing && name === "w:tab") {
      emitStructure("\t");
      continue;
    }
    if ((closing || selfClosing) && name === "w:p") {
      // Paragraph end: a newline in prose, a soft space inside table
      // cells (multi-paragraph cells stay on the row's single line; the
      // cleanup step drops the resulting separator-adjacent whitespace).
      emitStructure(cellDepth > 0 ? " " : "\n");
      continue;
    }
  }

  return cleanup(out);
}

/** Whitespace hygiene: separators are emitted structurally, so trailing
 *  tabs/spaces before a newline (end of a row) or another separator (end
 *  of a cell after an empty paragraph) are artifacts — remove them, cap
 *  blank runs at one empty line, trim the document. */
function cleanup(text: string): string {
  return text
    .replace(/[ \t]+(?=\n|\t|$)/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* 3. Public entry point                                               */
/* ------------------------------------------------------------------ */

/** DOCX bytes → document text. Throws ExtractError (code "format" /
 *  "corrupt" / "empty") with a user-safe message on any failure. */
export function extractDocxText(bytes: Uint8Array): string {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );
  const entries = readZipEntries(bytes, view);
  const doc = entries.find((e) => e.name === "word/document.xml");
  if (!doc) {
    throw new ExtractError(
      "format",
      "That’s a ZIP archive but not a Word document — no word/document.xml " +
        "inside. roducq reads .docx, .txt and .md; paste the text otherwise."
    );
  }

  const xmlBytes = readZipEntry(bytes, view, doc);
  let xml: string;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(xmlBytes);
  } catch {
    throw corrupt("The document’s XML isn’t valid UTF-8.");
  }

  const text = extractWordprocessingText(xml);
  if (text.length === 0) {
    throw new ExtractError(
      "empty",
      "No readable text in that document — is it blank (or all images)?"
    );
  }
  return text;
}
