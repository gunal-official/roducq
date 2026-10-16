# Forma Phase F — complete-product polish and responsive QA

2026-10-16 · Next.js App Router / npm / Vercel.

**Implementation and automated browser QA complete; review-only delivery.**
All seven required gates pass. The 91 original responsive findings are fixed;
the expanded light/dark suite and below-fold probes have zero findings.
Reference-site visual parity, WCAG certification and live integration QA are
**not** claimed. Human release checks remain explicit in §8.

## 1. Safety gate and scope

| Check before implementation | Evidence |
| --- | --- |
| Phase E prerequisite | PR [#38](https://github.com/gunal-official/roducq/pull/38) **MERGED**, `2026-10-16T10:27:02Z` |
| Latest-main base | `origin/main` fetched; `8d1e2e99017fc048144e12f35bc5532542b6e6ed`, with Phase E actually present |
| Working branch | Arena-pinned `arena/a3dd6a33-roducq`, initially clean and identical to that main commit; no branch switch |
| Push permission | Dry-run push succeeded before editing |
| Prior phases | Read A inventory, B shell, C/D/E closeouts; inspected source, tokens, routes, shell and tests |
| Baseline | 798 tests / 209 suites; lint, TypeScript, production build, DB and PDF gates passed; real Chromium reproduced **91 failing light-mode page×width records / 273** |
| Reference | Text could be inspected, but real Chromium at 375/768/1440 returned `net::ERR_CONNECTION_CLOSED`; direct production/reference TLS access also failed |

Reference URL: <https://forma-visuvate.framer.website/>. Its text describes a
workspace preview, features, setup, integrations, team use cases, pricing and
FAQ. That informed the general calm workspace direction, **not a visually
verified palette/geometry/timing comparison**. No proprietary code or assets
were copied. The work uses RoduCQ's own components and original SVG language.

This is the finishing pass on the **whole existing product**, not a new
product or a marketing-only recolor. No forgot/reset-password/legal pages or
new application features have been invented. The existing Next global 404
has a coherent replacement; it is an error surface, not a new route feature.

## 2. Actual route checklist

Source inventory: **31 `page.tsx` files and 15 `route.ts` handlers**. The harness
walks `app/` and fails if any page pattern lacks a fixture. `/` has both its
anonymous marketing view and authenticated dashboard rewrite; `/dashboard`
is also tested directly. Nine actual comparison slugs are expanded:
`notion`, `bonsai`, `honeybook`, `dubsado`, `17hats`, `freshbooks`, `clickup`,
`basecamp`, `pandadoc`.

| Route pattern | Actual source | Scope |
| --- | --- | --- |
| `/briefs/[id]` | `app/(app)/briefs/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/briefs` | `app/(app)/briefs/page.tsx` | Verified: 7 widths × 2 themes |
| `/contracts/[id]` | `app/(app)/contracts/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/contracts` | `app/(app)/contracts/page.tsx` | Verified: 7 widths × 2 themes |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Verified: 7 widths × 2 themes |
| `/intake/inbox` | `app/(app)/intake/inbox/page.tsx` | Verified: 7 widths × 2 themes |
| `/intake` | `app/(app)/intake/page.tsx` | Verified: 7 widths × 2 themes |
| `/invoices/[id]` | `app/(app)/invoices/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/invoices` | `app/(app)/invoices/page.tsx` | Verified: 7 widths × 2 themes |
| `/plans/[id]` | `app/(app)/plans/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/plans` | `app/(app)/plans/page.tsx` | Verified: 7 widths × 2 themes |
| `/proposals/[id]` | `app/(app)/proposals/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/proposals/[id]/versions/[versionId]` | `app/(app)/proposals/[id]/versions/[versionId]/page.tsx` | Verified: 7 widths × 2 themes |
| `/proposals` | `app/(app)/proposals/page.tsx` | Verified: 7 widths × 2 themes |
| `/reports` | `app/(app)/reports/page.tsx` | Verified: 7 widths × 2 themes |
| `/search` | `app/(app)/search/page.tsx` | Verified: 7 widths × 2 themes |
| `/settings` | `app/(app)/settings/page.tsx` | Verified: 7 widths × 2 themes |
| `/time` | `app/(app)/time/page.tsx` | Verified: 7 widths × 2 themes |
| `/updates/[id]` | `app/(app)/updates/[id]/page.tsx` | Verified: 7 widths × 2 themes |
| `/updates` | `app/(app)/updates/page.tsx` | Verified: 7 widths × 2 themes |
| `/login` | `app/(auth)/login/page.tsx` | Verified: 7 widths × 2 themes |
| `/onboarding` | `app/(auth)/onboarding/page.tsx` | Verified: 7 widths × 2 themes |
| `/signup` | `app/(auth)/signup/page.tsx` | Verified: 7 widths × 2 themes |
| `/about` | `app/(marketing)/about/page.tsx` | Verified: 7 widths × 2 themes |
| `/` | `app/(marketing)/page.tsx` | Verified: 7 widths × 2 themes |
| `/pricing` | `app/(marketing)/pricing/page.tsx` | Verified: 7 widths × 2 themes |
| `/vs/[slug]` | `app/(marketing)/vs/[slug]/page.tsx` | Verified: 7 widths × 2 themes |
| `/vs` | `app/(marketing)/vs/page.tsx` | Verified: 7 widths × 2 themes |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | Verified: 7 widths × 2 themes |
| `/invoice/[token]` | `app/invoice/[token]/page.tsx` | Verified: 7 widths × 2 themes |
| `/share/[token]` | `app/share/[token]/page.tsx` | Verified: 7 widths × 2 themes |

For token pages, both unavailable-link probes and **valid UUID-backed public
invoice/update/invite fixtures** are retained. Earlier `tok-*` probes return
unavailable UI before their RPC; they were not proof of the actual public
documents. The valid fixture content is now explicitly asserted. Onboarding
also asserts successful browser `getUser`, an enabled workspace form, and
that it remains on `/onboarding`; no workspace is created for evidence.

Additional states: global 404 and all seven detail/version unavailable
screens. Altogether **51 fixtures** retain the original 39 and add 12, with no
page removed. Source-reviewed app loading/error/fatal boundaries are listed
in §8 separately from browser-rendered route fixtures.

### Operational routes — inventoried, not redesigned as UI

| Route pattern | Actual source | Scope |
| --- | --- | --- |
| `/api/cron/email` | `app/api/cron/email/route.ts` | Source inventoried; behavior unchanged |
| `/api/cron/webhooks` | `app/api/cron/webhooks/route.ts` | Source inventoried; behavior unchanged |
| `/api/email/callback` | `app/api/email/callback/route.ts` | Source inventoried; behavior unchanged |
| `/api/email/connect` | `app/api/email/connect/route.ts` | Source inventoried; behavior unchanged |
| `/api/intake/extract` | `app/api/intake/extract/route.ts` | Source inventoried; behavior unchanged |
| `/api/notion/callback` | `app/api/notion/callback/route.ts` | Source inventoried; behavior unchanged |
| `/api/notion/connect` | `app/api/notion/connect/route.ts` | Source inventoried; behavior unchanged |
| `/api/pdf/[kind]/[id]` | `app/api/pdf/[kind]/[id]/route.ts` | Source inventoried; behavior unchanged |
| `/api/pdf/reports` | `app/api/pdf/reports/route.ts` | Source inventoried; behavior unchanged |
| `/api/pdf/shared/invoice/[token]` | `app/api/pdf/shared/invoice/[token]/route.ts` | Source inventoried; behavior unchanged |
| `/api/pdf/time` | `app/api/pdf/time/route.ts` | Source inventoried; behavior unchanged |
| `/api/slack/callback` | `app/api/slack/callback/route.ts` | Source inventoried; behavior unchanged |
| `/api/slack/connect` | `app/api/slack/connect/route.ts` | Source inventoried; behavior unchanged |
| `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts` | Source inventoried; behavior unchanged |
| `/auth/callback` | `app/auth/callback/route.ts` | Source inventoried; behavior unchanged |

Auth callback, cron, integration connect/callback, extraction, Stripe and PDF
handlers keep their behavior. No server action, Supabase/database schema,
permission, financial calculation, integration implementation or production
security policy was changed. PDF output still uses the canonical TS tokens.

## 3. Before → after and root fixes

| Finding before | Root fix | Final evidence |
| --- | --- | --- |
| 91/273 failing records: all 13 marketing URLs at seven widths | Shared header becomes a proper modal menu below 1024; desktop row has room; footer/theme controls reach 44px | 0/714 expanded light+dark records; same original 273 records now clean |
| 320px header overflow 30px; About/Pricing/Login controls only 39/43/37px wide | Responsive composition, not smaller text or overflow hiding | 0/714 expanded light+dark records; same original 273 records now clean |
| Home glow layers counted outside viewport; narrow preview copy compressed | Clip **only** separate, pointer-inert, `aria-hidden` decoration; preview stacks on phones with readable text | 0/714 expanded light+dark records; same original 273 records now clean |
| Comparison content cut off (Dubsado 320: scroll 284 / client 278) | Semantic captioned table, scoped headers, wrapping cells, visible responsive header/body grids | 0/714 expanded light+dark records; same original 273 records now clean |
| Unnamed auth/invite landmarks and brief status select | Real main landmarks and independently named status selectors; alerts and associated template labels | 0 violations; incomplete contrast ledger retained (§8) |
| Light lavender secondary text failed contrast (e.g. 4.25:1) | Darker shared secondary-text mixture; active product accents resolve to the canonical brand; separate control boundaries | 0 violations; incomplete contrast ledger retained (§8) |
| More drawer not a complete modal focus model; account menu incomplete keyboard support | Radix drawer, actual-invoker refs, breakpoint close/focus fallback; menu arrows/Home/End/typeahead/Escape/Tab | All 24 interaction groups pass; Escape/trap/return/resize/menu proof saved |
| Below-fold team names squeezed into vertical letters; 320px remove action unreachable | Wrapping identity/actions rows, readable names/invite addresses, stacked phone invite form; added unchanged-metric scroll-through probes | 0/2,270 populated scroll samples; team confirm/removal probes pass at 320/768 |
| Report money rails imposed a 2% / 8px minimum, including zero buckets | Presentation-only exact proportional geometry, visible monetary legend; zero/small/nonfinite tests and browser zero-width assertions | Rendered rails [0, 276, 0] in both themes; 5 geometry edge-case tests pass |
| Small document metadata, tight title/stat rows, mixed page/portal surfaces | 12px meaningful metadata, native workflow legend, flexible doc header/stats, shared paper/card/menu/dialog treatment | 306 unaltered viewport PNGs + 204 labelled full supplements |
| Decorative orbits/flow repeated indefinitely; timing values diverged | One-time original SVG arrivals; shared 150/250/450ms vocabulary; fully visible base content; global reduced-motion guard | All 51 fixtures × both themes have no running animation under reduced motion; actual-speed exit/row probes pass |
| Standalone missing-document/error screens had no H1; default 404 disconnected visually | Optional semantic EmptyState heading, preserved default for embedded states; coherent existing global 404 | All seven unavailable details + 404 pass geometry/semantics in both themes |

A development iteration found that a 1px hidden mobile table header still
clipped real text. It was replaced by a **visible** header grid, not excluded.
Another found duplicate search landmarks; the topbar and page search now have
distinct names. All original geometry measurements and the 43.5px rounding
allowance for 44px targets remain unchanged. The same metrics now also run at overlapping positions in every real
vertical scroll container (including the app main and sidebar), restoring the
original position before screenshots. This exposed and fixed the team-row
issue that an initial-viewport-only scan missed. A legacy unscoped navigation
selector was scoped to the **visible modal** after the drawer became portalled;
its original destination and geometry assertions were retained. The baseline/current metrics
function is byte-identical (SHA-256
`fa4dcdfa9960184f5c651b47ae6125c7294bdf8063b9c50c1d857c1c4e18714c`).

## 4. What changed across the product

- **Marketing:** shared branded navigation/appearance controls; modal phone
  and tablet menu, current-destination labels, readable preview; About and
  comparison hub use the same original client-work SVG vocabulary as the app.
  All nine comparison pages preserve every row and use accessible tables.
- **App shell/auth:** drawer focus containment and correct trigger return,
  safe areas, resize closure, menu-button keyboard behavior, larger controls,
  main/heading/search landmarks. Authentication, workspace selection and
  navigation destinations remain intact.
- **Daily workflow/settings:** readable metadata and unified controls;
  wrapping team identities/actions and invite addresses, stacked phone form;
  associated unique template field labels, alert errors, calmer shared card
  treatment. Existing forms, imports, branding, members and settings behavior
  are preserved.
- **Briefs/proposals/versions/plans/updates:** shared wrapping document title,
  metadata/stat and paper vocabulary, labelled status selectors, meaningful
  native workflow legend. Version restore, task/composer and sharing behavior
  are not rewritten.
- **Invoices/contracts/time/reports/search:** same refinements on financial
  documents and controls; status colors and textual chart/number alternatives
  remain meaningful. Chart geometry no longer invents a minimum positive share
  for zero/small buckets; money totals and formatters are unchanged. Print markup, exports and all financial logic stay put.
- **Error/loading:** named loading status, semantic standalone unavailable and
  app error headings; fatal-boundary main/H1 and 44px retry; existing 404 styled
  coherently. Sentry hooks retained.

The current design rules are [documented here](forma-design-system.md), with
README and Phase A's forward checklist updated to point at this closeout.

## 5. SVG and motion review

- Original `RoduMark`, `WorkflowArt`, `ClientWorkArt`, `FinancialArt`,
  `AuthArtwork`; no reference asset downloads or new animation dependency.
- 150ms feedback; 250ms drawer/dialog/route/row transitions; 450ms expressive
  stroke/connection arrivals. Legacy duration aliases use those same tokens.
- No entrance `both`/`forwards` fill-mode trapping. Final static content and
  strokes are visible without animation; exit fill lasts only until removal.
- Decorative flow/drift/rings stop. Loading shimmer/spinners remain only for
  real pending work. No animated money values, fake live status or progress.
  The marketing workspace is explicitly labelled as illustrative.
- Reduced motion disables animation, transitions and smooth scroll across
  all pages, portals and pseudo-elements. Native 12px stage labels replace
  tiny SVG labels; artwork is understandable without movement.
- Existing `RUN_MOTION` frame capture intentionally slows selected animations
  **for capture only**; its actual-speed sampling is separate. Such slowed
  frames must not be presented as the product's real timing.

## 6. Final verification

| Gate | Final result |
| --- | --- |
| `npm test` | **831 passed**, 214 suites, 0 failures/skips (28 new Phase F contracts + 5 geometry cases; prior suites retained) |
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed (`npx tsc --noEmit` executed exactly on the final source) |
| `npm run build` | Passed, Next 16.3.6 production build |
| `npm run verify:db` | Passed, including RLS, role and proposal-version isolation checks |
| `npm run verify:pdf` | **14 documents / 20 pages**, 0 overflow/structure/content findings |
| `npm run verify:responsive` — light | Exit 0: **357 records + 1,135 scroll samples**, 0 findings; legacy dialog/interact/motion probes also pass |
| `npm run verify:responsive` — dark | Exit 0: **357 records + 1,135 scroll samples**, 0 findings |
| Additional empty-state sweep (light) | Exit 0: **204 records + 630 scroll samples**, 0 findings at 320/375/768/1440 |
| Axe / semantic / font / browser-error probes | **0 axe violations** in 204 populated-page + 102 empty-state scans; semantic/font/content/status/browser-error checks clean on all 918 records; incomplete contrast nodes retained |
| Keyboard / themes / reduced motion / print interactions | **24/24 groups pass**, including 16 modal/menu axe scans; separate onboarding persisted-theme/OS/reload check also passes |

After the complete sweeps, the **QA-only** redirect-forwarding guard and
integrated onboarding preference probe were rerun in a real browser at
375/1440: **102 records + 309 scroll samples**, zero findings, all 24
interaction groups passing. The integrated onboarding check proves stored
light/dark/system, enabled auth form, OS change and reload. This extra smoke
run does not replace or inflate the 714-record seven-width score. Its raw
[quality](screenshots/forma-phase-f/evidence/quality-guard-smoke.json),
[interactions](screenshots/forma-phase-f/evidence/interactions-guard-smoke.json)
and [exit log](screenshots/forma-phase-f/evidence/responsive-guard-smoke.log)
are retained. Full tests/lint/TypeScript also passed after the guard change;
no product code changed after the complete sweeps.

### Per-width proof

The baseline was the original **39 light-mode fixtures / 273 viewport records**;
those same records are now clean. The final suite expands to 51 fixtures and
runs both themes. Scroll measurements are additive, not a changed threshold.

| Width | Light records / failures | Light scroll samples | Dark records / failures | Dark scroll samples |
| --- | --- | --- | --- | --- |
| 320 | 51 / 0 | 306 | 51 / 0 | 306 |
| 375 | 51 / 0 | 212 | 51 / 0 | 212 |
| 414 | 51 / 0 | 178 | 51 / 0 | 178 |
| 600 | 51 / 0 | 145 | 51 / 0 | 145 |
| 768 | 51 / 0 | 79 | 51 / 0 | 79 |
| 1024 | 51 / 0 | 118 | 51 / 0 | 118 |
| 1440 | 51 / 0 | 97 | 51 / 0 | 97 |

### Reproduction

Use an installed real Chromium (`npm run verify:responsive:setup`) or the
`CHROMIUM_EXECUTABLE_PATH` override. In this restricted Linux environment,
Chromium 153.0.8010.0 was extracted from the npm `@sparticuz/chromium` Brotli
bundle with its shared libraries. Binary/libraries remain outside Git. This
is a real browser, not simulated geometry.

```sh
# Normal browser installation: omit these two environment overrides.
export CHROMIUM_EXECUTABLE_PATH=/path/to/chromium
export LD_LIBRARY_PATH=/path/to/chromium-libraries

PHASE_F=1 PHASE_F_INTERACTIONS=1 \
  RUN_DIALOG=1 RUN_INTERACT=1 RUN_MOTION=1 \
  SHOTS_DIR=/tmp/forma-f-light \
  PHASE_F_SHOTS_DIR="$PWD/docs/screenshots/forma-phase-f" \
  npm run verify:responsive

DARK=1 PHASE_F=1 \
  SHOTS_DIR=/tmp/forma-f-dark \
  PHASE_F_SHOTS_DIR="$PWD/docs/screenshots/forma-phase-f" \
  npm run verify:responsive

# Additional empty-state run; use a distinct ignored dist/stub port if parallel.
EMPTY_FIXTURES=1 PHASE_F=1 WIDTHS=320,375,768,1440 \
  SHOTS_DIR=/tmp/forma-f-empty npm run verify:responsive
```

Do not set `WIDTHS` for the final sweep: it measures
**320 / 375 / 414 / 600 / 768 / 1024 / 1440**. Axe runs at 375 and 1440 in each
screen theme; initial-viewport and scroll-through geometry, semantics, meaningful text size/font, expected content,
HTTP status, redirect and browser-error checks run at every width. The old Phase E assertion that required an 8px floor was replaced with a
**stronger** exact-component-helper contract, zero/tiny/nonfinite behavioral
cases, and browser-rendered `[0, 276, 0]` rail assertions. No test is disabled,
no route removed, and no geometry/contrast/target threshold relaxed. Incomplete
axe rules are retained for review; they are **not** counted as passes.

### Fixture honesty and security

The test harness serves only synthetic seeded data against a local Supabase
stub. Production CSP does not permit that loopback service, and Chromium 153
requires Local Network Access permission between loopback ports. The helper
asserts both hosts are `127.0.0.1`, appends **only that exact stub origin** to
the local document response's `connect-src`, grants that normal permission to
the local fixture app origin, and gives the stub matching CORS/OPTIONS.
No `bypassCSP`, disabled browser security, production-header change, auth
short-circuit or permanently pending auth request is used. The local document
adapter forwards redirects without following them server-side (`maxRedirects: 0`);
its contract is tested so an auth redirect cannot be fulfilled as a false 200. Legacy onboarding
capture modes were corrected too. Expected 404 document network messages are
recorded as expected HTTP errors; JS/hydration/other console errors still fail.

## 7. Evidence and performance

Primary evidence: [screenshots and evidence index](screenshots/forma-phase-f/README.md).
All original viewport PNGs are real, **unaltered rendered captures** at
375/768/1440, light and dark. Supplemental `*-full.jpg` files at 375/1440
flatten the app's internally scrolling `<main>` and remove fixed app chrome
**after** metrics and the viewport PNG, solely to show below-fold content.
They are labelled as supplemental, not ordinary viewport screenshots or
measurement proof. Public full-page images need no shell flattening.

Synthetic names (Atelier North / Harbor Lane), IDs and documents are fixtures,
not customer data. No live secrets, transactions or external sends are used.

### Measured build observations

| Observation | Before | After |
| --- | --- | --- |
| All emitted static JS, uncompressed (not a per-route initial payload) | 1,507,148 bytes / 49 files | 1,537,074 bytes / 52 files |
| Delta | — | **+29,926 bytes / +1.99%** |
| Manrope variable WOFF2 | 24,836 bytes | 24,836 bytes |
| Fira Code variable WOFF2 | 36,276 bytes | 36,276 bytes |
| Added production dependency | — | None; axe-core is dev-only |

Both size measurements use `npm run build` in the same unconfigured environment,
rather than comparing fixture and non-fixture builds. This modest JS increase includes proper
modal navigation and the custom error surface; it is not a claim of a speedup.
There is no runtime animation package. Inline artwork stays lightweight
(~26KB total TSX source across the four main artwork modules, not a transfer
size or unique per-page payload). Font loading remains local with `swap`.

Browser quality reports record **10–19 script resources** and
**156,951–297,227 encoded script bytes** per sampled page. The maximum observed
CLS was **0.0177841** (signup, 1024px); smaller shifts occurred mainly on the
404. This is **not zero CLS**, and there is no baseline CLS comparison.
These observations use a local production server and shared/warm browser
context, not throttled low-end hardware. **No Lighthouse, Core Web Vitals/INP/LCP or field-performance score
is asserted.**

## 8. Accessibility review and honest limits

The target is WCAG 2.2 AA; automated and agent-driven checks are not a
certification. Final evidence distinguishes:

| Area | Verification and limit |
| --- | --- |
| Headings/landmarks/labels | Automated DOM and axe per route; source review for loading/app error/fatal boundaries; unknown comparison slug also spot-checked in Chromium |
| Keyboard/focus | Real-browser scripted Tab/Shift+Tab, modal containment, both invokers, Escape, breakpoint focus fallback; menu arrows/Home/End/typeahead/Tab; not human screen-reader testing |
| Contrast/targets | Axe text contrast plus unchanged 44px geometry; sampled actual input surfaces/borders inspected; non-text/chart/forced-color perceptual review remains a human check |
| Theme | Explicit UI light/dark/system selection across all 28 app/detailed-state fixtures; persistence/reload/OS change checks. Fresh-user onboarding separately verifies all three persisted preferences, enabled auth form, OS dark change and reload. No reported JS/hydration errors |
| Reduced motion | All route fixtures in both themes: no running animations, visible H1/base content; selected static artwork screenshots |
| Print/PDF | Existing PDF audit plus public invoice/update Chromium print white/plum checks; not a physical printer or all print-driver/font combinations |
| Error/loading | All seven unavailable detail screens and 404 rendered; loading, recoverable app boundary and fatal root boundary source/contract reviewed, not production crashes deliberately induced |
| Live behavior | Synthetic fixtures and existing unit/DB gates; no real Supabase tenant, hosted Stripe purchase, SSO, Slack/Notion/Gmail callback, outbound email or production Vercel browser session |
| Agent visual review | Representative real captures inspected: mobile marketing home/comparison, public invoice, Pipeline, invoice/version details, settings full content in both themes, tablet reports/comparison, desktop Pipeline/report/auth, and focused template modal. This is not a claim that a human manually inspected every pixel of all 306 PNGs |
| Reference comparison | Reference visual access blocked at all three requested widths; no visual parity claim |

Axe left **104 color-contrast node occurrences per populated scheme** and
104 in the empty run. They are repeated brand/sidebar/auth gradients, overlapping
background/decoration and short-text cases, retained with exact selectors and
reasons in `evidence/axe-incomplete-review.json`. Modal/menu scan details are
retained too. Representative surfaces/gradients were visually inspected, but
**these unresolved automated checks have not been relabelled as passes**.

Remaining human release checks: VoiceOver/NVDA/TalkBack announcement order,
real touch/zoom/virtual keyboards, forced-colors/high-contrast rendering,
non-text/chart perception, actual screen/print devices, live integration
smoke tests and a visual reference comparison when reachable. Preserve axe
`incomplete` nodes for that review; do not relabel them as automatic passes.

`npm audit` reports the same pre-existing **13 vulnerabilities (10 high,
3 moderate)**. No unrelated forced/downgrading dependency fix was attempted.
The PDF Node module-format warning is also pre-existing; it does not change
its passing audit result.

## 9. Delivery

Review-only delivery from `arena/a3dd6a33-roducq`, with the exact title
**design: Forma complete-product polish and responsive QA — Phase F**.
The final handoff supplies the commit and PR URL. No merge is authorized;
stop after opening the PR. All test logs, raw metrics/quality records,
reference errors, before screenshots and image hashes are committed alongside
this document. Stored console logs normalize terminal line endings/trailing
whitespace only; raw quality/metrics JSON and image bytes remain unchanged.
Environment binaries and scratch builds are not committed.
