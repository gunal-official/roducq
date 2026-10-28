# roducq — final site-wide marketing visual, motion, accessibility & performance audit

**Audit date:** 2026-10-28 (Asia/Kolkata)
**Reference:** <https://forma-visuvate.framer.website/> (home, features, solutions, integrations, pricing, changelog, about)
**Production:** <https://roducq.nanexi.com/>
**Outcome:** **PASS with three P3 polish items and one P2 performance note.** No P0 or P1 finding. No application code was modified.
**Deployment:** none. No production deployment was triggered by this audit.

Every claim below carries one of these labels:

| Label | Meaning |
| --- | --- |
| **[MEASURED]** | a number read from a real Chromium 153 run in this environment, reproducible from the evidence files in `docs/evidence/final-marketing-audit/` |
| **[DOCUMENTED]** | a value already recorded in an existing reference doc, not re-derived here |
| **[OBSERVED]** | read from the served HTML / rendered text of a live URL, without a browser session (no computed styles) |
| **[INFERRED]** | chosen because no measurement covers it, with the reason stated |
| **[UNVERIFIED]** | no evidence available — stated as a gap, never as a pass |

---

## 1. Verified repository and deployment baseline

### 1.1 Repository

| Check | Result |
| --- | --- |
| `main` at audit start **[MEASURED]** | `6996c665f994cd6c6be08dfd6d45316d3f438b03` — "Merge pull request #79 from gunal-official/arena/ba23ee3e-roducq" |
| `git fetch origin --prune` | clean; `origin/main` = the same commit |
| Session branch | `arena/7e13e6f0-roducq`, branched from `6996c66`; **0 ahead / 0 behind** `origin/main` |
| Working tree at start | **clean** (`git status --porcelain` empty) |
| PR **#78** status **[MEASURED]** | **MERGED** — `2026-10-28T13:32:22Z`, merge commit `69d00bf8a9602cec770a261c9d88eb1881bee7a6`, base `main` |
| PR **#79** status **[MEASURED]** | **MERGED** — `2026-10-28T13:33:25Z`, merge commit `6996c665f994cd6c6be08dfd6d45316d3f438b03` (= `main` HEAD), base `main` |
| Other open PRs **[MEASURED]** | **none** (`gh pr list --state open` returned an empty array) |
| Toolchain | Node v22.22.3, npm 10.9.8, Next 16.4.3, React 18.3.1, `motion` 14.3.0 |

Both requested PRs are confirmed merged at the commits the merge records claim; neither was assumed. Because no other PR is open, nothing in flight can change a marketing page.

### 1.2 Deployment

| Check | Result |
| --- | --- |
| Latest Production deployment **[MEASURED]** | id `7386809442`, sha `6996c665f9…`, environment `Production`, created `2026-10-28T13:34:06Z` |
| Deployment status **[MEASURED]** | `state=success`, "Deployment has completed", environment URL `https://roducq-hnqtqduph-gunals-projects-ebbf653a.vercel.app` |
| Production commit | identical to `main` HEAD and to this session branch's base |

So the production deployment is the commit this audit measured locally — not an older build.

### 1.3 What could and could not be verified against the live domain

| Check | Result |
| --- | --- |
| `https://roducq.nanexi.com/` served HTML **[OBSERVED]** | reachable; renders the announcement band, the 7-item header, the hero, the four feature cards, the three-step band, the six integration cards with visible accessible names, the four team cards, and the three-plan pricing band |
| Browser session against production **[UNVERIFIED]** | **not performed.** The sandbox's egress allowlist does not include `roducq.nanexi.com` or the Vercel domains: `curl` fails with `SSL_ERROR_SYSCALL` (`000`). The HTML above came from an out-of-sandbox fetch, which cannot report computed styles, layout, console errors or paint timings |
| Forma live computed styles re-measured today **[UNVERIFIED]** | no browser session against `forma-visuvate.framer.website` from this sandbox; its **structure and copy were re-read today [OBSERVED]**, and its **numbers are the previously measured values [DOCUMENTED]** from `docs/FORMA_*_REFERENCE.md` (captured on a GitHub-hosted runner, which can reach the host) |

This is a real limitation, not a formality: every pixel, timing and contrast number in this document describes the **locally built production bundle at `6996c66`**, served by `next start`, driven by real Chromium. §11 lists exactly what remains unproven about the live domain.

### 1.4 Documentation reviewed

`docs/ANIMATION_NOTES.md`, `docs/FORMA_FINAL_FIDELITY_AUDIT.md`, `docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md`, `docs/FORMA_HOMEPAGE_POST_MERGE_AUDIT.md`, `docs/FORMA_ABOUT_FINAL_VERIFICATION.md`, `docs/FORMA_PRICING_REDESIGN.md`, `docs/FINAL_GO_LIVE_READINESS.md` — all read in full where they bear on a decision, all cross-checked against measurement rather than trusted.

Three previously recorded claims are **corrected** by this pass; they are listed in §5.4, §7.4 and §9 so nobody re-derives them from an old promise.

### 1.5 Environment and method

| | |
| --- | --- |
| Browser | **Chromium 153.0.8010.0** — `@sparticuz/chromium` 153 (brotli-inflated `bin/chromium.br` + the `al2023` shared libraries), driven by `playwright-core` 1.63.0 through `executablePath`. Same chain the previous two audits used, so numbers stay comparable |
| Build under test | `npm ci` → `npm run build` → `next start` on loopback. **Not** a dev server |
| axe-core | 4.14.0, the repository's own devDependency, injected into the live page |
| Harnesses | `scripts/verify-marketing-consistency.mjs` (shell/axe/LCP/motion), `scripts/verify-motion.mjs`, `scripts/sample-marketing-contrast.mjs` — all pre-existing, run unmodified; plus four audit-only probes for the questions those harnesses cannot answer (see the evidence index) |
| Themes | light and dark, via `colorScheme` + the persisted `theme` key |
| Widths | 320 / 375 / 390 / 768 / 1024 / 1200 / 1440 CSS px |

Audit-only probes were written to `/tmp` and are **not** part of the change set; their outputs are the evidence files. No probe imports app code and none writes to the repository except the evidence folder listed in §11.

---

## 2. Reference measurements

### 2.1 What was measured, and what was only read

The Forma pages were read today **[OBSERVED]**: band order, heading text, section counts, card counts, control inventory and status labels. Those are structural facts and are reliable.

Numeric geometry, colour, type and motion remain **[DOCUMENTED]** from the existing captures. They are not re-derived here and are not presented as fresh measurement.

### 2.2 Reference structure, read today

