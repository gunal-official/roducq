# Forma homepage reference audit

**Reference:** <https://forma-visuvate.framer.website/>
**Roducq route:** `/`
**Visual source:** user-supplied, image-based `home-page.pdf` (five pages; rendered and visually inspected; not committed)
**Repository baseline:** `main` / `arena/65c84448-roducq` at `4618b16` after PR #75
**Audit status:** PDF and repository baseline reviewed; live-site recapture unavailable in this sandbox.

## Evidence labels and limitations

- **[MEASURED — prior audit]** means the value was measured in the repository's recorded Chromium/CI audit (`docs/FORMA_FINAL_FIDELITY_AUDIT.md`, `docs/ANIMATION_NOTES.md`, or the named audit noted below). These are historical results, not fresh measurements from this turn.
- **[INFERRED]** means it is estimated from the supplied static PDF or from a documented layout pattern.
- **[UNVERIFIED]** means the available evidence does not establish the value or behavior.

The five PDF pages were rendered to images and inspected visually. The PDF captures a **static desktop composition**; it does not show interaction states, motion, responsive/mobile layouts, original CSS viewport, or device-pixel ratio. The sandbox's outbound host allowlist blocks both live website hosts, so no live recapture or interaction probe was possible in this turn. The earlier Forma audit did use a GitHub-hosted runner to measure the live reference; those artifacts are historical evidence, not a claim of current live parity.

No pixel-match percentage or pixel-perfect claim is made.

## Visual reading of the supplied PDF

Across the five pages, the reference presents these visual beats in order:

1. Compact Forma navigation; centered announcement pill, large two-line headline, short lead, paired CTAs and small reassurance line.
2. Large white product dashboard contained by a saturated rounded violet frame and a soft background glow.
3. Four illustrated feature cards; three numbered setup steps above a large purple-framed workflow illustration.
4. Integrations cards; four adjacent team/use-case cards; a four-card pricing composition.
5. Split FAQ, large left-copy/right-checklist closing CTA, and spacious multi-column footer with an oversized pale wordmark.

The current Roducq implementation already contains the same high-level sequence and the principal geometry (dashboard frame, four feature cards, three steps, three-column integration cards, four team cards, four pricing columns, split FAQ, CTA and shared footer). The redesign therefore retains existing components and changes copy, disclosures, pricing-card roles, and the hero word reveal rather than replacing the page wholesale.

## Reference measurements already recorded

| Surface | Existing reference measurement | Status / source |
| --- | --- | --- |
| Header | 69.7px high; 15px/400 navigation; 10px action radius | [MEASURED — prior audit], `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §3. Roducq's shared announcement band adds height and is retained as a site-wide shell decision. |
| Content column | 1240px at 1440px viewport (x=100); 736px at 768px; 358px at 390px | [MEASURED — prior audit], same doc §2. |
| Hero heading | 72px/400/1.02/−0.03em at wide desktop; 48px/400 at 1024px; 43px/400 at 768px and 390px | [MEASURED — prior audit], same doc §3. |
| Section headings | 54px/400/1.1 wide; 34px at 1024px; 32px at 390px | [MEASURED — prior audit], same doc §3. |
| Hero buttons | 52px high, 10px radius, approximately 15px/400 label | [MEASURED — prior audit], same doc §3. |
| Dashboard frame | Approximately 20px frame; sampled purple sweep from `#36278c` to `#9178e6` | [MEASURED — prior audit], same doc §3. |
| Features | Four desktop columns; 24px card inset | [MEASURED — prior audit], same doc §3. |
| Integrations | Three desktop columns; 14px gaps; 404px cards and 25px inset at 1440px | [MEASURED — prior audit], same doc §3. |
| Teams | Four desktop columns | [MEASURED — prior audit], same doc §3. |
| Pricing | Four visual columns; Team/featured ring treatment; 46px price at 1440px | [MEASURED — prior audit], same doc §3. Roducq keeps four visual columns but only three commercial plans. |
| FAQ | Split layout; 48px/600 wide heading; native Roducq `<details>` transition remains 260ms | [MEASURED — prior audit] for visual heading and current 260ms Roducq behavior. Forma's shipped accordion itself is a JavaScript row, not native `<details>`. |
| Motion | Hero/section word reveal 900ms with 50ms word cadence; hero ladder 80/550/650/720/800/850ms after the announcement; links/buttons 200ms; connector flow 1000ms linear/infinite | [MEASURED — prior audit], `docs/ANIMATION_NOTES.md` and `docs/FORMA_FINAL_FIDELITY_AUDIT.md` §5. Roducq retains opacity-preserving clip masks for LCP. |

