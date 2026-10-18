# Roducq Dedicated Pricing Page (`/pricing`) — Forma Template & PDF Specification Audit

**Date:** 2026-10-18  
**Branch:** `arena/552b2356-roducq`  
**Reference Template:** `https://forma-visuvate.framer.website/pricing`  
**Pricing Content Source:** Roducq Pricing Specification PDF (`Starter`, `Team`, `Studio`)

---

## 1. Executive Summary

This milestone recreates the dedicated `/pricing` page (`app/(marketing)/pricing/page.tsx`, `app/(marketing)/pricing/pricing-plans.tsx`, `app/(marketing)/pricing/plans.ts`) following the Forma pricing page layout, typography, spacing, and visual hierarchy (`https://forma-visuvate.framer.website/pricing`), populated with the exact 3-plan Roducq pricing specification (`Starter`, `Team`, `Studio`) from the pricing PDF.

All previously merged engineering work is preserved intact:
- **PR #48** — Phase 1–6 platform hardening & security fixes
- **PR #49** — Full Forma landing page recreation at `/`
- **PR #50** — Final Forma visual fidelity audit & launch readiness
- **PR #51** — Final go-live readiness & motion verification

Protected backend systems (`lib/razorpay.ts`, `/api/razorpay/*`, subscription database migrations, Supabase, authentication, and backend APIs) remain completely untouched, and production Razorpay Live Mode remains disabled (`ALLOWED_RAZORPAY_MODES = ["test"]`).

---

## 2. Forma `/pricing` Reference Inspection Summary

Inspection of the Forma pricing template (`https://forma-visuvate.framer.website/pricing`) and the captured multi-viewport Forma reference metrics (`1440×900`, `1024×768`, `768×1024`, `390×844`, `375×812`, `320×700`) established the following structural and typographic contract:

| Element | Desktop (`1440px`) | Small Desktop (`1024px`) | Tablet & Mobile (`768px` – `320px`) |
| --- | --- | --- | --- |
| **Section Container** | `.lm-shell` (`max-width: 1240px`, `padding: 120px 40px`) | `.lm-shell` (`padding: 88px 40px`) | `.lm-shell` (`padding: 52px 16px` / `24px`) |
| **Eyebrow (`PRICING`)** | `14px` (`text-lm-14`), weight `600`, uppercase, tracking `0.14em` | `14px`, weight `600` | `13px` (`text-lm-13`), weight `600` |
| **Main Heading (`<h1>`)** | `54px` (`text-lm-54`), weight `400`, line-height `1.1`, tracking `-0.03em` | `34px` (`text-lm-34`), line-height `1.1` | `32px` (`text-lm-32`), line-height `1.1` |
| **Subtitle** | `18px` (`text-lm-18`), weight `400`, line-height `1.65`, `max-w-xl` | `14px` (`text-lm-14`), line-height `1.65` | `14px` (`text-lm-14`), line-height `1.65` |
| **Billing Toggle** | Segmented pill (`rounded-lm-pill`), `44px+` tap target | Segmented pill (`rounded-lm-pill`) | Segmented pill (`rounded-lm-pill`), wraps cleanly at `320px` |
| **Pricing Card Grid** | 3 equal-height horizontal columns (`lg:grid-cols-3`, `gap-7`) | 3 equal-height horizontal columns (`lg:grid-cols-3`, `gap-6`) | 1-column vertical stack (`grid-cols-1`, `gap-6`) |
| **Card Internal Order** | Badge → Plan Name + Tagline → Price + Seat Info → CTA Button → Section Header (`INCLUDES` / `EVERYTHING IN ...`) → Feature Checklist | Same | Same |
| **Card Radius & Padding** | `14px` (`--lm-radius-card`), `32px` (`sm:p-8`) | `14px`, `32px` | `14px`, `24px` (`p-6`) |

---

## 3. PDF Pricing Specification Mapping (`Starter`, `Team`, `Studio`)

Every plan tier in `app/(marketing)/pricing/plans.ts` maps verbatim to the Roducq pricing PDF specification. Only three horizontal cards are rendered on `/pricing` (no fourth Enterprise card on `/pricing`):