| Forma page | Bands and controls observed **[OBSERVED]** |
| --- | --- |
| `/` | announcement pill → 5-item nav + `Get started` → hero headline split **one word per heading**, two CTAs (`Start for free`, `Try the demo`), "Free plan available", "Connects with +5 more" → dashboard preview → **4** feature cards → 3 setup steps + day timeline → **3-column** integration strip ("Twelve integrations today", 9 shown) → **4** teams → pricing (**Free/Pro/Team** cards + **Enterprise** row, Monthly/Yearly toggle "−20%") → **6** FAQ rows → closing CTA "Try Forma with your own projects" → footer |
| `/features` | h1 + **6** numbered feature sections (01 Automations … 06 Collaboration) → "Details / Smaller things that save time" with **4** small cards → CTA |
| `/solutions` | h1 + **4** audiences, each with 3 "Workflows teams set up first" items + Templates + a product mock → "Choosing a plan" band ("For a team, start with the Team plan") → CTA |
| `/integrations` | h1 + "12 integrations" + **12** cards, each with category and an `Available` / `Beta` status → "How connecting works" **3** steps → "Request an integration" form → CTA |
| `/pricing` | h1 + **4** plan cards (Free $0, Pro $15, Team $30, Enterprise custom) + Monthly/Yearly −20% toggle → "Compare plans / Full feature comparison" table → Enterprise band → **5** billing FAQ rows → CTA |
| `/changelog` | h1 + **4** category filters (All updates / New / Improved / Fixed) → **8** releases, dated and versioned, newest first → CTA |
| `/about` | h1 → story band → "How we make product decisions" with **5** numbered principles → **3** link cards (Changelog / Security / Contact) → CTA |

### 2.3 Measured reference values the recreation is held to **[DOCUMENTED]**

| Property | Reference value | Source |
| --- | --- | --- |
| Content column @1440 / @768 / @390 | 1240px (x=100) / 736px (x=16) / 358px (x=16) | `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §2 |
| Home hero headline | 72px / 400 / 1.02; 48px @1024; 43px @390 | same |
| Home section heading | 54px / 400 / 1.1; 34px @1024; 32px @390 | same |
| Interior h1 | Manrope 600, 67.2px / 68.54px, letter-spacing −2.016px | `docs/FORMA_FEATURES_PAGE_AUDIT.md` L99, `docs/FORMA_SOLUTIONS_REFERENCE.md` L145 |
| Action button | radius 10px, height 52px, 15px/400 | `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §2 |
| Purple frame | `#36278c` → `#9178e6` | same |
| Connector flow | `flowLinesDash` 1000ms linear infinite, no per-path delay | same |
| Headline line rise | 900ms `cubic-bezier(0.16,1,0.3,1)`, lines at 80 / 280ms | same |
| Hero entrance ladder | 0 / 80 / 550 / 650 / 720 / 800 / 850ms, dashboard 1300ms | same |
| Link / button transition | 0.2s | same |
| FAQ disclosure | 260ms | `docs/ANIMATION_NOTES.md` §3 |

### 2.4 Where roducq deliberately departs from the reference

These are **not** defects. Each is recorded in an approved doc and each was re-verified as still true:

| Surface | Forma | roducq | Why |
| --- | --- | --- | --- |
| Header destinations | 5 | **7** (adds About, Compare) | both are real shipped routes; dropping them would hide two pages behind no primary link. `docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md` §4.1 |
| Home headline markup | one heading per word | two masked lines, per-word cadence | pre-existing typography was preserved by instruction; identical 900ms / 50ms rhythm. `ANIMATION_NOTES.md` §7 D1 |
| FAQ implementation | JS accordion (`div` + `tabindex`) | native `<details>` / `<summary>` | no-JS correctness and real disclosure semantics. §7 D3 |
| Billing toggle | Monthly / Yearly −20% | **absent** | no annual Razorpay plans exist; advertising a discount that cannot be bought was explicitly rejected. `docs/FORMA_PRICING_REDESIGN.md` L15 |
| Plan set | Free / Pro / Team / Enterprise | **Starter $29 / Team $79 / Studio $199** + a Studio contact card | roducq's approved commercial plans |
| Integration count | 12 | **7** (3 read-only connectors + 4 native outputs) | only capabilities that actually exist are claimed |
| Product content | task manager | client work (intake → brief → proposal → plan → update) | roducq's own product |

---

## 3. Eight-page visual consistency matrix

Measured at 1440×900, light and dark, on all eight routes **[MEASURED]**.

Legend: ✔ identical · ◆ intentional difference (preserved) · — not applicable.

| Surface | `/` | `/features` | `/solutions` | `/integrations` | `/pricing` | `/changelog` | `/about` | `/vs` | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Logo + wordmark | 17 / 28px, 700, −1.02px | same | same | same | same | same | same | same | ✔ **8/8** |
| Header height | 64 (<768) / 72 (≥768) | same | same | same | same | same | same | same | ✔ **8/8** |
| Header plane | `rgb(255,255,255)`, sticky, no hairline | same | same | same | same | same | same | same | ✔ **8/8** |
| Nav list | 7 items | same | same | same | same | same | same | same | ✔ **1** distinct label+href signature across 112 renders |
| Nav type | 15px / 400, `rgb(104,112,131)` | same | same | same | same | same | same | same | ✔ |
| Nav padding | 10px <1200, 12px ≥1200 | same | same | same | same | same | same | same | ✔ |
| Active indicator | — (no nav item for home) | Features | Solutions | Integrations | Pricing | Changelog | About | Compare | ✔ **exactly one** per route |
| Theme toggle | icon control ≥1024 | same | same | same | same | same | same | same | ✔ **48/48** toggled |
| Announcement band | present, 61px ≥768 | same | same | same | same | same | same | same | ✔ |
| Footer | 3 nav columns + back-to-top + 1024×192 wordmark | same | same | same | same | same | same | same | ✔ **8/8**, 2 signatures only (light/dark bg) |
| Canvas / ink | `rgb(249,247,252)` / `rgb(27,20,38)` | same | same | same | same | same | same | same | ✔ |
| Canvas / ink (dark) | `rgb(23,19,30)` / `rgb(244,240,251)` | same | same | same | same | same | same | same | ✔ |
| Body font | Manrope (+ fallback stack) | same | same | same | same | same | same | same | ✔ |
| Button geometry | radius 10px, height 44px, 14px/600 | same | same | same | same | same | same | same | ✔ |
| h1 | 72px/400 | 67.2/600 | 67.2/600 | 67.2/600 | 68/600 | 67.2/600 | 67.2/600 | 36/700 | ◆ two measured reference steps + `/vs` (pre-Forma layout, preserved) |
| Section-heading step | 54px/400 | 42px/600 | 42px/600 | **54px/400** | 54px/600 | 28.8px/600 | 43.2px/600 | 16px/700 | ◆ per-page composition — see **P3-1** |
| Closing CTA heading | 64px/600 | 64.8px/600 | 64.8px/600 | 64.8px/600 | 64px/600 | 64.8px/600 | 64.8px/600 | — | ✔ within 0.8px |
| Letter-spacing / size | −0.03em | −0.03em | −0.03em | −0.03em | **−0.045 … −0.055em** | −0.03em | −0.03em | −0.011em | ◆ `/pricing` runs a tighter scale — see **P3-2** |
| Card radius / hairline | `--lm-*` tokens | same | same | same | same | same | same | same | ✔ |
| Focus treatment | 2px outline, card-scoped where the card is the target | same | same | same | same | same | same | same | ✔ (see §5.3) |
| Reduced motion | 0 running animations, 0 hidden bands | same | same | same | same | same | same | same | ✔ **8/8** |
| No-JS | full text, no opacity-0 content | same | same | same | same | same | same | same | ✔ |
| Horizontal overflow | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ **112/112 cells** |
| Console / page errors | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ✔ **112/112 cells** |

