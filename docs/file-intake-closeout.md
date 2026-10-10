# File intake closeout — DOCX/PDF/TXT/MD upload + extraction (2026-10-10)

**Scope:** Queue item #6 — let users attach a file at `/intake` instead of
only pasting. **Zero new npm dependencies** (Node builtins only:
`node:zlib`, `TextDecoder`). **Extract-only**: uploaded bytes are parsed
in memory and **discarded** — no Supabase Storage bucket, no disk writes,
no DB writes. The extracted text is the only artifact; it lands in the
existing paste textarea for review/edit before Generate, so the
generation action, RPCs and schema are untouched.

PDF upload shipped 2026-10-10 (previously an explicit refusal — see
history below); everything else from the original 2026-10-06 closeout is
unchanged.

## 1. Supported formats, detection, limits

| Format | How detected            | Extraction |
| ------ | ----------------------- | ---------- |
| `.docx` | `PK\x03\x04` magic (ZIP container) + `word/document.xml` inside | Central-directory ZIP walk + WordprocessingML tokenizer (`lib/intake/docx.ts`) |
| `.pdf` | `%PDF-` magic | Brute-force object scan + content-stream text extraction (`lib/intake/pdf.ts`) |
| `.txt` / `.md` | anything that isn't `%PDF-`/`PK` | strict UTF-8 decode (fatal), BOM strip, CRLF/CR → LF (`lib/intake/extract.ts`) |

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

## 3. The PDF reader (zero-dep)

`lib/intake/pdf.ts` does not trust `xref`/`trailer` at all — it brute-force
scans the file for every `N G obj … endobj`, which also makes incremental
updates trivially correct (a later `N G obj` for the same id simply
overwrites the earlier one in the object map, same outcome a real xref
would resolve to).

- **Object map.** A hand-written recursive-descent parser understands the
  PDF value grammar needed for dictionaries: names, literal/hex strings,
  numbers, arrays, nested dicts, booleans/null, and `N G R` indirect
  references (disambiguated from two bare numbers by a `R` lookahead).
  Streams are located by `/Length` (direct, or resolved from an
  already-scanned indirect object) with a fallback scan for a literal
  `endstream` when that doesn't check out — never a hard failure from a
  single bad `/Length`.
- **Compressed object streams (`/Type /ObjStm`, PDF 1.5+).** Flattened
  into the same object map before anything else runs, so files that
  compress their Catalog/Pages/Font dictionaries into an object stream
  (common from modern writers) resolve exactly like classic files —
  without ever parsing a cross-reference *stream*.
- **`FlateDecode`** is decompressed via `inflateSync` with an output
  ceiling; any other filter (images: `DCTDecode`, `CCITTFaxDecode`, …) is
  treated as "no text here", not a hard failure — a page that's one scanned
  image contributes nothing, which surfaces as the `empty` code once every
  page comes back blank.
- **Page tree walk.** `/Root` → `/Pages` → `/Kids`, inheriting
  `/Resources` down the tree, with a cycle guard. Falls back to "every
  `/Type /Page` object, by id" for files whose catalog can't be resolved.
- **Content-stream interpreter.** A small operator-stack reader tracks
  only what text extraction needs: the active font (`Tf`) and line breaks
  (`Td`/`TD`/`T*`/`Tm`). `Tj`/`'`/`"` show one string; `TJ` arrays are
  walked left to right, and a kerning number ≤ **-120** (thousandths of
  text space — a heuristic for generators that skip the actual space
  glyph) becomes a space.
- **Font character maps**, in priority order:
  1. `/ToUnicode` CMap (`bfchar`/`bfrange`) — the common case for
     embedded/subset fonts from Chrome "Print to PDF", LibreOffice, Word;
     codespace range picks 1- vs 2-byte codes.
  2. Simple fonts (`Type1`/`TrueType`): WinAnsi/MacRoman/StandardEncoding
     base table + a `/Differences` overlay through a pragmatic Adobe
     Glyph List subset (typographic punctuation + Latin-1 letters).
  3. A `Type0` composite font with **no** `/ToUnicode` contributes nothing
     — there's no honest way to recover text from raw CIDs without one.
- **Refusals:** encrypted/password-protected PDFs (`/Encrypt` anywhere) →
  `format`. No resolvable pages → `format`. No extractable text anywhere
  (scanned/image-only, or a font this reader can't decode) → `empty`,
  explicitly mentioning that OCR isn't supported. Any parser exception —
  pathological nesting, truncated streams — is caught and reported as
  `corrupt`; this reader never 500s, however malformed the input.

All failure modes throw `ExtractError` with a `code`
(`format`/`corrupt`/`empty`/`not_text`) and a user-safe message.

## 4. Endpoint: POST /api/intake/extract

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
  5 MB · `415` encrypted PDF / unresolvable pages / non-DOCX ZIP · `422`
  corrupt/empty/binary. `cache-control: no-store` on everything.
- **No rate-limit entry added**: the in-memory limiter
  (`lib/rate-limit.ts`) covers only *unauthenticated* Postgres-burning
  routes by design; this endpoint requires a session and writes nothing,
  same posture as the member PDF downloads.

## 5. UI

`components/intake/SourceFilePicker.tsx`, rendered by `SourcePanel`
(input mode only) under the existing textarea.

- "Add a file" button + dashed drop zone (drag-over highlight).
- Client pre-flights only the size cap (`> 5 MB`) by file size — format
  detection itself is server-side, by magic bytes; a PDF upload now goes
  straight to the endpoint like any other format.
- Extracted text **appends** to the textarea (`appendToSource`) — a
  blank line separates sources; existing pasted text is never replaced.
- Errors surface inline below the zone (e.g. an encrypted or scanned
  PDF's message); successes toast via the existing `ToastProvider`
  ("Added N characters from X", truncation called out).
- The picker stays available while the brief form is empty; during
  Generate it's disabled with the rest of the panel.

Generate, `create_brief_bundle`, and every RPC are unchanged.

## 6. Tests

`tests/lib/file-intake-text.test.ts` (UTF-8 strictness, newline
normalization, BOM, binary rejection, magic-byte dispatch),
`tests/lib/file-intake-docx.test.ts` (DOCX reader), and
`tests/lib/file-intake-pdf.test.ts` (PDF reader — simple fonts, hex
strings, `TJ` kerning-to-space, `FlateDecode`, `/Differences`, Type0 +
`/ToUnicode`, `/ObjStm` flattening, encrypted/no-pages/scanned refusals,
pathological-nesting safety, and a round-trip against the repo's own
`lib/pdf/writer.ts` output) cover the extractors directly, no network, no
binary fixtures committed (`file-intake-zip.ts` / `file-intake-pdf.ts`
build real ZIP/PDF bytes by hand). `tests/lib/file-intake-route.test.ts`
drives the real route handler end to end: 401 unauthenticated, 400 no
file, 200 text/docx/pdf/mislabeled-name + metadata, 413 over-5MB
(declared-length pre-check + real file), 100k output cap +
surrogate-safe cut, 422 corrupt/binary/empty, 415 for an encrypted/
unreadable PDF or non-DOCX ZIP.

## 7. Gates (2026-10-10)

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (0 errors, 0 warnings).
- `npm test` — full suite passes (file-intake + PDF-reader tests included
  alongside the full prior suite).
- `npm run build` — clean; `/api/intake/extract` registers as a dynamic
  Node-runtime route (needs `node:zlib`, marked `runtime = "nodejs"` +
  `force-dynamic`).
- `npm run verify:db` — clean (unaffected; this feature touches no
  schema/RPCs).
