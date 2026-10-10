# PDF export — v2 closeout (2026-10-10)

This closes PDF v2 on top of the original PDF writer (v1, 2026-09-27).
V2 adds workspace letterhead logos and PDF exports for updates, plans,
time logs, and reports. The v1 implementation notes and historical audit
are retained below, explicitly marked as an archive; v2 verification and
production instructions are recorded first. Companion docs: `README.md`
("PDF export" section), `docs/icon-audit.md` (download glyph rules), and
`docs/roles-spec.md` (why viewers can't export money).

## PDF v2 — what changed

| Piece | File | What it is |
|---|---|---|
| Image decoder | `lib/pdf/images.ts`, `lib/pdf/image-constants.ts` | Bounded PNG/JPEG data-URL validation; PNG color/alpha decoded with built-in zlib, JPEG retained as DCT bytes; dimensions and CRCs checked |
| Writer | `lib/pdf/writer.ts` | Adds PDF Image XObjects, `/SMask` alpha objects, JPEG `/DCTDecode`, and content-key deduplication across pages; no new runtime packages |
| Letterhead | `lib/pdf/layout.ts` | Optional workspace logo repeated in every page header; image objects are shared in the document |
| Builders | `lib/pdf/documents.ts` | Adds pure `buildUpdatePdf`, `buildPlanPdf`, `buildTimePdf`, and `buildReportsPdf` builders |
| Branding data | `lib/data/workspace-branding.ts` | Reads the active workspace name + optional data-URL logo through ordinary RLS |
| Settings | `components/settings/WorkspaceBrandingCard.tsx`, `app/(app)/settings/actions.ts` | Owner-only PNG/JPEG upload/replace/remove; server-side format, size, dimensions, and decode validation |
| Migration | `supabase/migrations/20261010010000_workspace_logo.sql` | Adds the bounded `workspaces.logo_data_url` column and includes the logo in the safe public-invoice RPC payload |
| Routes | `app/api/pdf/[kind]/[id]/route.ts`, `app/api/pdf/time/route.ts`, `app/api/pdf/reports/route.ts` | Authenticated update/plan detail routes plus workspace-level time/report routes; time and reports keep the `canSeeMoney` gate |
| Public route | `app/api/pdf/shared/invoice/[token]/route.ts` | Adds the optional workspace logo to the token-gated invoice PDF |
| Gate | `scripts/verify-pdf.mjs` (`npm run verify:pdf`) | Now audits all four new builders along with the original documents |

**Image constraints:** PNG or JPEG only, maximum uploaded file size 256 KiB,
maximum 4 megapixels, bounded data URL stored in the workspace database.
No Storage bucket or environment variable is added. PNG alpha is represented
as an 8-bit grayscale `/SMask`; JPEG compressed data is passed through as
`/DCTDecode`. Image/font dependencies are unchanged. **Font embedding and
subsetting are not part of v2.**

### V2 verification

All requested local gates passed on this branch:

- `npm test` — **541/541 tests passed**.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed; build includes `/api/pdf/time`,
  `/api/pdf/reports`, and the expanded `/api/pdf/[kind]/[id]` route.
- `npm run verify:db` — all **30 migrations** apply; schema, bounded logo,
  owner/member RLS, removal, and shared invoice logo assertions passed.
- `npm run verify:pdf` — **14 documents · 20 pages · 0 findings**; structure,
  xref offsets, stream lengths, margins, page furniture, required/forbidden
  text, determinism, and filenames passed.

### Production rollout and smoke test

1. Apply `supabase/migrations/20261010010000_workspace_logo.sql` to the
   production Supabase database before deploying/using v2. No new Vercel
   environment variables and no Storage bucket/policy setup are expected.
2. Sign in as a workspace owner at `https://roducq.nanexi.com/settings`,
   upload a PNG or JPEG (≤256 KiB), refresh Settings, and verify the preview
   persists. Remove/re-upload if checking both mutations.
3. From an owner account, verify the four new downloads (replace `<id>` with
   records in that workspace):
   - `https://roducq.nanexi.com/api/pdf/update/<id>`
   - `https://roducq.nanexi.com/api/pdf/plan/<id>`
   - `https://roducq.nanexi.com/api/pdf/time`
   - `https://roducq.nanexi.com/api/pdf/reports`
4. Confirm each response downloads a valid PDF and the configured logo is
   visible in its letterhead. Also smoke-test an existing export, e.g.
   `/api/pdf/invoice/<id>` or `/api/pdf/shared/invoice/<live-sent-token>`.
   The detail-page links are `/updates/<id>`, `/plans/<id>`, `/time`, and
   `/reports`; the time and reports PDF routes remain unavailable to
   viewers without `canSeeMoney`.

The production Supabase/Vercel round trip remains an operator-side check;
local validation above uses PGlite and does not claim the production
migration or a live logo upload has already been applied.

## V1 archive (2026-09-27)

The following sections describe the original v1 implementation and its
historical verification. Statements there about three document types, no
logo/images, and operator setup are superseded by the v2 section above.

### 1. What shipped in v1

| Piece | File | What it is |
|---|---|---|
| Encoder | `lib/pdf/encoding.ts` | UTF-8 → WinAnsi bytes: direct map, then honest transliteration (₹ → "Rs.", − → "-", nbsp → space), then NFD mark-stripping (ā → a), then a visible "?" — never silent corruption, never a crash |
| Metrics | `lib/pdf/metrics.ts` + `metrics-data.ts` | Adobe base-14 widths (generated by `scripts/generate-pdf-metrics.mjs`), `measureText` / `wrapText` / `wrapParagraphs` / `ellipsize` — measurement is done on the transcoded string, so it can never disagree with what is painted |
| Writer | `lib/pdf/writer.ts` | PDF 1.7: catalog, page tree, per-page content stream, font objects (WinAnsiEncoding), Info dictionary, xref + trailer. Text / rects / lines / RGB. ~230 lines, no dependencies |
| Layout | `lib/pdf/layout.ts` | Top-down flow with page breaks: letterhead header repeated per page, "Page i of n" footers stamped at `finish()`, title block, uppercase field labels, meta grid, line-item table (repeating header, zebra rows, atomic rows), totals block, status strip, checklist, signature lines |
| Documents | `lib/pdf/documents.ts` | `buildInvoicePdf` / `buildContractPdf` / `buildProposalPdf` — pure: plain data + `generatedAt` in, bytes + filename out |
| HTTP | `lib/pdf/response.ts` | One attachment response shape: `application/pdf`, `content-disposition` with an ASCII filename + RFC 5987 `filename*`, `no-store`, `nosniff` |
| Member route | `app/api/pdf/[kind]/[id]/route.ts` | Session + the ordinary RLS data layer; 404 for "no session", "not yours" and "doesn't exist" alike; invoices gated on `canSeeMoney` |
| Public route | `app/api/pdf/shared/invoice/[token]/route.ts` | The client's download: only the `get_shared_invoice` definer RPC, shape check first, rate-limited prefix, one indistinguishable 404 |
| UI | `components/ui/DownloadPdfButton.tsx` | A plain `<a download>` in the Button slot — no client JS, works in Server Components, middle-click safe; mounted on the three detail pages and the public invoice |
| Gate | `scripts/verify-pdf.mjs` (`npm run verify:pdf`) | Builds ten documents and reads every one back (below) |

### Design decisions worth knowing

- **No runtime dependency.** A PDF that uses only base-14 fonts is a text
  format with a byte-offset table; owning it keeps the output
  deterministic and testable and keeps the bundle unchanged. The one
  piece of borrowed *data* — Adobe's published glyph widths — is
  generated into a checked-in table by `scripts/generate-pdf-metrics.mjs`
  (the AFM files themselves are not vendored).
- **A4 by default, `?size=letter` for US Letter.** The product is global;
  North America is one query parameter away.
- **Deterministic by construction.** Every builder takes `generatedAt`;
  nothing calls `Date.now()` or `Intl` inside the document layer, so the
  same row always renders the same bytes on any server.
- **Uncompressed streams.** A roducq document is 3–32 KB. Plain text
  streams are greppable in tests and debuggable by a human.
- **Injection is impossible by construction.** All client-authored text
  goes through the escaper; the test suite renders
  `Acme (EU) \ Ltd) Tj 0 0 0 rg (injected` and asserts it comes back as
  text, not as operators.

### 2. Verification in v1

All green at the phase HEAD:

- `npx tsc --noEmit` · `npm run lint` · **`npm test` 255/255**
  (173 → 255: `pdf-encoding`, `pdf-metrics`, `pdf-writer`,
  `pdf-documents`, `pdf-response`, `DownloadPdfButton`, plus the
  rate-limit prefix update) · `npm run build` (38 route entries, incl.
  `ƒ /api/pdf/[kind]/[id]` and `ƒ /api/pdf/shared/invoice/[token]`) ·
  `npm run verify:db` (unchanged — this phase adds no migration).
- **`npm run verify:pdf` — 10 documents · 16 pages · 0 findings.** Per
  document: `%PDF` header and `%%EOF`; every xref offset points at its
  own object; `startxref` points at the table; every `/Length` equals the
  real stream length; `/Count` equals the page objects; every painted run
  inside the margins (the PDF analogue of the responsive overflow
  detector); letterhead + correct `Page i of n` on every page; required
  strings present and `Invalid Date` / `NaN` / `undefined` absent; two
  builds byte-identical; filename ASCII.
- **Read back by a real engine, not just by our own parser.** The ten
  sample documents were additionally opened with Mozilla **pdf.js**
  (ad-hoc, outside the repo — not a dependency): all 10 parse, page
  counts match, `getOperatorList()` evaluates every content stream
  without error, and the Info dictionary decodes as proper Unicode
  ("INV-0002 — Website relaunch — phase 1"). Page 1 of the sent invoice,
  page 3 of the signed contract, the proposal and the hostile invoice
  were rasterised and eyeballed: letterhead + accent rule, status strip,
  meta grid, zebra line items, right-aligned money, accent total,
  signature lines, and the 400-character title capped at four lines
  instead of eating the page.

### Not run in this environment (honest gap)

`npm run verify:responsive` could **not** run here: the sandbox blocks
`cdn.playwright.dev`, so Chromium cannot be downloaded
(`npm run verify:responsive:setup` fails with `Download failure`). The
UI delta is one 44px pill button added to rows that already wrap
(`DocHeader`'s `flex flex-wrap items-center gap-2`, the contract rail
card, and the public invoice chrome — all three asserted in
`tests/components/DownloadPdfButton.test.ts`). **Trigger:** on a machine
with CDN access, run `npm run verify:responsive:setup && npm run
verify:responsive` and eyeball `/invoices/:id`, `/contracts/:id`,
`/proposals/:id`, `/invoice/<token>` at 320–1440.

The live round trip (click PDF in a signed-in browser against a real
Supabase project) is likewise operator-side: this environment has no
Supabase credentials. What was proven here instead: with Supabase
unconfigured, every PDF route answers **404, never 500** (curl against
`next dev`, all five URL shapes).

### 3. Honest limitations in v1

- **Base-14 fonts only.** Helvetica regular/bold/oblique. Text outside
  WinAnsi transliterates where honest and otherwise renders "?" — CJK,
  Devanagari, Arabic and emoji do not draw. Embedding a font (and a
  subsetter) is the fix when a customer needs one.
- **No logo / images.** The letterhead is the workspace name in bold.
- **Three document kinds.** Shared updates (`/share/<token>`), plans,
  time logs and reports still have no PDF; the layout vocabulary is ready
  for them (`createLayout` + the block methods).
- **No pixel-parity contract with the on-screen document.** The PDF
  mirrors the same facts in the same design language; it is not a
  rasterisation of the page (that is what Print still is).
- **Titles are capped at four lines** (ellipsised) so a pathological
  title cannot push the document off page 1 — the full text stays in the
  app.
- **Uncompressed streams**: a 60-line invoice is ~32 KB. If documents
  ever grow images, add Flate via `node:zlib` at the writer boundary.
- **No caching.** Every request rebuilds (a few ms) and answers
  `no-store`; documents change whenever their rows do.

### 4. Operator setup in v1

None. No env var, no migration, no external service — the feature is
pure computation over rows the app already reads.
