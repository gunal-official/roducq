# Forma redesign — production release audit

Audit date: 2026-10-16 · Audited commit: `430865573a89a4fbc59b41fa0ada3013ad09567b` (main)
Production: https://roducq.nanexi.com · Design reference: https://forma-visuvate.framer.website/

This is a **verification audit of the shipped Forma redesign (Phases A–F)**. No redesign,
no design-system change, and no pricing claim was altered by this audit. One production
visual defect was found, fixed on a review branch, and verified — see
[Findings](#findings).

---

## 1. Release status

| Check | Result | Evidence |
| --- | --- | --- |
| PR #39 exists and is **merged** | ✅ MERGED | `gh pr view 39` → `state: MERGED`, `mergedAt: 2026-10-16T12:06:44Z`, merge commit `4308655`, base `main` ← `arena/a3dd6a33-roducq`, 685 files, +144,857 / −688 |
| `main` contains the Phase F changes | ✅ | `91a4e55` "design: finish Forma product polish and responsive QA (Phase F)" is an ancestor of `origin/main` (`4308655` is its merge commit); Phase A–E commits (`69785b3`, `763510f`, `3d22533`, `8f117d1`, `57d9369`) all present |
| Local tree matches `main` | ✅ | `git diff --stat origin/main HEAD` → empty; `origin/main` = `HEAD` = `4308655` |
| Vercel **Production** deployment Ready | ✅ (via GitHub) | Latest Production deployment `sha=4308655…`, created `2026-10-16T12:07:39Z`; deployment status `state: success` ("Deployment has completed"); commit status context `Vercel` = `success` |
| CI green on the merged commit | ✅ | Actions run `38898273941` (`verify`, branch `main`, push) = `success` (1m39s); every Phase A–F PR run also `success` |
| Production serves the latest `main` | ✅ | Deployment record pins production to `4308655…` (no later Production deployment exists), **and** the served HTML contains Phase-F-only markup: `/about` returns semantic `<h3>` card headings (Phase F replaced `CardTitle`, a `<div>`, with `<h3>`), `/` returns the Phase-F `role="img"` illustration with the label "Illustrative RoduCQ workspace with example project data; not a live account", `/pricing` renders the Phase-E/f "Pick the tool closest…" comparison hub copy, `/vs/notion` renders the Phase-F semantic comparison `<table>` with its `sr-only` caption |

**PR #39 is merged, so the audit proceeded.**

### Environment limitation (declared, not worked around blindly)

This sandbox's network egress is restricted to `github.com`, `registry.npmjs.org` and
`pypi.org`. Direct TLS to `roducq.nanexi.com` and `*.vercel.app` is blocked from the
shell, and no Vercel token is available. Consequences:

- Production HTML was read through the platform's page-fetch path, not `curl` from the sandbox.
- "Deployment Ready" is evidenced by **GitHub's deployment status API** (`state: success`)
  rather than the Vercel dashboard. A human should confirm the Vercel dashboard shows
  `Ready` for `4308655`.
- No browser automation could run **against the production origin**. All browser evidence
  in this audit was produced by running the exact deployed commit locally (same source,
  same CSS, same Next.js version) — see §7.

---

## 2. Public website

Routes inspected: `/`, `/about`, `/pricing`, `/vs`, `/vs/notion` (plus the other 8 `/vs/*`
comparison routes in the local sweep).

| Check | Result |
| --- | --- |
| Forma purple / lavender styling | ✅ tokens shipped: `--forma-purple #7c3aed`, `--forma-purple-hover #6d28d9`, `--forma-lavender #ede5f8`, background `#faf8fc`, plum `#2c1b36`, surface-raised `#f2ecf7` (`lib/design-tokens.ts`, `app/globals.css`) |
| Manrope typography | ✅ self-hosted variable woff2 via `next/font/local` (`app/layout.tsx`, 24.8 KB, `display: swap`) — **no public font CDN request**, consistent with CSP `font-src 'self'`. Font state `loaded` on every audited render; **0 non-Manrope text nodes** across 714 Phase-F renders |
| Navigation | ✅ header nav (About / Pricing / Compare), theme control, Log in, Sign up; primary CTAs `Start free`, `Compare roducq`, `See pricing`, `Talk to us` all reachable |
| Footer | ✅ rendered with "What roducq doesn't do", comparison link and contact mailto |
| Mobile menu | ✅ dialog "Explore RoduCQ": opens with Enter **and** Space, 36-cycle focus trap holds, Escape closes with focus restored to the trigger, following a link closes the dialog and navigates to `/vs` (light + dark at 320/375/768) |
| CTA buttons | ✅ ≥44×44 at every width; no hidden primary actions |
| Animated SVG elements | ✅ CSS-only (24 `@keyframes`; no `requestAnimationFrame`/`setInterval` in shared components); each drawing's base state is its final visible state, so a dropped animation costs motion, not content |
| Reduced-motion support | ✅ 15 `prefers-reduced-motion` blocks; harness asserts **0 running animations** across all 51 routes in light **and** dark, with the H1 still visible and SVGs still drawn |
| No horizontal overflow | ✅ `overflowX = 0`, 0 offending elements on every route × width × theme |
| No clipped content | ✅ 0 true cut-offs detected (scroll-overflow + `overflow:hidden` checks); see the one hero overlap in [Findings](#findings) — it is paint occlusion, not clipping, which is why the harness's cut-off detector did not flag it |
| Links | ✅ crawl of the built app: 16 internal links, **0 non-200/30x** |
| Metadata | ✅ `/` "roducq", `/about` "About — roducq", `/pricing` "Pricing — roducq", `/vs` "Comparisons — roducq", `/vs/notion` "roducq vs Notion — roducq"; favicon `/icon.svg`; `viewport-fit=cover` for safe-area insets |
| Pricing claims unmodified | ✅ no pricing/plan copy, price or claim was changed by this audit |

Minor metadata gap (LOW, documented not fixed): `/login`, `/signup`, `/onboarding` and the
404 page inherit the root title `"roducq"` instead of a route-specific title. `/about`,
`/pricing` and `/vs/*` set their own.

---

## 3. Authentication

| Check | Result | Notes |
| --- | --- | --- |
| Login page | ✅ renders | Google button, email + password, show/hide password (48px target) |
| Signup page | ✅ renders | Full name, email, password, workspace name; invite-token variant titles "Join your team" |
| Logout | ✅ present & keyboard-reachable | Account menu ("Log out" last item; `End` reaches it, `Escape` restores focus) |
| Redirect after authentication | ✅ | Unauthenticated `/dashboard` → `/login` **verified on the production host**; OAuth returns to `/auth/callback`, which exchanges the PKCE code server-side and re-validates `next` (same-site only, `//` rejected) or redirects to `/login?error=oauth` |
| Password recovery | ❌ **not implemented** | No `resetPasswordForEmail` / `updateUser` call anywhere in `app/`, `components/`, `lib/`; no "Forgot password" affordance on `/login`. The task asked to test it "where implemented" — it is not implemented, so it is reported as absent rather than as passing |
| Google sign-in | ⚠️ wired, **not executed** | The provider call exists (`lib/auth/oauth.ts` → Google → `/auth/callback`). The live handshake was **not** performed: no Supabase credentials are available in this sandbox and `*.supabase.co` is unreachable |

**Not tested, not claimed:** live Supabase sign-up → session, live login, live logout,
live Google sign-in, live invite acceptance, live password reset. `scripts/verify-auth.mjs`
exists for an operator to run with real credentials; it was **not** run here. No credentials
were requested, held, or exposed, and no throwaway user was created anywhere.

---

## 4. Authenticated application

Method: the repo's own harness boots the app against an in-process Supabase stub with rich
fixtures and renders **every** page at **every** breakpoint in real Chromium. 51 routes ×
7 widths (320/375/414/600/768/1024/1440), each in light and dark.

Coverage per area (representative routes): Dashboard (`/dashboard`, `/`), Pipeline (`/`),
Intake (`/intake`), Inbox (`/intake/inbox`), Briefs (`/briefs`, `/briefs/:id`), Proposals
(`/proposals`, `/proposals/:id`, `/proposals/:id/versions/:versionId`), Plans (`/plans`,
`/plans/:id`), Updates (`/updates`, `/updates/:id`), Invoices (`/invoices`, `/invoices/:id`),
Contracts (`/contracts`, `/contracts/:id`), Time (`/time`), Reports (`/reports`), Search
(`/search?q=…`), Settings (`/settings`), plus public share/invoice/invite token routes,
onboarding, and 7 "not found / not available" states.

| Check | Result |
| --- | --- |
| Forma styling consistent | ✅ 0 non-Manrope text nodes, 0 sub-12px text nodes, exact theme match on all 714 renders |
| Navigation works | ✅ shell (sidebar / topbar / phone tab bar / drawer) renders and traps focus correctly; drawer closes at the tablet breakpoint and returns focus to `#main` |
| Forms submit correctly | ✅ verified live in-browser where the harness drives it (the template dialog accepts typing into Title and Body; the probe deliberately saves nothing). Validation, submit and mutation paths are covered by the unit suite and the offline DB/RLS suite rather than by a browser write — no write was performed against any real backend. All inputs are labelled (axe: 0 violations) |
| Data loads | ✅ lists, detail pages, version history, report totals and search results all render from fixtures; report money rails verified to show exact values with empty buckets empty (light + dark) |
| Permissions respected | ✅ `npm run verify:db` (in-memory Postgres, RLS enforced) asserts member/viewer/stranger isolation: viewer cannot restore or insert versions, stranger sees zero rows, tamper/purge affect 0 rows, append-only `proposal_versions` has 1 SELECT + 1 INSERT and no UPDATE/DELETE policies, owner-only integration access, users cannot write `integration_connections`/`integration_imports` |
| Empty states render | ✅ dedicated **EMPTY_FIXTURES sweep (357 renders) passed** — e.g. `/briefs` shows "Requests that became documents" with 0 / 0 / 0 counts, "Total briefs 0 · All time", and an empty list state instead of a broken table |
| Light/dark switching works | ✅ theme persistence verified across all application routes in both directions; 0 theme mismatches; print media pins white background + `#261d2d` ink |
| No console errors | ✅ 0 browser errors, 0 hydration/React mismatches, 0 `pageerror` events across all 714 renders |

**No production customer records were created, read or modified.** All data above came from
the harness's local stub fixtures. No production workspace was touched and no production
data was altered.

---

## 5. Integrations — status surfaces only

| Integration | Surface | Verified | Not verified |
| --- | --- | --- | --- |
| Slack | Settings → Integrations: Connect Slack, connection row (name, "Last imported …" / "Never imported yet"), `last_error`, `needs_reauth` → "Connect again", Import now, disconnect confirm | ✅ UI renders for connected and disconnected states; OAuth routes export GET+HEAD and 302 unauthenticated callers to `/login`; missing env 302s to `/settings` with an actionable notice | ⚠️ live OAuth handshake, live import, live sync, token refresh |
| Notion | same card (`/api/notion/connect`, `/api/notion/callback` → `api.notion.com/v1/oauth/token`) | ✅ as above | ⚠️ live OAuth, live page import |
| Gmail / Outlook | Settings → Mailbox: Connect Gmail, sync now, disconnect; `gmailConfigured` gating with an explanatory notice when unset | ✅ renders both configured and unconfigured states; revoked-refresh-token → `needs_reauth` path is unit-tested | ⚠️ live mailbox connection and live sync |
| Stripe | Settings → Plan & billing; pricing page price rows | ✅ gating is honest: with `STRIPE_SECRET_KEY`/`STRIPE_PRICES` absent the UI says *"Billing isn't configured for this install yet — start free and we'll be in touch about pricing."* rather than offering a broken upgrade. **Production currently shows this state**, so paid checkout is not live in production | ⚠️ live Checkout session, billing portal, webhook delivery |

No account was connected, disconnected, or modified; no destructive request was issued.

---

## 6. PDF exports

`npm run verify:pdf` → **passed**: 14 documents, 20 pages, **0 overflow, 0 structure,
0 content findings**, determinism (byte-identical rebuild) asserted.

| Representative export | Result |
| --- | --- |
| Proposal | `proposal-sent` (1p), `proposal-empty` (1p), `proposal-many-deliverables` (2p) |
| Invoice | `invoice-sent` (1p), `invoice-paid-letter` (1p, "Zoë & Søn (Køge)"), `invoice-empty` (1p), `invoice-hostile` (injected-PDF-operator client name), `invoice-long` (4p) |
| Contract | `contract-signed` (3p), `contract-empty-draft` (1p) |
| Time | `time-log` (1p, "2 entries · through Sep 27, 2026", TODAY/THIS MONTH/ALL TIME) |
| Reports | `workspace-reports` (1p, COLLECTED $5,000.00 / OUTSTANDING $3,000.00 / DRAFT) |

Independently re-extracted the text layer of every sample: content is correct, letterhead
and "Page i of n" furniture present, no `NaN`, `undefined` or `Invalid Date`, and no
palette regression (invoice-hostile's `??` for `东京 Studio 🚀` is the documented
WinAnsi behaviour of `lib/pdf/encoding.ts` — non-encodable glyphs cost one `?` each, and
that fixture exists precisely to prove the writer survives it).

**Limitation:** no PDF rasterizer is installed in this sandbox, so samples were verified by
structural parse + text extraction + the repo's own reader, not by eye. A human should
eyeball `~/pdf-evidence/*.pdf` for typographic judgement.

---

## 7. Responsive verification

Real Chromium **153.0.8010.0** via `playwright-core` 1.63, 7 widths — 320 / 375 / 414 / 600 /
768 / 1024 / 1440 — light **and** dark, plus an empty-state sweep and a keyboard/interaction
suite. **Harness thresholds were not weakened; no file under `scripts/` was modified.**

| Sweep | Renders | Result |
| --- | --- | --- |
| Light (all routes) | 357 | ✅ passed |
| Dark (all routes) | 357 | ✅ passed |
| Empty-state fixtures | 357 | ✅ passed |
| Dialog probe (320, 768) | 2 | ✅ fits width, fits height / scrolls, `288×483@16,43` and `512×497@128,264` |
| Keyboard + axe + reduced-motion + print | 24 checks | ✅ 0 failures |
| Post-fix re-run (light, dark, interactions) | 357 + 357 + 24 checks | ✅ passed, 0 regressions |

Observed metrics: **0** horizontal overflow · **0** offending elements · **0** true
cut-offs · **0** fixed elements escaping the viewport · **0** controls under 44×44 at any
width (shortest observed control is 44×44) · **0** theme mismatches.

Sandbox note: `cdn.playwright.dev` is unreachable, so `npm run verify:responsive:setup`
cannot fetch its browser. The harness's documented `CHROMIUM_EXECUTABLE_PATH` escape hatch
was used with a Chromium 153 build obtained from the npm registry (unpacked to `/tmp`,
outside the repo). **No repository dependency or file was changed for this.**

---

## 8. Accessibility

Automated: real `axe-core` on every rendered page (tags `wcag2a, wcag2aa, wcag21aa,
wcag22aa, best-practice`) → **0 violations across 714 renders**.

Manual keyboard checks driven in Chromium (light + dark):

| Check | Result |
| --- | --- |
| Tab navigation | ✅ 36-cycle trap in the marketing menu, 48-cycle in the workspace drawer, 18-cycle in the template dialog — focus never escaped |
| Enter / Space activation | ✅ menu opens with either; dialog buttons activate |
| Escape to close | ✅ marketing menu, workspace drawer, template dialog, account menu |
| Focus restoration | ✅ to the exact trigger for all four surfaces; drawer returns focus to `#main` when the breakpoint closes it |
| Form labelling | ✅ dialog/close/nav controls have accessible names; axe `button-name`/`label` rules clean |
| Error messages | ✅ present as text (not colour alone) — e.g. integration `last_error` and notice surfaces |
| Reduced motion | ✅ 0 running animations on all 51 routes, content still visible and drawn |

Contrast: axe reports one **`color-contrast` "incomplete" (human review)** on 98 renders —
it "could not determine background because it partially overlaps other elements" for the
hero sub-paragraph, the mock's "r" mark and the closing `<h2>`. Manual computation of the
shipped tokens passes AA everywhere relevant: light 15.35:1 (body), 5.98:1 (muted),
5.70:1 (on-accent), 5.40:1 (accent); dark 17.25:1, 11.43:1, 8.11:1, 8.59:1.

**No WCAG certification is claimed.** Not performed: screen-reader passes (NVDA/JAWS/
VoiceOver), 200% zoom / reflow, forced-colors / high-contrast mode, focus-order semantics
beyond trap containment, and cognitive/content review. Axe cannot verify those.

---

## 9. Performance observations

Measured in the real-browser sweep (local production build, cold navigations):

| Signal | Observation |
| --- | --- |
| Layout shifts | **CLS max 0.0178, mean 0.0002** across 714 renders — well inside "good" |
| Console | 0 warnings/errors captured by the audit's console + page-error hooks |
| Fonts | 2 self-hosted variable woff2 (`Manrope` 24.8 KB, `Fira Code` 36.3 KB), `display: swap`, **no third-party font request**; four unused OFL-licensed runs (Playfair, Source Sans) are not referenced by any code path — dead assets, ~67 KB, safe to drop |
| Illustration/artwork | inline SVG + CSS custom properties (no raster hero, no Lottie/GIF) on the audited routes — the only `next/image` usage is the optional workspace logo in Settings. Artwork recolours with the theme, so no image-optimisation work is needed |
| Animation | CSS `transform`/`opacity` keyframes only; no JS animation loop; press feedback gated behind `prefers-reduced-motion: no-preference` |
| Script weight | ≤19 JS resources / **≤297 KB encoded** per page under `next dev`; the production build is minified, so this is an upper bound, not the shipped figure |
| Security headers (production config) | HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, CSP `default-src 'self'` with `connect-src` limited to Supabase — verified on the production build locally |
| Dependencies | **none added** by this audit (`package.json` unchanged) |

Not measured: field/real-user metrics (LCP, INP, TTFB), Vercel edge cache behaviour,
bundle analysis of the production build, and third-party impact. No performance
optimisation was performed and none is claimed.

---

## 10. Verification gates

All gates were run twice: once at the deployed commit `4308655` (pre-fix) and once after the
fix on this branch. Both runs: **all green**.

| Gate | Pre-fix (`4308655` = production) | Post-fix |
| --- | --- | --- |
| `npm test` | ✅ 831 tests, 214 suites, 831 pass / 0 fail | ✅ 831 pass / 0 fail |
| `npm run lint` | ✅ clean (no output) | ✅ clean |
| `npx tsc --noEmit` | ✅ clean | ✅ clean |
| `npm run build` | ✅ success (Next.js 16.3.6) | ✅ success |
| `npm run verify:db` | ✅ "All database checks passed" | ✅ passed |
| `npm run verify:pdf` | ✅ 14 docs / 20 pages / 0 findings | ✅ passed |
| `npm run verify:responsive` | ✅ light + dark + empty + interactions | ✅ light + dark + interactions |

Node 22.22.3 · npm 10.9.8. `npm run verify:live` (production Supabase schema/policies) was
**not** run — it requires operator credentials and `*.supabase.co` access, and it is
deliberately excluded from CI. It remains a manual pre-deploy step.

---

## Findings

### F1 — MEDIUM · Hero illustration callout obscures content (production, fixed on review branch)

**Affected route:** `/` (marketing home), hero product mock.
**Affected widths:** all ≥ 640px (verified at 640, 768, 900, 1024, 1280, 1440). Hidden
below `sm`, so phones are unaffected.
**Also affects:** dark theme identically (same geometry, same tokens).

Reproduction:
1. Open https://roducq.nanexi.com/ at ≥ 768px wide.
2. Look at the "Next up / Delivery plan" card in the hero mock.
3. The floating "Nothing gets lost" callout paints over its last row.

Measured: the `2 of 4 complete` row (with its check icon) is overlapped
**85 × 8 px = 50 % of the row's height** at every tested width ≥ 640px. Before/after renders
with the callout toggled prove the row is fully painted underneath (the callout's
`bg-card` is opaque) — i.e. **occlusion, not clipping**, which is why the harness's
cut-off detector does not catch it.

Root cause: the callout is `absolute -bottom-5`, i.e. it intentionally overlaps the card's
bottom edge, but the card's right column had no bottom padding, so the overlap lands on
authored content.

Fix (this branch, `app/(marketing)/page.tsx`): add `sm:pb-12` to the mock's content column
so the callout overlaps only the illustration's plane, and raise the callout to `z-10` so
its stacking is explicit rather than paint-order-dependent — 2 class-token changes, no
design-system, copy, or pricing change.

Verified after fix: 0 occluded text nodes at 640/768/900/1024/1280/1440; light and dark
full sweeps re-run green; `marketing-home` Phase-F metrics identical before vs after
(axe 0, exactly 1 H1, CLS 0, 0 failures); `npm test` / `lint` / `tsc` / `build` re-run green.

**Open question for the reviewer:** whether the fix belongs in the product mock at all —
deliberately bleeding a decorative callout over artwork is a legitimate Forma-style choice,
so "reserve space" and "re-anchor the callout to clear the row" are both defensible.

### F2 — LOW · Auth routes inherit the generic document title

`/login`, `/signup`, `/onboarding` and the 404 page all title as `"roducq"` rather than
something route-specific, while `/about`, `/pricing` and `/vs/*` set their own titles.
Affects tab clarity, history entries and link previews. Not fixed here (metadata-only,
outside the audit's remit, and not a regression from the redesign).

### F3 — INFO · Password recovery is not implemented

No reset flow exists in the codebase and `/login` offers no "Forgot password" affordance.
Reported as absent rather than as a failing test; the task scoped this check to "where
implemented".

### F4 — INFO · Production billing is not configured

Stripe is absent in the production environment, so `/pricing` shows the
"Billing isn't configured for this install yet…" note and Settings offers no paid upgrade.
This is **honest gating, not a defect** — the UI does not offer an upgrade it cannot
fulfil — but it means paid checkout is not live in production today.

### F5 — INFO · Unused font assets in the repo (~66 KB)

`playfair-display-latin-wght-normal.woff2` (38.4 KB) and
`source-sans-3-latin-wght-normal.woff2` (28.7 KB) ship in `app/fonts/` with their OFL
licence texts, but no code path references them. No runtime cost — Next only emits fonts
that are actually loaded, and the build output contains only Manrope and Fira Code — but
they are dead weight in the tree.

---

## Remaining risks

1. **Deployment status is second-hand.** "Ready" comes from GitHub's deployment API, not the
   Vercel dashboard, because Vercel is unreachable from this sandbox. Confirm visually.
2. **No live production browser pass.** Browser evidence comes from the identical commit
   rendered locally. A production run could still differ through environment-specific
   data, CDN behaviour or an env var (e.g. `STRIPE_PRICES`) that changes rendering.
3. **Live integrations unproven.** Slack, Notion, Gmail/Outlook and Stripe status surfaces
   render correctly, but no live OAuth, import, sync, checkout or webhook delivery was
   executed. Do not treat the integration UI as proof that the integrations work.
4. **Live auth unproven.** Sign-in, sign-up, logout, Google OAuth and invites were not
   executed against real Supabase. Run `node scripts/verify-auth.mjs` and
   `npm run verify:live` with operator credentials before declaring the release airtight.
5. **F1's fix is unreviewed and undeployed.** Production still shows the occlusion until the
   review PR merges and Vercel redeploys.
6. **`verify:live` not run** — the production schema/policy probe is the only gate that
   inspects the real database, and it stays a manual step by design.

## Verdict

The Forma redesign (Phases A–F) **is merged, deployed, and serving main at `4308655`**.
Across 51 routes × 7 breakpoints × 2 themes — plus empty-state, keyboard, reduced-motion
and print sweeps — the product passes every offline gate with **0 axe violations, 0
overflow, 0 clipped content, 0 console errors and CLS ≤ 0.018**. PDF exports and the
offline database/RLS suite pass.

One real production defect was found on the marketing home hero (**F1**), fixed on the
review branch `arena/f4c9a9d1-roducq` and verified; it needs review and a deploy to reach
production. Live authentication, live integrations and paid billing remain **unverified**
and are explicitly not claimed.

Evidence artefacts: `~/responsive-evidence/{final-light,final-dark,empty-states,interactions,fix-light,fix-dark}/`
(screenshots, `summary-*.json`, `phase-f-quality.json`, `phase-f-interactions.json`) and
`~/pdf-evidence/*.pdf`. No secrets and no customer data are contained in this document or
those artefacts.
