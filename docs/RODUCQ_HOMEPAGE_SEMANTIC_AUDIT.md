# Homepage semantic audit — `/`

**Status:** audit complete. **No application code was changed to produce this document.**

| | |
|---|---|
| Route | `/` (marketing homepage) |
| Reference standard | `/solutions` — see `docs/RODUCQ_SOLUTIONS_DESIGN_SYSTEM.md` |
| Commit measured | `6996c665f994cd6c6be08dfd6d45316d3f438b03` (production deployment `7386809442`) |
| Build | local `next start` of that commit, `.next/BUILD_ID qIGus8daJv5ZtaWAURwd6` |
| Browser | Chromium 153.0.8010.0, viewport 1440×900, light theme |
| Method | rendered DOM (not source), computed styles, CDP `Accessibility.getFullAXTree`, axe-core |
| Probe | `scripts`-external harness `/tmp/semantic-probe.mjs` (document order, headings, paragraphs, landmarks, interactive, lists, media) |

Every tag below was checked twice: once in the rendered DOM and once against the accessibility
tree. Where the two disagreed, the accessibility tree wins — the rendered text of this page is
split into one `<span>` per word, so `textContent` is not a reliable reading of what is announced.

## 0. Verdict

The homepage is **semantically sound**. It has exactly one `h1`, it never skips a heading level,
it never uses `h4`–`h6`, and it has zero axe-core violations. The problems this audit found are
**typographic, not structural**: nine distinct heading signatures where the reference uses four.

| Check | Result |
|---|---|
| `h1` count | **1** — pass |
| Skipped levels | **0** — pass |
| `h4` / `h5` / `h6` used | **0** — pass |
| Accessibility-tree heading names | **30 / 30 correct** — pass |
| axe-core violations (1440, light) | **0** — pass |
| axe-core incomplete | **1 rule / 15 nodes** — `color-contrast`, see §10.1 |
| Landmarks | `main` ×1, `header` ×1, `footer` ×1, `nav` ×5 — pass |
| Named `<section>` elements | **0 of 8** — see §4 |
| Paragraphs | 121, 0 nested, 0 inside another interactive element |
| Lists | 21 (18 `ul`, 2 `ol`, 1 `dl`) — all valid |
| Decorative graphics | 99 `svg`, all excluded from the accessibility tree |
| Distinct heading signatures | **9** — this is the actual finding, see §3 |

## 1. Complete heading inventory (H1–H6)

All 30 headings, in document order. Values are computed px at 1440×900, light theme. Font family
is Manrope for every heading; ink is `#1b1426` except where noted.

