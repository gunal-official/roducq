# Forma pricing reference and Roducq content audit

**Audit date:** 2026-10-27 (UTC)<br>
**Status:** the owner approved implementation of the three-card Forma-style `/pricing` redesign using the corrected matrix, exact FAQ and CTA destinations in `docs/FORMA_PRICING_CONTENT_REVIEW.md`. The repository transcription remains provisional; protected billing, authentication and database systems remain out of scope.<br>
**Reference:** <https://forma-visuvate.framer.website/pricing><br>
**Baseline:** `arena/8b61b041-roducq`, commit `6136204566c044e592ca91e91478e12b8dd23cea`

## 1. Evidence and limitations

1. GitHub reports [PR #67](https://github.com/gunal-official/roducq/pull/67) **merged** at `6136204566c044e592ca91e91478e12b8dd23cea`; that is this branch's starting commit. The worktree was clean before this audit. The GitHub compare API reports the baseline is ahead of the [PR #53](https://github.com/gunal-official/roducq/pull/53) merge commit, with zero commits behind it. The local checkout itself is shallow.
2. The reference URL's **text** was retrieved through the page-fetch tool on 2026-10-27. It confirms a pricing hero, a monthly/yearly control, four reference plan cards, a full comparison section, an organization CTA, a billing FAQ, and a closing CTA, in that order. Text extraction does **not** establish computed styles, element dimensions, visible color, or running animation.
3. A real Chromium 153.0.8010.0 navigation to the reference failed with `net::ERR_CONNECTION_CLOSED`; a direct `curl` request also failed. The sandbox's network allowlist prevents direct access to the Framer host. **There are no new live-browser reference measurements or viewport-specific captures at any of the seven requested widths.**
4. The user supplied the Forma pricing-page screenshot on 2026-10-27: `docs/screenshots/forma-pricing-audit/reference-user-provided.png` (2,880 × 11,762 image pixels; SHA-256 `fedbfa1cef98c5de77bcdb12437fcf2900e2991b58f410aff3472cace38c1841`). It is the primary visual reference. Its CSS viewport, device-pixel ratio, timing, and capture conditions are not known, so image-pixel coordinates are not represented as browser-computed CSS measurements. It is one static, light-theme, wide-screen image; mobile, interaction, and motion remain unverified. The checked-in images under `docs/screenshots/forma-final/reference/` are separate historical captures of the **Forma homepage**, not this pricing page.
5. On 2026-10-27, the user uploaded `pricing-page.pdf` (4,871,602 bytes; SHA-256 `8a9c325de38fbe35bf97c074a4f68830d00798a4a4d8ecd801d3ee184f370a32`). It has four image-only pages with no extractable text. All four pages were rendered and inspected: they reproduce the **Forma pricing-page visual reference**, not a Roducq Starter/Team/Studio feature specification. It is useful as visual evidence, but contains no authoritative Roducq feature matrix. No Forma plan benefits or prices will be imported. The user-provided file is preserved outside the repository at `/home/user/roducq-user-inputs/pricing-page.pdf`, not added to the branch.
6. PR #52 and `docs/RODUCQ_PRICING_PAGE.md` describe the current tier data as a transcription of a Roducq pricing PDF; `app/(marketing)/pricing/plans.ts` names it `roducq_pricing.pdf`. The underlying Roducq PDF has not been supplied, so the transcription cannot be independently checked. The user subsequently authorized the repository transcription **as a provisional source**; this is not independent verification of the original PDF or of runtime entitlements. The prices and seats in §5 are explicitly reconfirmed by the user.
7. `docs/pricing-offer.md` discusses an older Stripe integration and is not authoritative for the current Razorpay code. Current implementation and `docs/PRODUCTION_READINESS_AUDIT.md` take precedence for implementation status; neither establishes an owner-approved commercial feature matrix.

## 2. Reference observations: measured evidence versus estimates

### 2.1 Direct observations from this audit

The live pricing-page text extraction establishes the section order listed above. The user-supplied screenshot additionally shows the wide-screen composition: a centered eyebrow, two-tone hero and short description; four reference cards with a full-width featured badge and purple outline; a four-plan comparison grid with pale category bands and a lightly tinted featured column; a purple organization banner; a two-column billing FAQ; a large purple closing CTA with a product mockup; and a multi-column footer with an oversized pale wordmark. Roducq will retain three white cards with Team in the middle, use only Roducq content, and omit the screenshot's active annual selector, per the user's explicit instructions. Static pixels do not establish hover states, disclosure animation, sticky behavior, or mobile/dark-theme behavior.

#### Measurements in the supplied screenshot only

The following measurements were made from the **2,880 × 11,762 PNG**, not from a browser. Coordinates are image pixels with origin at the upper left. The CSS viewport and device-pixel ratio are unknown; do not reinterpret these values as CSS pixels or current live-site measurements.

| Screenshot property | Measured image-pixel observation |
| --- | --- |
| Shared horizontal content band | `x=200…2679`, width 2,480 image px, observed across the comparison category row at `y=3200` and the organization banner at `y=7400`. |
| Card top edges | At `y=1154`: normal card spans `x=200…795` (596px), featured span `x=826…1425` (600px), next span `x=1456…2051` (596px), final span `x=2084…2679` (596px). Horizontal gaps are 30, 30, and 32 image px respectively. |
| Card heights and badge | The left normal card's visible vertical border spans `y=1154…2369` (1,216 image px). The featured card edge spans `y=1094…2371` (1,278px); the solid purple badge spans `y=1094…1153` (60px) above the shared card top edge. |
| Comparison | The section occupies the same 2,480px content band. Its left and right straight outer-border portions are visible at `x=200` and `x=2679`, `y=3017…6803`; rounded corners extend beyond those straight portions. Category rows are pale lavender and the featured plan column has a lighter tint. |
| Organization banner | At `x=1440`, the saturated gradient extends `y=7075…7564` (490 image px); its full-width interior spans `x=200…2679` at `y=7400`. |
| Closing CTA | At `x=1440`, the saturated gradient extends `y=9094…10162` (1,069 image px); its full-width interior spans `x=200…2679` at `y=9200`. |
| Sampled screenshot colors | White background `#ffffff`; card/outer border sample `#eae6f1`; comparison category sample `#f9f7fc`; featured-column sample `#f7f6fe`. On the organization gradient at `y=7100`, sampled `#3a2a96` at `x=500` and `#9379ea` at `x=2600`. These are raster samples, not computed CSS color declarations or complete gradient definitions. |

No current browser measurement of Forma `/pricing` or visual-fidelity score is claimed.

### 2.2 Historical browser measurements from the Forma homepage

The earlier Chromium captures and their provenance are documented in `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §§1, 3–5 and `docs/ANIMATION_NOTES.md` §1. These are **historical homepage measurements only**, provided as design-system context. Their applicability to the dedicated pricing page has not been verified.

| Historical homepage measurement | Value | Source |
| --- | --- | --- |
| Content column | 1,240px at 1,440px viewport; 736px at 768px; 358px at 390px | `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §4 |
| Header | 69.7px high at the recorded desktop viewport; nav labels 15px / weight 400 | same, §3.01 |
| Pricing band heading | 54px / weight 400 at desktop | same, §3.08 |
| Pricing band plan name | 23px / weight 600 / line-height 1.4 / letter-spacing −0.025em | same, §3.08 |
| Pricing band price | 46px / weight 500 at 1,440px; 35px at 1,024px; 36px at 768px | same, §3.08 |
| Featured pricing card | Purple 2px ring and a popular-plan banner | same, §3.08; `docs/screenshots/forma-final/reference/1440-05-pricing.png` |
| Pricing CTA radius | 10px | same, §3.08 |
| FAQ heading | 48px / weight 600 at desktop; 28px at 1,024px; 32px at 390px | same, §3.09 |
| Closing CTA | Heading 64.8px / weight 600 / line-height 1.02; historically sampled gradient `#36288c` → `#9279e6` | same, §3.10; `docs/screenshots/forma-final/reference/1440-07-final-cta.png` |
| Footer | Multiple columns and an oversized pale wordmark treatment | same, §3.11 |
| Link transitions | 200ms in the historical capture | `docs/ANIMATION_NOTES.md` §§1, 3 |

The existing Roducq native FAQ disclosure uses **260ms**, as requested; the historical fidelity audit does not establish that duration as a measurement of the reference disclosure. Preserve it rather than claiming a new Forma measurement.

### 2.3 Unverified / proposed pricing-page treatment

The screenshot confirms the static wide-screen structures described above. The remaining values and behaviors below are **[INFERRED]** or unverified, not direct browser measurements:

| Requested area | Still unverified |
| --- | --- |
| Page container and header | [INFERRED] Exact CSS widths, horizontal margins, header height/position, and nav spacing at 320, 375, 390, 768, 1024, 1200, and 1440px. Preserve Roducq's shared header regardless. |
| Pricing hero | [INFERRED] Exact computed font size, weight, line-height, gradient definition, paragraph width, and spacing. The screenshot does confirm the centered hero and purple emphasis visually. |
| Cards | [INFERRED] CSS padding, border widths, radii, shadow parameters, button alignment rules, and responsive breakpoints. The screenshot's raster geometry is measured above. Adapt to three Roducq cards without copying the reference's plan content. |
| Comparison table | [INFERRED] Computed radius, row heights, typography, sticky behavior, scrolling behavior, and mobile treatment. The screenshot confirms category bands and a highlighted plan column visually. |
| Organization/Studio banner | [INFERRED] Full CSS gradient, exact padding, button rules, and mobile stacking. The screenshot shows left copy, central highlights, and a right-side light CTA. |
| Billing FAQ | [INFERRED] Exact CSS row spacing, focus states, and motion. The screenshot shows a split layout and plus/minus-style disclosure icons. Keep native `<details>/<summary>` and the existing 260ms Roducq transition. |
| Bottom CTA and footer | [INFERRED] Complete CSS gradient, shadow parameters, footer spacing, and responsive behavior. The screenshot shows a layered right-side mockup and pale oversized footer wordmark. Preserve the shared Roducq footer. |
| Motion | [INFERRED] Dedicated-page hero/card/section entrance sequences, delays, hover behavior, easing, and scroll triggers. A screenshot cannot measure animation. |

No current visual-fidelity score or post-redesign screenshot comparison is claimed.

## 3. Measured Roducq baseline — not Forma measurements

A local production build of the unchanged baseline was run without billing configuration. Chromium 153.0.8010.0 used `prefers-reduced-motion: reduce` for layout and screenshot captures. These are local baseline results, not production or reference measurements. Raw results: `docs/evidence/forma-pricing-audit/baseline-browser.json`. Before screenshots:

- `docs/screenshots/forma-pricing-audit/baseline-1440-light.png`
- `docs/screenshots/forma-pricing-audit/baseline-390-light.png`

| Viewport | Current card geometry | Light/dark document overflow | Axe WCAG 2A/2AA/2.1A/2.1AA violations | Page errors |
| --- | --- | ---: | ---: | ---: |
| 320×700 | vertical stack, 288px wide at x=16 | 0px / 0px | 0 / 0 | 0 / 0 |
| 375×812 | vertical stack, 343px wide at x=16 | 0px / 0px | 0 / 0 | 0 / 0 |
| 390×844 | vertical stack, 358px wide at x=16 | 0px / 0px | 0 / 0 | 0 / 0 |
| 768×1024 | vertical stack, 736px wide at x=16 | 0px / 0px | 0 / 0 | 0 / 0 |
| 1024×768 | three columns, 296px wide at x=40, 364, 688 | 0px / 0px | 0 / 0 | 0 / 0 |
| 1200×900 | three columns, approximately 354.7px wide at x=40, 422.7, 805.3 | 0px / 0px | 0 / 0 | 0 / 0 |
| 1440×900 | three columns, approximately 394.7px wide at x=100, 522.7, 945.3 | 0px / 0px | 0 / 0 | 0 / 0 |

The automated axe scan is not a complete accessibility audit. The visibility heuristic in the raw JSON also lists the intentionally off-screen, screen-reader-only skip link as a 1px-wide control; it becomes visible on keyboard focus and is not a visible 1px touch target. Root theme classes were verified to be `light` and `dark` in the respective runs.

Additional baseline observations:

- `/pricing` currently has **no feature comparison table and no FAQ**; therefore there was no pricing-FAQ interaction to test.
- At 390px, keyboard focus reached the mobile menu; Enter opened its dialog and Escape closed it. At 390px and 1440px, keyboard activation could select the existing Annual control and return to Monthly. This confirms the old UI exists; it does not approve that UI for the redesign.
- In reduced-motion mode at 390px and 1440px, the heading computed `opacity: 1`, `animation-name: none`, and `clip-path: none`.
- With JavaScript disabled at 390px and 1440px, all three cards were present and had nonzero own opacity; the heading had opacity 1. At 1.6 seconds its clip path had reached the finished state. The no-JS test is not a complete screen-reader or interaction audit.

### 3.1 Baseline PR #53-style LCP scenarios

These are **local `/pricing` baseline** PerformanceObserver samples, not Lighthouse scores, field data, Forma results, or post-redesign results. Each scenario used three fresh browser contexts against a local production build, waited 2.6 seconds, and recorded the last LCP candidate. Scenario B used 4× CPU throttling; network was local and unthrottled. The candidate was the pricing `h1` in every run; observed CLS was 0 in each run.

| Scenario | LCP samples (ms) | Median (ms) |
| --- | --- | ---: |
| A: 412×823, motion enabled, 1× CPU | 96, 100, 96 | 96 |
| B: 412×823, motion enabled, 4× CPU | 356, 212, 196 | 212 |
| C: 1350×940, motion enabled, 1× CPU | 92, 68, 104 | 92 |
| D: 412×823, reduced motion, 1× CPU | 108, 104, 100 | 104 |

Repeat the four scenarios after any approved redesign, keeping potential LCP elements and their ancestors at opacity 1 from first paint. No JavaScript, reduced motion, and layout-shift checks also need to be repeated on the finished page.

### 3.2 Baseline automated checks

| Command | Result on this baseline |
| --- | --- |
| `npm ci` | Passed; 575 packages installed. |
| `npm test` | Passed: 1,253 tests, 312 suites, 0 failures. |
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed; 45 static pages generated. Existing React 18 deprecation and Tailwind ambiguous-utility warnings were printed. |
| `npm run verify:db` | Passed offline migration/RLS checks; no production database accessed. |
| `npm run verify:pdf` | Passed: 14 documents, 20 pages, zero overflow, structure, or content findings. The generated sample PDFs were removed after verification. |
| `npm audit` | 0 vulnerabilities reported in this run. Audit data can change; PR #67's earlier run reported four moderate advisories. |

The build left `tsconfig.json` unchanged. These baseline checks do not replace the required post-redesign verification.

## 4. Approved page composition

1. Preserve the existing shared marketing header, navigation, theme control, mobile menu, and footer. The footer already has Roducq columns and an oversized wordmark; no site-wide redesign is proposed.
2. A centered Roducq hero, with a pricing eyebrow, two-tone heading, and short client-work/professional-writing description. Keep the h1 opacity-preserving for LCP and visible without JavaScript.
3. Three equal-height desktop cards: **Starter | Team | Studio**, with Team centered, purple-accented, and labeled **MOST POPULAR**. Stack at smaller widths after testing; retain real `/signup` and `mailto:hello@roducq.dev` destinations, with labels that do not imply live checkout. Monthly-only presentation: no active yearly selector and no annual savings claim.
4. A semantic four-column comparison table: **Feature | Starter | Team | Studio**, with category grouping and a clearly highlighted Team column. On small screens, make the table keyboard-accessible and horizontally scrollable rather than hiding plan information. The user authorized the transcription as provisional and approved the final Starter-cell corrections, matrix and FAQ in `docs/FORMA_PRICING_CONTENT_REVIEW.md`. Runtime tier mapping remains unresolved and outside the redesign scope.
5. A purple Studio banner with only approved claims and **Talk to us**, followed by a split billing FAQ using native disclosures and the existing 260ms timing.
6. A large purple closing CTA with two real destinations, a fictional Roducq client-work mockup, and the visible disclosure **Illustrative example · fictional client**. Do not reuse Forma copy or its task-management mockup.
7. Use the existing Motion.dev conventions and LCP-safe pre-hydration CSS, no other animation library, only patterns supported by available evidence, and reduced-motion/no-JS fallbacks.

The existing `PLAN_TIERS` is also imported by `components/marketing/landing/PricingSection.tsx` on the homepage. Pricing-only presentation changes must not accidentally change the homepage, shared shell, checkout, plan logic, or entitlements. Existing unsupported homepage claims, if any, remain out of this pricing-only scope unless separately approved.

## 5. Historical candidate comparison audit — superseded

**Do not use the candidate rows in this section as final page copy.** The owner directed omissions and qualifications and approved the corrected cards, matrix and FAQ in `docs/FORMA_PRICING_CONTENT_REVIEW.md`. This section remains as provenance and implementation evidence only.

The following commercial terms are explicitly provided in the request and match `app/(marketing)/pricing/plans.ts`. They are **not evidence of enforced seats, configured tier checkout, or a completed payment flow**.

| Commercial row | Starter | Team | Studio |
| --- | --- | --- | --- |
| Monthly price | $29 | $79 | $199 |
| Seats in the proposed plan | 1 | Up to 5 | Up to 15 |
| Additional-seat term | Not specified | $12 per additional seat after 5 | Not specified |
| Contact | Existing account-signup route; not a paid-tier checkout | Existing account-signup route; not a paid-tier checkout | Talk to us |

The seat terms and additional-seat price must be clearly distinguished from enforcement and actual checkout availability. Annual self-serve checkout is not approved/configured; no annual prices or discounts should be introduced.

The candidate rows below document **current marketing claims**, not verified tier entitlements or approved final copy. `Listed` means present in the current plan's feature array; `[INFERRED]` means the current card copy says “everything in” the preceding tier. `Not listed` means only that the current card does not specify it, not that the product lacks the feature or the tier excludes it.

| Candidate row / current claim | Starter | Team | Studio | Source-level reality and decision needed |
| --- | --- | --- | --- | --- |
| Intake workspace / source preservation | Listed | [INFERRED] | [INFERRED] | Intake and source history exist; tier mapping is unverified. |
| Brief drafting with flagged gaps | Listed as AI-generated | [INFERRED] | [INFERRED] | AI is optional when configured; a deterministic fallback exists. Confirm wording and tier availability. |
| Basic proposal generation | Listed | [INFERRED] | [INFERRED] | Drafting/generation exists; tier mapping is unverified. |
| Brief quota | 15/month listed | Unlimited listed | [INFERRED] | No per-tier brief quota is enforced. Absence of a cap alone does not establish a commercial unlimited-service promise. |
| Task-plan generation with owners and due dates | Not listed | Listed | [INFERRED] | Plans/tasks exist, but the task representation is `{id, text, checked}`; per-task owners and due dates were not found. Do not present those subfeatures as available. |
| Client-update composer | Not listed | Listed | [INFERRED] | Source-level update drafting exists; tier mapping is unverified. |
| Shareable read-only **brief** links | Not listed | Listed | [INFERRED] | **Not implemented as advertised:** public links are for updates, not briefs (`AUD-FUNC-001`). The user directed the label **Not currently available**; do not silently substitute another entitlement. The claim's placement comes from the provisionally authorized transcription and remains unverified against the missing PDF. |
| Full edit history and audit trail | Not listed | Listed | [INFERRED] | Proposal version history and activity exist, but a full history/audit trail across all documents is not established. |
| Brief, proposal and update templates | Not listed | Not listed | Listed | Workspace templates and update-composer insertion exist; equivalent insertion into brief and proposal workflows was not found. |
| Intake inbox with threaded sources | Not listed | Not listed | Listed | Source-level implementation exists; Studio-only status is unverified. |
| Link revocation controls | Not listed | Not listed | Listed | Revocation exists for update links; it is not evidence of brief sharing. Tier mapping is unverified. |
| Higher AI usage caps | Not listed | Not listed | Listed | No per-tier AI-generation caps are enforced; don't present the claim as currently enforced. |
| Support and onboarding | Community support listed | Priority email support listed | Priority support/onboarding listed | Operational availability and tier terms require owner confirmation. |

Evidence: `app/(marketing)/pricing/plans.ts`; `docs/RODUCQ_PRICING_PAGE.md` §3; `docs/PRODUCTION_READINESS_AUDIT.md` §§C, E, F and K; `supabase/migrations/20260923010000_plans_schema.sql`; `lib/types/plan.ts`; `supabase/migrations/20260923030000_share_links_schema.sql`; `lib/data/shares.ts`; `app/(app)/updates/[id]/page.tsx`; `components/updates/UpdateComposer.tsx`; and `lib/data/templates.ts`. Source-level implementation does not prove a live production account, provider configuration, support operation, or tier entitlement.

### 5.1 Verification of every feature currently advertised in the repository

This is a review of the **existing code's 16 feature strings**, not confirmation of an authoritative Roducq pricing PDF. The uploaded `pricing-page.pdf` contains Forma visual reference images rather than Roducq plan benefits. “Code-level” means the implementation exists in source; it does not prove production configuration, end-to-end operation, or which paid tier includes it. No source establishes the three advertised tiers as enforced feature gates.

| Current card | Existing advertised benefit | Implementation review |
| --- | --- | --- |
| Starter | `15 briefs / month` | **Not enforced:** the current pricing disclosure says brief usage is not metered; a 15-brief quota is not an active application entitlement. |
| Starter | `Intake workspace with source preservation` | **Code-level:** intake saves brief, source, and questions through `create_brief_bundle`; see `app/(app)/intake/actions.ts`. |
| Starter | `AI-generated briefs with flagged gaps` | **Conditional:** `lib/ai/brief-generator.ts` uses OpenAI when configured and falls back to a deterministic heuristic that also generates questions. Do not promise AI is used in every environment. |
| Starter | `Basic proposal generation` | **Code-level:** `app/(app)/briefs/[id]/actions.ts` creates a proposal draft by copying brief content; this particular step is deterministic, not AI generation. |
| Starter | `Community support` | **Unverified:** a support commitment is an operational/commercial promise, not established by application source. |
| Team | `Unlimited briefs` | **Unverified as a commercial promise:** no per-tier brief cap is currently enforced; absence of a cap does not establish an unlimited service commitment. |
| Team | `Task-plan generation with owners & due dates` | **Partial:** plan tasks exist, but their documented shape is `{id, text, checked}` with no per-task owner or due date (`supabase/migrations/20260923010000_plans_schema.sql`, `lib/types/plan.ts`). |
| Team | `Client-update composer` | **Code-level:** the update page renders `UpdateComposer`; plans can produce update drafts (`app/(app)/updates/[id]/page.tsx`, `app/(app)/plans/[id]/actions.ts`). |
| Team | `Shareable read-only brief links` | **Not currently implemented:** the public sharing schema and RPC reference updates, not briefs (`supabase/migrations/20260923030000_share_links_schema.sql`). The user directed that it be labeled **Not currently available**. |
| Team | `Full edit history & audit trail` | **Partial:** brief source/history and proposal version history exist, but complete history/audit coverage for every document and action is not established (`app/(app)/intake/actions.ts`, `lib/data/proposals.ts`). |
| Team | `Priority email support` | **Unverified:** service priority and response commitments need owner confirmation. |
| Studio | `Configurable brief, proposal & update templates` | **Partial:** workspace templates and insertion into update composition exist; equivalent brief and proposal insertion was not found (`lib/data/templates.ts`, `components/updates/UpdateComposer.tsx`). |
| Studio | `Intake inbox with threaded sources` | **Code-level:** intake can attach follow-up sources to an existing brief through `add_brief_source` (`app/(app)/intake/actions.ts`). |
| Studio | `Link revocation controls` | **Code-level for client updates:** update share links have `revoked_at` and a revoke action. This does not establish brief-link sharing (`app/(app)/updates/[id]/actions.ts`, `supabase/migrations/20260923030000_share_links_schema.sql`). |
| Studio | `Higher AI usage caps` | **Not enforced:** no per-tier AI-generation caps are enforced according to the current pricing disclosure. |
| Studio | `Priority support & onboarding` | **Unverified:** operational support and onboarding commitments require owner confirmation. |

Separately, the requested seat counts and Team's additional-seat price are approved commercial inputs, but seat limits and per-seat billing are not currently enforced or mapped to the public three tiers. The owner authorized the repository transcription as a provisional source, decided the disputed claims, approved a prior revision, and then requested final corrections to the matrix and additions to the FAQ and CTA destinations. The current proposal and exact 16-string transcription are in `docs/FORMA_PRICING_CONTENT_REVIEW.md`.

**Gate resolved:** The owner approved implementation using the corrected matrix and FAQ. The missing original PDF means all transcribed benefit wording and tier placement remain unverified against it. Do not publish a fabricated or inferred per-tier comparison or change protected systems.

## 6. Unresolved commercial and test conflicts

- **`AUD-BILL-001`:** settings and entitlements use Free/Pro and workspace-level billing; the public three-tier prices, seats, additional-seat amount, and per-tier usage are not mapped to enforced in-app entitlements. The current code's `FOOTER_NOTE` expressly says limits are not enforced. No live payment should be implied, and no billing implementation is in scope.
- **Annual claim:** the existing UI actively selects Annual and displays a `Save 17%` badge even though `ANNUAL_PRICES` is empty. The new request explicitly requires monthly-only and no invented annual discount.
- **Optional launch offer:** `getPricingOffer` can expose a default `Save 20%` / `LAUNCH20` banner when billing is configured. Whether the operator has an actual approved offer was not verified; the default mentions checkout. The local baseline had no billing configuration, so this banner was not displayed. Resolve its pricing-page presentation with the owner without editing Razorpay code/configuration.
- **Checkout/trial wording:** the current Team presentation can say “Live Razorpay checkout” when pricing is configured, while the source guards Live Mode. The signup CTAs do not themselves establish a paid-tier trial or a live payment flow. Confirm safe copy/destinations without changing payment logic.
- **Data use:** the existing guarantee that client data is never used to train models lacks a separate third-party attestation in the repository; the existing footnote flags this for commercial/legal sign-off. Do not strengthen that claim without evidence.
- **Test conflict:** `tests/components/pricing.test.ts` asserts the old active Annual control, `Save 17%`, the old hero, and exact feature text including unsupported brief sharing. The monthly-only and truthful-display requirements conflict with those UI-specific assertions. The owner authorized updating obsolete UI assertions while retaining or strengthening annual-checkout, LCP, accessibility, pricing, and payment safety coverage. No test changes have yet been made; do not weaken or delete safety tests merely to obtain a pass.

## 7. Approval gate and remaining work

### Decisions received on 2026-10-27

- The user approved the three-card Forma-style visual structure, but did not approve the earlier feature matrix verbatim. The screenshot and uploaded `pricing-page.pdf` are Forma visual references; the latter is not the missing Roducq feature specification.
- After inspecting the uploaded Forma-only `pricing-page.pdf`, the user initially chose to upload the original Roducq pricing PDF. When it did not arrive, the user subsequently **authorized the existing repository transcription as the provisional source** for the redesign. The original Roducq PDF remains unavailable, and every transcribed benefit and tier placement must be identified as unverified against it.
- The user provided individual content decisions: show Starter's 15 briefs and Team/Studio's unlimited briefs only with a not-enforced disclosure; retain the source-verified intake, drafting, proposals, basic tasks, updates, update templates, threaded inbox, and update-link revocation; label history/audit **Partial**; omit unverified support promises, brief/proposal templates, and higher AI caps. Account signup must be disclosed as not purchasing or activating a paid plan. Annual checkout stays unavailable. The user approved the revised exact cards, matrix, and disclosures in `docs/FORMA_PRICING_CONTENT_REVIEW.md`, but explicitly selected **“Approve, but wait.”**
- The user subsequently requested final corrections: Starter must show **— (Not included)** for per-task owners, per-task due dates, and brief sharing, while Team and Studio retain **Not currently available**; Team's $12 additional-seat term must disclose that billing is not implemented; the billing FAQ must cover seats, brief limits, extra seats, annual checkout, and signup versus paid-plan activation. The Studio banner **Talk to us** links to the existing Studio mailto, and the bottom **Start organizing client work** links to `/signup`. The user subsequently approved implementation using the exact FAQ and CTA destinations in `docs/FORMA_PRICING_CONTENT_REVIEW.md` §§4–5.
- The user approved updating obsolete UI-specific test assertions for the new presentation while retaining or strengthening the billing, pricing, accessibility, and LCP safeguards. No test has been changed yet.
- **Brief-link claim:** the user chose to keep it visible with the exact **Not currently available** label. Its Team placement is from the provisional transcription, not verified against the missing PDF; no implementation date is promised.
- **Task-plan claim:** the user chose to show supported basic task-plan generation and separately label per-task owners and due dates **Not currently available**. Team placement is from the provisional transcription and remains unverified against the missing PDF.

**Final approval received:** implement only the authorized `/pricing` work; re-run all requested checks and seven-width browser tests in both themes; repeat keyboard, axe, reduced-motion, no-JS, and four LCP scenarios; document actual findings and limitations in `docs/FORMA_PRICING_REDESIGN.md`; then open the requested PR against `main` and leave it unmerged. Do not deploy production. The repository transcription remains provisional and the screenshot and uploaded `pricing-page.pdf` remain Forma visual references only.
