# App accessibility and timer usability — verification

This records the approved accessibility and narrow-screen timer changes, their pre-change baseline and focused verification. All browser data was fictional and local; this is not a production or comprehensive accessibility audit.

## Baseline and attribution

The baseline compared `main` immediately before PR #70 (`ff90300b730edff2ed6d37a035619512b8a1e8f8`) with merged PR #70 (`c34b33c5160c6184f9c5e9f0a6a7d1d637da72a0`). Both were built with the same lockfile and run with the same fixtures, Chromium, axe, browser settings and dimensions. The approved fixes were made only after this baseline was recorded.

| Finding | Before PR #70 | Merged PR #70 baseline | After these fixes |
| --- | --- | --- | --- |
| Matched page axe scans | 42 | 42 | 42 |
| `aria-prohibited-attr` on the static, compact single-workspace `<div>` | 6 occurrences | 6 occurrences | 0 violations in the matched scans |
| `color-contrast` incompletes on the gradient wordmark | 18 scans | 18 scans | 18 scans, still incomplete |
| Status focus after 14 successful saves (7 widths × 2 themes) | Lost to `BODY` | Lost to `BODY` | Remained on `Update status` |
| Timer overlay intersections | Present on tested phone/tablet controls | Same geometry | No idle/running timer hits on tested intake controls at any of the seven widths |

The targeted findings were therefore not introduced by PR #70 in this comparison. In the baseline at 320×568, the timer overlapped the intake textarea by up to 112×44px idle, 246×58px running and 246×220px with its stop form open. At 390×844 the running timer overlapped the “Add a file” button by about 95×40px. Desktop targets sampled in the baseline did not intersect. The change reserves a scrollport/dock only where the existing `canSeeMoney` check renders a timer; viewer and desktop layouts retain their previous reservation behavior.

The baseline fixture, exact configurations, element details and geometry are retained in [baseline JSON and probe sources](evidence/roducq-accessibility-timer/). The baseline probe and expanded timer probe SHA-256 hashes are respectively `3a1004cfda0bb941bdefba1f1f98dd68460a1ea0cd1dfedb06e2a605614d506b` and `b75bee0d8979efd7d043005b149f3c2b8ce3a23c359ebf147bedbd27af3692d3`. The two baseline builds used lockfile SHA-256 `5ae18ac5f756b807950bea0377fd4ab74bc640ec203b0a6ac909ff8255af7214`.

## Keyboard, timer and error behavior

- The compact single-workspace mark has a permitted noninteractive image role and accessible name. The multi-workspace combobox remains named and can be opened, navigated and dismissed by keyboard; switching workspaces itself was not exercised.
- During a status save, the trigger remains focusable and announces `aria-disabled`; pointer/keyboard reopening and duplicate updates are guarded. Success, rollback on a synthetic error and both status directions retain focus. Moving focus intentionally to search during a save is respected. Stored `sent` and share/delivery semantics are unchanged.
- Below 1024px, **Stop** opens a modal with focus on its description field. Tab and Shift+Tab remain inside; the background is visually and interactively blocked. Escape, **Close**, and **Keep running** dismiss without a write, preserve the running timer and restore focus to **Stop**. In the nested Brief picker, Escape first closes the picker. While a save is in flight, dismissal and duplicate save are blocked. Successful save writes once, clears the timer and focuses **Start timer**; a synthetic save failure announces the error and retains the timer. Description, minutes and date validation messages are alerts associated with their invalid controls.
- Reload resumes the same running timer. A 320×320 check exercised modal scrolling and focus return. At 1024px and wider, the stop form remains the original non-modal floating form. The existing timer storage and server action are unchanged; the 320px date control is widened enough to display its native calendar icon.
- The main phone/tablet timer dock left a minimum measured gap of 14px/10px respectively between the running pill and the tested scrollport. The sampled controls were also keyboard-focused and hit-tested at intermediate scroll positions, not only at the bottom of the page. The 320×320 probe checked the dialog only, not full-page usability at that height.