| # | Tag | Visible text | Parent section | Size / weight | Line height | Letter spacing | Semantic verdict |
|---|---|---|---|---|---|---|---|
| 1 | `h1` | From first client message to a clear proposal | From first client message to a clear proposal | 72 / 400 | 73.44 | -2.16 | Correct. Sole H1; states the product promise. |
| 2 | `h2` | Four parts of clearer client work | Four parts of clearer client work | 54 / 400 | 59.4 | -1.62 | Correct. Section H2. |
| 3 | `h3` | Every client message, captured verbatim | Four parts of clearer client work | 22 / 400 | 28.6 | -0.77 | Correct level. Type drift: 22/400 — same size as the step titles, regular instead of semibold. |
| 4 | `h3` | Gaps flagged instead of quietly guessed | Four parts of clearer client work | 22 / 400 | 28.6 | -0.77 | Correct level. Type drift: 22/400 — same as the step titles. |
| 5 | `h3` | Every save is a version you can restore | Four parts of clearer client work | 22 / 400 | 28.6 | -0.77 | Correct level. Type drift: 22/400 — same as the step titles. |
| 6 | `h3` | Draft a client update from plan progress | Four parts of clearer client work | 22 / 400 | 28.6 | -0.77 | Correct level. Type drift: 22/400 — same as the step titles. |
| 7 | `h2` | Three steps from context to client work | Three steps from context to client work | 54 / 400 | 59.4 | -1.62 | Correct. Section H2. |
| 8 | `h3` | Capture client context | Three steps from context to client work | 22 / 600 | 28.6 | -0.77 | Correct. Step title under the section H2. |
| 9 | `h3` | Shape a clear brief | Three steps from context to client work | 22 / 600 | 28.6 | -0.77 | Correct. Step title under the section H2. |
| 10 | `h3` | Draft and keep clients updated | Three steps from context to client work | 22 / 600 | 28.6 | -0.77 | Correct. Step title under the section H2. |
| 11 | `h3` | One engagement, one day | Three steps from context to client work | 18 / 700 | 29.7 | -0.27 | Correct level. Type outlier: 18/700, the only bold H3 on the page. |
| 12 | `h2` | Bring client context into one workspace | Bring client context into one workspace | 54 / 400 | 59.4 | -1.62 | Correct. Section H2. |
| 13 | `h3` | Slack | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 14 | `h3` | Notion | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 15 | `h3` | Email inbox | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 16 | `h3` | Webhooks | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 17 | `h3` | PDF export | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 18 | `h3` | Share links | Bring client context into one workspace | 17 / 600 | 25.5 | -0.34 | Correct. Integration card title under the H2. |
| 19 | `h2` | Made for different shapes of client work | Made for different shapes of client work | 54 / 400 | 59.4 | -1.62 | Correct. Section H2. |
| 20 | `h3` | Keep each client engagement together | Made for different shapes of client work | 23 / 600 | 32.2 | -0.8 | Correct. Team card title under the H2. |
| 21 | `h3` | Keep creative direction attached to the brief | Made for different shapes of client work | 23 / 600 | 32.2 | -0.8 | Correct. Team card title under the H2. |
| 22 | `h3` | Give a small team a clearer client-work trail | Made for different shapes of client work | 23 / 600 | 32.2 | -0.8 | Correct. Team card title under the H2. |
| 23 | `h3` | Bring logged work into client updates | Made for different shapes of client work | 23 / 600 | 32.2 | -0.8 | Correct. Team card title under the H2. |
| 24 | `h2` | Plans for client work | Plans for client work | 54 / 400 | 59.4 | -1.62 | Correct. Section H2 naming the pricing band. |
| 25 | `h3` | Starter | Plans for client work | 23 / 600 | 32.2 | -0.57 | Correct. Plan card title under the H2. |
| 26 | `h3` | Team | Plans for client work | 23 / 600 | 32.2 | -0.57 | Correct. Plan card title under the H2. |
| 27 | `h3` | Studio | Plans for client work | 23 / 600 | 32.2 | -0.57 | Correct. Plan card title under the H2. |
| 28 | `h3` | Talk to us | Plans for client work | 23 / 600 | 32.2 | -0.57 | Correct. Contact card title under the H2 (three plans + one contact card, no fourth tier). |
| 29 | `h2` | Questions before getting started | Questions before getting started | 48 / 600 | 52.8 | -1.44 | Correct. Section H2 (variant "faq", 48/600). |
| 30 | `h2` | Bring one client project into clearer focus | Bring one client project into clearer focus | 64 / 600 | 65.28 | -2.24 | Correct. Closing-CTA H2. |

