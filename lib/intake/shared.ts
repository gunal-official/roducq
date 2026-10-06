/**
 * File intake (Queue item #6) — shared constants + tiny helpers that are
 * safe to import from BOTH the server (route handler / extractors) and the
 * client (SourceFilePicker). This module must stay dependency-free: the
 * client bundle pulls it in, so nothing here may touch node:* or Next.
 *
 * Architecture: extract-only. Uploaded bytes are parsed in memory and
 * DISCARDED — no Supabase Storage bucket, no DB writes, no disk writes.
 * The extracted text is all that ever leaves the endpoint; the user then
 * reviews/edits it in the existing paste textarea before Generate.
 */

/** Error codes the route handler maps to statuses — kept here (not in
 *  extract.ts/docx.ts) so both extractors share one import graph without
 *  a cycle: extract → docx → shared, handler → extract + shared. */
export type ExtractErrorCode =
  /** PDF refused, deliberately, with paste-instead instructions. */
  | "pdf"
  /** ZIP or PDF container, but not a readable document. */
  | "format"
  /** Archive structure violated / deflate stream broken / XML undecodable. */
  | "corrupt"
  /** Parsed fine but there is simply no text to hand back. */
  | "empty"
  /** Not decodable as UTF-8 text, or obviously binary. */
  | "not_text";

/** Typed extraction failure; `message` is always safe to show to the user. */
export class ExtractError extends Error {
  readonly code: ExtractErrorCode;

  constructor(code: ExtractErrorCode, message: string) {
    super(message);
    this.name = "ExtractError";
    this.code = code;
  }
}

/** Upload ceiling enforced by POST /api/intake/extract (and pre-flighted
 *  client-side so an oversized pick never leaves the machine). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Output ceiling: extracted text is truncated past this many characters. */
export const MAX_OUTPUT_CHARS = 100_000;

/** The explicit refusal, verbatim, shown for PDF uploads (client pre-check
 *  AND server response must carry this exact string). */
export const PDF_REFUSAL_MESSAGE =
  "PDF upload isn’t supported yet — open it, copy the text, paste it " +
  "(scanned PDFs won’t work).";

export const TOO_LARGE_MESSAGE =
  "That file is too large — uploads are capped at 5 MB. Copy the text " +
  "you need and paste it instead.";

/** Tail-wind classes diffs aside: true when the first bytes are %PDF-. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d //    -
  );
}

/** Server → client payload for POST /api/intake/extract (success case). */
export interface ExtractSuccessPayload {
  text: string;
  meta: {
    filename: string;
    /** Client-supplied Content-Type of the part — informational only;
     *  detection itself is by magic bytes, never extension or this value. */
    mime: string;
    /** Uploaded byte length (the bytes themselves are already gone). */
    bytes: number;
    /** Character count of `text` (after any truncation). */
    chars: number;
    format: "text" | "docx";
    /** true when the document exceeded MAX_OUTPUT_CHARS and was cut. */
    truncated: boolean;
  };
}

/** Append semantics for the intake textarea: extracted text always APPENDS
 *  to whatever the user already pasted (never replaces), separated by a
 *  blank line so two sources stay visually distinct. */
export function appendToSource(current: string, addition: string): string {
  const base = current.trimEnd();
  return base ? `${base}\n\n${addition}` : addition;
}
