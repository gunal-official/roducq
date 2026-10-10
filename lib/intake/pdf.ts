/**
 * File intake (Queue item #6) — zero-dependency PDF text reader.
 *
 * A PDF is a flat bag of numbered objects (`N G obj … endobj`) plus a
 * cross-reference table that is, in practice, optional: every reader
 * (and this one) can recover a working object map by scanning the file
 * for object headers directly, which also sidesteps dealing with
 * incremental updates (later `N G obj` for the same id simply wins —
 * `Map.set` keeps the last writer, same as a real xref would resolve it).
 *
 * This module:
 *   1. finds every object by brute-force scan (no trust placed in
 *      `startxref`/`xref`), decompressing `FlateDecode` streams with
 *      `node:zlib` the same way `./docx.ts` does for ZIP entries;
 *   2. inlines `/Type /ObjStm` object streams (PDF 1.5+ compressed
 *      objects) into the same map, so files that compress their object
 *      table still resolve — without ever parsing a cross-reference
 *      STREAM;
 *   3. walks `/Root` → `/Pages` → `/Kids` to get pages in document
 *      order (falling back to "every `/Type /Page` object, by id" for
 *      files whose catalog can't be found);
 *   4. for each page, decodes its content stream(s) with a small
 *      operator-stack interpreter that tracks only what text extraction
 *      needs: the active font (`Tf`) and line breaks (`Td`/`TD`/`T*`/
 *      `Tm`), decoding `Tj`/`TJ`/`'`/`"` operands through the active
 *      font's character map — `/ToUnicode` CMaps (`bfchar`/`bfrange`)
 *      when present (the common case for embedded/subset fonts from
 *      Word, LibreOffice, Chrome "Print to PDF" …), else WinAnsi /
 *      MacRoman / StandardEncoding (+ `/Differences`) for simple fonts.
 *
 * WHAT IT DOES NOT DO: render anything, OCR scanned pages, decrypt
 * password-protected files (refused explicitly), or decode CID fonts
 * without a `/ToUnicode` map (code points pass through as empty — rare
 * in the wild, since a font without one is usually symbolic/decorative
 * rather than copy-pasteable text anyway).
 *
 * Server-side only: imports node:zlib. The client never sees this module.
 */

import { inflateSync } from "node:zlib";

import { ExtractError } from "./shared.ts";

/* ------------------------------------------------------------------ */
/* 0. Bytes <-> latin1 (byte-preserving) string                        */
/* ------------------------------------------------------------------ */

/** Every PDF structural byte (outside of stream payloads) is ASCII, so a
 *  latin1 round-trip (1 char = 1 byte) lets the rest of this module work
 *  with plain string ops — same trick `lib/pdf/writer.ts` uses on the way
 *  out, used here on the way in. */
function bytesToLatin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 4096) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 4096)));
  }
  return out;
}

function latin1ToBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

function corrupt(message: string): ExtractError {
  return new ExtractError(
    "corrupt",
    `${message} The PDF looks damaged — try re-exporting it, or open it and paste the text.`
  );
}

/* ------------------------------------------------------------------ */
/* 1. Minimal PDF object-value parser (dictionaries/arrays/refs)       */
/* ------------------------------------------------------------------ */

export type PdfValue =
  | number
  | boolean
  | null
  | { type: "name"; value: string }
  | { type: "string"; value: string } // raw bytes, latin1-encoded
  | { type: "ref"; num: number; gen: number }
  | PdfValue[]
  | { type: "dict"; map: Map<string, PdfValue> };

const WHITESPACE = new Set([0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20]);
const DELIMITERS = new Set("()<>[]{}/%".split("").map((c) => c.charCodeAt(0)));

function skipWhitespaceAndComments(text: string, pos: number): number {
  for (;;) {
    while (pos < text.length && WHITESPACE.has(text.charCodeAt(pos))) pos++;
    if (text.charCodeAt(pos) === 0x25 /* % */) {
      while (pos < text.length && text.charCodeAt(pos) !== 0x0a) pos++;
      continue;
    }
    return pos;
  }
}

function parseName(text: string, pos: number): { value: string; next: number } {
  let start = pos + 1;
  let out = "";
  let i = start;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (WHITESPACE.has(code) || DELIMITERS.has(code)) break;
    if (code === 0x23 /* # */ && i + 2 < text.length) {
      const hex = text.slice(i + 1, i + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        out += String.fromCharCode(parseInt(hex, 16));
        i += 3;
        continue;
      }
    }
    out += text[i];
    i++;
  }
  return { value: out, next: i };
}