Reading order and DOM order agree. Three headings sit a few pixels higher than their predecessor
(#4, #5 by 7–8 px; #26 by 35 px). These are **card alignment offsets, not an outline defect** —
see §10.3.

## 2. Heading levels

The level sequence is:

```
h1
└─ h2 ─ h3 h3 h3 h3                    (features)
   h2 ─ h3 h3 h3 h3                    (steps + engagement panel)
   h2 ─ h3×6                           (integrations)
   h2 ─ h3×4                           (teams)
   h2 ─ h3×4                           (pricing)
   h2                                  (FAQ)
   h2                                  (closing CTA)
```

- One `h1`, seven `h2`, twenty-two `h3`. Nothing deeper.
- No level is skipped: every `h3` has an `h2` ancestor, every `h2` has the `h1` ancestor.
- The closing CTA is an `h2` and therefore a **peer of the content sections**, not a subsection.
  That is the correct reading: it is a top-level band, not part of the pricing section.
- The six integration card titles (`Slack`, `Notion`, `Email inbox`, `Webhooks`, `PDF export`,
  `Share links`) are `h3` under the `h2` "Bring client context into one workspace". Correct.
- The four pricing card titles are `h3` under the `h2` "Plans for client work". Correct, and
  consistent with `/pricing`, where the same titles are `h2` because there the plan card *is* the
  top level of the page.

**Nothing in this section needs to change.**

## 3. Heading typography — the real finding

Nine distinct signatures for thirty headings:

| Signature | Count | Used by |
|---|---|---|
| `h1` 72 / 400 / 73.44 / −2.16 | 1 | hero |
| `h2` 54 / 400 / 59.4 / −1.62 | 5 | section headings (`variant="section"`) |
| `h2` 48 / 600 / 52.8 / −1.44 | 1 | FAQ (`variant="faq"`) |
| `h2` 64 / 600 / 65.28 / −2.24 | 1 | closing CTA |
| `h3` 22 / 400 / 28.6 / −0.77 | 4 | feature card titles |
| `h3` 22 / 600 / 28.6 / −0.77 | 3 | step titles |
| `h3` 18 / 700 / 29.7 / −0.27 | 1 | "One engagement, one day" |
| `h3` 17 / 600 / 25.5 / −0.34 | 6 | integration card titles |
| `h3` 23 / 600 / 32.2 | 8 | team card + plan card titles |

Two of these are deliberate and documented. `components/marketing/landing/SectionHeading.tsx`
carries a comment explaining that 54/400 and 48/600 are two treatments measured on the Forma
reference (`docs/FORMA_FINAL_FIDELITY_AUDIT.md` §4), so they are not an accident. Against
`/solutions` the drift is still real:

| Role | Homepage | `/solutions` (master) | Delta |
|---|---|---|---|
| Page `h1` | 72 / **400** / −2.16 | **67.2 / 600** / −2.02 | −4.8 px, weight 400 vs 600 |
| Section `h2` | **54 / 400** / −1.62 | **42 / 600** / −1.26 | −12 px, weight 400 vs 600 |
| Closing CTA `h2` | **64** / 600 / −2.24 | **64.8 / 600** / −2.27 | −0.8 px |
| Card `h3` | 17, 18, 22, 23 — **four sizes** | 12 / 600 (eyebrow only) | no single card step |

The `/solutions` interior `h2` is *smaller* than its `h1` by a wide margin (42 vs 67.2) and it is
**semibold**; the homepage interior `h2` is 54 px and **regular**. That single difference is what
makes the homepage read as a different site rather than a different page.

## 4. Landmarks and sections

| Landmark | Count | Names |
|---|---|---|
| `main` | 1 | — |
| `header` | 1 | — |
| `footer` | 1 | — |
| `nav` | 5 | "Main navigation" (7 links), unnamed (0 links, see below), "Product" (4), "Workspace" (4), "Account" (2) |
| `section` | 8 | **all unnamed** |
| `article` | 11 | — |
| `aside` | 1 | inside `aria-hidden` illustration |
| `figure` | 2 | both with `figcaption` |

Two findings:

**4.1 The eight `<section>` elements have no accessible name.** None carries `aria-label` or
`aria-labelledby`, so each maps to `role="generic"` rather than `role="region"`. This is not an
axe violation and not a WCAG failure, but it is the *inconsistent* half of a pattern the site
already gets right: `/pricing` labels all five of its sections with `aria-labelledby`
(`pricing-page-heading`, `pricing-comparison-heading`, `pricing-studio-heading`,
`billing-faq-heading`, `pricing-closing-heading`). Recommendation: add `aria-labelledby` on the
homepage pointing at each section's own `h2` id. **P2**, low risk, no visual change.

**4.2 One `<nav>` has no accessible name and no links.** It is
`components/marketing/landing/WorkspacePreview.tsx:129` — a presentational sidebar inside the
hero's `aria-hidden` illustration. It is invisible to assistive technology (confirmed: the
accessibility tree exposes only four navigation landmarks), so this is a cosmetic tidy-up, not a
defect. **P3**, optional.