**The shell is genuinely one shell.** The header nav produces a *single* distinct `(labels, hrefs)` signature across all 112 route × width × theme renders, the footer produces two (light background, dark background) and nothing else, and every token above is byte-identical across routes. The two intentional type differences are catalogued as P3-1 and P3-2 rather than "fixed", because this audit makes no design changes.

---

## 4. Responsive results

**112 cells** — 8 routes × 7 widths (320, 375, 390, 768, 1024, 1200, 1440) × 2 themes — each scrolled end-to-end first, so every scroll-triggered band was in its settled state before measurement **[MEASURED, `responsive-112-cells.txt`]**.

| Check | Result |
| --- | --- |
| Root horizontal overflow (`scrollWidth − clientWidth`) | **0 in all 112 cells** (also 0 on the `/vs/notion` spot check) |
| Touch targets under 44×44 (stretched `::after` hit areas counted as the card) | **0** |
| Text clipped by an ancestor that is not a horizontal scroll strip | **0** |
| Overlapping headings / CTAs | **0** |
| Text painted outside the viewport with no scrollable ancestor | **0** |
| Page or console errors | **0** |

Responsive transitions, measured:

| Boundary | Behaviour |
| --- | --- |
| 320 → 767 | header 64px; nav row hidden; hamburger dialog; footer 1 column; announcement stacks to 105–123px |
| 768 → 1023 | header 72px; nav still in the dialog; footer 2 columns; announcement single row 61px |
| 1024 → 1199 | full 7-item nav row at 10px padding; measured clearance between the row and the theme control |
| ≥ 1200 | nav padding returns to the measured 12px |

Homepage grid steps, measured from the grid containers' own children **[MEASURED]** — columns × items:

| Width | Features | Integrations | Teams | Pricing |
| --- | --- | --- | --- | --- |
| 320 / 375 | 1 × 4 | 1 × 6 | 1 × 4 | 1 × 4 |
| 768 | 2 × 4 | 2 × 6 | 2 × 4 | 2 × 4 |
| 1024 / 1200 / 1440 | **4** × 4 | **3** × 6 | **4** × 4 | **4** × 4 (`1.5fr 1fr 1fr 1fr`) |

That is the composition the brief asks for: a four-column feature band, a **three-column** integration band, a four-column team band, and a four-track pricing band whose four slots hold **three commercial plans plus the Studio contact card**.

---

## 5. Accessibility findings

### 5.1 axe-core

8 routes × 3 widths (320 / 768 / 1440) × 2 themes = **48 scans**, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`, after a full scroll pass **[MEASURED, `shell-axe-lcp-motion.json`]**.

| | Result |
| --- | --- |
| Violations | **0**, in all 48 scans |
| Passing rule checks | **2,056** |
| Incomplete | **832 `color-contrast` node instances** — the only incomplete rule |

**The 832 incomplete nodes are not passes, and are not reported as ones.** axe cannot compute a ratio when the background is a gradient, an image, or a decorative overlay, which is most of this design. They break down as:

| Route | 320 | 768 | 1440 |
| --- | --- | --- | --- |
| `/` | 43 / 43 | 44 / 42 | 44 / 42 |
| `/features` | 20 / 20 | 13 / 13 | 14 / 14 |
| `/solutions` | 20 / 20 | 16 / 16 | 18 / 18 |
| `/integrations` | 13 / 13 | 13 / 13 | 13 / 13 |
| `/pricing` | 28 / 28 | 28 / 28 | 28 / 28 |
| `/changelog` | 12 / 12 | 12 / 12 | 12 / 12 |
| `/about` | 8 / 8 | 8 / 8 | 8 / 8 |
| `/vs` | 1 / 1 | 1 / 1 | 1 / 1 |

(light / dark. Identical counts in both themes is itself informative: the incomplete set is structural — gradient panels and mock artwork — not a light-only artefact.)

### 5.2 Rendered-pixel contrast — the part axe cannot answer

Two independent measurements, both of which sample the **actual backdrop under the glyphs** rather than a pixel beside the box.

**(a) The repository's sampler, run unmodified** — 18 text-on-gradient cases and 4 gradient-stop sweeps × 2 themes **[MEASURED, `contrast-matrix.txt` part 3]**:

| Case | Measured | Needs | Verdict |
| --- | --- | --- | --- |
| Home hero note (12px muted on card) | 5.01 / 6.17 dark | 4.5 | PASS |
| Home closing CTA headline (64px white on gradient) | 8.25 | 3 | PASS |
| Home closing CTA body (19px `#efebff`) | 6.23 | 4.5 | PASS |
| Home dark pricing card title / body | 15.62 / 9.88 | 4.5 | PASS |
| Works-with chip inside the purple frame (10px) | 5.01 / 6.17 | 4.5 | PASS |
| `/solutions` stage headline / body / note | 7.23 / 6.83 / 4.57 | 3 / 4.5 / 4.5 | PASS |
| `/solutions` stage body at 768 | 6.12 | 4.5 | PASS |
| `/features`, `/integrations`, `/changelog` stage headline | 8.72–8.75 | 3 | PASS |
| `/features`, `/changelog` stage body | 6.78–6.97 | 4.5 | PASS |
| `/changelog` stage body at 768 | 4.59 | 4.5 | PASS |
| `/changelog`, `/integrations` mock disclosure at 320 (11px) | 4.57 | 4.5 | PASS |
| Soft gradient on the `/solutions` stage | 6.50–7.12 | 3 | PASS |
| **Home hero first gradient stop** | **2.02** | 3 | **FAIL — instrument artefact, see §5.4** |

**(b) Glyph-core measurement, written for this audit** — the box is captured twice at DPR 2 (as rendered, and painting nothing); pixels that differ by more than a threshold are glyph cores, and the second pass gives the exact backdrop each one sat on; each element is then scored against **its own computed gradient stops** **[MEASURED]**:

| Measurement | Cases | Result |
| --- | --- | --- |
| Solid-colour headline text, 8 routes × 2 themes × 3 widths | 48 | **48 PASS**, worst 11.25:1 |
| Gradient-painted headline words, 7 routes (none on `/vs`) × 2 themes × 2 widths | 28 | **28 PASS**, worst 3.03:1 |

Worst gradient-word readings, and why they matter:

