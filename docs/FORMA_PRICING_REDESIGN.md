# Roducq pricing — Forma visual recreation

## Scope and source of truth

The `/pricing` page has been rebuilt from the owner-approved cards, corrected 16-row comparison, disclosures, five FAQ answers, and CTA destinations in [`FORMA_PRICING_CONTENT_REVIEW.md`](FORMA_PRICING_CONTENT_REVIEW.md). The shared announcement, header, theme control, mobile menu, and footer are unchanged. The homepage still consumes the historical `PLAN_TIERS`; reconciling other marketing pages was explicitly outside this pricing-only scope.

The original Roducq pricing PDF was not available. The repository's historical transcription was authorized **provisionally**, but its benefits and tier placement remain **unverified against that PDF**. Source inspection of implementation is not production verification. The uploaded `pricing-page.pdf` is an image-only Forma visual reference, not the Roducq benefits specification. Provenance, measurements, and the owner decisions are recorded in [`FORMA_PRICING_REFERENCE.md`](FORMA_PRICING_REFERENCE.md) and the content review.

No Razorpay code/configuration, authentication, Supabase, database, schema, migration, subscription, entitlement, checkout, or webhook code was changed. No production deployment was performed. The public page explicitly states that brief and seat limits are not enforced by tier, Team additional-seat billing is not implemented, the three advertised tiers are not mapped to separate paid checkout, annual checkout is unavailable, and signup does not purchase or activate a paid plan.

## Implementation

- `app/(marketing)/pricing/pricing-content.ts` isolates the approved pricing-page-only copy from the legacy data used elsewhere. It contains exactly three cards, the matrix, FAQ, disclosures, and Studio mail address.
- `page.tsx`, `pricing-plans.tsx`, and `pricing.css` provide the centered two-tone hero, three white cards with the purple Team band, a four-column semantic comparison, Studio banner, native FAQ, and bottom purple CTA. On small screens the comparison remains a real, keyboard-scrollable table; each data cell explicitly associates its category, feature, and plan headers.
- The two account-card CTAs and bottom CTA go to `/signup`. The Studio card and banner use the approved Studio `mailto:`. No annual selector, annual price or discount, unapproved offer, demo route, or Enterprise card was added. The fictional brief illustration is visibly labeled **Illustrative example · fictional client**.
- Motion.dev supplies the optional card hover; it is disabled for reduced motion. The hero and its ancestors are visible on first paint rather than starting at opacity zero. The existing native `details`/`summary` implementation retains its 260 ms disclosure transition and works without JavaScript.
- `tests/components/pricing.test.ts` and `tests/components/marketing-header.test.ts` replace obsolete UI assumptions with exact approved-content, availability, accessibility, and LCP assertions. Historical plan-data and billing/annual/offer safety assertions remain; the shared homepage data was not rewritten.

## Browser comparison with the supplied reference

The original screenshot is `docs/screenshots/forma-pricing-audit/reference-user-provided.png` (2,880 × 11,762; SHA-256 `fedbfa1cef98c5de77bcdb12437fcf2900e2991b58f410aff3472cace38c1841`). The uploaded visual-reference PDF has SHA-256 `8a9c325de38fbe35bf97c074a4f68830d00798a4a4d8ecd801d3ee184f370a32` and is not committed to the repository.

Chromium rendered the supplied raster at an **inferred** 1,440 CSS-pixel width beside a 1,440 px screenshot of the local production build. The browser-generated comparisons are:

- [`redesign-reference-browser-comparison-top.png`](screenshots/forma-pricing-audit/redesign-reference-browser-comparison-top.png) — hero and cards.
- [`redesign-reference-browser-comparison.png`](screenshots/forma-pricing-audit/redesign-reference-browser-comparison.png) — full page; left is the static Forma screenshot and right is Roducq.
- [`redesign-1440-light.png`](screenshots/forma-pricing-audit/redesign-1440-light.png) and [`redesign-390-light.png`](screenshots/forma-pricing-audit/redesign-390-light.png) — individual local captures.

The comparison reproduces the centered headline and generous whitespace, thin white card borders, purple featured strip and button, rounded comparison frame with category bands and tinted featured column, horizontal Studio banner, split FAQ, and large closing gradient with a white mock document. The retained Roducq footer differs from the reference by design.

Approximate raster positions in the reference are **not measured CSS**, because the screenshot's original viewport and device-pixel ratio are unknown. Local numbers below are from the Chromium DOM at 1,440 × 900, 1× DPR, with reduced motion and `--font-render-hinting=none`:

| Element | Forma raster normalized to 1,440 px | Roducq local build | Context |
| --- | ---: | ---: | --- |
| Main content band | x ≈ 100–1,340 | x = 100–1,340 | Matching 1,240 px band at this width. |
| Hero eyebrow | y ≈ 165 | y = 219 | The preserved Roducq announcement adds a band absent from the screenshot. |
| Cards / featured badge | y ≈ 577 / 547 | y = 616.5 / 587.5 | Roducq uses three ≈403 px cards instead of four ≈298 px cards. The longer approved Team availability copy makes its card ≈669 px high rather than ≈608 px. |
| Comparison heading | y ≈ 1,354 | y ≈ 1,575 | Approved disclosures and longer card content add space. |
| Studio banner | y ≈ 3,537.5; height ≈245 | y ≈ 3,188; height 245 | The approved matrix has fewer rows than the reference. |
| Closing banner | y ≈ 4,547; height ≈534 | y ≈ 4,146; height 532 | Earlier placement follows the shorter comparison; the two-column CTA composition is retained. |
| Full page | ≈5,881 px high | 5,506 px high | Different content, shared shell, and footer prevent a pixel-identical page. |