| Field | Plan 1: `Starter` | Plan 2: `Team` (Featured) | Plan 3: `Studio` |
| --- | --- | --- | --- |
| **Plan Name** | `Starter` | `Team` | `Studio` |
| **Badge** | — | `MOST POPULAR` | — |
| **Audience Description** | `For solo consultants and freelancers` | `For small agencies getting organized` | `For growing teams running full client operations` |
| **Monthly Price** | `$29` `/ month` | `$79` `/ month` | `$199` `/ month` |
| **Seat Limit** | `1 seat` | `Up to 5 seats` | `Up to 15 seats` |
| **Additional Seat Pricing** | — | `+$12/seat after 5 seats` | — |
| **CTA Label & Destination** | `Start free trial` → `/signup` | `Start free trial` → `/signup` | `Talk to us` → `mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry` |
| **Card Styling** | Neutral border (`.lm-pricing-card`), light CTA (`.lm-pricing-cta-light`) | Highlighted orange/red accent border (`.lm-pricing-card-featured`), `MOST POPULAR` badge, accent primary CTA (`.lm-pricing-cta-primary`) | Neutral border (`.lm-pricing-card`), light CTA (`.lm-pricing-cta-light`) |
| **Features Section Header** | `INCLUDES` (`featuresHeading: null`) | `EVERYTHING IN STARTER, PLUS` | `EVERYTHING IN TEAM, PLUS` |
| **Features** | • `15 briefs / month`<br>• `Intake workspace with source preservation`<br>• `AI-generated briefs with flagged gaps`<br>• `Basic proposal generation`<br>• `Community support` | • `Unlimited briefs`<br>• `Task-plan generation with owners & due dates`<br>• `Client-update composer`<br>• `Shareable read-only brief links`<br>• `Full edit history & audit trail`<br>• `Priority email support` | • `Configurable brief, proposal & update templates`<br>• `Intake inbox with threaded sources`<br>• `Link revocation controls`<br>• `Higher AI usage caps`<br>• `Priority support & onboarding` |

---

## 4. Header & Billing Toggle Implementation (`Monthly` / `Annual Save 17%`)

- **Header (`app/(marketing)/pricing/page.tsx`)**:
  - Eyebrow: `PRICING` (`HERO.eyebrow`)
  - Main Heading (`<h1 id="pricing-page-heading">`): `Plans that scale with how your team works.` (`HERO.title`)
  - Description: `Start free. Upgrade when your team is ready to turn every client conversation into a plan everyone trusts.` (`HERO.subtitle`)
- **Billing Period Toggle (`app/(marketing)/pricing/pricing-plans.tsx`)**:
  - Rendered as an accessible segmented pill (`role="group"`, `aria-label="Billing period"`) with two buttons (`aria-pressed={selected}`):
    - `Monthly` (default active option)
    - `Annual` with the `Save 17%` badge (`ANNUAL_BADGE_LABEL`)

---

## 5. Annual Billing & Razorpay Configuration Alignment Notes

- Inspection of `lib/razorpay.ts` confirms that Roducq currently provisions recurring **monthly** Razorpay plans only (`SUBSCRIPTION_TOTAL_COUNT = 120`, `quantity = 1` per workspace) and `ANNUAL_PRICES` in `app/(marketing)/pricing/plans.ts` is `[]`.
- Per the engineering rules, `lib/razorpay.ts` and the checkout APIs were **not** modified, no annual plan IDs or unverified annual prices were invented, and selecting the `Annual` toggle tab **never** triggers a monthly checkout:
  - When `Monthly` is active (default), the cards display the PDF's published monthly prices (`$29 / month`, `$79 / month`, `$199 / month`) alongside the live Razorpay status note on `Team`.
  - When `Annual` is selected and `ANNUAL_PRICES` is empty, an accessible `role="status"` (`aria-live="polite"`) notice appears (`Annual billing is pending commercial and Razorpay configuration approval.`), card price rows display `Annual pricing pending configuration` instead of fabricated annual numbers, and the self-serve CTAs on `Starter` and `Team` are disabled (`disabled`, `aria-disabled="true"`) while `Studio` retains its `Talk to us` contact link.