## 5. Paragraphs and inline semantics

- **121 `<p>`**, none nested, none invalid.
- **12 sit inside an `<a>`** — the six integration cards, each of which wraps its card in one
  link. This is valid HTML5 (`<a>` is transparent) and produces correct accessible names:
  "CONNECTOR Slack Import recent client messages into intake. The connection is read-only; …".
  The name is long but every word is visible on screen, which is the rule PR #79 established.
  **No change.**
- **56 paragraphs are five words or shorter.** 16 are inside the `aria-hidden` illustration.
  The remainder are labels and values in the illustrative timeline ("MONDAY · EXAMPLE", "Client
  context captured", "Proposal draft prepared") and the sticky band labels ("Features",
  "Getting started"). A one-word `<p>` is over-semantic, but none is a label for a control, so
  nothing is misrepresented to assistive technology. **No change recommended.**
- **`strong`, `em`, `b`, `i`, `small`, `mark`, `abbr`, `time`, `sup`, `sub`, `cite`, `code` = 0.**
  Emphasis on this page is carried entirely by weight and colour. For marketing copy that is
  acceptable; there is no content whose meaning is lost without an emphasis element.
- **`<br>` = 0.** Headline line breaks are done with `display:block` spans, which is the better
  technique — a screen reader reads one continuous sentence. Verified: the `h1` accessible name
  is "From first client message to a clear proposal", with the words joined correctly.

## 6. Lists

21 lists: 18 `ul`, 2 `ol`, 1 `dl`. All valid.

The single `<dl>` is the statistics strip in the workspace preview
(`WorkspacePreview.tsx:231`). It has **4 `<dt>` and 8 `<dd>`**, each pair grouped in a `<div>` —
two `<dd>` per term, one for the value and one for the change indicator. That is conforming HTML
and correct definition-list usage. (An earlier reading of this audit process reported "0 dt/dd"
by counting only direct children of `<dl>`; that was a probe artefact, corrected here.)

Both `ol` lists are the three-step sequences in the steps section. Correct: the order is
meaningful.

The pricing feature lists are `ul` in all four cards. One plan description is a bare `<p>` where
its siblings are `ul` — that is a content difference, not a markup error.

## 7. Interactive elements

54 interactive elements: 47 links, 1 button (`Switch to dark theme`), 6 `<summary>`.

- **0 nested interactive elements** — the integration-card link does not contain the card's own
  CTA.
- **0 interactive elements inside another interactive element.**
- 3 `aria-label`s, none contradicting visible text. PR #79's integration-link naming fix holds.
- Target sizes: every control meets the 24 × 24 minimum except the skip link (1 × 44), which is
  visually hidden until focused and is exempt as a skip mechanism.

## 8. Media and hidden content

- **0 `<img>`.** The page uses no raster images.
- **99 `<svg>`** — 96 carry `aria-hidden="true"`, the remaining 3 are inside an `aria-hidden`
  subtree. **No decorative icon is announced.** All are lucide icons at 16 px.
- **1 `role="img"` element** — the hero workspace illustration, with a 44-word `aria-label`
  ending "Example data, not a live account." Correct and unusually well done: the illustration is
  one described image instead of a hundred exposed mock widgets.
- **127 `aria-hidden="true"` subtrees**, which is why the mocked UI inside them contributes no
  headings, links or paragraphs.
