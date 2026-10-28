# Roducq homepage — Forma-inspired redesign record

**Route:** `/`
**Reference audit:** [`FORMA_HOMEPAGE_REDESIGN_REFERENCE.md`](./FORMA_HOMEPAGE_REDESIGN_REFERENCE.md)
**Status:** Implementation and server/build verification complete; browser viewport and axe checks remain blocked by the sandbox's missing Chromium runtime libraries.
**Branch:** `arena/65c84448-roducq` (kept open; not deployed).

## Goal and scope

Recreate the supplied five-page Forma desktop composition for Roducq while keeping Roducq's shared marketing shell, Manrope typography, accessible purple system, real route destinations, and only product capabilities verified in the repository. This is an intentionally close **structural and visual recreation**, not a claim of pixel-perfect parity: the reference PDF is static, the live sites could not be freshly measured, and Roducq's accurate copy changes line wrapping and height.

No authentication, Supabase, billing, checkout, entitlement, database, migration, backend API, or `/pricing` implementation was changed. The `/pricing` route continues using its own approved `PricingPlans` presentation. No other marketing page was intentionally redesigned. The shared header and footer retain their original geometry and non-home copy; only the announcement and footer CTA text switch on `/` to avoid free-plan wording on the homepage. The header's route-specific announcement stays in the existing header component; the small footer CTA client component changes only its label and keeps the same `/signup` destination and styling.

## What changed

### Composition and interface

- Kept the approved order: shared announcement/header; centered hero and Roducq workspace frame; four feature cards; three ordered workflow steps with purple illustration; integrations; four audience cards; four pricing columns; split six-item FAQ; closing gradient CTA; shared footer.
- Retained the existing Roducq artwork and shared layout rather than copying Forma marks, task examples, or product copy.
- Added visible fictional-example disclosures to the dashboard, feature miniatures, workflow panel, audience previews, and closing checklist.
- Kept the pricing row's four visual columns while showing only Starter, Team, Studio and a non-commercial contact panel.

### Copy, routes, product truth, and pricing

- Describes intake → structured brief → proposal → progress-grounded client update; removes free/trial and unattended-automation messaging from the homepage.
- Main CTA destinations are real: `/signup`, `/solutions`, `/features`, `/integrations`, and `/pricing`. Account creation explicitly does not purchase or activate a paid plan.
- Integrations stay within verified capabilities: Slack, Notion and connected mailbox imports are read-only; webhooks are signed outbound; PDF export, supported file intake and supported read-only share links are native Roducq capabilities.
- Approved monthly presentation only: Starter **$29/month** (1 seat); Team **$79/month** (up to 5 seats, +$12/additional seat; **MOST POPULAR**); Studio **$199/month** (up to 15 seats). The fourth column is informational/contact-only, not Enterprise.
- Visible disclosures cover unavailable annual checkout; listed seat/brief limits not currently enforced; additional-seat billing not implemented; signup versus paid-plan activation; read-only imports; and unavailable features. No checkout, pricing authority or entitlements were changed.
- Preserved six accurate native `<details>/<summary>` questions and the existing measured 260ms disclosure transition.

### Motion and accessibility contracts retained

- Kept Motion.dev as the only motion library and retained the recorded hero/section cadence and 260ms FAQ behavior.
- Hero/LCP content is not initialized at `opacity: 0`; the word reveal uses a clip mask with opacity preserved. Existing no-JavaScript and reduced-motion paths remain visible, with no new initial blur or layout-shifting media.
- Retained the shared focus treatment, 44px minimum interactive target contract, contrast-safe purple gradient tokens, semantic headings/lists, server-rendered page content, and native FAQ interaction.
- Updated `scripts/verify-responsive.mjs` with the requested 390px and 1200px widths and an optional `PAGE_SLUGS` filter, so the homepage-only seven-width run can be invoked without traversing unrelated routes.

## Verification performed

| Check | Result |
| --- | --- |
| `npm test` | **Pass:** 1,329 tests / 334 suites, 0 failures. |
| Targeted homepage + feature/integration/solutions/pricing component suites | **Pass:** 222 tests, 0 failures. |
| `node --test tests/components/home.test.ts` | **Pass:** 97 tests, 0 failures. |
| `npm run build` | **Pass:** Next.js 16.4.3 production build and generated routes. Existing warnings remain: React 18 support deprecation in Next.js 16 and an ambiguous pre-existing `duration-[250ms]` utility. |
| `npm run lint -- --no-warn-ignored` | **Pass.** |
| `npx tsc --noEmit` | **Pass** (also run during production build). |
| `npm run verify:db` | **Pass:** 32 migrations and the existing database/RLS checks. No database files were modified. |
| `npm run verify:pdf` | **Pass:** 14 documents / 20 pages, zero overflow, structure or content findings. |
| `npm run verify:production` | **Pass:** metadata, public routes, security headers, sitemap/robots, 15 homepage links and JSON-LD; local loopback timings across repeated runs ranged 6–17ms TTFB and 10–24ms total. This is server smoke evidence, **not** a Core Web Vitals or browser performance measurement. |
| `npm audit` | **Pass:** 0 vulnerabilities. |
| Production HTML spot-check | **Pass:** homepage announcement and footer wording are the route-specific variants; no “Start free”, “Enterprise”, or default free-plan announcement appears in the homepage HTML; approved prices, six native details elements, fictional labels, and a non-hidden hero initializer were present. `/solutions` retained its pre-existing announcement copy. |

### Browser checks not completed

The requested real-layout checks at **320, 375, 390, 768, 1024, 1200, and 1440px**, screenshot comparison, and axe-core scan were **not run successfully**. The responsive harness was extended and invoked for the homepage at those widths, but the available Chromium binary failed to start because this image lacks `libnspr4.so`. The Playwright Chromium download endpoint is outside the sandbox's allowed outbound hosts. No overflow-free result, axe pass, fresh animation timing, or pixel comparison is claimed.

The reference audit in the companion document records historical measurements separately from current-run evidence. A fresh browser comparison against Forma and the implementation remains outstanding and should be run in an environment with Chromium's system libraries or the Playwright-managed browser installed.

## Deliberate differences from Forma

- Roducq-specific messages, capabilities, examples and destinations replace Forma content.
- The six verified integrations/capability cards remain in a three-column grid; no unimplemented vendors or automations are advertised.
- The fourth pricing slot is contact/information-only; there is no fabricated Enterprise tier.
- The global Roducq header/footer, theme toggle, mobile menu, typography, contrast requirements and native details behavior take precedence over reproducing Forma's own shell and interaction code.
- No browser evidence supports a claim of exact pixel parity.

## Files of interest

- `app/(marketing)/home/content.ts` and `app/(marketing)/home/chrome-content.ts` — homepage copy and small route-specific shell copy.
- `components/marketing/landing/PricingSection.tsx` — approved plan presentation and disclosures; separate from `/pricing` checkout/presentation code.
- `components/marketing/landing/HeroSection.tsx`, `StepsSection.tsx`, `WorkspacePreview.tsx`, `FeaturesSection.tsx`, `TeamsSection.tsx`, `IntegrationsSection.tsx`, and `FinalCta.tsx` — homepage-specific rendering and illustrative captions.
- `scripts/verify-responsive.mjs` — expanded viewport list and optional page filter for future browser verification.