---

## 6. Card Layout, Styling, and Accent Token Decisions

To honor the PDF's warm orange/red accent styling on the pricing cards while preserving the global Roducq marketing shell (`SiteHeader` and `SiteFooter`), scoped pricing tokens (`--lm-pricing-*`) were added to `app/(marketing)/landing.css` inside `.rdq-marketing` and `.dark .rdq-marketing`:

- **Light Mode (`.rdq-marketing`)**:
  - `--lm-pricing-accent: #c93b14`
  - `--lm-pricing-accent-strong: #b93815`
  - `--lm-pricing-on-accent: #ffffff`
  - `--lm-pricing-accent-surface: #fff1ec`
  - `--lm-pricing-accent-ink: #b93815`
  - `--lm-pricing-neutral-border: #e3dfec`
  - `--lm-pricing-cta-light: #f6f4fa`
- **Dark Mode (`.dark .rdq-marketing`)**:
  - `--lm-pricing-accent: #ff784f`
  - `--lm-pricing-accent-strong: #ff8e6b`
  - `--lm-pricing-on-accent: #1b1426`
  - `--lm-pricing-accent-surface: #3a1d16`
  - `--lm-pricing-accent-ink: #ffb49a`
  - `--lm-pricing-neutral-border: #38304a`
  - `--lm-pricing-cta-light: #2a2233`

No raw hex or `rgb()`/`rgba()` literals appear in `app/(marketing)/pricing/page.tsx`, `app/(marketing)/pricing/pricing-plans.tsx`, or `app/(marketing)/pricing/plans.ts`.

---

## 7. Pricing Footnote & Policy Verification Notes

Below the three pricing cards, `/pricing` renders the exact 3-item footnote from the PDF specification (`FOOTER_ITEMS`):

> `No credit card required for trial` · `Cancel anytime` · `Your client data is never used to train models`

### Verification Against Roducq's Codebase & Policies
1. **`No credit card required for trial` — Verified in code**: `app/(auth)/signup/page.tsx` creates an account and workspace with email/password only; no payment method or Razorpay checkout is invoked during signup.
2. **`Cancel anytime` — Verified in code**: `components/settings/PlanCard.tsx` (`ManageBillingButton`) and `lib/razorpay.ts` (`cancelRazorpaySubscription`) allow workspace owners to cancel an active Razorpay subscription at any time from Settings.
3. **`Your client data is never used to train models` & per-tier quotas — Documented for commercial/legal sign-off**:
   - `lib/ai/brief-generator.ts` calls OpenAI (`gpt-4o-mini` via `OPENAI_API_KEY`) when configured, falling back to a local deterministic parser. While OpenAI's API platform policy does not train on API business data by default, no separate third-party DPA/attestation file is stored in the repository.
   - Similarly, per-tier quota enforcement (`15 briefs / month`, seat caps, and per-seat overage billing) is not enforced in application code today (`billing_subscriptions` bills `quantity: 1` per workspace).
   - Both points are explicitly disclosed in `FOOTER_NOTE` immediately below the 3 footnote items so the page never misrepresents live backend enforcement.

---

## 8. Homepage vs `/pricing` Pricing Consistency Summary

- `components/marketing/landing/PricingSection.tsx` imports `PLAN_TIERS` directly from `app/(marketing)/pricing/plans.ts`.
- Updating `PLAN_TIERS` in `app/(marketing)/pricing/plans.ts` and binding `tier.priceDisplay`, `tier.cadence`, `tier.seatsLabel`, `tier.additionalSeatsLabel`, and `tier.featuresHeading` in `PricingSection.tsx` ensures the homepage pricing section (`/`) and the dedicated `/pricing` page display identical names, prices (`$29`, `$79`, `$199`), seat allowances, and feature lists for `Starter`, `Team`, and `Studio` (while `/` retains its 4th dark `Enterprise` card for the homepage 4-column band and `/pricing` renders strictly the 3 PDF cards).

---

## 9. Motion.dev Animation Summary