function parseLiteralString(text: string, pos: number): { value: string; next: number } {
  // pos is at the opening '('.
  let depth = 1;
  let i = pos + 1;
  let out = "";
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "\\") {
      const next = text[i + 1];
      if (next === "n") {
        out += "\n";
        i += 2;
      } else if (next === "r") {
        out += "\r";
        i += 2;
      } else if (next === "t") {
        out += "\t";
        i += 2;
      } else if (next === "b") {
        out += "\b";
        i += 2;
      } else if (next === "f") {
        out += "\f";
        i += 2;
      } else if (next === "(" || next === ")" || next === "\\") {
        out += next;
        i += 2;
      } else if (next === "\n") {
        i += 2; // line continuation
      } else if (next === "\r") {
        i += text[i + 2] === "\n" ? 3 : 2;
      } else if (next !== undefined && /[0-7]/.test(next)) {
        let octal = "";
        let j = i + 1;
        while (j < text.length && octal.length < 3 && /[0-7]/.test(text[j])) {
          octal += text[j];
          j++;
        }
        out += String.fromCharCode(parseInt(octal, 8) & 0xff);
        i = j;
      } else if (next === undefined) {
        i += 1;
      } else {
        out += next;
        i += 2;
      }
      continue;
    }
    if (ch === "(") {
      depth++;
      out += ch;
      i++;
      continue;
    }
    if (ch === ")") {
      depth--;
      i++;
      if (depth > 0) out += ch;
      continue;
    }
    out += ch;
    i++;
  }
  return { value: out, next: i };
}

function parseHexString(text: string, pos: number): { value: string; next: number } {
  // pos is at the opening '<' (already confirmed not '<<').
  let i = pos + 1;
  let hex = "";
  while (i < text.length && text[i] !== ">") {
    if (!WHITESPACE.has(text.charCodeAt(i))) hex += text[i];
    i++;
  }
  if (hex.length % 2 === 1) hex += "0";
  let out = "";
  for (let k = 0; k < hex.length; k += 2) {
    out += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16) || 0);
  }
  return { value: out, next: Math.min(i + 1, text.length) };
}

const NUMBER_RE = /^[+-]?(\d+\.\d*|\.\d+|\d+)/;

/** Parse one PDF value at `pos`. Returns null if nothing parseable is
 *  there (end of dict/array, or a stray keyword this reader ignores). */
function parseValue(text: string, pos: number): { value: PdfValue; next: number } | null {
  pos = skipWhitespaceAndComments(text, pos);
  if (pos >= text.length) return null;
  const code = text.charCodeAt(pos);

  if (code === 0x2f /* / */) {
    const { value, next } = parseName(text, pos);
    return { value: { type: "name", value }, next };
  }
  if (code === 0x28 /* ( */) {
    const { value, next } = parseLiteralString(text, pos);
    return { value: { type: "string", value }, next };
  }
  if (code === 0x3c /* < */) {
    if (text[pos + 1] === "<") return parseDict(text, pos);
    const { value, next } = parseHexString(text, pos);
    return { value: { type: "string", value }, next };
  }
  if (code === 0x5b /* [ */) return parseArray(text, pos);
  if (text.startsWith("true", pos) && !isIdentChar(text[pos + 4])) {
    return { value: true, next: pos + 4 };
  }
  if (text.startsWith("false", pos) && !isIdentChar(text[pos + 5])) {
    return { value: false, next: pos + 5 };
  }
  if (text.startsWith("null", pos) && !isIdentChar(text[pos + 4])) {
    return { value: null, next: pos + 4 };
  }
  const numMatch = NUMBER_RE.exec(text.slice(pos, pos + 32));
  if (numMatch) {
    const after = pos + numMatch[0].length;
    // Lookahead for "N G R" (indirect reference) / "N G obj" — both look
    // like two integers in a row; only the keyword that follows decides.
    if (/^\d+$/.test(numMatch[0])) {
      const p2 = skipWhitespaceAndComments(text, after);
      const genMatch = /^\d+/.exec(text.slice(p2, p2 + 16));
      if (genMatch) {
        const p3 = skipWhitespaceAndComments(text, p2 + genMatch[0].length);
        if (text[p3] === "R" && !isIdentChar(text[p3 + 1])) {
          return {
            value: { type: "ref", num: Number(numMatch[0]), gen: Number(genMatch[0]) },
            next: p3 + 1,
          };
        }
      }
    }
    return { value: Number(numMatch[0]), next: after };
  }
  return null;
}

function isIdentChar(ch: string | undefined): boolean {
  if (ch === undefined) return false;
  const code = ch.charCodeAt(0);
  return !WHITESPACE.has(code) && !DELIMITERS.has(code);
}

function parseArray(text: string, pos: number): { value: PdfValue; next: number } {
  const out: PdfValue[] = [];
  let i = pos + 1;
  for (;;) {
    i = skipWhitespaceAndComments(text, i);
    if (i >= text.length || text[i] === "]") {
      i = Math.min(i + 1, text.length);
      break;
    }
    const parsed = parseValue(text, i);
    if (!parsed) {
      i++; // stray byte — skip rather than loop forever
      continue;
    }
    out.push(parsed.value);
    i = parsed.next;
  }
  return { value: out, next: i };
}