## Contrast and axe

For the 17px, weight-800 wordmark, paired screenshots were taken with and without the glyphs while preserving the actual composited gradient underneath. For pixels where the screenshots differed by at least 4/255, computed text color was compared with the rendered background using WCAG relative luminance. The minimum sampled ratios were:

| Theme | `rodu` | `cq` | Normal-text threshold |
| --- | ---: | ---: | ---: |
| Light | 13.833:1 | 4.825:1 | 4.5:1 |
| Dark | 10.745:1 | 5.262:1 | 4.5:1 |

These sampled wordmark ratios exceed the threshold; no color was changed. They do **not** convert axe's gradient findings into passes or establish contrast throughout the application. The final 42 page scans had no violations but retained all 18 `color-contrast` incompletes (three routes × 1024/1200/1440 × two themes). The seven additional modal scans had no violations but each retained an `aria-hidden-focus` incomplete on Radix focus guards/the hidden background; the keyboard focus-loop and pointer-blocking checks passed, but these incomplete results remain for manual assistive-technology review.

## Verification and evidence

- Full `npm test`: 1,275 passed, zero failed/skipped. TypeScript (`npx tsc --noEmit`), `npm run lint`, and standard `npm run build` passed. The build used fictional loopback configuration, not live credentials.
- `npm run verify:db` passed with offline PGlite; `npm run verify:pdf` passed for 14 documents and 20 pages with no overflow, structure or content findings. `npm audit --audit-level=low` reported zero vulnerabilities.
- Chromium `153.0.8010.0`, Playwright `1.63.0`, axe-core `4.14.0`, Node `v22.22.3`: 320×568, 375×667, 390×844, 768×900, 1024×900, 1200×900 and 1440×900. The matched 42 page scans used both themes, reduced motion, `en-US`, UTC, device scale factor 1 and blocked external browser network. Four light modal widths, 375/768 dark modals and a 375 normal-motion modal were separately tested; normal-motion status behavior, short modal, resize across the breakpoint, viewer, navigation, workspace switching and synthetic timer save failure were also exercised.
- The status success/error comparisons use the same 900ms fictional delay as the baseline; the extra duplicate-submission stress case uses 1400ms. No browser page/HTTP errors occurred in the final run. The strengthened Phase 1 harness also completed 90 renders and 36 axe scans: zero violations and 15 retained incompletes.
- [Final raw ledger](evidence/roducq-accessibility-timer/final.json), [baseline ledgers](evidence/roducq-accessibility-timer/), and [representative screenshots](screenshots/roducq-accessibility-timer/) are committed. Screenshot filenames in raw ledgers reflect the original capture directories; the complete screenshot set can be regenerated with the harness.

To rerun the final browser harness from a clean checkout, install dependencies (`npm ci`), provide a local Chromium binary and run:

```sh
CHROMIUM_PATH=/path/to/chromium node scripts/verify-app-a11y.mjs
```

On systems whose Chromium requires additional libraries, set `LD_LIBRARY_PATH` accordingly. An optional `EVIDENCE_DIR` must name a new directory. The harness refuses existing `.env` files or a pre-existing `resp-next`, builds with fictional loopback services, restricts browser requests to those services, and removes only its own temporary build. To replay the baseline probes, copy each archived `.mjs.txt` source to `scripts/` in isolated archives of both commits, install their matching lockfiles and run both with the same Chromium and settings on the same UTC day; fixture dates are relative.

**Limitations:** these are headless Chromium desktop-viewport simulations, not physical devices, virtual keyboards, screen readers, nonzero hardware safe-area insets, other browser engines, live Supabase/RLS, real users or production deployment. CSS includes safe-area insets but their physical rendering was not verified. Axe incompletes are not passes, and the sampled routes/states do not establish application-wide WCAG conformance.