- **Shared Provider**: `/pricing` inherits `MotionProvider` (`<MotionConfig reducedMotion="user">`) from `app/(marketing)/layout.tsx`.
- **Segmented-Pill Toggle Indicator**: `PricingPlans` uses `<motion.span layoutId="pricing-billing-pill" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} />` to smoothly slide the active pill between `Monthly` and `Annual`.
- **Header & Card Reveal**: The header and toggle use `<Reveal>` (`components/marketing/landing/Reveal.tsx`), and the three cards (`<motion.article>`) and footnote use staggered Forma easing (`cubic-bezier(0.22, 1, 0.36, 1)`, `120ms` / `180ms` / `240ms`).
- **Hover & Reduced Motion**: Cards and CTAs use subtle `translateY` and background transitions that are neutralized under `@media (prefers-reduced-motion: reduce)` in `app/(marketing)/landing.css` and `MotionConfig reducedMotion="user"`.

---

## 10. Responsive Breakpoint Verification (`1440px`, `1024px`, `768px`, `390px`, `375px`, `320px`)

Headless Chromium (`Playwright` + `Chromium 153.0.8010.0`) verified `/pricing` and `/` across all 6 required viewports:

| Viewport | Horizontal Overflow (`scrollWidth - clientWidth`) | Card Layout | Measured Card Coordinates (`x, y, width × height`) | Tap Targets (`>= 44px`) | Console / Page Errors |
| --- | --- | --- | --- | --- | --- |
| **`1440×900`** | `0px` | 3 horizontal columns | `starter@(100,641 395×751)`, `team@(523,641 395×751)`, `studio@(945,641 395×751)` | Pass (`44px` toggle, `48px` CTAs) | `0` |
| **`1024×768`** | `0px` | 3 horizontal columns | `starter@(40,655 296×810)`, `team@(364,655 296×810)`, `studio@(688,655 296×810)` | Pass (`44px` toggle, `48px` CTAs) | `0` |
| **`768×1024`** | `0px` | 1-column stack | `starter@(16,499 736×560)`, `team@(16,1097 736×681)`, `studio@(16,1802 736×560)` | Pass (`44px` toggle, `48px` CTAs) | `0` |
| **`390×844`** | `0px` | 1-column stack | `starter@(16,521 358×526)`, `team@(16,1078 358×681)`, `studio@(16,1783 358×546)` | Pass (`44px` toggle, `48px` CTAs) | `0` |
| **`375×812`** | `0px` | 1-column stack | `starter@(16,521 343×526)`, `team@(16,1078 343×681)`, `studio@(16,1783 343×569)` | Pass (`44px` toggle, `48px` CTAs) | `0` |
| **`320×700`** | `0px` | 1-column stack | `starter@(16,605 288×566)`, `team@(16,1195 288×723)`, `studio@(16,1942 288×589)` | Pass (`44px` toggle, `48px` CTAs) | `0` |

---

## 11. Accessibility & Contrast Summary (`WCAG 2.1 AA >= 4.5:1`)

All foreground/background pairs for the pricing page tokens are verified in `tests/components/pricing.test.ts` to exceed the **4.5:1** WCAG 2.1 AA threshold in both light and dark modes:

| Pair | Light Mode Hex Pair | Light Contrast | Dark Mode Hex Pair | Dark Contrast |
| --- | --- | --- | --- | --- |
| Primary CTA & `MOST POPULAR` badge text on accent | `#ffffff` on `#c93b14` | **5.10 : 1** | `#1b1426` on `#ff784f` | **6.85 : 1** |
| Primary CTA hover text on accent-strong | `#ffffff` on `#b93815` | **5.77 : 1** | `#1b1426` on `#ff8e6b` | **8.21 : 1** |
| `PRICING` eyebrow on page canvas | `#c93b14` on `#f9f7fc` | **4.79 : 1** | `#ff784f` on `#1d1826` | **6.70 : 1** |
| Accent checkmark / text on card surface | `#c93b14` on `#ffffff` | **5.10 : 1** | `#ff784f` on `#2a2233` | **5.66 : 1** |
| `Save 17%` badge text on badge surface | `#b93815` on `#fff1ec` | **5.23 : 1** | `#ffb49a` on `#3a1d16` | **8.96 : 1** |
| Neutral CTA button text on light CTA surface | `#1b1426` on `#f6f4fa` | **15.84 : 1** | `#f4f0fb` on `#2a2233` | **13.42 : 1** |

