/**
 * POST /api/intake/extract — file intake, Queue item #6.
 *
 * Multipart form in («file» field), extracted plain text out. Supported:
 * .docx, .txt, .md — detected by MAGIC BYTES, never by name or declared
 * MIME. PDF is refused with an explicit “paste instead” message.
 * Limits: 5 MB upload, 100k characters out (truncated, flagged).
 *
 * EXTRACT-ONLY: bytes are parsed in memory and discarded; nothing is
 * written to disk, to a Supabase Storage bucket, or to the database —
 * the /intake textarea is the only destination, via the client.
 *
 * AUTH: session cookie, same cookie-based gate as the other route
 * handlers (lib/supabase/server). The request logic itself lives in
 * lib/intake/handler.ts, framework-free so tests can drive it with a
 * stubbed auth gate; this file only supplies the real gate.
 */

import { handleExtractRequest } from "@/lib/intake/handler";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // node:zlib (DOCX inflate) — never edge

export async function POST(request: Request) {
  return handleExtractRequest(request, {
    async isAuthenticated() {
      // Fail closed when env isn't set up — same posture as the proxy and
      // the PDF routes (an unreachable Supabase is "not signed in").
      if (!isSupabaseConfigured()) return false;
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user !== null;
    },
  });
}
