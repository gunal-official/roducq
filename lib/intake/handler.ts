/**
 * File intake (Queue item #6) — request-handling core for
 * POST /api/intake/extract.
 *
 * Deliberately framework-free (global Request/Response/FormData only) so
 * the node:test suite can drive it directly; app/api/intake/extract/route.ts
 * is a thin wrapper that only wires in the real Supabase auth gate.
 *
 * Contract:
 *   401 — unauthenticated (the gate decides; session is the only auth).
 *   400 — not multipart, or no file under the "file" field.
 *   413 — upload over MAX_UPLOAD_BYTES (checked both on the declared
 *         Content-Length and on the actual part size).
 *   415 — unsupported container (PDF refusal lives here, verbatim).
 *   422 — corrupt/empty/not-text (parseable request, unusable content).
 *   200 — { text, meta } (see shared.ts); output truncated at
 *         MAX_OUTPUT_CHARS with meta.truncated=true.
 *
 * Extract-only: bytes live in memory for the duration of this call and are
 * never written to disk, a Storage bucket, or the database.
 */

import { extractUploadText } from "./extract.ts";
import {
  ExtractError,
  MAX_OUTPUT_CHARS,
  MAX_UPLOAD_BYTES,
  TOO_LARGE_MESSAGE,
} from "./shared.ts";
import type { ExtractSuccessPayload } from "./shared.ts";

/** Injected by the route (real Supabase session check) and by tests (a
 *  stub) — the ONLY seam this module needs. */
export interface ExtractAuthGate {
  isAuthenticated(): Promise<boolean>;
}

/** Content-Length includes the multipart envelope (boundary + headers),
 *  not just the file, so a declared-length pre-check gets a 64 KB
 *  allowance; the exact cap is enforced on the file part itself. */
const ENVELOPE_ALLOWANCE = 64 * 1024;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function statusForError(error: ExtractError): number {
  switch (error.code) {
    case "pdf":
    case "format":
      return 415; // Unsupported Media Type — the doc is healthy, we don't eat it
    case "corrupt":
    case "empty":
    case "not_text":
    default:
      return 422;
  }
}

/** Slice at the cap without splitting a surrogate pair. */
function capOutput(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT_CHARS) return { text, truncated: false };
  let out = text.slice(0, MAX_OUTPUT_CHARS);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return { text: out, truncated: true };
}

export async function handleExtractRequest(
  request: Request,
  auth: ExtractAuthGate
): Promise<Response> {
  // Auth first — cheap reject before any body parsing.
  if (!(await auth.isAuthenticated())) {
    return json(
      { error: "Sign in to extract text from a file.", code: "auth" },
      401
    );
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES + ENVELOPE_ALLOWANCE) {
    return json({ error: TOO_LARGE_MESSAGE, code: "too_large" }, 413);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(
      {
        error: "Expected a multipart form upload with the file under “file”.",
        code: "bad_request",
      },
      400
    );
  }

  const field = form.get("file");
  if (field === null || typeof field === "string") {
    return json(
      { error: "Attach a file under the “file” field.", code: "bad_request" },
      400
    );
  }
  if (field.size > MAX_UPLOAD_BYTES) {
    return json({ error: TOO_LARGE_MESSAGE, code: "too_large" }, 413);
  }

  // The only moment the bytes exist: parse → text, then drop them.
  const bytes = new Uint8Array(await field.arrayBuffer());
  let extracted;
  try {
    extracted = extractUploadText(bytes);
  } catch (err) {
    if (err instanceof ExtractError) {
      return json(
        { error: err.message, code: err.code },
        statusForError(err)
      );
    }
    throw err; // programmer error — let the framework 500
  }

  if (extracted.text.trim().length === 0) {
    return json(
      {
        error: "No readable text in that file — paste the content instead.",
        code: "empty",
      },
      422
    );
  }

  const { text, truncated } = capOutput(extracted.text);
  const payload: ExtractSuccessPayload = {
    text,
    meta: {
      filename: field.name || "upload",
      mime: field.type || "application/octet-stream",
      bytes: field.size,
      chars: text.length,
      format: extracted.format,
      truncated,
    },
  };
  return json(payload, 200);
}
