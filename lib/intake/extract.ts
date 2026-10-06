/**
 * File intake (Queue item #6) — type detection and TXT/MD extraction.
 * Server-side only (the DOCX branch pulls in node:zlib via ./docx).
 *
 * Detection is by MAGIC BYTES ONLY — the filename and the browser's
 * declared MIME type are never trusted:
 *   %PDF-                         → explicit refusal (see shared.ts)
 *   PK\x03\x04 / PK\x05\x06 / PK\x07\x08 → ZIP container → DOCX walker
 *   anything else                 → TXT/Markdown as strict UTF-8
 * A `.docx` that is really plain text is read as text; a `.txt` that is
 * really a Word file is read as Word. That is the behaviour the magic-byte
 * decision locks in.
 */

import { extractDocxText } from "./docx.ts";
import {
  ExtractError,
  looksLikePdf,
  PDF_REFUSAL_MESSAGE,
} from "./shared.ts";

export type UploadFormat = "text" | "docx";

export interface ExtractedUpload {
  text: string;
  format: UploadFormat;
}

function isZipContainer(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  const third = bytes[2];
  // PK\x03\x04 local header · PK\x05\x06 empty archive · PK\x07\x08 spanned
  return third === 0x03 || third === 0x05 || third === 0x07;
}

/** Control characters that have no business in user prose (\t and \n are
 *  allowed; \r is already normalized away before this test). */
const BINARY_CHAR = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** TXT / Markdown: strict UTF-8 decode + newline normalization. */
export function extractPlainText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ExtractError(
      "not_text",
      "That file isn’t valid UTF-8 text. Save or export it as UTF-8 — or " +
        "select-all, copy and paste the text — and try again."
    );
  }

  // Strip one leading UTF-8 byte-order mark, then normalize CRLF/CR → LF.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  text = text.replace(/\r\n?/g, "\n");

  if (BINARY_CHAR.test(text)) {
    throw new ExtractError(
      "not_text",
      "That looks like a binary file, not text. roducq reads .docx, .txt " +
        "and .md — PDFs and other formats need the paste-instead route."
    );
  }

  return text;
}

/** The one entry point used by the route handler. Bytes in, text out —
 *  the bytes are never persisted anywhere. */
export function extractUploadText(bytes: Uint8Array): ExtractedUpload {
  if (bytes.length === 0) {
    throw new ExtractError("empty", "That file is empty — nothing to read.");
  }
  if (looksLikePdf(bytes)) {
    throw new ExtractError("pdf", PDF_REFUSAL_MESSAGE);
  }
  if (isZipContainer(bytes)) {
    return { text: extractDocxText(bytes), format: "docx" };
  }
  return { text: extractPlainText(bytes), format: "text" };
}