function parseDict(text: string, pos: number): { value: PdfValue; next: number } {
  const map = new Map<string, PdfValue>();
  let i = pos + 2;
  for (;;) {
    i = skipWhitespaceAndComments(text, i);
    if (i >= text.length) break;
    if (text.startsWith(">>", i)) {
      i += 2;
      break;
    }
    if (text.charCodeAt(i) !== 0x2f /* / */) {
      i++; // resync on malformed input
      continue;
    }
    const key = parseName(text, i);
    const val = parseValue(text, key.next);
    if (!val) {
      i = key.next;
      continue;
    }
    map.set(key.value, val.value);
    i = val.next;
  }
  return { value: { type: "dict", map }, next: i };
}

function asDict(value: PdfValue | undefined): Map<string, PdfValue> | null {
  return value && typeof value === "object" && !Array.isArray(value) && "map" in value
    ? value.map
    : null;
}

function asName(value: PdfValue | undefined): string | null {
  return value && typeof value === "object" && !Array.isArray(value) && "type" in value && value.type === "name"
    ? value.value
    : null;
}

function asNumber(value: PdfValue | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function asArray(value: PdfValue | undefined): PdfValue[] | null {
  return Array.isArray(value) ? value : null;
}

function asRef(value: PdfValue | undefined): { num: number; gen: number } | null {
  return value && typeof value === "object" && !Array.isArray(value) && "type" in value && value.type === "ref"
    ? { num: value.num, gen: value.gen }
    : null;
}

/* ------------------------------------------------------------------ */
/* 2. Object map: brute-force scan + ObjStm flattening                 */
/* ------------------------------------------------------------------ */

interface PdfObjectRecord {
  /** The object's own value — a dict for most objects, but could be a
   *  bare number (a classic indirect /Length object), name, array, etc. */
  value: PdfValue | null;
  /** Raw (still-encoded) stream bytes, latin1-encoded, or null. */
  rawStream: string | null;
}

function dictOf(record: PdfObjectRecord | null | undefined): Map<string, PdfValue> | null {
  return record ? asDict(record.value ?? undefined) : null;
}

const MAX_INFLATED_BYTES = 64 * 1024 * 1024;
const OBJ_HEADER_RE = /(\d+)[ \t]+(\d+)[ \t]+obj\b/g;

function scanObjects(text: string): Map<number, PdfObjectRecord> {
  const map = new Map<number, PdfObjectRecord>();
  const headers = Array.from(text.matchAll(OBJ_HEADER_RE));

  for (let i = 0; i < headers.length; i++) {
    const match = headers[i];
    const id = Number(match[1]);
    const start = match.index + match[0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index : text.length;
    const raw = text.slice(start, end);

    const streamIdx = raw.search(/\bstream\b/);
    const dictText = streamIdx === -1 ? raw : raw.slice(0, streamIdx);
    // A bare integer body (classic "/Length" helper object) parses to a
    // plain number; a dict body parses to a dict — both are kept as-is.
    const parsedValue = parseValue(dictText, 0);
    const value = parsedValue ? parsedValue.value : null;
    const dict = asDict(value ?? undefined);

    let rawStream: string | null = null;
    if (streamIdx !== -1) {
      let streamStart = streamIdx + "stream".length;
      if (raw[streamStart] === "\r" && raw[streamStart + 1] === "\n") streamStart += 2;
      else if (raw[streamStart] === "\n") streamStart += 1;
      else if (raw[streamStart] === "\r") streamStart += 1;

      const declaredLength = dict ? resolveDirectLength(dict.get("Length"), map) : null;
      let streamEnd = -1;
      if (declaredLength !== null) {
        const candidate = streamStart + declaredLength;
        if (/^\s*endstream/.test(raw.slice(candidate, candidate + 24))) {
          streamEnd = candidate;
        }
      }
      if (streamEnd === -1) {
        const endIdx = raw.indexOf("endstream", streamStart);
        streamEnd = endIdx === -1 ? raw.length : endIdx;
        // Trim exactly one trailing EOL before "endstream".
        if (raw[streamEnd - 1] === "\n") streamEnd--;
        if (raw[streamEnd - 1] === "\r") streamEnd--;
      }
      rawStream = raw.slice(streamStart, Math.max(streamStart, streamEnd));
    }

    // Later definitions win (incremental updates re-declare the same id).
    map.set(id, { value, rawStream });
  }

  flattenObjectStreams(map);
  return map;
}

/** /Length as a direct integer, or resolved from an already-scanned
 *  indirect object (the common case: a tiny "N 0 obj 1234 endobj" length
 *  helper placed near its stream, in either file order — the whole map is
 *  built before any stream boundary actually needs this. Forward/backward
 *  order doesn't matter since `map` is fully populated by the time any
 *  consumer calls `decodeStream`; it only matters here, during the single
 *  pass that locates stream boundaries, where only EARLIER objects are
 *  visible — the `endstream` scan below covers the rest. */
function resolveDirectLength(
  value: PdfValue | undefined,
  mapSoFar: Map<number, PdfObjectRecord>
): number | null {
  if (typeof value === "number") return value;
  const ref = asRef(value);
  if (!ref) return null;
  const target = mapSoFar.get(ref.num);
  return target && typeof target.value === "number" ? target.value : null;
}

/** Decompress a stream's raw bytes per its /Filter chain. Returns null for
 *  filters we don't speak (images, LZW, …) — callers treat that as "no
 *  text here" rather than failing the whole document. */
function decodeStream(dict: Map<string, PdfValue>, rawStream: string): Uint8Array | null {
  const filterValue = dict.get("Filter");
  const filters = filterValue
    ? asArray(filterValue)
      ? (asArray(filterValue) as PdfValue[]).map((f) => asName(f)).filter((f): f is string => !!f)
      : asName(filterValue)
        ? [asName(filterValue) as string]
        : []
    : [];

  let bytes = latin1ToBytes(rawStream);
  for (const filter of filters) {
    if (filter === "FlateDecode" || filter === "Fl") {
      try {
        bytes = new Uint8Array(
          inflateSync(bytes, { maxOutputLength: MAX_INFLATED_BYTES })
        );
      } catch {
        return null;
      }
    } else {
      return null; // DCTDecode, CCITTFaxDecode, LZWDecode, ASCII85Decode, ...
    }
  }
  return bytes;
}

/** Inline PDF 1.5+ compressed object streams into `map` so the rest of the
 *  reader never has to know they existed. Spec: objects inside an ObjStm
 *  can only be non-stream values, so this never recurses into nested
 *  ObjStms. */
function flattenObjectStreams(map: Map<number, PdfObjectRecord>): void {
  const objStms: { id: number; record: PdfObjectRecord }[] = [];
  for (const [id, record] of map) {
    const dict = dictOf(record);
    const type = dict ? asName(dict.get("Type")) : null;
    if (type === "ObjStm" && record.rawStream !== null) objStms.push({ id, record });
  }

  for (const { record } of objStms) {
    const dict = dictOf(record);
    if (!dict || record.rawStream === null) continue;
    const n = asNumber(dict.get("N"));
    const first = asNumber(dict.get("First"));
    if (n === null || first === null) continue;
    const decoded = decodeStream(dict, record.rawStream);
    if (!decoded) continue;
    const body = bytesToLatin1(decoded);

    const headerPairs: { id: number; offset: number }[] = [];
    let pos = 0;
    for (let k = 0; k < n; k++) {
      pos = skipWhitespaceAndComments(body, pos);
      const idMatch = /^\d+/.exec(body.slice(pos, pos + 20));
      if (!idMatch) break;
      pos += idMatch[0].length;
      pos = skipWhitespaceAndComments(body, pos);
      const offMatch = /^\d+/.exec(body.slice(pos, pos + 20));
      if (!offMatch) break;
      pos += offMatch[0].length;
      headerPairs.push({ id: Number(idMatch[0]), offset: Number(offMatch[0]) });
    }

    for (const { id, offset } of headerPairs) {
      if (map.has(id)) continue; // a top-level (re)definition already wins
      const parsed = parseValue(body, first + offset);
      if (!parsed) continue;
      map.set(id, { value: parsed.value, rawStream: null });
    }
  }
}

function resolve(
  value: PdfValue | undefined,
  objects: Map<number, PdfObjectRecord>,
  depth = 0
): PdfValue | undefined {
  if (depth > 32) return undefined;
  const ref = asRef(value);
  if (!ref) return value;
  const target = objects.get(ref.num);
  if (!target) return undefined;
  return resolve(target.value ?? undefined, objects, depth + 1);
}

/* ------------------------------------------------------------------ */
/* 3. Page tree walk                                                    */
/* ------------------------------------------------------------------ */

interface PdfPageInfo {
  record: PdfObjectRecord;
  resources: Map<string, PdfValue> | null;
}

function collectPages(
  objects: Map<number, PdfObjectRecord>,
  root: Map<string, PdfValue> | null
): PdfPageInfo[] {
  const pages: PdfPageInfo[] = [];
  const visited = new Set<number>();

  function walk(node: PdfValue | undefined, inheritedResources: Map<string, PdfValue> | null): void {
    const dict = asDict(node);
    if (!dict) return;
    const type = asName(dict.get("Type"));
    const resources = asDict(resolve(dict.get("Resources"), objects)) ?? inheritedResources;

    if (type === "Page" || (!dict.has("Kids") && dict.has("Contents"))) {
      pages.push({ record: { value: node ?? null, rawStream: null }, resources });
      return;
    }
    const kids = asArray(dict.get("Kids"));
    if (!kids) return;
    for (const kid of kids) {
      const ref = asRef(kid);
      if (ref) {
        if (visited.has(ref.num)) continue;
        visited.add(ref.num);
      }
      walk(resolve(kid, objects), resources);
    }
  }

  if (root) {
    const pagesRef = root.get("Pages");
    walk(resolve(pagesRef, objects), null);
  }

  if (pages.length === 0) {
    // Fallback: no (working) catalog — gather every /Type /Page object
    // directly, in ascending object-id order.
    const ids = Array.from(objects.keys()).sort((a, b) => a - b);
    for (const id of ids) {
      const record = objects.get(id)!;
      const dict = dictOf(record);
      if (dict && asName(dict.get("Type")) === "Page") {
        const resources = asDict(resolve(dict.get("Resources"), objects));
        pages.push({ record, resources });
      }
    }
  }

  return pages;
}

function findCatalog(objects: Map<number, PdfObjectRecord>): Map<string, PdfValue> | null {
  for (const record of objects.values()) {
    const dict = dictOf(record);
    if (dict && asName(dict.get("Type")) === "Catalog") return dict;
  }
  return null;
}

function isEncrypted(objects: Map<number, PdfObjectRecord>, raw: string): boolean {
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(raw)) return true;
  for (const record of objects.values()) {
    if (dictOf(record)?.has("Encrypt")) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 4. Font character maps (ToUnicode CMap / simple-font encodings)     */
/* ------------------------------------------------------------------ */

interface FontMap {
  /** Byte width of one character code: 1 for simple fonts, 2 for the
   *  Identity-H/V composite fonts this reader understands. */
  codeBytes: 1 | 2;
  decode(code: number): string;
}

/** CP1252 0x80–0x9F (the inverse of lib/pdf/encoding.ts's forward table). */
const CP1252_HIGH_REVERSE: Record<number, string> = {
  128: "\u20AC", 130: "\u201A", 131: "\u0192", 132: "\u201E",
  133: "\u2026", 134: "\u2020", 135: "\u2021", 136: "\u02C6",
  137: "\u2030", 138: "\u0160", 139: "\u2039", 140: "\u0152",
  142: "\u017D", 145: "\u2018", 146: "\u2019", 147: "\u201C",
  148: "\u201D", 149: "\u2022", 150: "\u2013", 151: "\u2014",
  152: "\u02DC", 153: "\u2122", 154: "\u0161", 155: "\u203A",
  156: "\u0153", 158: "\u017E", 159: "\u0178",
};

/** MacRomanEncoding 0x80–0xFF (ASCII below that matches, as it does for
 *  every encoding this reader supports). */
const MAC_ROMAN_HIGH: string[] = (
  "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø" +
  "¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\uF8FFÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ"
).split("");

function winAnsiByte(code: number): string {
  if (code >= 32 && code <= 126) return String.fromCharCode(code);
  if (code >= 160 && code <= 255) return String.fromCharCode(code);
  return CP1252_HIGH_REVERSE[code] ?? "";
}

function macRomanByte(code: number): string {
  if (code >= 32 && code <= 126) return String.fromCharCode(code);
  if (code >= 128 && code <= 255) return MAC_ROMAN_HIGH[code - 128] ?? "";
  return "";
}

/** A pragmatic subset of the Adobe Glyph List: the names a hand-written
 *  /Differences array actually uses (typography + Latin-1 letters). Names
 *  outside this table fall back to "" (dropped, never garbled). */
const GLYPH_NAMES: Record<string, string> = {
  space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$",
  percent: "%", ampersand: "&", quotesingle: "'", quoteright: "\u2019",
  quoteleft: "\u2018", parenleft: "(", parenright: ")", asterisk: "*",
  plus: "+", comma: ",", hyphen: "-", minus: "-", period: ".", slash: "/",
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", colon: ":", semicolon: ";",
  less: "<", equal: "=", greater: ">", question: "?", at: "@",
  bracketleft: "[", backslash: "\\", bracketright: "]",
  asciicircum: "^", underscore: "_", grave: "`", braceleft: "{",
  bar: "|", braceright: "}", asciitilde: "~",
  bullet: "\u2022", endash: "\u2013", emdash: "\u2014",
  quotedblleft: "\u201C", quotedblright: "\u201D", ellipsis: "\u2026",
  trademark: "\u2122", dagger: "\u2020", daggerdbl: "\u2021",
  florin: "\u0192", circumflex: "\u02C6", tilde: "\u02DC",
  Scaron: "\u0160", scaron: "\u0161", Zcaron: "\u017D", zcaron: "\u017E",
  OE: "\u0152", oe: "\u0153", Ydieresis: "\u0178", Euro: "\u20AC",
  fi: "\uFB01", fl: "\uFB02", nbspace: "\u00A0",
};
for (const code of [...Array(26).keys()]) {
  GLYPH_NAMES[String.fromCharCode(65 + code)] = String.fromCharCode(65 + code);
  GLYPH_NAMES[String.fromCharCode(97 + code)] = String.fromCharCode(97 + code);
}
// Latin-1 Supplement letters, named the way AGL names them (a small but
// common slice: Eacute, eacute, Ntilde, ntilde, Ouml, ouml, etc.).
const LATIN1_NAMES: Record<string, number> = {
  Agrave: 0xc0, Aacute: 0xc1, Acircumflex: 0xc2, Atilde: 0xc3, Adieresis: 0xc4,
  Aring: 0xc5, AE: 0xc6, Ccedilla: 0xc7, Egrave: 0xc8, Eacute: 0xc9,
  Ecircumflex: 0xca, Edieresis: 0xcb, Igrave: 0xcc, Iacute: 0xcd,
  Icircumflex: 0xce, Idieresis: 0xcf, Ntilde: 0xd1, Ograve: 0xd2,
  Oacute: 0xd3, Ocircumflex: 0xd4, Otilde: 0xd5, Odieresis: 0xd6,
  Ugrave: 0xd9, Uacute: 0xda, Ucircumflex: 0xdb, Udieresis: 0xdc,
  Yacute: 0xdd, agrave: 0xe0, aacute: 0xe1, acircumflex: 0xe2, atilde: 0xe3,
  adieresis: 0xe4, aring: 0xe5, ae: 0xe6, ccedilla: 0xe7, egrave: 0xe8,
  eacute: 0xe9, ecircumflex: 0xea, edieresis: 0xeb, igrave: 0xec,
  iacute: 0xed, icircumflex: 0xee, idieresis: 0xef, ntilde: 0xf1,
  ograve: 0xf2, oacute: 0xf3, ocircumflex: 0xf4, otilde: 0xf5,
  odieresis: 0xf6, ugrave: 0xf9, uacute: 0xfa, ucircumflex: 0xfb,
  udieresis: 0xfc, yacute: 0xfd, ydieresis: 0xff, ssharp: 0xdf,
  degree: 0xb0, copyright: 0xa9, registered: 0xae, cent: 0xa2,
  sterling: 0xa3, yen: 0xa5, section: 0xa7, paragraph: 0xb6,
  plusminus: 0xb1, periodcentered: 0xb7,
};
for (const [name, code] of Object.entries(LATIN1_NAMES)) {
  GLYPH_NAMES[name] = String.fromCharCode(code);
}

function glyphToUnicode(name: string): string {
  if (GLYPH_NAMES[name] !== undefined) return GLYPH_NAMES[name];
  const uni = /^uni([0-9A-Fa-f]{4})$/.exec(name);
  if (uni) return String.fromCharCode(parseInt(uni[1], 16));
  return "";
}

function simpleFontMap(fontDict: Map<string, PdfValue>, objects: Map<number, PdfObjectRecord>): FontMap {
  const encodingValue = resolve(fontDict.get("Encoding"), objects);
  let base: (code: number) => string = winAnsiByte;
  let differences: Map<number, string> | null = null;

  const encodingName = asName(encodingValue);
  if (encodingName === "MacRomanEncoding") base = macRomanByte;
  else if (encodingName === "WinAnsiEncoding" || encodingName === "StandardEncoding") base = winAnsiByte;

  const encodingDict = asDict(encodingValue);
  if (encodingDict) {
    const baseName = asName(encodingDict.get("BaseEncoding"));
    if (baseName === "MacRomanEncoding") base = macRomanByte;
    const diffArray = asArray(encodingDict.get("Differences"));
    if (diffArray) {
      differences = new Map();
      let code = 0;
      for (const entry of diffArray) {
        const num = asNumber(entry);
        if (num !== null) {
          code = num;
          continue;
        }
        const name = asName(entry);
        if (name !== null) {
          differences.set(code, glyphToUnicode(name));
          code++;
        }
      }
    }
  }

  return {
    codeBytes: 1,
    decode(code: number): string {
      const override = differences?.get(code);
      if (override !== undefined) return override;
      return base(code);
    },
  };
}

/** Parse a /ToUnicode CMap stream: `beginbfchar`/`endbfchar` (1:1) and
 *  `beginbfrange`/`endbfrange` (contiguous ranges, with either a single
 *  destination bumped by offset, or an explicit array of destinations). */
function parseToUnicodeCMap(text: string): { codeBytes: 1 | 2; map: Map<number, string> } {
  const map = new Map<number, string>();
  let codeBytes: 1 | 2 = 2;

  const codespace = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(text);
  if (codespace) {
    const hex = /<([0-9A-Fa-f]+)>/.exec(codespace[1]);
    if (hex && hex[1].length <= 2) codeBytes = 1;
  }

  const hexToCodepoints = (hex: string): string => {
    // UTF-16BE code units, possibly several (surrogate pairs included).
    let out = "";
    for (let i = 0; i + 4 <= hex.length; i += 4) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
    }
    return out;
  };

  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let section: RegExpExecArray | null;
  while ((section = bfcharRe.exec(text)) !== null) {
    const pairRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let pair: RegExpExecArray | null;
    while ((pair = pairRe.exec(section[1])) !== null) {
      map.set(parseInt(pair[1], 16), hexToCodepoints(pair[2]));
    }
  }

  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((section = bfrangeRe.exec(text)) !== null) {
    const body = section[1];
    const arrayRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g;
    const simpleRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
    let consumed = "";
    let m: RegExpExecArray | null;
    while ((m = arrayRe.exec(body)) !== null) {
      consumed += m[0];
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      const dests = Array.from(m[3].matchAll(/<([0-9A-Fa-f]+)>/g)).map((d) => d[1]);
      for (let code = lo; code <= hi && code - lo < dests.length; code++) {
        map.set(code, hexToCodepoints(dests[code - lo]));
      }
    }
    const rest = body.split(consumed || "\u0000").join("");
    while ((m = simpleRe.exec(rest)) !== null) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      const startCp = parseInt(m[3], 16);
      for (let code = lo; code <= hi; code++) {
        map.set(code, String.fromCharCode(startCp + (code - lo)));
      }
    }
  }

  return { codeBytes, map };
}

function toUnicodeFontMap(cmapText: string): FontMap {
  const { codeBytes, map } = parseToUnicodeCMap(cmapText);
  return {
    codeBytes,
    decode(code: number): string {
      return map.get(code) ?? "";
    },
  };
}

function buildFontMap(
  fontDict: Map<string, PdfValue> | null,
  objects: Map<number, PdfObjectRecord>
): FontMap {
  if (!fontDict) return { codeBytes: 1, decode: () => "" };

  const toUnicodeRef = asRef(fontDict.get("ToUnicode"));
  if (toUnicodeRef) {
    const record = objects.get(toUnicodeRef.num);
    const dict = dictOf(record);
    if (record && dict && record.rawStream !== null) {
      const bytes = decodeStream(dict, record.rawStream);
      if (bytes) return toUnicodeFontMap(bytesToLatin1(bytes));
    }
  }

  const subtype = asName(fontDict.get("Subtype"));
  if (subtype === "Type0") {
    // Composite font with no /ToUnicode we can parse: without a CMap there
    // is no honest way to recover text, so this font contributes nothing.
    return { codeBytes: 2, decode: () => "" };
  }
  return simpleFontMap(fontDict, objects);
}

/* ------------------------------------------------------------------ */
/* 5. Content-stream interpreter                                       */
/* ------------------------------------------------------------------ */

/** TJ array numbers are in thousandths of text space (unscaled by font
 *  size); a gap at least this large is, in practice, a generator's
 *  stand-in for a space character it chose not to draw literally. */
const TJ_SPACE_THRESHOLD = -120;

function tokenizeOperands(stream: string, pos: number): { value: PdfValue; next: number } | null {
  return parseValue(stream, pos);
}

function extractPageText(
  stream: string,
  resources: Map<string, PdfValue> | null,
  objects: Map<number, PdfObjectRecord>
): string {
  const fontCache = new Map<string, FontMap>();
  function fontFor(resourceName: string): FontMap {
    const cached = fontCache.get(resourceName);
    if (cached) return cached;
    const fontDictRes = resources ? asDict(resolve(resources.get("Font"), objects)) : null;
    const fontRef = fontDictRes?.get(resourceName);
    const fontDict = fontRef ? asDict(resolve(fontRef, objects)) : null;
    const map = buildFontMap(fontDict, objects);
    fontCache.set(resourceName, map);
    return map;
  }

  let out = "";
  let currentFont: FontMap = { codeBytes: 1, decode: () => "" };
  let pendingNewline = false;
  let wroteAny = false;

  const decodeOperand = (raw: string): string => {
    let text = "";
    const width = currentFont.codeBytes;
    for (let i = 0; i + width <= raw.length; i += width) {
      let code = 0;
      for (let b = 0; b < width; b++) code = (code << 8) | raw.charCodeAt(i + b);
      text += currentFont.decode(code);
    }
    return text;
  };

  const emit = (text: string) => {
    if (text === "") return;
    if (pendingNewline && wroteAny) out += "\n";
    pendingNewline = false;
    out += text;
    wroteAny = true;
  };

  let pos = 0;
  let operands: PdfValue[] = [];
  while (pos < stream.length) {
    pos = skipWhitespaceAndComments(stream, pos);
    if (pos >= stream.length) break;
    const ch = stream[pos];

    if (ch === "/" || ch === "(" || ch === "<" || ch === "[" || /[0-9+\-.]/.test(ch)) {
      const parsed = tokenizeOperands(stream, pos);
      if (!parsed) {
        pos++;
        continue;
      }
      operands.push(parsed.value);
      pos = parsed.next;
      continue;
    }

    // Keyword: an operator (BT, Tj, ...), or true/false/null (already
    // handled by parseValue above, so what's left here is an operator).
    const kwMatch = /^[A-Za-z*'"]+/.exec(stream.slice(pos));
    if (!kwMatch) {
      pos++;
      continue;
    }
    const op = kwMatch[0];
    pos += op.length;

    switch (op) {
      case "Tf": {
        const name = asName(operands[operands.length - 2]);
        if (name) currentFont = fontFor(name);
        break;
      }
      case "Td":
      case "TD":
      case "Tm":
      case "T*":
        pendingNewline = true;
        break;
      case "BT":
        break;
      case "ET":
        break;
      case "Tj": {
        const str = operands[0];
        if (str && typeof str === "object" && !Array.isArray(str) && "type" in str && str.type === "string") {
          emit(decodeOperand(str.value));
        }
        break;
      }
      case "'": {
        pendingNewline = true;
        const str = operands[0];
        if (str && typeof str === "object" && !Array.isArray(str) && "type" in str && str.type === "string") {
          emit(decodeOperand(str.value));
        }
        break;
      }
      case '"': {
        pendingNewline = true;
        const str = operands[2];
        if (str && typeof str === "object" && !Array.isArray(str) && "type" in str && str.type === "string") {
          emit(decodeOperand(str.value));
        }
        break;
      }
      case "TJ": {
        const arr = asArray(operands[0]);
        if (arr) {
          for (const item of arr) {
            if (typeof item === "number") {
              if (item <= TJ_SPACE_THRESHOLD) emit(" ");
            } else if (item && typeof item === "object" && !Array.isArray(item) && "type" in item && item.type === "string") {
              emit(decodeOperand(item.value));
            }
          }
        }
        break;
      }
      default:
        break;
    }
    operands = [];
  }

  return out;
}

function pageContentStream(
  page: PdfObjectRecord,
  objects: Map<number, PdfObjectRecord>
): string {
  const pageDict = dictOf(page);
  if (!pageDict) return "";
  const contents = pageDict.get("Contents");
  const refs: { num: number; gen: number }[] = [];
  const direct = asRef(contents);
  if (direct) refs.push(direct);
  const arr = asArray(contents);
  if (arr) {
    for (const item of arr) {
      const ref = asRef(item);
      if (ref) refs.push(ref);
    }
  }

  const parts: string[] = [];
  for (const ref of refs) {
    const record = objects.get(ref.num);
    const dict = dictOf(record);
    if (!record || !dict || record.rawStream === null) continue;
    const bytes = decodeStream(dict, record.rawStream);
    if (bytes) parts.push(bytesToLatin1(bytes));
  }
  return parts.join("\n");
}

/* ------------------------------------------------------------------ */
/* 6. Cleanup + public entry point                                     */
/* ------------------------------------------------------------------ */

function cleanup(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** PDF bytes → extracted text. Throws `ExtractError` (code `format` /
 *  `corrupt` / `empty`) with a user-safe message on any failure — never
 *  a raw exception, however malformed the input. */
export function extractPdfText(bytes: Uint8Array): string {
  const raw = bytesToLatin1(bytes);

  let objects: Map<number, PdfObjectRecord>;
  try {
    objects = scanObjects(raw);
  } catch {
    throw corrupt("That PDF's object structure couldn't be parsed.");
  }

  if (isEncrypted(objects, raw)) {
    throw new ExtractError(
      "format",
      "Password-protected / encrypted PDFs aren’t supported — remove the " +
        "protection (or open it, copy the text, and paste it) and try again."
    );
  }

  let pages: PdfPageInfo[];
  try {
    const catalog = findCatalog(objects);
    pages = collectPages(objects, catalog);
  } catch {
    throw corrupt("That PDF's page tree couldn't be walked.");
  }
  if (pages.length === 0) {
    throw new ExtractError(
      "format",
      "That PDF has no readable pages — roducq reads text-based PDFs; " +
        "paste the text instead."
    );
  }

  const pageTexts: string[] = [];
  for (const page of pages.slice(0, 2000)) {
    let text: string;
    try {
      const stream = pageContentStream(page.record, objects);
      text = extractPageText(stream, page.resources, objects);
    } catch {
      text = "";
    }
    const trimmed = text.trim();
    if (trimmed) pageTexts.push(trimmed);
  }

  const joined = cleanup(pageTexts.join("\n\n"));
  if (joined.length === 0) {
    throw new ExtractError(
      "empty",
      "No readable text in that PDF — it may be a scanned/image-only " +
        "document (OCR isn’t supported). Paste the text instead."
    );
  }
  return joined;
}
