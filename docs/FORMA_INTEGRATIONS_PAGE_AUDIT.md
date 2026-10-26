# Forma `/integrations` — measured reference audit and Roducq build record

Reference: <https://forma-visuvate.framer.website/integrations>
Captured: **2026-10-26** (GitHub Actions runs **40260803142**, **40261212034**,
**40261654254**, **40262014319** — Chromium **153.0.8010.12**)
Target Roducq route: **`/integrations`**
Companion documents: `docs/FORMA_INTEGRATIONS_REFERENCE.md` (the full measured
dossier) and `docs/FORMA_INTEGRATIONS_CAPABILITY_AUDIT.md` (what the product
really supports).
Status: **built, verified in real Chromium, pull request open — not merged, not
deployed.**

---

## 0. Labeling contract

| Label | Meaning |
| --- | --- |
| **[MEASURED]** | Read from the live page by real Chromium via `getBoundingClientRect()` / `getComputedStyle()` / the Web Animations API / `IntersectionObserver` construction options / `MutationObserver` / `PerformanceObserver` / raw DOM / screenshots. |
| **[INFERRED]** | Not directly measurable; the reason is stated inline. Never used as ground truth. |
| **[UNVERIFIED]** | Cannot be established from the available evidence. |

No numeric value in this document comes from a text extraction of the page. The
development sandbox's egress allowlist blocks the Framer host (direct `curl`
fails with `SSL_ERROR_SYSCALL`), so every reference number comes from the
capture workflow running real Chromium on a GitHub-hosted runner — the same
discipline `/solutions` and `/features` established.

## 1. What this page is

Roducq's integration surface, in the reference's own five-band order:

| # | Band | Component | Reference behaviour reproduced |
| --- | --- | --- | --- |
| 0 | Hero | `IntegrationsHero.tsx` | eyebrow, two-part headline (ink + gradient), one lead; the measured three-step type scale (67.2 → 45.4 → 44px) |
| 1 | Catalog | `IntegrationsCatalog.tsx` | search field, chip row, derived count line, 3/2/1-column card grid, instant hover tint, inert cards |
| 2 | How connecting works | `ConnectingSteps.tsx` | 54px weight-400 heading and the 1px-gap three-cell container |
| 3 | Request `#request` | `RequestIntegration.tsx` | two columns, white 24px card, label/field rhythm — with a mailto action instead of a form |
| 4 | Closing CTA | `IntegrationsClosingCta.tsx` | the shared purple stage, radius 28, white checklist card |

The marketing shell (header, footer, announcement band, motion provider) comes
from the route group's layout, exactly like `/`, `/about`, `/pricing`,
`/solutions`, `/features` and `/vs`.

## 2. Truthfulness — the rule this page is built around

An integrations page is a promise, so the content module
(`app/(marketing)/integrations/content.ts`) publishes **seven** entries — not
the reference's twelve — and every one of them carries `evidence`: a file plus a
symbol that must exist.

| Entry | Chip | Category | Evidence |
| --- | --- | --- | --- |
| Slack | Read-only | Chat | `lib/integrations/oauth.ts` `SLACK_AUTHORIZE_URL`, `lib/integrations/sync.ts` `fetchImportedItems`, `components/settings/IntegrationsCard.tsx` |
| Notion | Read-only | Docs & notes | `lib/integrations/oauth.ts` `NOTION_AUTHORIZE_URL`, `lib/integrations/sync.ts` `fetchImportedItems`, `components/intake/IntegrationStaging.tsx` |
| Connected mailbox | Read-only | Email | `lib/email/oauth.ts` `GMAIL_SCOPE`, `lib/email/sync.ts` `fetchInboxMessages`, `components/settings/MailboxCard.tsx` |
| Signed webhooks | Native | Automation | `lib/webhooks.ts` `signPayload`, `lib/events.ts` `EVENT_TYPES`, `components/settings/WebhooksCard.tsx` |
| PDF export | Native | Files & exports | `lib/pdf/documents.ts` `buildInvoicePdf`, `app/api/pdf/[kind]/[id]/route.ts` `KINDS`, `components/settings/WorkspaceBrandingCard.tsx` |
| File import | Native | Files & exports | `lib/intake/extract.ts` `extractUploadText`, `lib/intake/shared.ts` `MAX_UPLOAD_BYTES`, `app/api/intake/extract/route.ts` `POST` |
| Client links | Native | Sharing | `lib/data/shares.ts` `getSharedDocumentByToken`, `lib/invoice-sharing.ts` `canShareInvoice`, `app/share/[token]/page.tsx` `SharePage` |