- **2 `<figure>`, both with `<figcaption>`** reading "Illustrative example · fictional client".
  Correct pairing.

## 9. FAQ

Six native `<details>` elements, the first `open`. Each expands to a `<p>` of prose.

- `summary` is the native disclosure control — correct, keyboard-operable, works with no JS.
- The question text is **not** a heading. That means FAQ questions do not appear in heading
  navigation. This is a legitimate choice, not a defect: the `<details>`/`<summary>` pair already
  gives the control an accessible name and a collapsed/expanded state, and wrapping the question
  in an `h3` inside `summary` risks the question being announced twice.
- **Recommendation: no change.** Recording the decision here so it is not "fixed" later.

## 10. Findings

### 10.1 `color-contrast` — 15 incomplete nodes, not 15 passes

axe-core returns `color-contrast` as **incomplete**, not `pass`, for 15 nodes on this route. The
rule cannot compute contrast when text sits over a gradient or a translucent surface, which is
most of this page. Per the standing rule, **these are reported as incompletes**. They have not
been converted to passes, and closing them requires sampling rendered pixels rather than trusting
axe. **P1 to resolve before any colour change ships**, since a token change made on top of
unmeasured contrast could regress it.

### 10.2 Heading typography divergence — P1

Nine heading signatures against the reference's four, including a `400`-weight `h1`/`h2` where
`/solutions` uses `600`. This is the largest gap between the homepage and the approved standard.
It is **not** a semantic defect and must not be "fixed" by changing heading levels. See
`docs/RODUCQ_SITEWIDE_DESIGN_AUDIT.md` §3 for the proposed scope.

*Conflict to resolve before implementation:* the 54/400 and 48/600 variants are documented as
measured from the Forma reference. Normalising them to the `/solutions` 42/600 would change an
approved Forma-reference decision. The audit therefore proposes the change and asks for a
decision rather than applying it.

### 10.3 Three "inverted" headings — not a defect

`#4`, `#5` and `#26` report a smaller `top` offset than their predecessor (7 px, 8 px, 35 px).
Cause: the feature cards and the plan cards are aligned to different internal baselines, so their
titles do not share a y-position. DOM order still matches reading order. **No semantic change.**
It is a visual alignment question for the site-wide audit.

### 10.4 Eight unnamed sections — P2

See §4.1. Fix is additive and invisible.

### 10.5 Presentational `<nav>` in the hero mock — P3

See §4.2. Optional.

## 11. Hypotheses this audit falsified

Recorded so they are not re-investigated and not "fixed" by mistake.

| Hypothesis | Verdict |
|---|---|
| The `h1` reads "From first client messageto a clear proposal" | **False.** That is `textContent` with no whitespace between the two line spans. The accessible name is "From first client message to a clear proposal". No fix needed. |
| The `<dl>` has no `dt`/`dd` | **False.** 4 `dt`, 8 `dd`, wrapped in `div`s. Conforming. |
| A `<nav>` without a name leaks a nameless landmark | **False.** That `<nav>` is inside an `aria-hidden` illustration; the AX tree exposes four named navs. |
| Integration cards have concatenated accessible names ("ConnectorSlack…") | **False.** The AX names are correctly spaced; the concatenation was a `textContent` artefact. |
| The page skips heading levels | **False.** 0 skips. |
| Headings are missing focus or are inside links | **False.** 0 headings inside interactive elements. |

## 12. Scope limits

- Measured in **light theme at 1440 only** here; the dark-theme and 320–1024 width sweep is
  Phase 7 and is `[UNVERIFIED]` in this document.
- **Chromium only.** Firefox and WebKit could not be installed in this environment, so any
  browser-specific accessibility-tree difference is `[UNVERIFIED]`.
- Contrast over gradients is **incomplete**, per §10.1.
- The production origin could not be fetched from this sandbox (TLS failure), so all numbers come
  from a local build of the deployed commit, not from `roducq.nanexi.com` itself.