---

## 12. SEO & Metadata Verification Summary

`app/(marketing)/pricing/page.tsx` preserves all PR #50 SEO metadata conventions:
- `title`: `"Pricing — roducq"`
- `description`: `"Plans that scale with how your team works: Starter ($29/month), Team ($79/month), and Studio ($199/month). Start free and upgrade when your team is ready to turn every client conversation into a plan everyone trusts."`
- `alternates.canonical`: `"/pricing"`
- `openGraph`: `type: "website"`, `url: "/pricing"`, `images: [SOCIAL_IMAGE]`
- `twitter`: `card: "summary_large_image"`, `images: [TWITTER_IMAGE]`
- Included in `app/sitemap.ts` (`/pricing`).

---

## 13. Test, Build & Production Verification Results

| Check | Command | Result |
| --- | --- | --- |
| **ESLint** | `npm run lint` | **PASS** (0 warnings, 0 errors) |
| **TypeScript** | `npx tsc --noEmit` | **PASS** (0 errors) |
| **Unit & Component Tests** | `npm test` | **PASS** (**1,116 / 1,116 tests passing** across 278 suites) |
| **Production Build** | `npm run build` | **PASS** (41 static & dynamic routes compiled cleanly) |
| **Production Smoke Harness** | `npm run verify:production` | **PASS** (metadata, canonicals, internal links, auth redirects, TTFB) |
| **Multi-Viewport Chromium Audit** | Headless Chromium (`1440`, `1024`, `768`, `390`, `375`, `320`) | **PASS** (`0px` horizontal overflow, `0` console/page errors) |

---

## 14. Files Changed

- `app/(marketing)/landing.css` — Added scoped `--lm-pricing-*` light/dark tokens and `.lm-pricing-*` card, badge, toggle, and CTA classes.
- `app/(marketing)/pricing/plans.ts` — Updated shared pricing tier definitions (`Starter`, `Team`, `Studio`), header copy (`HERO`), `Save 17%` toggle badge (`ANNUAL_BADGE_LABEL`), 3-item PDF footnote (`FOOTER_ITEMS`), policy/billing disclosure (`FOOTER_NOTE`), and `plansForInterval` interval resolver.
- `app/(marketing)/pricing/pricing-plans.tsx` — Rebuilt the client pricing toggle and 3-card grid to match the Forma pricing geometry, Motion.dev segmented-pill indicator (`layoutId="pricing-billing-pill"`), safe annual-pending state, and PDF card styling.
- `app/(marketing)/pricing/page.tsx` — Rebuilt `/pricing` inside `.lm-shell` with Forma typography scale, optional launch-offer callout (`data-testid="pricing-offer"`), 3-item PDF footnote (`data-testid="pricing-footnote"`), and PR #50 SEO metadata.
- `components/marketing/landing/PricingSection.tsx` — Updated homepage pricing card rendering to read `tier.priceDisplay`, `tier.cadence`, `tier.seatsLabel`, `tier.additionalSeatsLabel`, and `tier.featuresHeading` from shared `PLAN_TIERS`.
- `scripts/build-pricing-screenshots.py` — Synced screenshot generator constants with updated `plans.ts`.
- `docs/screenshots/pricing-light.png`, `docs/screenshots/pricing-dark.png`, `docs/screenshots/pricing-no-billing.png` — Updated with real headless Chromium captures of `/pricing`.
- `tests/components/pricing.test.ts` & `tests/components/pricing-offer-shots.test.ts` — Expanded `/pricing` test coverage for PDF plan accuracy, Razorpay annual safety, Motion.dev integration, accessibility, and WCAG 2.1 AA contrast.
- `docs/RODUCQ_PRICING_PAGE.md` — Created this comprehensive engineering and visual verification report.