`tests/components/integrations-page.test.ts` resolves all 21 citations against
the working tree on every test run. **An integration that is removed from the
codebase cannot survive here as marketing** — the test fails instead.

Deliberately absent, and asserted absent: Zapier, Make.com, Google/Outlook
Calendar, Jira, Linear, Figma, GitHub, Drive, Dropbox, Trello, Asana, ClickUp,
Stripe, QuickBooks, Xero. None of them exist in this repository.

**Read-only is stated, not implied.** `lib/integrations/sync.ts` pulls items in
and never writes back, so every external connector carries a *Read-only* chip
and the catalog's disclaimer says "External connections import into roducq and
never write back." The reference's "syncs both ways" claim is absent by design,
and a test asserts no rendered string claims it.

## 3. Deviations from the reference — all approved at the content gate

| Reference behaviour | What ships here | Why |
| --- | --- | --- |
| Chips look like filters, filter nothing (**[MEASURED]**: all five chips clicked, grid stayed at 12 cards) | Chips really filter, in a `role="group"` with `aria-pressed` | Dead controls were ruled out. Same visual design (dark active pill, 999px radius, 14px label) on a control that works. |
| Search filters live (verified: `chat`→2, `email`→1, `docs`→3, `slack`→none) | Search filters live, with an empty state and a Clear filters action | The reference's one working control, rebuilt as one working control plus a recovery path for the no-match case the reference leaves stranded. |
| Cards carry a decorative ↗ arrow and are inert on click (**[MEASURED]**: no navigation, no dialog) | Cards are plain `<li>`, no arrow, no pointer cursor; the measured hover tint is kept | An arrow on an inert surface promises a page that does not exist. |
| A live form posts to Framer's endpoint | A white card listing what to include, with one `mailto:hello@roducq.dev` action | Roducq has no request endpoint and the brief forbids inventing a backend. A submit button that silently drops a request is worse than none, so there is no `<form>`, no POST and no "sent" state. |
| Twelve vendor logos as SVG sprites | Seven generic Lucide glyphs | Roducq ships none of those logos and must not reproduce them. |
| Status chips read Available / Beta | Read-only / Native | "Available" says nothing about direction; this page has to say read-only out loud. |
| Count line hardcodes "12 integrations" | Derived from the data every render | A hardcoded count is how an integrations page starts lying. |
| The reference's six task-manager categories | Seven chips: All, Chat, Docs & notes, Email, Automation, Files & exports, Sharing | Roducq's own taxonomy. Every category filters to at least one card; a test asserts no dead filter. |

Band 2's copy ("Three steps, no shared password" → Connect as the owner / Import
what matters / Turn a message into a brief) deliberately ends on the same
pipeline a pasted email already takes, so the page does not describe a workflow
the product does not have.

## 4. Approved content (verbatim)

- Hero eyebrow **Integrations**; ink **Bring the work in.**; gradient **Send the work out.**
- Lead: "Slack, Notion and a connected mailbox feed the Inbox; signed webhooks,
  PDFs and share links carry the finished work back out."
- Count: `7 integrations · 3 external, 4 native`, and `N of 7 shown · <Category>`
  when filtering.
- Band 2 eyebrow "How connecting works", heading "Three steps, no shared password".
- Band 3 eyebrow "Request an integration", heading "Missing an app you need?".
- Band 4 heading "Try roducq with / your own / client project", CTAs *Start free*
  (`/signup`) and *Talk to us* (`mailto:hello@roducq.dev`) — the same pair
  `SOLUTIONS_CLOSING` and `FEATURES_CLOSING` publish.
- Miniature disclosure: "Illustrative example · fictional workspace".

## 5. Design-system compliance

- **Tokens only.** No component hardcodes a hex colour, `font-size` or
  `box-shadow`; a test enforces it. Five new page-local tokens were added
  (`--lm-size-45-4`, `--lm-size-40-8`, `--lm-size-13-5`, `--lm-size-12-5`,
  `--lm-radius-step`) plus their Tailwind keys, each with a comment explaining
  why it is not shared. Every class the six files use was compiled through
  Tailwind to confirm it emits CSS — a class that silently vanishes is the
  failure mode these pages are most exposed to.
- **The closing stage is not re-declared.** The reference's closing gradient is
  byte-identical to `/solutions`', so the band reuses `.lm-solutions-stage`, and
  the checklist reuses `ChecklistRows variant="card"` from
  `solutions/PracticeMocks.tsx`. Two pages cannot drift apart.