### Reference and current viewport evidence

| Width | Evidence available before this redesign | Status |
| ---: | --- | --- |
| 320px | Prior repository audit | [MEASURED — historical] |
| 375px | Prior repository audit | [MEASURED — historical] |
| 390px | Prior repository audit and committed mobile captures | [MEASURED — historical] |
| 768px | Prior repository audit | [MEASURED — historical] |
| 1024px | Prior repository audit | [MEASURED — historical] |
| 1200px | Shared marketing shell/type measurements exist; a fresh homepage comparison is still required | [INFERRED / UNVERIFIED for current homepage] |
| 1440px | Prior repository audit and committed desktop section captures | [MEASURED — historical] |

The after-change browser run must cover all seven requested widths; zero overflow must be observed, not assumed from this table.

## Existing baseline comparison

| Band | Already present / verified | Change made in this redesign |
| --- | --- | --- |
| Shared shell | Shared header, navigation, theme control, mobile menu and footer are already in place. | Preserve their appearance/layout and all other-route copy. The announcement and footer account CTA switch to homepage-specific wording only on `/`; every other marketing route keeps its existing copy. |
| Hero | Centered two-line hero, paired links, source/output strip, dashboard frame and LCP-safe reveal exist. | Replace overpromising copy; link to `/signup` and `/solutions`; state that account creation does not activate a paid plan; animate individual heading words with the measured cadence. |
| Dashboard | Roducq-specific sidebar, statistics, chart and activity mock already exist. | Keep the illustration and give it a visible fictional-client disclosure; remove plan-tier wording from mock data. |
| Features | Four cards and custom Roducq visuals already exist. | Keep geometry; qualify the update-drafting claim and avoid implying unattended automation. |
| Getting started | Three steps and large purple illustration already exist. | Describe the verified client-context → brief → proposal/update flow and label the illustration as fictional. |
| Integrations | Six cards in a three-column layout already exist. | Retain the grid and distinguish read-only connectors from Roducq-native capabilities; link cards to `/integrations`. |
| Teams | Four cards and miniature interface previews already exist. | Keep four approved audiences, update the link to `/solutions`, and add a visible illustrative-data disclosure. |
| Pricing | Three legacy plan cards plus a dark fourth Enterprise-style card currently render from legacy plan data and dynamic billing configuration. | Render the three approved Starter/Team/Studio cards from the already-approved `/pricing` presentation, plus a non-commercial contact panel. State every required checkout/enforcement limitation. No billing source or backend behavior changes. |
| FAQ | Split layout, six native disclosures and 260ms CSS transition already exist. | Keep the semantics and timing; replace inaccurate free-plan and billing answers with approved, product-accurate content. |
| Closing CTA | Gradient card, paired actions, onboarding illustration and product-limit callout already exist. | Keep the layout; remove free/trial implication, use implemented destinations, and add a fictional-client caption. |
| Footer | Shared Roducq component with oversized wordmark and working route inventory exists. | Retain layout and routes; use “Create an account” rather than “Start free.” |

## Unverified / intentional differences

- **[UNVERIFIED]** Current live Forma and Roducq screenshots, hover states, animation timelines, and responsive breakpoints could not be measured from this sandbox.
- **[UNVERIFIED]** The PDF alone cannot supply mobile reference measurements, dark-theme behavior, or exact CSS spacing/color values.
- **[INFERRED]** Text must remain Roducq-specific, so line wrapping and total document height will not match Forma exactly.
- **Intentional:** preserve the shared Roducq shell, Manrope, accessible contrast-safe gradient stop, native FAQ, and the visible no-signature/no-payment limitation. These take precedence over copying Forma's typography, global header, JavaScript accordion, or unsupported product claims.
- **Intentional:** Forma's nine integration cards are not reproduced as nine vendor integrations. Roducq retains six cards for verified connectors/native capabilities; no unsupported connector is invented.
- **Intentional:** the fourth pricing column is informational rather than a commercial tier. No Enterprise, Free, annual price, or unsupported custom-service promise is introduced.
