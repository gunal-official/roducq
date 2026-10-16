# Forma — current product design system

Updated 2026-10-16, Phase F. This is the **active** browser guidance; older
Ember/Step-34 closeouts are implementation history. See
[the Phase F audit and limitations](forma-phase-f-closeout.md) and
[the original token contract](../lib/design-tokens.ts).

## Foundations

- **Type:** self-hosted variable **Manrope** for display and body; Fira Code
  for code/monospaced values. No remotely fetched font. Use 12px as the minimum
  meaningful metadata size, 14–16px for ordinary copy, and a responsive heading
  scale. Do not fix a narrow layout by shrinking text or hiding its content.
- **Color:** canonical light tokens remain `#7c3aed` purple, `#ede5f8` lavender,
  `#2c1b36` plum, `#faf8fc` canvas, `#ffffff` surface and `#261d2d` ink.
  The browser's dark palette is separately authored, not inverted; its purple
  is `#bba4ff`. Product-plane purple aliases resolve to the shared brand.
  Use `--bg`, `--surface`, `--text`, `--secondary-text`, `--border` and the
  relevant semantic aliases rather than adding unrelated literal colors.
- **Status is not branding:** success, warning/overdue, error and informational
  states retain their own semantic colors **and text labels**. Never make
  every status purple or encode a chart's meaning by color alone. Chart rails
  use exact proportional geometry: zero is **zero width**, without minimum
  positive fills for zero/tiny buckets; add visible labels as well as an
  accessible chart description.
- **Compatibility:** `--ember-*`, `terracotta` and other historical names alias
  the current palette. They are not an active Ember presentation. Preserve
  these contracts for integrations, email and PDF consumers. The canonical
  TypeScript/PDF tokens and print palette have not been changed by Phase F.

## Surfaces and spacing

- Controls use `--radius-control` (8px); small surfaces/popovers use
  `--radius-surface` (12px). Larger product cards/paper and sheets use the
  shared `--radius-card` (24px) and `--radius-sheet` (20px) vocabulary.
- Use the existing `PageHeader`, `SectionCard`, `EmptyState`, `DocHeader`,
  `PaperCard` and `DocBody` primitives. Cards have restrained plum-tinted
  elevation and quiet dividers, not a different shadow for each feature.
- Keep clear header/content/rail separation. On phones, stack document
  metadata, let titles and values wrap, and keep rails below the document.
  Team identities and their management actions must wrap into separate rows
  before controls squeeze names into an unreadable column.
  Use `min-width: 0` on flexible children, not overflow clipping on text.
- Input boundaries use `--control-border`, separately from decorative card
  hairlines; invalid controls can override it with the error token. In light
  mode the resolved boundary is approximately `#8c8594`: 3.56:1 against white,
  3.37:1 against the canonical canvas. Check actual adjacent colors when
  introducing a new tinted control surface; these figures are not a blanket
  non-text-contrast certification.

## Responsive composition

- **320 / 375 / 414:** mobile app dock and modal navigation drawer; wrapping
  topbar search and document stats. No body horizontal scrolling.
- **600 / 768:** app icon rail; marketing retains its modal menu through 1023px.
- **1024 / 1440:** full app sidebar and the complete marketing navigation row.
- Marketing comparison pages are real tables with a caption and scoped row
  and column headings. Below 768px, both the **visible header** and each body
  row reflow into labelled grids. Do not visually hide the table header in a
  1px clipped box: that clipped real text in the audit.
- Decorative glow clipping is allowed only on a separate `aria-hidden`,
  pointer-inert layer. Never hide overflow on the hero, document or table to
  make the responsive test pass.
- Targets are at least **44×44 CSS px** where applicable, including icon-only
  close, appearance, footer and navigation controls. Respect mobile safe areas.

## Interaction and accessibility

- Menus use the menu-button keyboard model: Enter/Space, Up/Down, Home/End,
  Escape, Tab out and character navigation. Mark the selected destination.
- Modal navigation and dialogs use Radix focus containment and Escape handling.
  Restore the actual invoking button, including either workspace-drawer
  trigger. When a responsive breakpoint hides that invoker, focus `#main`
  instead. Main landmarks used for skip/fallback focus have `tabIndex={-1}`.
- Keep one visible H1 and one main landmark for each rendered route/state.
  Standalone error/unavailable states use `EmptyState headingAs="h1"`;
  embedded empty-list titles keep the default paragraph to avoid extra H1s.
- Give controls names independent of their current value; distinguish
  **Global search** from **Search workspace**. Associate labels by ID and
  announce async validation errors using alerts. Preserve useful native form
  validation and disabled/pending states.
- Visible focus must work in both themes and forced-color mode. Do not nest
  buttons and links. Charts need readable values/labels or a textual summary.
- Theme choice persists as light/dark/system. System follows OS changes;
  explicit selection survives navigation/reload. Root theme initialization
  remains in place to avoid a wrong-theme hydration flash.

## Motion and original SVGs

| Token | Duration | Use |
| --- | --- | --- |
| `--motion-fast` / `--duration-fast` | 150ms | hover/press, short fade, popover |
| `--motion-standard` / `--duration-normal` | 250ms | drawer/dialog, route arrival, row enter/leave |
| `--motion-expressive` / `--duration-slow` | 450ms | one-time SVG stroke/connection arrival |

`--motion-ease` is the shared settling curve. Entrance styles must have a
fully visible **base state**, without `both`/`forwards` fill-mode trapping.
Exit presence may retain its last frame only until the node is unmounted.
Timers match the standard 250ms duration; reduced motion disables visual
animation and transition globally, including portals and pseudo-elements.

Use the project's original `RoduMark`, `WorkflowArt`, `ClientWorkArt`,
`FinancialArt` and `AuthArtwork`. SVGs communicate a workflow/document shape
statically; decorative arrivals finish. No SMIL loops, continuously orbiting
marketing art, animated financial values or fake progress. Workflow labels
are native 12px text outside the drawing. Loading shimmer/spinners are reserved
for real pending work, not decoration. No animation package is required.

## Print, performance and verification

Print stays white paper with canonical plum ink regardless of screen theme.
Keep dedicated print/PDF document markup and no-print chrome behavior. Do not
apply product-plane overrides to exported financial numbers or calculations.

Prefer CSS transforms/opacity and small inline SVGs over heavy animation
libraries. Manrope/Fira are already self-hosted; do not reintroduce old active
fonts or a second runtime font stack. A clean axe scan is **not** WCAG proof;
manual assistive-technology and real-device checks remain part of release QA.
Measure below-fold content by scrolling real containers, not just by taking a
body `fullPage` screenshot: the app main and its sidebar scroll internally.

The reproducible commands, all-route checklist, before/after findings,
font/bundle/CLS observations, screenshot conventions and outstanding human
checks are in [the Phase F closeout](forma-phase-f-closeout.md).