- **Motion.** Motion.dev is the only animation dependency; nothing here imports
  an animation library. The hero rides the existing CSS primitives
  (`.lm-hero-in`, `.lm-hero-mask`, `.lm-hero-word`, `.lm-hero-accent`) at the
  measured cadence; band 2 uses the shared `Reveal` + `.lm-word` gate; the
  catalog, the request band and the closing band are static, which is what the
  reference's motion log records for them.

### 5.1 The LCP rule (PR #53) is preserved

The reference starts every hero element at `opacity: 0.001` and dissolves words
out of `blur(10px)` **[MEASURED]**. That is not reproduced:

- no hero element is pre-hidden — no `opacity: 0`, no `opacity-0`, no heavy
  blur on the headline or lead;
- the entrance animates the clip-path mask and a small rise, with opacity at 1
  in every keyframe;
- below-fold reveals stay gated behind `.lm-js`, so a no-JS visitor sees the
  finished page;
- the catalog's initial state is `all` + empty query, so the server HTML carries
  all seven cards.

Measured result: `/integrations` LCP was the hero lead paragraph on every run,
and it never painted at less than opacity 1 (asserted per run).

## 6. Verification — measured, in real Chromium

Harness: `scripts/verify-integrations-page.mjs` (new), run by
`.github/workflows/forma-integrations-verify.yml` against `next start` on the
production build. Routes: `/integrations` (the page) and `/` (the regression
control, per the `/features` precedent).

Run **40264396094**, 2026-10-26T03:31Z, Chromium **153.0.8010.12**,
`ubuntu-latest`. Report: `integrations-verification.json` on the evidence branch
`arena/forma-integrations-capture`. Overall verdict: **`/integrations` true,
`/` true**.

### 6.1 LCP, four scenarios, three fresh runs each **[MEASURED]**

| Scenario | `/integrations` median | runs | `/` median | runs |
| --- | --- | --- | --- | --- |
| A mobile 412×823 @1.75, animations on | **88 ms** | 100 / 56 / 88 | 104 ms | 104 / 88 / 104 |
| B mobile, 4× CPU throttle | **132 ms** | 140 / 124 / 132 | 164 ms | 164 / 156 / 200 |
| C desktop 1440×900 | **64 ms** | 72 / 64 / 64 | 132 ms | 144 / 132 / 128 |
| D mobile, `prefers-reduced-motion: reduce` | **64 ms** | 76 / 60 / 64 | 92 ms | 92 / 124 / 92 |

Budget 2500 ms; CLS 0.0000 in all 12 `/integrations` runs and all 12 control
runs. The LCP element was the hero lead `<p>` in every run — text, at opacity 1,
no image, no font-blocked heading.

**Honest caveats.**

- Lighthouse is not a dependency of this workspace and its CDN is unreachable
  from the runner sandbox, so **no Lighthouse number is reported anywhere**.
  The PerformanceObserver entries the page emits are the primary instrument.
- One earlier run (**40264085671**) recorded a single CLS of **0.1341** on the
  *control* route `/` in scenario B, with the two other runs at 0. The control
  route is not modified by this branch. It did not reproduce in the clean run
  above (all zeros), and it is recorded here rather than quietly dropped.

### 6.2 Overflow sweep **[MEASURED]**

`scrollWidth - clientWidth` and the offender list at **320 / 375 / 390 / 768 /
1024 / 1200 / 1440** in both colour schemes: **0 px everywhere**, zero
offenders, on both routes.

### 6.3 Accessibility **[MEASURED]**

axe-core (wcag2a, wcag2aa, wcag21aa, wcag22aa, best-practice) on `/integrations`:
**0 violations**, 44 passes. One rule reports **incomplete**, not pass:
`color-contrast` — axe defers white-on-gradient text in the closing stage to
manual review, exactly as it does on `/solutions` and `/features`. Treating that
as "verified" would be dishonest; it is **manual-check territory** and the
stage's three text colours are the same tokens the two shipped pages use.

Keyboard and semantics: the filters are `role="group"` toggle buttons with
`aria-pressed`; the search field has a real `<label>`, `type="search"` and a
`role="search"` wrapper; one `aria-live="polite"` region announces the filtered
count; every control clears the 44px floor (the search field is 48px). One `h1`
per page.

### 6.4 No-JS **[MEASURED]**

With JavaScript disabled at 390×844: **7 cards rendered, 7 visible, 7
descriptions visible, 7 chips, search field visible**, the closing note visible,
`document.documentElement` has no `lm-js` marker, and all five hero mask spans
compute `opacity: 1`. The raw server HTML (80,033 bytes) contains every
contiguous string the page publishes.