| Route | Theme | Width | Worst stop | Backdrop under glyphs | Ratio | Floor |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | light | 390 | `rgb(168,85,251)` | `rgb(234,225,253)` | **3.11** | 3.0 |
| `/` | dark | 390 | `rgb(139,92,246)` | `rgb(54,44,81)` | **3.03** | 3.0 |
| `/` | light / dark | 1440 | — | `rgb(255,255,255)` / `rgb(33,27,41)` | 3.92 / 3.96 | 3.0 |
| other 6 pages | both | 390 and 1440 | — | page card / dark card | 3.92 / 3.96 | 3.0 |

Every gradient word clears the 3:1 large-text floor, but the homepage's at 390px clears it by **0.03–0.11** — recorded as **P3-3**, not as a pass with room to spare.

### 5.3 Keyboard, focus and semantics

| Check | Result |
| --- | --- |
| First Tab stop on every route **[MEASURED]** | `Skip to content` (112/112 cells) |
| Focus stops checked | **896** (112 cells × 8 tabs); **0** null stops — every Tab reached a real control |
| Stops whose focused element reported no outline | **18**, all of them the three `/about` link cards at 320/375/390/768 in both themes. **Not a defect:** those cards deliberately draw the ring on the *card* via `:focus-within` (2px `rgb(98,70,234)` light / `rgb(167,139,250)` dark, `outline-offset: 2px`), because the whole card is the target. Re-measured directly in both themes: every card link reports `:focus-visible`, its card reports `:focus-within`, and the card's outline resolves to `solid 2px`. The harness reads only the focused element's own outline, so it cannot see an ancestor ring — a **harness limitation**, documented in §9.4 |
| Heading hierarchy | exactly **one `h1` per route** (all 8, plus `/vs/notion`); axe `heading-order` passes on all 48 scans |
| Link accessible names | homepage integration cards derive their names from visible text (PR #79's fix holds); axe `label-content-name-mismatch` reports **0** |
| Mobile menu dialog (390px) | `role="dialog"`, `aria-modal`, labelled; **7** destination links + `Create your workspace` + `Log in` + a 3-way theme control; **focus trap 12/12 stops inside**; Escape closes; focus returns to `Open menu`; activating `Solutions` navigates and closes |
| axe with the dialog **open** | **0 violations**, 33 passes; incompletes: `color-contrast` 15, `aria-hidden-focus` 7 |
| FAQ | 6 native `<details>`/`<summary>`; first item open by default (`open={index === 0}`); mouse toggle **6/6 at 1440 and 6/6 at 390**; **Enter 5/5**, **Space 10/10** toggles; `::details-content` transition `0.26s, 0.26s` |
| Filters — `/integrations` | 7 chips with `aria-pressed`, mutual exclusivity, live counts: All 7 · Chat 1 · Docs & notes 1 · Email 1 · Automation 1 · Files & exports 2 · Sharing 1; search filters; `No integrations match` empty state; Enter activates |
| Filters — `/changelog` | 4 chips; entry counts 8 / 7 / 3 / 2 |
| Theme toggle | 48/48 desktop cells flipped; persists across reload and across routes |

### 5.4 Correction — the one `FAIL` in the repo's contrast sampler is an instrument artefact

`scripts/sample-marketing-contrast.mjs` reports, on every run:

```
/   2.02:1 FAIL (needs 3) gradient stop rgb(98,70,234) at x=588 on rgb(158,135,244) — 72px/400
```

It is not a contrast failure. The sampler's gradient sweep samples a *backdrop-only* pixel at a fraction of the element's width. On the other six pages the matched element is a single gradient span, so that pixel is page background. On the homepage the gradient is applied **per word** (`span.lm-hero-word.lm-text-gradient`), so `x = left + 15% of the word's box` lands **inside the word** — and `rgb(158,135,244)` is not a background at all, it is a glyph pixel: `#6246ea` antialiased over the white card, seven samples in.

Measured against what is genuinely behind those glyphs, the same stop reads **3.11:1** at 390px and **11+** at 1440px (§5.2b). The homepage hero headline sits on `rgb(255,255,255)` with two soft decorative blooms that never reach the type (§7.5).

**Recommended (not applied):** make the sweep sample the union of the element's *non-gradient* ancestors, or skip stops whose sampled pixel differs from the surrounding card — i.e. teach the sampler the per-word case. Until then that line should be read as "instrument edge case", which is exactly how this audit treats it.

### 5.5 Reduced motion and no-JavaScript

| Check | Result |
| --- | --- |
| `prefers-reduced-motion: reduce`, 8 routes × 2 widths | **0 running animations**, **0 hidden bands**; reveal `data-visible="true"`, duration `0`, opacity `1`, transform `none` |
| Chart line under reduced motion | `stroke-dashoffset: 0px` (fully drawn, not blank) |
| FAQ under reduced motion | transition `0s` — opens instantly, content never hidden |
| Drift blobs under reduced motion | `animation: none` |
| No-JavaScript, 8 routes | full text rendered (1,548–10,263 characters per page), one `h1` each, **no essential text at opacity 0**. `/solutions` shows two `aria-hidden="true"` crossfade pills at `opacity-0` — decoy-free decoration, and the visible pill in the same group stays opaque |

---

## 6. Motion fidelity

`scripts/verify-motion.mjs` (the repository's own harness) was run against the produced build: **PASS — 12 viewport/theme renders + tablet boundary + motion + reduced motion** **[MEASURED]**.

Measured computed values versus `docs/ANIMATION_NOTES.md` (its timing authority):

| Surface | Spec (ANIMATION_NOTES) | Measured today | Verdict |
| --- | --- | --- | --- |
| Scroll reveal | 620ms desktop / 420ms ≤767 | `620` / `420`, `data-motion` switches at the 767/768 boundary | ✔ |
| Hero line rise | 900ms, 50ms per word | `0.9s` at every width | ✔ |
| Chart draw | 620ms | `0.62s` | ✔ |
| Step connectors | 1000ms, linear, infinite, no delay | `1s`, `infinite`, `linear` | ✔ |
| Header entrance | 420ms / 340ms | `0.42s` / `0.34s` | ✔ |
| Announcement entrance | 360ms / 300ms | `0.36s` / `0.3s` | ✔ |
| Ambient drift | 14s desktop, off ≤767 | `14s` / `0s` (animation none) | ✔ |
| FAQ disclosure | 260ms open and close | `0.26s, 0.26s` on `block-size, content-visibility` | ✔ |
| Button / link transition | 0.2s | `0.2s` (`0.001s` under reduced motion) | ✔ |
| Reduced motion | nothing animates | every surface `none` / `0s`, reveal duration `0`, iterations `1` | ✔ |
| PR #53 opacity contract | LCP text opaque at first paint | hero `h1` and lead report `opacity: 1`, `visibility: visible`, `filter: none` at first paint on all 8 routes | ✔ |

**Motion is faithful to its recorded authority and the three protections are intact:** the PR #53 opacity-preserving LCP fix (see §7.2 — mobile emits a real LCP candidate on every route), reduced-motion behaviour, and no-JavaScript visibility. No animation library was added; `motion@14.3.0` is the only one present.

Only one motion surface behaves differently from the notes, and it is *lighter*, not heavier: at ≤767px the drift loop is `animation: none` by CSS, which is the documented compact reduction.

---

## 7. Performance and the CLS investigation

### 7.1 Method

The PR #53 four scenarios, **3 fresh runs per scenario**, 8 routes, LCP and CLS read from the page's own `PerformanceObserver` entries **[MEASURED, `shell-axe-lcp-motion.json`]**. Chromium 153, produced build, loopback server, light scheme, CLS summed over a 2.8s post-load window (the PR #53 definition).

| Scenario | Conditions |
| --- | --- |
| A | 412×823 CSS px, DPR 1.75, no CPU/network throttle |
| B | 412×823, DPR 1.75, **CDP CPU throttling ×4**, network unthrottled |
| C | 1440×900, DPR 1, unthrottled |
| D | 412×823, DPR 1.75, `prefers-reduced-motion: reduce` |

### 7.2 LCP — all eight routes, all four scenarios

Medians in ms (range in brackets). Budget 2,500ms.

| Route | A | B (4× CPU) | C | D | LCP candidate |
| --- | --- | --- | --- | --- | --- |
| `/` | **172** (152–184) | **340** (260–396) | **240** (236–244) | **244** (212–248) | `p.lm-hero-in` hero lead |
| `/features` | 124 (104–124) | 244 (184–284) | 124 (120–128) | 116 (108–120) | hero lead |
| `/solutions` | 104 (96–160) | 252 (240–276) | 136 (120–156) | 124 (104–136) | hero lead |
| `/integrations` | 116 (88–124) | 200 (176–208) | 120 (108–128) | 88 (84–112) | hero lead |
| `/pricing` | 100 (100–112) | 224 (132–236) | 124 (96–148) | 124 (104–128) | hero description / `h1` |
| `/changelog` | 116 (108–156) | 212 (200–228) | 112 (104–120) | 124 (116–144) | hero lead |
| `/about` | 112 (100–120) | 180 (136–208) | 320 (280–360) | 104 (92–116) | `/about` body paragraph |
| `/vs` | 96 (84–116) | 176 (172–180) | 100 (100–104) | 92 (84–120) | intro paragraph |

Worst median anywhere is **340ms**, 86% inside budget. On mobile **every route now emits a real LCP candidate** — the "mobile LCP is never reported" defect recorded in `docs/FINAL_GO_LIVE_READINESS.md` §6.2 stays fixed, and the candidate is substantive text, not a header chip.

`/about`'s desktop candidate being the body paragraph rather than the hero is a correct consequence of its measured geometry (the prose block is larger than the display heading), not a regression.

### 7.3 CLS medians

| Route | A | B | C | D |
| --- | --- | --- | --- | --- |
| `/` | 0.000 | 0.000 (one run 0.1289) | 0.000 (one run 0.0086) | 0.000 |
| `/pricing` | 0.000 | 0.000 | 0.000 | 0.000 (one run 0.0065) |
| all other six | 0.000 | 0.000 | 0.000 | 0.000 |

Median CLS is **0.000 in all 32 route × scenario cells**. Outliers are retained, never averaged away, and are the subject of §7.4.

### 7.4 The intermittent homepage CLS spikes — investigated, not inferred

**Reproduced.** Ten runs per scenario on `/`:

| Scenario | CLS per run | Nonzero | Max |
| --- | --- | --- | --- |
| A — mobile unthrottled | 0 ×10 | 0/10 | 0.000 |
| **B — mobile 4× CPU** | `0.0613, 0, 0, 0.0843, 0, 0, 0.0811, 0, 0, 0.2348` | **4/10** | **0.2348** |
| C — desktop | 0 ×10 | 0/10 | 0.000 |
| D — reduced motion | 0 ×20 (extended to 20 runs) | 0/20 | 0.000 |

So the spike family is real, it belongs to the **CPU-throttled mobile** profile, and its magnitude (0.061–0.235 here; 0.252 and 0.344 previously) is consistent with what was reported. The historical **D = 0.34418 did not reproduce in 20 runs** — that outlier remains rare, not refuted.

**Attributed by the browser, not by guesswork.** Every nonzero entry carries `LayoutShiftAttribution` sources, and every source is one of the two decorative hero blooms:

```
run 0  value 0.0613 @298ms   div.lm-bloom-b.lm-drift  y 266 -> 284
                             div.lm-bloom-a.lm-drift  h 252 -> 186
run 9  value 0.1537 @186ms   div.lm-bloom-b.lm-drift  y 213 -> 260
                             div.lm-bloom-a.lm-drift  h 446 -> 274
```

No text, card, heading or layout container ever appears in the source list. All entries land between **186 and 396ms**.

**Controlled repeat measurement.** CSS was injected *pre-paint* by rewriting the document response, so each control was in force before first paint rather than after hydration. Ten B runs per control:

| Control | CLS runs | Nonzero |
| --- | --- | --- |
| baseline | `0.0613, 0, 0, 0.0843, 0, 0, 0.0811, 0, 0, 0.2348` | 4/10 |
| `.lm-bloom-* { animation: none }` | `0, 0.1388, 0, …` | 1/10 |
| `.lm-bloom-* { filter: none }` | `0, 0, 0.1411, 0, …` | 1/10 |
| `.lm-bloom-* { display: none }` | 0 ×10 | 0/10 |

**Do the blooms "genuinely cause layout shift"?** Direct measurement says **no content moves**:

| Measurement at 412px, 4× CPU, sampled at 0/60/120/200/300/500/900ms, 3 trials **[MEASURED]** | Result |
| --- | --- |
| `.lm-bloom-a` rect | `y=-253, h=608` — **constant across every sample** |
| `.lm-bloom-b` rect | `y=284, h=512` — **constant** |
| `animation-name` on both | `none` — the `≤767px` rule already disables the 14s drift on phones |
| hero `<section>` height | `1918px`, **constant** across the load |
| document height | `16,629px`, constant |

The blooms are `position: absolute`, inside a `pointer-events-none`, `aria-hidden` wrapper, with `-z-10` — they participate in no layout, and by 400ms their boxes are stable. The entries are therefore Blink recording the **initial resolution of two very large decorative boxes** (`38rem` / `32rem`, each `filter: blur(110px)`) while the main thread is 4× throttled — not a reflow of anything a visitor reads.

**Conclusion.** The spikes are **P2-1**: an ambient-decorative layer can register layout-shift entries on a throttled mobile device, and 4/10 throttled sessions exceeded the 0.1 "good" CLS threshold, with an observed maximum of 0.235 (below 0.25). Nothing users read moves; median CLS is 0.000 in every scenario; unthrottled and reduced-motion loads are clean 10/10 and 20/20. The honest statement of causality is bounded by sample size: 10 runs per control cannot rank `animation: none` against `filter: none` (both 1/10), and only removing the elements reached 0/10 — so the trigger sits in the bloom layer's first-layout/paint cost, not exclusively in either the animation or the blur. **[INFERRED]** for that last ranking.

The recommended minimal fix is in §10; it is **not applied**.

### 7.5 What is not claimed

No Lighthouse run (not installed in this workspace), no field/CrUX data, no network shaping (CPU-only throttling, matching the method used for `/features` and `/solutions`), no INP field value, and no measurement of the live domain. These are lab numbers and are labelled as such.

---

## 8. Functional and content verification

### 8.1 Links

| Check | Result |
| --- | --- |
| Distinct `href` values across 9 pages (8 + `/vs/notion`) | 65 |
| Internal destinations | **32 checked → 28 × HTTP 200, 4 × 307** |
| The four 307s | `/plans`, `/briefs`, `/intake`, `/proposals` → `/login` — auth redirects for unauthenticated visitors, correct |
| Dead or broken internal links | **0** |
| External links | 8 GitHub PR links (`/pull/9, 22, 40, 46, 52, 55, 62, 63`) — **all 8 resolve, HTTP 200** |
| `mailto:` links | Studio contact carries a prefilled subject; no bare `href="#"` anywhere |
| Canonical/OG URLs | resolve to `http://localhost:3000…` **in this build only** because `NEXT_PUBLIC_SITE_URL` is unset locally — an environment value, not a defect **[MEASURED]** |

### 8.2 Pricing and disclosures

| Check | Result |
| --- | --- |
| Commercial plans rendered | **3** — `Starter $29/ month`, `Team $79/ month`, `Studio $199/ month` |
| Highlighted plan | **Team**, exactly one card carrying `MOST POPULAR` |
| Additional-seat price | `+$12 / additional seat after 5 seats` on Team only |
| Comparison table | 21 rows across plan-detail and capability groups |
| Availability disclosures | present — limits "are not currently enforced by tier", additional-seat billing "is not currently implemented", tiers "are not mapped to separate paid-plan checkout", signup does not purchase a plan |
| Billing FAQ | 5 native disclosures under "Questions about pricing" |
| Annual billing | **no toggle, no annual price, no discount badge** — matches the approved decision that annual checkout does not exist (`docs/FORMA_PRICING_REDESIGN.md` L15). No fabricated annual figure is rendered |
| CTA destinations | Starter/Team → `/signup`; Studio → the approved `mailto:hello@roducq.dev` with a subject; no dead buttons |

Prices are display-only marketing copy; `lib/razorpay.ts`, checkout, subscriptions and entitlements were **not touched or exercised** by this audit.

### 8.3 Integration claims

| Check | Result |
| --- | --- |
| Directory entries | **7** — Slack, Notion, Connected mailbox (external, all `read-only`); Signed webhooks, PDF export, File import, Client links (native) |
| Claim accuracy | each external connector is described as **read-only, import-only**, with an explicit "Roducq does not post to Slack / does not write back to Notion / does not send email"; each native capability describes an outbound or export action that exists |
| Fabricated OAuth / Connect buttons | **none** — entry cards are inert; there is no fake connect control |
| Filters and search | 7 `aria-pressed` chips + search + `No integrations match` empty state, all functional and keyboard-operable (§5.3) |

The count is **lower** than the reference's 12 because roducq does not claim integrations it has not shipped. That is a content decision, and it is the correct one.

### 8.4 Changelog accuracy

| Check | Result |
| --- | --- |
| Releases | **8**, newest first |
| Dates | `2026-10-26` ×2, `10-25`, `10-18` ×2, `10-16`, `10-10`, `10-02` — all bound to `<time dateTime>` |
| Backing evidence | each release links to a real merged PR; **8/8 URLs return 200** |
| Category filters | All updates 8 · New 7 · Improved 3 · Fixed 2 — consistent with the per-entry tags (12 tags over 8 entries) |
| Fabricated versions / unshipped features | **none** — no semantic version numbers are invented |

### 8.5 Branding and content integrity

| Check | Result |
| --- | --- |
| "Forma" in visitor-facing text | **none** on any of the 9 pages |
| Copied task-manager content (`Alex`, `FRM-`, `focus time`, `Website refresh`, `Q4 roadmap`, `Try the demo`, `Start for free`) | **none** |
| One apparent hit, `Studio workspace` on `/pricing` | a **row-group heading in roducq's own comparison table** for the Studio plan — not Forma copy |
| Illustrative mocks | labelled "Illustrative example · fictional client"; no real client data |
| Marketing copy changed by this audit | **none** |

### 8.6 Compare (`/vs`) and `/vs/[slug]` preserved

| Check | Result |
| --- | --- |
| `/vs` renders | 9 comparison links, one `h1`, same header/footer, 0 overflow, 0 errors |
| `/vs/[slug]` | all 9 build (`notion, bonsai, honeybook, dubsado, 17hats, freshbooks, clickup, basecamp, pandadoc`); `/vs/notion` spot-checked: `h1 "roducq vs Notion"`, header 72px `rgb(255,255,255)`, `Compare` active, 3 footer columns, 1 comparison table, 0 overflow, 0 console errors |
| Route files in the change set | **none** — `git diff` against `main` is empty for `app/(marketing)/vs/**` |
| Design changes to Compare | **none**; its 16px/700 heading step and −0.011em tracking are its own pre-Forma layout, catalogued as ◆ intentional |

---

## 9. Automated regression — exact results

Run on `6996c66` in this workspace, in this order **[MEASURED]**:

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `npm ci` | **0** | 575 packages added, 576 audited, **0 vulnerabilities** |
| 2 | `npm test` | **0** | **1,350 tests / 340 suites — 1,350 pass, 0 fail**, 0 cancelled, 0 skipped |
| 3 | `npx tsc --noEmit` | **0** | clean |
| 4 | `npm run lint` | **0** | `eslint .` clean |
| 5 | `npm run build` | **0** | Next 16.4.3; marketing routes prerendered (`/`, `/features`, `/solutions`, `/integrations`, `/pricing`, `/changelog`, `/about`, `/vs`, `/vs/[slug]` ×9); app routes unchanged |
| 6 | `npm run verify:db` | **0** | "All database checks passed" (offline PGlite) |
| 7 | `npm run verify:pdf` | **0** | 14 documents · 20 pages · **0 overflow, 0 structure, 0 content findings** |
| 8 | `npm audit` | **0** | **found 0 vulnerabilities** |
| 9 | `scripts/verify-motion.mjs` | **0** | PASS — 12 renders + tablet boundary + motion + reduced motion |
| 10 | `scripts/verify-marketing-consistency.mjs` | **0** | 112 shell cells, 48 axe scans, 32 LCP cells, 8 motion cells |

### 9.1 `tsconfig.json` integrity

`tsconfig.json` and `package-lock.json` were hashed **before** the build and re-checked after: **both unchanged** (`sha256 08018bbb…` and `5ae18ac5…` respectively), and `diff` against the pre-build copy is empty. No unintended generated TypeScript config change.

### 9.2 Tests were not weakened

No test file was read-and-relaxed, no assertion deleted, no skip added. `npm test` count (1,350) is higher than the 1,331 recorded in `docs/FORMA_HOMEPAGE_POST_MERGE_AUDIT.md` because PR #79 added its two regressions; this audit adds none.

### 9.3 Dependency posture has improved since the last audit

`docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md` §11 recorded **11 findings, 1 critical** (including a critical advisory against `next@16.3.6`). On this baseline `npm audit` reports **0 vulnerabilities**, and the resolved `next` is **16.4.3**. No dependency was changed by this pass; the lockfile is byte-identical to `main`.

### 9.4 Two harness limitations found (not site defects)

1. **`smallTaps` / keyboard probe and card-scoped focus.** The shell probe reads the focused element's own outline, so `/about`'s three link cards — whose ring is deliberately drawn on the card via `:focus-within` — appear as "no ring" at 320/375/390/768 in both themes (18 false positives). Re-measured directly: every card reports `outline: solid 2px` with `outline-offset: 2px` on focus. The site is correct; the probe cannot see ancestor focus styles.
2. **`sample-marketing-contrast.mjs` and per-word gradient spans** — see §5.4.

Both are worth fixing in the harness eventually. Neither is a reason to change a page.

---

## 10. Prioritized discrepancies

**P0 — critical security or data exposure: none found.**
No secret, token, key or personal datum appears in any audited page or in the evidence. No auth, billing, database or API surface was touched.

**P1 — broken navigation or major accessibility failure: none found.**
Navigation resolves from every page at every width (§8.1); axe reports 0 violations across 48 scans and again with the mobile dialog open; every gradient and solid headline clears its WCAG floor when measured against the pixels actually behind the glyphs (§5.2).

### P2-1 — Decorative hero blooms register layout-shift entries on a throttled mobile device

| | |
| --- | --- |
| Where | `components/marketing/landing/HeroSection.tsx` L71–72 (`div.lm-bloom-a lm-drift`, `div.lm-bloom-b lm-drift`), styled by `app/(marketing)/landing.css` L653–676 |
| Evidence | `/` scenario B (412×823, DPR 1.75, CPU ×4): **4/10 runs nonzero**, max **0.2348**; sources name only the two blooms, at 186–396ms. Historical 0.252 / 0.344 are the same family. Controls: `display:none` 0/10, `animation:none` 1/10, `filter:none` 1/10 |
| Impact | A throttled mobile load can exceed the 0.1 "good" CLS threshold from decoration alone. **No text or control moves**; median CLS is 0.000 in every scenario; the max observed (0.235) stays under 0.25 |
| Proposed minimal fix (not applied) | Promote the decorative layer so its boxes cannot be reported as shifts, and state the intent in the CSS comment: add `contain: paint` to the `pointer-events-none absolute inset-0 -z-10` wrapper in `HeroSection.tsx` (or `will-change: transform` on `.lm-bloom-a, .lm-bloom-b`). Either is a **containment/layerisation hint only** — no visual, motion, colour or layout change. Then re-run scenario B ×20 and require 0/20 |
| Risk | Low: both properties are paint-only hints on an `aria-hidden` decor element. `will-change` on two elements is cheap; `contain: paint` clips to the wrapper, which already sits inside `overflow-hidden` |

### P3-1 — Two section-heading steps coexist, and one page uses both

Measured at 1440px: the homepage's section headings are **54px/400, −0.03em** (the reference-measured value) while `/features` and `/solutions` render their section headings at **42px/600, −0.03em**; `/features` then renders "Smaller things that save time" at **54px/400** in the same page, `/integrations` alternates 54px/400 and 40.8px/600, and `/pricing` uses 54px/600 with −0.045em. The same structural role therefore looks different page to page and, on `/features`, within one page. Both steps are internally consistent and neither breaks hierarchy (one `h1`, no skipped levels). **[UNVERIFIED]** which step the reference uses for interior section headings — only the homepage value was measured — so this is recorded as polish, not as a failed match.

### P3-2 — `/pricing` runs a tighter letter-spacing scale than the rest of the site

Every other page computes **−0.03em** (e.g. 67.2px → −2.016px; 54px → −1.62px; 42px → −1.26px). `/pricing` computes **−0.055em** on its `h1` (68px → −3.74px), **−0.045em** on its section headings (54px → −2.43px) and **−0.05em** on its closing CTA (64px → −3.2px). It is visible as a slightly tighter display line. This is the only route with a different tracking ratio.

### P3-3 — Homepage gradient headline clears the 3:1 floor by 0.03 at 390px in dark theme

`rgb(139,92,246)` on the bloom-tinted backdrop `rgb(54,44,81)` = **3.03:1** (floor 3.0); light theme at 390px is **3.11:1**. At 1440px the same page reads 3.92 / 3.96. It passes today, but the margin is small enough that any future darkening of the dark card or lightening of the gradient's middle stop would fail it silently — axe cannot see it (§5.1). Worth a regression guard rather than a design change.

### P3-4 — Announcement band takes 105–123px on phones

61px from 768px up, **105px** at 375/390, **123px** at 320 (the description wraps to two lines). Not a defect and not an overflow — but on a 320×700 viewport it is 17.6% of the first screen before the header. Recorded for the record; no change proposed.

### P3-5 — `/integrations` opens its heading sequence with a 16px/400 `h2`

"Integrations catalog" is a 16px/400 label styled as an eyebrow but marked up as an `h2`. Heading order is valid and axe passes; it only means the page's first `h2` is not a display heading, which is why the page looks different in a naive per-page type comparison. No change proposed.

### P3-6 — axe's 832 contrast incompletes need the manual sampler to stay honest

No violation exists, but axe can never resolve gradient panels and mock artwork. The rendered-pixel sampling in §5.2 is what actually covers those nodes, and it lives in a script rather than in CI. Recommendation only: keep `scripts/sample-marketing-contrast.mjs` in the loop and fix its per-word-span blind spot (§5.4).

---

## 11. Recommended minimal fixes and the approval gate

**Nothing in this section has been applied.** Application code, pricing, billing, auth, database, APIs and every marketing design are exactly as they were at `6996c66`; the only file this pass adds is documentation and evidence.

| # | Finding | Proposed change | Files | Risk | Verification after the change |
| --- | --- | --- | --- | --- | --- |
| 1 | **P2-1** CLS from the decorative bloom layer | Add `contain: paint` to the hero's decorative wrapper (one class string), or `will-change: transform` on `.lm-bloom-a, .lm-bloom-b` | `components/marketing/landing/HeroSection.tsx` **or** `app/(marketing)/landing.css` | Low — paint/layerisation hint on an `aria-hidden` decoration | `/` scenario B ×20 → 0/20 nonzero; visual diff at 320/390/768/1440 in both themes unchanged; `verify-motion` still PASS; measure the reduced-motion and no-JS states again |
| 2 | **P3-1** two section-heading steps | **No change proposed.** Confirm the interior step against the reference first; when it is measured, adopt one value per role | — | — | — |
| 3 | **P3-2** `/pricing` tracking | **No change proposed.** Normalise to −0.03em only if the owner wants site-wide parity; it is the only route that differs | `app/(marketing)/pricing/pricing.css` | Low, but it is a design decision | Re-measure `h1` and section tracking at 1440/768/390 |
| 4 | **P3-3** 3.03:1 gradient margin | Add a regression test asserting the shipped gradient stops and the measured worst-case backdrop, so a future palette change fails loudly | `tests/components/marketing-contrast.test.ts` (existing) | None | `npm test` |
| 5 | **§5.4 / §9.4** harness blind spots | Teach `sample-marketing-contrast.mjs` the per-word-span case; read ancestor focus styles in the shell probe | `scripts/sample-marketing-contrast.mjs`, `scripts/verify-marketing-consistency.mjs` | None — evidence tooling only | Re-run both; expect the 2.02:1 line to disappear and the 18 focus false-positives to become passes |
| 6 | **P3-4 / P3-5 / P3-6** | **No change proposed** — recorded for the record | — | — | — |

Item 1 is the only fix that changes a shipping surface. It is a one-property change with a stated verification plan, and it needs your approval before it is made.

---

## 12. Production verification limitations

Stated plainly, because each one bounds a claim made above:

1. **No browser session against production.** `roducq.nanexi.com` and the Vercel preview domains are outside this sandbox's egress allowlist (`SSL_ERROR_SYSCALL`, HTTP 000 via `curl`). Everything measured here was measured on the locally built bundle at `6996c66` — the same commit the Production deployment records — served by `next start` on loopback. The production **HTML** was read through an out-of-sandbox fetch and matches. Production **rendering, console, layout, paint timing and contrast** are **[UNVERIFIED]** from inside this sandbox.
2. **No Forma re-measurement today.** The reference's structure and copy were re-read today; its numeric geometry, colour and motion values remain the previously recorded measurements from GitHub-runner captures, labelled **[DOCUMENTED]**. Nothing in §2 presents them as new.
3. **Chromium only.** Firefox and WebKit cannot be installed here (the Playwright CDN and GitHub release assets are both blocked), so cross-engine behaviour — `::details-content` interpolation, `background-clip: text` gradient edges, `color-mix()` fallbacks — is **[UNVERIFIED]**. Every browser number in this document is Chromium 153.0.8010.0.
4. **Lab performance only.** LCP/CLS here are `PerformanceObserver` readings under loopback with CPU-only throttling and no network shaping; they are not field numbers, and no CrUX or INP field value is claimed.
5. **The D-scenario outlier is unexplained, not exonerated.** The historical CLS 0.34418 in the reduced-motion profile did not reproduce in 20 runs. It is recorded as rare rather than as fixed.
6. **Sample size bounds the causal ranking in §7.4.** Ten runs per control separate "blooms present" from "blooms removed", but cannot rank `animation: none` against `filter: none`; that ordering is **[INFERRED]**.
7. **Real-device touch, iOS Safari, screen-reader output and zoom/reflow at 400%** were not exercised. Touch-target geometry (≥44px) and keyboard operability were measured; assistive-technology announcements were not.
8. **Evidence files** written by this pass live under `docs/evidence/final-marketing-audit/` and are documentation. `scripts/verify-motion.mjs` rewrites the tracked file `docs/screenshots/forma-motion/report.json` when it runs; that file was reverted to its committed content after measurement, so the change set does not include generated drift. `verify-out/` and `tsconfig.tsbuildinfo` are gitignored and were not committed.

---

## 13. Evidence index

All under `docs/evidence/final-marketing-audit/`:

| File | Contents |
| --- | --- |
| `shell-axe-lcp-motion.json` | 112 shell cells (overflow, header/footer geometry, tokens, tap targets, keyboard stops, theme switch, page errors), 48 axe scans (violations + incomplete node counts + pass counts), 32 LCP/CLS cells with per-run values and LCP candidates, 8 reduced-motion + 8 no-JS cells. Chromium 153.0.8010.0, axe-core 4.14.0 |
| `responsive-112-cells.txt` | The independent responsive sweep: one line per route × width × theme with its flags, then the aggregate (0 overflow, 0 small targets, 0 clipped, 0 overlaps, 0 offscreen text, 0 errors) |
| `contrast-matrix.txt` | Part 1: solid headline contrast, 48 cases. Part 2: gradient-word contrast scored against each element's own computed stops, 28 cases. Part 3: the repository sampler's raw output, retained including its one `FAIL` line and the explanation of why it is an instrument artefact |
| `cls-investigation.json` | The CLS study: 10 baseline runs × 4 scenarios with full `LayoutShiftAttribution` source lists, the three pre-paint CSS controls (10 runs each), and the 20-run reduced-motion repeat |

Reproduce with the produced build on loopback (`npm run build && npx next start -p 3000`) and:

```bash
export LD_LIBRARY_PATH=/tmp/al2023/lib           # the al2023 libs the Chromium bundle needs
BASE_URL=http://127.0.0.1:3000 \
CHROMIUM_EXECUTABLE_PATH=/tmp/cb/chromium \
RUNS=3 OUTPUT=verify-out/final-audit.json \
  node scripts/verify-marketing-consistency.mjs

LD_LIBRARY_PATH=/tmp/al2023/lib BASE_URL=http://127.0.0.1:3000 \
  CHROMIUM_EXECUTABLE_PATH=/tmp/cb/chromium node scripts/verify-motion.mjs --no-shots

LD_LIBRARY_PATH=/tmp/al2023/lib node scripts/sample-marketing-contrast.mjs
```

The four audit-only probes (glyph-core contrast, gradient-word scoring, the 112-cell responsive sweep, the CLS controls) were written to `/tmp` for this pass and are summarised above rather than committed.

---

## 14. Verdict

| Dimension | Verdict |
| --- | --- |
| Reference fidelity, eight pages | **PASS** — band-for-band match on all eight; every deliberate departure is documented and preserved |
| Shared shell consistency | **PASS** — one header, one footer, one token set, 112/112 cells |
| Responsive behaviour | **PASS** — 0 overflow, 0 clipped text, 0 overlaps, 0 small targets across 320 → 1440 in both themes |
| Accessibility | **PASS with recorded incompletes** — 0 axe violations in 48 scans (+0 with the menu open); 76 rendered-pixel contrast cases pass; 832 axe `color-contrast` nodes remain *incomplete* and are not counted as passes |
| Motion fidelity | **PASS** — every documented timing measured in-browser and matched; PR #53 opacity contract, reduced motion and no-JS all intact |
| Performance | **PASS with P2 note** — worst LCP median 340ms of a 2,500ms budget; CLS median 0.000 everywhere; decorative-layer spikes characterised and bounded |
| Content and functional integrity | **PASS** — 0 dead links, accurate pricing with disclosures, capability-accurate integrations, 8 evidence-backed releases, no Forma or sample task-manager copy |
| Compare routes | **PRESERVED** — `/vs` and all 9 `/vs/[slug]` pages render, navigate and match the shell; untouched |

**No fix was applied. P2-1 in §10 needs your approval, and it is the only item that would change a shipping surface.**