The reference's annual control, fourth/Enterprise card, sales/demo CTAs, text, and features were intentionally not copied. The gradient is adapted to keep the approved copy readable; the fictional brief is not a screenshot of a real client. Direct live Forma browsing was unavailable, so the comparison is against a static user-supplied screenshot only. It cannot verify live interaction, exact typography, original viewport/DPR, mobile layouts, dark theme, or reference motion; no pixel-match percentage is claimed.

## Verification

All commands below ran locally on the assigned branch. The browser checks used Chromium 153.0.8010.0 against `next start` after a production build, not a deployed site. Reproduction: start the build with `npm run start`, set `CHROMIUM_EXECUTABLE_PATH` to a compatible browser, then run `node scripts/verify-pricing-redesign.mjs`. The script writes the browser JSON and screenshots. The separately run PR #53 harness is `ROUTES=/pricing PHASES=lcp,motion RUNS=3 node scripts/verify-marketing-consistency.mjs` with the same browser and an `OUTPUT` path.

| Check | Result |
| --- | --- |
| `npm ci` | Passed; 575 packages installed, 0 reported vulnerabilities. |
| `npm test` | Passed: 1,258 tests. |
| `npx tsc --noEmit` | Passed. |
| `npm run lint` | Passed. |
| `npm run build` | Passed; `/pricing` was statically prerendered. Next.js reported the existing React 18 deprecation and ambiguous `duration-[250ms]` warning. `tsconfig.json` has no resulting diff. |
| `npm run verify:db` | Passed local database checks. This is not a live production database audit. |
| `npm run verify:pdf` | Passed: 14 documents, 20 pages, zero overflow, structure, or content findings. |
| `npm audit` | 0 vulnerabilities. |
| Responsive + axe | At 320, 375, 390, 768, 1024, 1200, and 1440 px, in light and dark: zero page horizontal overflow and zero axe WCAG 2 A/AA or 2.1 A/AA violations. All 16 rows and header associations remain present. |
| Keyboard + FAQ | At 390 px, the shared menu opens with Enter, closes with Escape, and returns focus. Tab order reaches the cards, table, all five FAQ summaries, and bottom CTA. All five FAQs open with Enter and close with Space. The computed normal-motion disclosure duration is 0.26 s. The table scrolls by keyboard (0 → 40 px) and its last column is reachable at 464 px. |
| Themes + CTAs | The theme toggle switches dark and back. All three signup buttons were clicked and reached `/signup`; its GET returned 200. Both Studio anchors have the exact approved `mailto:`; opening a local email application or delivering email was not tested. |
| Reduced motion + no JS | No reduced-motion card hover transform or FAQ transition; hero is visible. Without JS the three cards, 16 rows, five FAQs, and hero render, and a native FAQ opens with Enter. |

Axe returned one **incomplete color-contrast rule** per viewport/theme because it cannot automatically assess gradient backgrounds, checkmark-only symbols, or the shared footer SVG. The browser evidence records the affected nodes; this is not a clean bill of health from automation alone. For pricing-specific cases, computed gradient-stop/color checks found worst-case ratios of 5.06:1 for the muted banner text, 5.86:1 light / 6.16:1 dark for the large gradient hero text, and 6.99:1 light / 8.42:1 dark for comparison checkmarks. The shared decorative footer SVG remains an automated-review limitation. Manual contrast checks and automated scans do not replace a full assistive-technology audit.

### PR #53 LCP scenarios

Three fresh local PerformanceObserver runs per scenario, after the production build; no network throttling. The mobile viewport was 412 × 823 at 1.75× DPR, the desktop viewport 1,440 × 900 at 1× DPR. The candidate was the hero description on mobile and the `h1` on desktop. Every run recorded early hero opacity 1, zero page errors, and CLS 0.

| Scenario | LCP samples (ms) | Median (ms) |
| --- | --- | ---: |
| A — mobile, unthrottled CPU | 116 / 112 / 132 | 116 |
| B — mobile, 4× CPU throttle | 256 / 256 / 268 | 256 |
| C — desktop | 132 / 132 / 140 | 132 |
| D — mobile, reduced motion | 124 / 140 / 120 | 124 |

These local measurements are not Lighthouse, real-user, live Forma, or production results. The earlier baseline is retained in `docs/evidence/forma-pricing-audit/baseline-browser.json`; its desktop viewport differed, so its numbers should not be treated as a directly controlled performance comparison. The post-redesign evidence is `docs/evidence/forma-pricing-audit/redesign-pr53-lcp.json` and `redesign-browser.json`. No production deployment or live checkout test was performed.