### 6.5 The catalog control suite **[MEASURED]**

New for this page, because it is the first marketing page with controls that do
something. Real clicks, real typing, re-read after every action:

| Check | Result |
| --- | --- |
| Seven cards at rest; count line `7 integrations · 3 external, 4 native` | pass |
| Every chip: `aria-pressed` moves to exactly it, grid narrows to that category, count line agrees with the rendered card count | pass (7 chips, `All`→7, `Chat`→1, `Docs & notes`→1, `Email`→1, `Automation`→1, `Files & exports`→2, `Sharing`→1) |
| Search `slack` → Slack; `webhook` → Signed webhooks; `zzzz` → empty state | pass |
| Empty state's Clear filters restores 7 cards and empties the input | pass |
| No card is a link, button or `role="button"`; no card has a pointer cursor | pass |
| No control on the page starts with "Connect" | pass |
| Exactly two outbound actions, both `mailto:hello@roducq.dev` | pass |
| No `<form>` on the page | pass |
| No forbidden copy (Forma, Framer, two-way sync, calendar, board, Available, Beta, Coming soon) | pass |
| No console errors | pass |

## 7. Existing tests touched, and why

Two assertions had to move. Neither is weakened; both are still exact string
comparisons.

1. `tests/components/features-page.test.ts` locked
   `const showcase = solutions || features;`. The header's showcase gate is how
   `/features` gets its white chrome, and `/integrations` needs the same gate, so
   the literal became `const showcase = solutions || features || integrations;`.
   The test now asserts the new literal **and** keeps its existing assertions that
   the `/features` predicate and the locked nav-data ternary
   (`const items = solutions ? SOLUTIONS_NAV : NAV;`, which
   `vs-comparisons.test.ts` also locks) are untouched. `/features` and
   `/solutions` render byte-identically.
2. `tests/components/forma-phase-f.test.ts` asserted 35 App Router pages. The
   page inventory is now 36 because this branch adds one page. The handler count
   is unchanged — `/integrations` adds no API route.

`scripts/verify-responsive.mjs` gained one `PAGES` fixture
(`marketing-integrations`), which the Phase-F coverage gate requires for every
page.

## 8. Files

New:

- `app/(marketing)/integrations/page.tsx`, `.../content.ts`
- `components/marketing/landing/integrations/{IntegrationsHero,IntegrationsCatalog,ConnectingSteps,RequestIntegration,IntegrationsClosingCta}.tsx`
- `tests/components/integrations-page.test.ts` (31 tests)
- `scripts/verify-integrations-page.mjs`
- `.github/workflows/forma-integrations-verify.yml` (dispatch-only)
- this document

Changed:

- `app/(marketing)/landing.css` — five page-local tokens, one comment block
- `tailwind.config.ts` — their five keys
- `components/marketing/SiteHeader.tsx` — one pathname boolean, folded into the
  existing `showcase` gate
- `tests/components/features-page.test.ts`,
  `tests/components/forma-phase-f.test.ts`, `scripts/verify-responsive.mjs` — §7
- `.github/workflows/forma-integrations-reference.yml` — the temporary
  development `push` trigger is removed; it is dispatch-only again

Untouched, deliberately: Razorpay, billing, checkout, auth, database schema,
backend APIs, `/solutions`, `/features`, `/pricing`, `/vs`, the home page.

## 9. Local gate results

| Gate | Result |
| --- | --- |
| `npm test` | **1205 pass, 0 fail** (296 suites) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | success; `/integrations` prerendered as static (○) |
| Class emission audit | 184 distinct utilities across the six files, all compile (the only non-emitting token is `group`, which is a marker class by design) |

## 10. Open questions and follow-ups

- **The reference's 1024-band hero type (45.4px) is reproduced as measured.**
  If the design system ever consolidates to the two-step scale `/solutions` and
  `/features` use, this page's middle step is the one to revisit.
- **`color-contrast` incomplete on the closing stage** (§6.3) is inherited from
  the shared stage and is a manual-review item on all three marketing pages, not
  new here.
- **No request endpoint.** When one exists, the mailto card in band 3 is the
  place to swap in a real form — the composition already matches the
  reference's.
- **Live-action links.** The cards are inert because the reference's are; if
  Settings links are wanted later, `/settings` already renders the connect
  surface, and card links would be a content-gate decision rather than a layout
  one.
- **Not merged, not deployed.** As instructed, this stops at an open pull
  request against `main`.
