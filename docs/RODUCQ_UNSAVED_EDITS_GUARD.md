# Unsaved update edits — protection, verification and limits

This records the approved fix for UX audit finding **P2‑02** ("Unsaved edits and partial saves can undermine trust") in its unsaved-navigation part only. Scope: the client-update editor at `/updates/[id]`. Backend behaviour, data model, permissions, billing, pricing, authentication and marketing pages are unchanged. All browser evidence is fictional and local; it is not a production, RLS or delivery test.

## Baseline and the reproduced problem

**Baseline commit:** `b2fa77f1e38092fed878b2126b27279fcd199071` (`main`, PR #72 merged 2026‑10‑28T07:47:37Z). The fix was written against that commit; the working tree was clean before it.

Before the change the composer tracked unsaved content (`dirty = title !== initialTitle || body !== initialBody`, where the props are the last saved server state) and showed an "Unsaved changes" chip, but **nothing stopped a navigation**. A production build was run against a fictional loopback Supabase fixture in headless Chromium 153.0.8010.0 and every path below lost the edits with no prompt:

| Action while dirty | Before | After |
|---|---|---|
| Sidebar navigation (≥ 600px) | edit lost, no prompt | accessible dialog; "Keep editing" returns, "Discard changes" navigates |
| Header/mobile-drawer navigation | edit lost, no prompt | dialog, same behaviour at 320–390px |
| In-page links (`/updates` back link, source plan, stat tiles) | edit lost, no prompt | dialog |
| Browser **Back** | edit lost, no prompt | traversal cancelled; confirm re-issues it |
| Browser **Forward** | edit lost, no prompt | traversal cancelled; confirm re-issues it |
| Reload (Ctrl/Cmd+R, F5, browser button) | edit lost, no prompt | native `beforeunload` confirmation |
| Tab close | edit lost, no prompt | native `beforeunload` confirmation |
| Switching to another update | edit lost, no prompt | dialog |
| Full-page form navigation (global search GET) | edit lost, no prompt | native `beforeunload` confirmation |
| Successful save → navigate | persisted, no prompt | unchanged (no dialog, guard disarmed) |
| Failed save → navigate | error shown, then edit lost silently | error stays, editor stays dirty, guard still armed |
| Clean editor → navigate | no prompt | unchanged (no listeners registered at all) |

## The fix

Two new modules and one wiring change; no new dependency, no new animation library, no global provider and no navigation blocker.

- `lib/ui/unsaved-changes.ts` — pure, DOM-free rules: `isEditorDirty()` (current vs. last saved), `shouldGuardAnchorClick()` (exactly which clicks are held), Navigation API feature detection (`asNavigation()`) and `isTraversalToGuard()`. TypeScript 5.9's `lib.dom` declares `NavigationHistoryEntry` but not `Navigation`/`NavigateEvent`, so the minimal shapes are declared locally — no `any`, no `@ts-ignore`.
- `components/ui/unsaved-changes-guard.tsx` — `useUnsavedChangesGuard({ dirty })` returns the confirmation dialog. Listeners exist **only while dirty** and are removed the moment the editor is clean (including after a successful save). The dialog reuses `components/ui/dialog.tsx` (Radix) and `Button`, so focus trapping, Escape, overlay dismissal, focus restoration and the existing 250 ms exit animation come from the components the rest of the app already uses.
- `components/updates/UpdateComposer.tsx` — computes `dirty` through the shared rule, mounts the guard, renders the dialog, and marks the existing saved/unsaved indicator as `role="status" aria-live="polite"`. Save, template insert, error surface and all previously asserted copy are untouched.

### Dirty-state lifecycle

`dirty` is derived, never stored: it is true only while the editor differs from the props that came back from the last **successful** save. A failed save leaves the props untouched, so the state and the guard both stay armed; a successful save re-renders fresh props and the guard disarms. Reverting an edit returns the editor to clean, and nothing warns. No timers, no autosave, no duplicated state.

### Interception strategy (Next.js 16 compatible)

| Navigation | Mechanism |
| --- | --- |
| In-app links | One capture-phase `document` click listener. It runs before React's root delegation, so `preventDefault()` stops Next's `<Link>` handler before any route change or RSC request. Holding "Keep editing" therefore leaves the router untouched; confirming calls `router.push()`. |
| Back / Forward | The Navigation API `navigate` event with `navigationType === "traverse"`: `preventDefault()` cancels the traversal *before* the browser commits, so the URL and Next's history entry never move. Confirming calls `navigation.traverseTo(key)` for the original destination, with `router.push()` as a fallback if the entry is gone. |
| Refresh / tab close / cross-document navigation | `beforeunload` (the browser's native confirmation). |
| Everything else | Not intercepted: downloads (`download`, `/api/*`), new tabs, modified/middle clicks, hash-only links, other origins, non-http protocols, buttons and forms. |

The guard never writes history (`pushState`/`replaceState`/`history.back()` are not used at all), never patches `next/navigation`, and adds no provider. This matters on Next 16, which owns the `__NA` history state and reloads the document when it meets a foreign entry.

### Accessibility

`role="alertdialog"`, labelled by its title and described by its text; initial focus is on the **safe** action ("Keep editing"); Tab/Shift+Tab stay inside; Escape, the close button and the overlay all mean "keep editing"; focus returns to the invoking link (or, when a traversal had no focused invoker, to the composer's first field rather than `<body>`). Both actions are ≥ 44 px, the scrim matches every other dialog, and no new motion is introduced — the existing reduced-motion rules cover the shared dialog animation.

## Verification

```
npm ci                     # 575 packages, 0 vulnerabilities
npm test                   # 1301 passed, 0 failed (324 suites) — was 1276/317 on the baseline
npx tsc --noEmit           # clean
npm run lint               # clean
npm run build              # clean
npm run verify:db          # "All database checks passed ✔"
npm run verify:pdf         # "pdf audit passed ✔"
CHROMIUM_PATH=… node scripts/verify-unsaved-edits.mjs   # 19 scenarios, 0 failures
```

New tests: `tests/lib/unsaved-changes.test.ts` (unit rules), `tests/components/update-unsaved-guard.test.ts` (structural wiring, scoping and "existing save flow preserved"). No existing test was modified or weakened.

Browser run (`scripts/verify-unsaved-edits.mjs`, fictional loopback fixture, reduced motion unless stated, both themes, external network blocked): Chromium 153.0.8010.0, Playwright 1.63.0, axe-core 4.14.0, Node 22.22.3, Next 16.4.3 — 320×568, 375×667, 390×844, 768×900, 1024×900, 1200×900, 1440×900.

- **Layout:** at every width the dialog stays inside the viewport, both actions measure ≥ 44 px, "Keep editing" holds focus, and there is no horizontal overflow (measured `scrollWidth − innerWidth` = 0).
- **Navigation:** sidebar and drawer links are held (URL unchanged) and the drawer's "Discard changes" completes the navigation; page links behave the same; Back and Forward are cancelled and re-issued after confirmation; a clean editor navigates with no dialog, and reverting an edit restores the clean state.
- **Staying:** "Keep editing", Escape and an overlay click all keep the URL and both fields, and focus returns to the `.work-back` link.
- **Unload:** reload asks with the native prompt (dismiss keeps the edits, accept reloads to the saved content); tab close asks and dismissing keeps the tab open.
- **Saves:** a successful save clears the chip, disarms the guard and navigates without a prompt; a forced synthetic failure shows the existing `role="alert"` message, keeps "Unsaved changes", keeps the guard armed, and a retry that succeeds disarms it. A status-only save (Draft → Marked sent) revalidates the page and does not lose the dirty edits.
- **Not over-blocking:** the global-search GET form is confirmed by `beforeunload`; the skip link (`#main`) and the PDF download are never intercepted.
- **Motion/themes:** the dialog is usable with `prefers-reduced-motion: no-preference`; axe reports **0 violations** for the dialog in light 1440, dark 375 and light 390 (34 passing rules each). No browser page errors or HTTP ≥ 400 responses were recorded.

Evidence: [ledger](../evidence/roducq-unsaved-edits/ledger.json) (geometry, scenario results, axe, versions) and screenshots for [320](../screenshots/roducq-unsaved-edits/dirty-dialog-320.png), [375](../screenshots/roducq-unsaved-edits/dirty-dialog-375.png), [390](../screenshots/roducq-unsaved-edits/dirty-dialog-390.png), [768](../screenshots/roducq-unsaved-edits/dirty-dialog-768.png), [1024](../screenshots/roducq-unsaved-edits/dirty-dialog-1024.png), [1200](../screenshots/roducq-unsaved-edits/dirty-dialog-1200.png), [1440](../screenshots/roducq-unsaved-edits/dirty-dialog-1440.png) and [dark 375](../screenshots/roducq-unsaved-edits/dialog-dark-375.png).

To rerun: `npm ci`, then `CHROMIUM_PATH=/path/to/chromium node scripts/verify-unsaved-edits.mjs` (`npm run verify:unsaved`). The script refuses an existing `.env` or `resp-next`, builds with fictional loopback services, restricts browser requests to the app and the fixture, and only ever deletes the build directory it created.

## Navigation that cannot be intercepted reliably

| Scenario | Behaviour | Why |
| --- | --- | --- |
| Back/Forward in Safari ≤ 26.1 and Firefox ≤ 146 | Not held; the navigation happens and the edits are lost | Those versions lack the Navigation API, and the History API cannot cancel a traversal. Chromium 102+, Firefox 147+ and Safari 26.2+ (Baseline since January 2026) are covered. |
| Browser refresh / tab close wording | Native prompt, text not customisable; some mobile browsers (notably iOS Safari) suppress or throttle it | Browser policy. Chromium also requires prior user interaction. A listener suppresses bfcache only while dirty. |
| Sign out, workspace switch | **Held** (follow-up) — see [RODUCQ_UNSAVED_EDITS_SHELL_GUARD.md](./RODUCQ_UNSAVED_EDITS_SHELL_GUARD.md). Both handlers ask the guard's registry first, so the same dialog covers them and the action runs once after confirmation. | They are buttons calling a server action / the Supabase client, so the link-click listener cannot see them; the registry is the smallest contract that avoids a router patch. |
| Other programmatic `router.*` calls (server-action redirects) | Not held | Only interceptable with a global router patch/blocker, which was excluded as higher-risk and out of scope. |
| Cross-origin links, `mailto:`/`tel:`, downloads, new tabs | Not held | The current document is not destroyed. |
| Tab crash, OS shutdown, battery death, link opened from an external app | Cannot be guarded | Outside the page's control. |
| JavaScript disabled | Guard cannot run | The editor cannot save either; the page body is script-revealed in this app, so the composer is not interactive without JavaScript. |

Known pre-existing behaviours deliberately left unchanged: the composer's props→state re-sync can still overwrite keystrokes typed while a save is in flight, and intake's "Start over" still resets its own draft without a guard. Neither is part of this fix.

## Limitations of the evidence

Headless Chromium viewports are simulations: no physical devices, virtual keyboards, screen readers, non-zero safe-area insets, other engines, real Supabase/RLS, real users or production deployment were exercised. Axe violations of zero are not a WCAG certification. The fixture does not model real network latency or failure modes beyond the explicitly forced save error.
