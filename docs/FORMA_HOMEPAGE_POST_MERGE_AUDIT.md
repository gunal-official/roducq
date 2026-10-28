# Forma homepage post-merge audit

**Audit date:** 2026-10-28 (Asia/Kolkata)
**Outcome:** **The approved integration-link fix is verified.** Axe reports zero violations at all 14 requested viewport/theme combinations.
**Remaining accessibility limitation:** axe still marks layered/gradient preview contrast as incomplete; see §5.
**Live-production visual check:** **UNVERIFIED.** Deployment metadata is verified, but the production domain could not be reached from this sandbox.
**Production deployment:** none.

**Pull request:** [#79 — Roducq — Fix homepage integration link accessible names](https://github.com/gunal-official/roducq/pull/79), open against `main` and intentionally unmerged. GitHub `verify`, Vercel Preview, and Vercel Preview Comments checks passed.

This audit covers the `main` baseline after PR #76 and the narrowly approved accessible-name fix. The fix only removes a redundant ARIA name from the six integration-card links; it does not change visible text, destinations, layout, styles, animation, pricing, or product claims.

## 1. Baseline and deployment evidence

- PR **#76** was merged at `2026-10-28T12:16:42Z`.
- Merge commit / audited baseline SHA: `9e774ac5ca88998fdd52fbfbf75bdcdf49f5d9af`.
- GitHub `verify` run **40686498188** for that SHA completed successfully.
- GitHub deployment **7385092983** targets the same SHA; environment `Production`; status `success` / “Deployment has completed,” recorded at `2026-10-28T12:17:40Z`. Its environment URL is `https://roducq-bz43hgntw-gunals-projects-ebbf653a.vercel.app`.
- The configured live homepage is `https://roducq.nanexi.com/`. The sandbox’s outbound host allowlist does not include the Vercel or custom production domains, so neither domain’s served HTML nor a browser session against it was verified. The deployment record is not treated as proof that the custom domain served this content.

The repository was built locally from the audited baseline plus this one-line component fix using `npm ci` and `npm run build`. The production build succeeded (Next.js 16.4.3); it emitted non-fatal warnings about the ambiguous `duration-[250ms]` utility and React 18 support. A local `next start` server on port 3100 was used for browser checks. It was not a deployment.

## 2. Approved fix and regression test

In `components/marketing/landing/IntegrationsSection.tsx`, the six `/integrations` card links no longer set `aria-label`. Their native accessible names now derive from their visible descendants: category, heading, and description; the decorative icon remains `aria-hidden`. Visible copy, `href`, class names, hover/focus treatment, and Reveal delay are unchanged.

Added `tests/components/integration-link-names.test.ts` with two focused regressions: the integration link has no `aria-label`/`aria-labelledby` override and renders its visible category/title/description within the anchor; all six card records contain visible title/description text. Playwright `getByRole('link', { name })` probes also matched each of the six visible card titles exactly once at every width and theme.

## 3. Responsive and visual regression checks

All requested widths were rechecked in light and dark themes: **320, 375, 390, 768, 1024, 1200, and 1440 CSS px**.

| Width | Root horizontal overflow (light/dark) | Responsive runner: offscreen controls / small taps | Features / integrations / teams / pricing columns |
|---:|---:|---:|---:|
| 320 | 0 / 0 px | 0 / 0 | 1 / 1 / 1 / 1 |
| 375 | 0 / 0 px | 0 / 0 | 1 / 1 / 1 / 1 |
| 390 | 0 / 0 px | 0 / 0 | 1 / 1 / 1 / 1 |
| 768 | 0 / 0 px | 0 / 0 | 2 / 2 / 2 / 2 |
| 1024 | 0 / 0 px | 0 / 0 | 4 / 3 / 4 / 4 |
| 1200 | 0 / 0 px | 0 / 0 | 4 / 3 / 4 / 4 |
| 1440 | 0 / 0 px | 0 / 0 | 4 / 3 / 4 / 4 |

The change is ARIA-only. Before/after responsive results preserve the same visible headings, control geometry, and card-column breakpoints; root overflow remains zero, and no target below 44px was reported. At widths 320, 375, and 390 in both themes, the responsive screenshots were byte-identical before/after. The other captures include the animated `lm-drift` hero background and are not byte-identical across separate capture times; visual review shows no content/layout change. The only measured metric deltas were ±1px in the hero’s decorative overflow heuristic at a few desktop widths.

**Responsive-runner caveat:** the repository heuristic still exits nonzero because it reports one `cut` at every width in both themes. Each hit is the same hero `<section class="relative isolate overflow-hidden bg-lm-card">`: its `aria-hidden` absolute decorative layer has a larger `scrollWidth` than its clipped parent. The page root has zero horizontal overflow. An independent visible-text range scan found zero text crossing a clipping boundary and zero offscreen key controls/headings. This remains a **heuristic false positive, not a confirmed content defect**; the raw post-fix results are retained in [`forma-homepage-post-merge-postfix/`](screenshots/forma-homepage-post-merge-postfix/) and [`forma-homepage-post-merge-postfix-dark/`](screenshots/forma-homepage-post-merge-postfix-dark/).

The desktop/mobile screenshots and full-page capture from the original visual comparison are in [`screenshots/forma-homepage-post-merge/`](screenshots/forma-homepage-post-merge/); the post-fix responsive captures are in the two directories above.

## 4. Navigation and keyboard checks

At 390px, the six integration-card links were present and exposed to Playwright’s role/name query. Keyboard focus moved from the first card link to the second with Tab; the second link matched `:focus-visible`. Pressing Enter navigated to `/integrations`. This check found six links, focused both targets in order, and activated the destination successfully.

The mobile site menu also remains a working modal navigation control. Existing page-level checks confirmed the hero CTAs navigate to `/signup` and `/solutions`, and the mobile Pricing menu item reaches `/pricing` and closes the dialog. These routes, content, and product copy were not changed by this fix.

## 5. Axe results and remaining incomplete contrast findings

Axe-core **4.14.0** ran after scrolling reveal content into view at all seven widths in light and dark themes (**14 scans**), using WCAG 2.0/2.1/2.2 A/AA and best-practice tags. **Every scan returned zero violations**, including zero `label-content-name-mismatch` findings. All six visible integration-card titles matched exactly one accessible link in every scan; there were no page errors.

| Width | Light: violations / `color-contrast` incomplete | Dark: violations / `color-contrast` incomplete |
|---:|---:|---:|
| 320 | 0 / 43 | 0 / 43 |
| 375 | 0 / 43 | 0 / 43 |
| 390 | 0 / 43 | 0 / 43 |
| 768 | 0 / 44 | 0 / 42 |
| 1024 | 0 / 45 | 0 / 43 |
| 1200 | 0 / 45 | 0 / 43 |
| 1440 | 0 / 44 | 0 / 42 |

The remaining incomplete nodes are **not passes**: axe cannot determine some contrast backgrounds because preview artwork overlaps content or uses gradients. Complete per-node messages, targets, and the post-fix accessible-name probes are in [`axe-postfix-14-scans.json`](screenshots/forma-homepage-post-merge/axe-postfix-14-scans.json). The earlier four-scan report that captured the original six-node violation remains as [`browser-audit.json`](screenshots/forma-homepage-post-merge/browser-audit.json).

Representative manual pixel contrast samples are in [`manual-contrast.txt`](screenshots/forma-homepage-post-merge/manual-contrast.txt), with per-span gradient results in [`gradient-contrast-exact.json`](screenshots/forma-homepage-post-merge/gradient-contrast-exact.json). The sampled solid-color text met its applicable threshold. Exact gradient-stop versus rendered-background sampling found minima of 3.12:1 (light/390), 3.85:1 (light/1440), 3.06:1 (dark/390), and 3.96:1 (dark/1440), above the 3:1 large-text floor. These samples cover representative high-salience text only; they do not resolve every axe-incomplete preview node.

## 6. Reduced motion, no-JavaScript, and LCP / CLS

The prior audit verified the FAQ’s six native `<details>/<summary>` disclosures, Space/Enter toggling, light/dark theme switching, reduced-motion visibility, and no-JavaScript rendering. Those findings remain relevant because this fix changes only an ARIA attribute; their screenshots and records remain linked from the prior evidence in `browser-audit.json` and `no-javascript-390.png`.

The PR #53 four-scenario lab run was repeated after the fix with three fresh Chromium contexts per scenario. LCP is the median of in-page `largest-contentful-paint` entries; CLS is the median of layout-shift totals through 2.8 seconds after load. All LCP candidates were the hero lead paragraph: `P.lm-hero-in.mt-5.5.max-w-lm-measure-lead.text-lm-16.text-lm-ink-soft.md:text-lm-18` (“Capture the original context, shape a brief…”).

| Scenario | Conditions | LCP runs (ms) → median | CLS runs → median |
|---|---|---:|---:|
| A — mobile unthrottled | 412×823 CSS px, DPR 1.75; animations on; no CPU/network throttle | 168, 216, 184 → **184 ms** | 0, 0, 0 → **0.00000** |
| B — mobile 4× CPU | 412×823, DPR 1.75; animations on; CDP CPU rate 4; network unthrottled | 364, 376, 316 → **364 ms** | 0, 0.25237, 0 → **0.00000** |
| C — desktop unthrottled | 1440×900 CSS px, DPR 1; animations on; no CPU/network throttle | 268, 384, 272 → **272 ms** | 0, 0, 0 → **0.00000** |
| D — mobile reduced motion | 412×823, DPR 1.75; reduced motion before navigation; no CPU/network throttle | 288, 200, 224 → **224 ms** | 0.34418, 0, 0 → **0.00000** |

The occasional nonzero CLS entries in scenarios B and D were attributed by `PerformanceObserver` to the existing decorative `.lm-bloom-a/.lm-bloom-b.lm-drift` hero elements; they were not caused by the ARIA-only change. The median is zero in each scenario, but the individual outliers are retained here rather than hidden. No animation, hero, CSS, or LCP behavior was changed as part of this fix. Full entries and conditions are in [`lcp-scenarios.json`](screenshots/forma-homepage-post-merge/lcp-scenarios.json). These are local lab results, not measurements of the live domain, a throttled network, or real-user telemetry.

## 7. Visual comparison with all five supplied PDF pages

The source pages are retained as rendered images in [`reference-pages/`](screenshots/forma-homepage-post-merge/reference-pages/). Current 1440×900 browser captures are in [`comparison/`](screenshots/forma-homepage-post-merge/comparison/). The comparison is qualitative; the PDF is portrait print output and the current screenshots are browser viewports with different product copy and section heights. **No pixel-perfect fidelity is claimed.**

| PDF page | Reference content | Current homepage evidence | Observed comparison |
|---:|---|---|---|
| 1 | Header, centered hero, product preview, start of feature section | [Reference p.1](screenshots/forma-homepage-post-merge/reference-pages/page-1.png) · [Current hero and preview](screenshots/forma-homepage-post-merge/comparison/01-hero-and-preview.png) · [Feature cards](screenshots/forma-homepage-post-merge/comparison/02-feature-cards.png) | The centered hero, compact navigation, purple accent, and large framed product preview remain. Roducq’s approved headline, explanation, actions, and dashboard are used; Forma wording is not copied into the product. |
| 2 | Four feature cards, three setup steps, framed workflow visual, integrations intro | [Reference p.2](screenshots/forma-homepage-post-merge/reference-pages/page-2.png) · [Current feature cards](screenshots/forma-homepage-post-merge/comparison/02-feature-cards.png) · [Current steps](screenshots/forma-homepage-post-merge/comparison/03-getting-started-steps.png) | The broad sequence of compact cards, numbered steps, and a purple-framed workflow illustration is present. Content and examples are Roducq-specific. |
| 3 | Integrations grid, team-specific cards, pricing-section lead-in | [Reference p.3](screenshots/forma-homepage-post-merge/reference-pages/page-3.png) · [Current integrations/context](screenshots/forma-homepage-post-merge/comparison/04-client-context-integrations.png) · [Current team cards](screenshots/forma-homepage-post-merge/comparison/05-team-cards.png) · [Pricing lead-in](screenshots/forma-homepage-post-merge/comparison/06-pricing.png) | Integration cards, a four-column team layout at desktop widths, and a pricing section follow a similar hierarchy. Connector/capability labels and disclosures remain Roducq-specific and unchanged. |
| 4 | Pricing cards, FAQ, purple closing CTA | [Reference p.4](screenshots/forma-homepage-post-merge/reference-pages/page-4.png) · [Current pricing](screenshots/forma-homepage-post-merge/comparison/06-pricing.png) · [Current FAQ](screenshots/forma-homepage-post-merge/comparison/07-faq.png) · [Current CTA](screenshots/forma-homepage-post-merge/comparison/08-closing-cta.png) | The current page retains Starter **$29**, Team **$79**, and Studio **$199**, plus a separate contact option. FAQ and closing CTA remain distinct sections. No pricing changes were made. |
| 5 | Footer columns and large pale wordmark | [Reference p.5](screenshots/forma-homepage-post-merge/reference-pages/page-5.png) · [Current footer](screenshots/forma-homepage-post-merge/comparison/09-footer.png) | Both end with grouped navigation and a large pale brand mark; footer links and product description are Roducq-specific. |

## 8. Verification and limitations

Verification after the approved change:

- Focused regression: **2 tests passed**.
- Full test suite: **1,331 tests / 335 suites passed**.
- TypeScript: `npx tsc --noEmit` passed.
- Lint: `npm run lint` passed.
- Build: `npm run build` passed.
- Database: `npm run verify:db` passed; offline PGlite checks only.
- PDF: `npm run verify:pdf` passed — 14 documents, 20 pages, zero overflow/structure/content findings.
- Browser: 14 axe scans, zero violations; keyboard link activation passed; responsive sweep retains the documented hero-cutoff heuristic result.

Limitations: the live production domain was not directly fetched or browser-tested; axe’s 42–45 contrast nodes per scan remain incomplete and manual samples do not cover every preview label; the responsive runner’s hero cutoff heuristic remains a false positive; and occasional nonzero CLS entries from decorative hero blooms were observed in two of three runs in scenarios B and D, despite zero medians. No production deployment was performed.

This audit documents the approved accessible-name fix and verification. A pull request will be opened against `main` as requested and left open and unmerged; Vercel Preview may run, but there will be no production deploy.
