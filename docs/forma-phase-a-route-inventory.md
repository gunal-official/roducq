# Forma Application Redesign — Phase A Route Inventory

**Status:** Phase A foundation is implemented in this PR; Phases B–F remain
open. This inventory was reconstructed from the current App Router tree on
2026-10-16; the similarly named file did not exist at the start of this
session.

## Recovery and starting state

- `origin/main` was fetched at `c590f89` (the current checkout's base).
- PR [#33](https://github.com/gunal-official/roducq/pull/33), “design: Complete
  Forma-inspired marketing redesign,” is merged. It established the public
  site's purple accent and added the self-hosted Manrope font asset.
- Previous-session commit `092ca00` was **not recovered**: it is absent from
  the local object database and GitHub's commit lookup/search. The working
  tree was clean, and no Phase A implementation or route inventory was present
  before this work. This PR recreates the foundation from the current `main`.
- The repository already had a `next-themes` provider, a theme switcher on the
  marketing header, a warm “Ember” palette, a responsive authenticated shell,
  and some page-level UI foundations. Those earlier pages and flows are not
  represented as a completed Forma redesign. Phase A updates shared tokens,
  typography, theme selection and component foundations; it does **not**
  recompose every authenticated page.

## Phase A foundation

- Canonical CSS and TypeScript tokens use Forma purple, lavender and plum
  semantics. Existing semantic Tailwind colors (`accent`, `background`,
  `foreground`, `primary`, `secondary`, `muted`, `card`, `popover`, `input`,
  `ring`, `success`, `info`, and related aliases) remain available.
- Deprecated `--ember-*` CSS variables and `TOKENS.terracotta` /
  `TOKENS.terracottaHover` exports resolve to the Forma values for source
  compatibility. Existing UI imports and class names therefore keep working.
- Light and dark are deliberately designed palettes. The authenticated
  account menu and the public marketing header both expose **Light**, **Dark**
  and **System** choices; system preference remains the default.
- Manrope is self-hosted and used for both body and display typography across
  public and authenticated browser surfaces. Fira Code remains available for
  monospace content. PDF and root-error colors use the shared light tokens;
  invitation emails use the shared token palette and a Manrope-first system
  font stack. The deterministic PDF writer retains its built-in Helvetica
  faces.
- Shared buttons, fields, badges, cards, dialogs, tabs and focus treatments
  consume semantic tokens. Existing route-level layouts, data handling,
  navigation destinations and server actions are preserved.

## Route inventory

Route groups in parentheses are organizational only. The `(app)` layout owns
the authenticated shell and requires a signed-in user plus an active
workspace. Middleware rewrites signed-in `/` requests to `/dashboard`, so the
same URL is the marketing homepage for guests and the Pipeline dashboard for
members.

### Authenticated application routes — all remain in scope for Phases B–F

| URL | App Router source | Area / planned redesign coverage |
| --- | --- | --- |
| `/` (signed-in rewrite) | `app/(app)/dashboard/page.tsx` | Dashboard / Pipeline |
| `/dashboard` (direct route) | `app/(app)/dashboard/page.tsx` | Same Pipeline dashboard; direct URL remains routable |
| `/intake` | `app/(app)/intake/page.tsx` | Intake |
| `/intake/inbox` | `app/(app)/intake/inbox/page.tsx` | Inbox, email and staged imports |
| `/briefs` | `app/(app)/briefs/page.tsx` | Brief list |
| `/briefs/[id]` | `app/(app)/briefs/[id]/page.tsx` | Brief detail, questions and source material |
| `/proposals` | `app/(app)/proposals/page.tsx` | Proposal list |
| `/proposals/[id]` | `app/(app)/proposals/[id]/page.tsx` | Proposal detail and actions |
| `/proposals/[id]/versions/[versionId]` | `app/(app)/proposals/[id]/versions/[versionId]/page.tsx` | Proposal version history |
| `/plans` | `app/(app)/plans/page.tsx` | Plan list |
| `/plans/[id]` | `app/(app)/plans/[id]/page.tsx` | Plan detail and tasks |
| `/updates` | `app/(app)/updates/page.tsx` | Update list |
| `/updates/[id]` | `app/(app)/updates/[id]/page.tsx` | Update detail and sharing |
| `/invoices` | `app/(app)/invoices/page.tsx` | Invoices and billing documents |
| `/invoices/[id]` | `app/(app)/invoices/[id]/page.tsx` | Invoice detail |
| `/contracts` | `app/(app)/contracts/page.tsx` | Engagement letters / contracts |
| `/contracts/[id]` | `app/(app)/contracts/[id]/page.tsx` | Contract detail and print surface |
| `/time` | `app/(app)/time/page.tsx` | Time tracking |
| `/reports` | `app/(app)/reports/page.tsx` | Financial and workspace reports |
| `/settings` | `app/(app)/settings/page.tsx` | Workspace, branding, team, templates, plan, integrations |
| `/search` | `app/(app)/search/page.tsx` | Global search |

### Other route groups (shared Forma foundations, not part of authenticated
page composition)

| URLs | Route files | Access / current role |
| --- | --- | --- |
| `/`, `/about`, `/pricing`, `/vs`, `/vs/[slug]` | `app/(marketing)/**` | Public marketing site; the homepage remains public for guests |
| `/login`, `/signup`, `/onboarding` | `app/(auth)/**` | Authentication and workspace onboarding |
| `/auth/callback` | `app/auth/callback/route.ts` | Server-side auth completion; not a rendered page |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | Token-based invitation acceptance |
| `/share/[token]` | `app/share/[token]/page.tsx` | Public, token-gated shared update |
| `/invoice/[token]` | `app/invoice/[token]/page.tsx` | Public, token-gated invoice |

### API and operational routes (listed for scope; not page-redesign targets)

| URL family | Route files | Role / visual scope |
| --- | --- | --- |
| `/api/cron/email`, `/api/cron/webhooks` | `app/api/cron/**/route.ts` | Scheduled jobs; no rendered UI |
| `/api/email/connect`, `/api/email/callback` | `app/api/email/**/route.ts` | Email integration flow; behavior unchanged |
| `/api/intake/extract` | `app/api/intake/extract/route.ts` | Intake extraction endpoint; behavior unchanged |
| `/api/notion/connect`, `/api/notion/callback` | `app/api/notion/**/route.ts` | Notion integration flow; behavior unchanged |
| `/api/slack/connect`, `/api/slack/callback` | `app/api/slack/**/route.ts` | Slack integration flow; behavior unchanged |
| `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts` | Billing webhook; behavior unchanged |
| `/api/pdf/[kind]/[id]`, `/api/pdf/reports`, `/api/pdf/time`, `/api/pdf/shared/invoice/[token]` | `app/api/pdf/**/route.ts` | PDF outputs use the shared Forma light tokens; endpoint behavior unchanged |

## Remaining full-application redesign checklist

Phase A is the design foundation, not the finished application redesign.

- [x] **Phase B — Application shell:** sidebar and topbar, workspace switcher,
      mobile tabs/drawer, account menu and responsive shell states.
- [x] **Phase C — Daily workflow:** Dashboard/Pipeline, Intake and Inbox,
      including Settings, empty/loading/error states and responsive compositions.
      Implementation complete; the routes are re-measured by the Phase D audit.
      See `forma-phase-c-closeout.md` (its browser limitation is resolved — see
      `forma-phase-d-closeout.md` §6.2).
- [x] **Phase D — Delivery workflow:** Briefs and Proposals (including proposal
      versions), Plans and the task workspace, Updates and the composer.
      Implemented, measured in real Chromium at 320–1440 in both themes, with
      reduced-motion artwork proof. See `forma-phase-d-closeout.md`.
- [ ] **Phase E — Financial workflow:** Invoices, Contracts, Time and Reports;
      preserve existing calculations, permissions, exports and print output.
- [ ] **Phase F — Workspace and finishing pass:** Settings and Search; forms,
      dialogs, tables, cards and menus; animated SVGs and motion; accessibility,
      and complete light/dark/responsive review at 375px, 768px and 1440px.
- [ ] Audit every authenticated route in the table above in both themes; no
      route should be called Forma-redesigned solely because it inherits the
      Phase A tokens.

## Verification and screenshot evidence

Phase A's numbers are kept below as the historical record of that phase; the
current gates are in the per-phase closeouts (Phase D: 758 tests, real-Chromium
audit, screenshots in `docs/screenshots/forma-phase-d/`).

- `npm test` — passed (711 tests at the time of Phase A).
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- `npm run verify:db` — passed (30 migrations; all database checks).
- `npm run verify:pdf` — passed (14 documents / 20 pages; no findings).
- `npm run verify:responsive` — **not run in a browser**: the harness exited
  because this environment has no installed Chromium. `npm run
  verify:responsive:setup` was attempted, but Playwright's download from
  `cdn.playwright.dev` failed with `ECONNRESET` before TLS was established;
  no system Chromium/Chrome executable was found in the available paths.
- **Screenshots:** none captured. The requested 375px, 768px and 1440px
  light/dark captures are explicitly outstanding; no screenshots are
  fabricated or represented as visual verification.

Re-run the responsive audit and capture the six theme/viewport combinations
on a browser-enabled machine before treating visual browser verification as
complete.

> **Update (Phase D, 2026-10-16):** the browser gap described above is closed
> in this environment — Chromium was provisioned from the
> `@sparticuz/chromium` bundle plus its `al2023` shared libraries and
> `verify:responsive` ran unmodified at 320/375/414/600/768/1024/1440 in both
> themes. See `forma-phase-d-closeout.md` §6.2 for the exact chain and §6.3 for
> the measured results; page and artwork screenshots are committed under
> `docs/screenshots/forma-phase-d/`.
