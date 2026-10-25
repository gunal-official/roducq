# /solutions verification harness

Browser checks used for `docs/FORMA_SOLUTIONS_FINAL_VERIFICATION.md`.
These scripts are **not** part of the app and add no npm dependencies.
Run them by hand against a production build.

## Setup (once, outside `package.json`)

```bash
npm ci
npm run build
npm run start -- -H 0.0.0.0 -p 3000     # or: npx next start -H 0.0.0.0 -p 3000
# Chromium comes from @sparticuz/chromium. Install it without saving it to package.json:
npm install --no-save @sparticuz/chromium@153.0.0
```

`@sparticuz/chromium` needs shared libraries that a minimal Linux image may lack.
If launch fails with a missing `libnspr4.so`, extract the bundled library archive
and point `LD_LIBRARY_PATH` at it before running any script.

## Running

All scripts write under `verify-out/` (git-ignored) relative to the working
directory, and must be run from the repository root:

```bash
export BASE_URL=http://localhost:3000   # default

MODE=freeze   ROUTES=/solutions,/ node scripts/solutions-verification/axe-run.mjs
MODE=reduced  ROUTES=/solutions,/ node scripts/solutions-verification/axe-run.mjs
MODE=live     ROUTES=/solutions,/ node scripts/solutions-verification/axe-run.mjs

node scripts/solutions-verification/layout.mjs         # 320–1440px, light + dark, overflow + h1
node scripts/solutions-verification/crosspage.mjs      # /, /solutions, /pricing, /about, /vs, /vs/notion
node scripts/solutions-verification/sticky2.mjs > sticky-settled.json   # settled + crossfade timing
node scripts/solutions-verification/motion-nojs.mjs > reduced-motion-nojs.json
node scripts/solutions-verification/a11y-interact.mjs > a11y-interact.json
```

The LCP scenarios A–D are run by `scripts/verify-solutions-lcp.mjs` (repo, PR #53).
It launches Playwright's bundled Chromium, so it needs `npx playwright install chromium`
or an equivalent local browser. The final verification used the same scenario
definitions through the `@sparticuz/chromium` path, because the Playwright browser
download was blocked in the sandbox.

## Modes

- `freeze`: disables the status-pill crossfade (`.lm-pill-swap{transition:none}`) so the
  scan is deterministic.
- `reduced`: emulates `prefers-reduced-motion: reduce`.
- `live`: no changes. The pill crossfade can be caught mid-transition, which can
  report a transient contrast violation. Treat `freeze` as the gate.

## What the scripts check

| Script | Checks |
| --- | --- |
| `axe-run.mjs` | axe-core rules tagged wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa and best-practice, per route × theme × width |
| `layout.mjs` | `scrollWidth` vs viewport, one `h1`, headline line count, console errors, forbidden copy (Forma/Framer references, off-plan prices) |
| `crosspage.mjs` | status 200, overflow, one `h1`, header/footer/theme toggle present, page errors |
| `sticky2.mjs` | sticky counters 01–04, fill width, crossfade opacity samples (≥1200px) |
| `motion-nojs.mjs` | reduced-motion t=0 end state, category switching, no-JS SSR content |
| `a11y-interact.mjs` | mobile menu dialog (Escape, focus return), theme toggle label, focus rings |

`sticky2`, `motion-nojs` and `a11y-interact` print JSON to stdout (`>` redirect).
The others write files under `verify-out/`.
