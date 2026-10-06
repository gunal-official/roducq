# File intake closeout — DOCX/TXT/MD upload + extraction (2026-10-06)

**Scope:** Queue item #6 — let users attach a file at `/intake` instead of
only pasting. **Zero new npm dependencies** (Node builtins only:
`node:zlib`, `TextDecoder`). **Extract-only**: uploaded bytes are parsed
in memory and **discarded** — no Supabase Storage bucket, no disk writes,
no DB writes. The extracted text is the only artifact; it lands in the
existing paste textarea for review/edit before Generate, so the
generation action, RPCs and schema are untouched.

## 1. Supported formats, detection, limits

| Format | How detected            | Extraction |
| ------ | ----------------------- | ---------- |
| `.docx` | `PK\x03\x04` magic (ZIP container) + `word/document.xml` inside | Central-directory ZIP walk + WordprocessingML tokenizer (`lib/intake/docx.ts`) |
| `.txt` / `.md` | anything that isn't `%PDF-`/`PK` | strict UTF-8 decode (fatal), BOM strip, CRLF/CR → LF (`lib/intake/extract.ts`) |
| PDF | `%PDF-` magic | **refused** (see below) |

Detection is by **magic bytes only** — never the filename, never the
declared MIME type. A `.docx` renamed to `.txt` still reads as Word; a
`.docx` that's actually plain text reads as text.

**Limits** (`lib/intake/shared.ts`):

- **5 MB** max upload (`MAX_UPLOAD_BYTES`), enforced twice: a cheap
  pre-check on the declared `Content-Length`, then exactly on the parsed
  file part. Client pre-flights the same cap before uploading.
- **100 000** characters max output (`MAX_OUTPUT_CHARS`): longer
  documents are truncated, `meta.truncated: true`, and a surrogate pair
  is never split at the cut. (The Generate action's own 20k source cap
  still applies afterwards — the user reviews/edits in the textarea
  first, which is the point.)

**PDF refusal** — PDFs are out for now (a real extractor would need
layout-aware text reconstruction; half-parsing is worse than refusing).
Both server (415) and client pre-check carry this exact message:

> PDF upload isn’t supported yet — open it, copy the text, paste it
> (scanned PDFs won’t work).

## 2. The DOCX reader (zero-dep)

`lib/intake/docx.ts`:

- **ZIP via the central directory.** Scans backward for the
  end-of-central-directory record, then walks the **central directory**
  for the authoritative entry list: compressed/uncompressed sizes and
  local-header offsets live there. Local headers are consulted **only**
  for the name/extra lengths that locate each payload — their size
  fields are deliberately not trusted (streaming writers legally write
  zeros there; covered by the `zeroLocalSizes` fixture). ZIP64 and
  multi-disk are refused with clear messages.
- **Inflate with a ceiling.** Stored entries pass through; deflated
  entries go through `inflateRawSync` with `maxOutputLength` capped at
  the directory-claimed size (and a hard 64 MB ceiling) — a zip bomb
  dies at its claim, and a length mismatch after inflate is a clean
  `corrupt` error. Any inflate failure → `corrupt`, never a 500.
- **WordprocessingML walk.** A purpose-built tokenizer (no XML dep):
  `<w:t>` runs join contiguously (entities decoded, numeric refs
  included); `</w:p>`/`<w:p/>` → newline; `<w:br/>` → newline;
  `<w:tab/>` → tab; **tables keep structure** — `</w:tc>` separates
  cells with tabs, `</w:tr>` ends rows with newlines, in document order
  (regression-guarded by a `w:tbl` fixture); multi-paragraph cells stay
  on their row's line. **Skipped:** `<w:instrText>` field codes,
  `<w:delText>` tracked deletions, and `mc:Fallback` duplicates of
  AlternateContent drawings. Tracked **insertions** are kept — they're
  current text.

All failure modes throw `ExtractError` with a `code`
(`pdf`/`format`/`corrupt`/`empty`/`not_text`) and a user-safe message.

## 3. Endpoint: POST /api/intake/extract

`app/api/intake/extract/route.ts` → `lib/intake/handler.ts`
(framework-free, session gate injected — the pattern that lets tests
drive the real handler without a server).

- **Auth required** — same session-cookie gate as the other route
  handlers (`lib/supabase/server`), resolved before any body parsing;
  Supabase env missing ⇒ fail closed. 401 otherwise.
- Multipart form with the file under `file`. Nothing else is accepted
  (400).
- Parse → respond → drop. Bytes never touch disk/Storage/DB.
- Responses: `200 { text, meta: { filename, mime, bytes, chars, format,
  truncated } }` · `400` no file · `401` unauthenticated · `413` over
  5 MB · `415` PDF (refusal message) / non-DOCX ZIP · `422`
  corrupt/empty/binary. `cache-control: no-store` on everything.
- **No rate-limit entry added**: the in-memory limiter
  (`lib/rate-limit.ts`) covers only *unauthenticated* Postgres-burning
  routes by design; this endpoint requires a session and writes nothing,
  same posture as the member PDF downloads.

## 4. UI

`components/intake/SourceFilePicker.tsx`, rendered by `SourcePanel`
(input mode only) under the existing textarea.

- "Add a file" button + dashed drop zone (drag-over highlight).
- Client pre-flights by **magic bytes**, mirroring the server: `%PDF-`
  → the refusal message, no upload; `> 5 MB` → the size message, no
  upload.
- Extracted text **appends** to the textarea (`appendToSource`) — a
  blank line separates sources; existing pasted text is never replaced.
- Errors surface inline below the zone; successes toast via the existing
  `ToastProvider` ("Added N characters from X", truncation called out).
- The picker stays available while the brief form is empty; during
  Generate it's disabled with the rest of the panel.

Generate, `create_brief_bundle`, and every RPC are unchanged.

## 5. Tests

44 new tests (`node --test`, no new deps):

- `tests/lib/file-intake-text.test.ts` — UTF-8 strictness, newline
  normalization, BOM, binary rejection, magic-byte dispatch, verbatim
  PDF refusal message.
- `tests/lib/file-intake-docx.test.ts` — paragraph/run structure,
  entities, `<w:br>`/`<w:tab>`, blank paragraphs, field-code/deletion /
  fallback skips, **table tab/newline guard**, stored + deflated
  entries, **central-directory authority** (zeroed local sizes), crafted
  **corrupt deflate stream** (block-type bits invalidated — asserted to
  break `inflateRawSync` itself), missing `word/document.xml`,
  truncated archive, empty document.
- `tests/lib/file-intake-route.test.ts` — 401 unauthenticated (before
  body parsing), 400 no file, 200 text/docx/mislabeled-name + metadata,
  **PDF 415 with the exact message**, 413 over-5MB (declared-length
  pre-check + real file), 100k output cap + surrogate-safe cut,
  422 corrupt/binary/empty.
- `tests/lib/file-intake-zip.ts` — byte-by-byte ZIP fixture builder
  (real central directory, real `deflateRawSync` streams, real CRC-32).
  No binary fixtures are committed.

## 6. Gates (2026-10-06)

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (0 errors, 0 warnings).
- `npm test` — **368/368 pass** (44 new file-intake tests + the full
  prior suite).
- `npm run build` — clean; `/api/intake/extract` registers as a dynamic
  Node-runtime route (needs `node:zlib`, marked `runtime = "nodejs"` +
  `force-dynamic`).
