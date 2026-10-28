# Unsaved edits during sign-out and workspace switching

**Status: implemented; fictional-fixture Chromium matrix passed, with accessibility and live-service limitations.** Sections 1–10 retain the original audit and checkpoint history. Section 11 records the later approved UI corrections, current browser and automated-gate results, evidence, and remaining unverified items.

Scope: the client-update editor at `/updates/[id]` (the `UpdateComposer`) and the two shell actions that tear the editor down today: **sign out** and **workspace switch**. Everything is fictional — the reproduction used `example.test` identities, a `22222222-…` workspace and stub services; no production account, no Supabase project, no network.

---

## 1. Baseline verification

| Check | Result |
| --- | --- |
| PR #73 merged into `main` | **Yes** — `MERGED 2026-10-28T08:27:42Z`, "Roducq — Prevent accidental loss of unsaved update edits" |
| Working branch point | `2d0d4f9` (`Merge pull request #73 from gunal-official/arena/ac43f052-roducq`), tree clean |
| `npm ci` | clean, 0 vulnerabilities |
| `npm test` | **1301 passed / 0 failed**, 324 suites (matches the count documented in `docs/RODUCQ_UNSAVED_EDITS_GUARD.md`) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |

`docs/RODUCQ_UNSAVED_EDITS_GUARD.md` documents the shipped guard and explicitly lists **"Sign out, workspace switch, server-action redirects (programmatic `router.*`)" as _not held_ and out of scope**. That row is what this task removes.

## 2. What exists today

### 2.1 The guard (`components/ui/unsaved-changes-guard.tsx` + `lib/ui/unsaved-changes.ts`)

- `useUnsavedChangesGuard({ dirty, fallbackFocusSelector? })` returns `{ dialog }`.
- Listeners exist **only while dirty**: capture-phase `document` click (`<a href>` only, filtered by `shouldGuardAnchorClick`), Navigation API `navigate` for `traverse`, and `beforeunload`.
- One decision at a time (`busyRef`), a `bypassRef` for the confirmed navigation, one derived `open = dirty && pending !== null`, `role="alertdialog"`, focus on **Keep editing**, invoker/first-field focus restore.
- The composer is the only mount point: `components/updates/UpdateComposer.tsx:80`.
- It cannot see `<button>` clicks, server actions or programmatic `router.replace/refresh` — by design, and that is exactly why sign-out and workspace switching slip through.

### 2.2 Sign-out entry points (complete inventory)

| # | Surface | Trigger | Where | Behaviour today |
| --- | --- | --- | --- | --- |
| S1 | Desktop / tablet topbar → account menu → "Log out" | `<button role="menuitem">` (`LogoutButton`, `iconOnly={false}`) | `components/app-shell/Topbar.tsx:186-190` | `supabase.auth.signOut({ scope: "local" })` → `router.replace("/login")` → `router.refresh()` |
| S2 | Phone drawer ("More") → account plane → "Log out" | `AccountPanel showSignOut` → `LogoutButton` | `components/app-shell/MobileNav.tsx:169-175` → `AccountPanel.tsx:52-58` | same handler |
| — | Desktop rail account panel | `AccountPanel` **without** `showSignOut` (`Sidebar.tsx:235`) | — | no sign-out control, nothing to guard |
| — | `/reset-password` recovery flow | `app/(auth)/reset-password/page.tsx:198` | — | **security-driven, must stay unguarded** (different flow, composer never mounted) |

There is **one** client sign-out implementation (`components/auth/logout-button.tsx`); S1 and S2 are two renderings of it. No sign-out server action exists.

### 2.3 Workspace-switch entry points

`components/app-shell/WorkspaceSwitcher.tsx` renders four controls that all funnel into one `handleChange`:

| # | Surface | Variant | Where |
| --- | --- | --- | --- |
| W1 | Topbar | `inline` | `Topbar.tsx:91-96` |
| W2 | Tablet rail (64 px) | `compact` | `Sidebar.tsx:141-145` |
| W3 | Desktop rail | `panel` | `Sidebar.tsx:148-152` |
| W4 | Phone drawer | `panel` | `MobileNav.tsx:113-117` |

`handleChange(workspaceId)` → `setActiveWorkspaceAction({ workspaceId })` → `revalidatePath("/", "layout")` → `router.refresh()`.

**Does switching change server-side state?** Yes, and it is not just client navigation:

- `app/(app)/actions.ts` `setActiveWorkspaceAction` verifies the session (`auth.getUser()`), verifies **membership via RLS** (`workspace_members` select is membership-scoped), then writes `profiles.active_workspace_id`, then revalidates the whole layout.
- The client then calls `router.refresh()` — a same-URL RSC refresh, not a route change.

Consequence for the fix: **the least invasive interception point is the existing client handler `handleChange`, before the server action is called.** No new server action, no change to the action, no change to RLS, no global router patch.

### 2.4 Why the editor state can cross a workspace boundary

`getUpdateById` (`lib/data/updates.ts:61`) filters by **RLS membership only**, not by `active_workspace_id`. After a switch, `/updates/<id>` still renders the same row (the user is still a member of the owning workspace), so:

1. the composer stays mounted with **identical server props**,
2. the props→state re-sync (`seedKey = JSON.stringify([initialTitle, initialBody])` in `UpdateComposer.tsx:62-70`) sees no change and **does not re-seed**,
3. the local draft therefore **survives the switch** — the shell now says "Fictional Second Studio" while the draft belongs to "Fictional Studio".

Requirement 9 ("do not persist unsaved editor data across workspaces") is therefore a real gap today, not a hypothetical one.

## 3. Phase 2 — reproduction of the gaps

Browser evidence is unavailable in this environment (§7.3), so the reproduction ran the **real component code** (no re-implementation): the actual `UpdateComposer`, `LogoutButton` and `WorkspaceSwitcher` modules were bundled with esbuild and driven in **jsdom** with fictional stubs at the three boundaries — Supabase client, `setActiveWorkspaceAction` / `saveUpdateContent`, and `next/navigation`. React 18.3, Radix dialog as shipped; only the Radix `Select` primitive (third-party, not under test) was replaced by a semantic stand-in exposing the same `onValueChange`.

Harness: `tmp-repro/{entry.tsx,build.mjs,run.mjs}` (throwaway, **untracked**, not part of the deliverable). Result (`consoleErrors: []`, no React warnings):

| # | Fixture scenario | Observed today | Gap |
| --- | --- | --- | --- |
| 1 | Dirty editor → click **Sign out** | `signOut({scope:"local"})` called **1×**, `router.replace` 1×, `router.refresh` 1×, **no dialog**, edits still in the field until navigation destroys them | edits lost silently |
| 2 | Dirty editor → switch workspace | server action called **1×** with the target id, refresh 1×, **no dialog**, draft **still dirty** after the refresh | action fires unconfirmed **and** the draft follows into the new workspace |
| 3 | Dirty editor → choose **Stay** | **unreachable** — no confirmation is ever rendered for these actions | requirement 3 unmet |
| 4 | Dirty editor → choose **Discard** | **unreachable** | requirement 4 unmet |
| 5 | **Successful save** → Sign out | save 1×, chip cleared (`All changes saved`), then sign-out 1×, no dialog | correct today; must stay that way |
| 6 | **Failed save** → Sign out | `role="alert"` error shown, chip stays "Unsaved changes", then sign-out 1×, **no dialog** | dirty edits lost right after a failure |
| 7 | **Failed switch** while dirty | action 1×, error text shown, still dirty, no dialog | error path also drops the edits on the next clean switch |

Scenario 7 also confirms there is no double-submission today (`setWorkspace` called exactly once per selection), which the fix must preserve.

## 4. Phase 3 — proposed solution

Extend the **existing** guard; no second navigation-blocking system, no global blocker, no provider, no router patch, no change to auth, actions, RLS, billing or unrelated workflows.

### 4.1 New pure module (DOM-free, unit-testable)

`lib/ui/unsaved-edits-registry.ts` — a tiny client-side registry, deliberately **not** a React context:

```ts
export type GuardedShellAction = "sign-out" | "switch-workspace";

export interface UnsavedEditorController {
  isDirty(): boolean;
  /** Open the existing dialog; `run` fires exactly once on Discard. */
  confirm(run: () => void | Promise<void>): void;
}

/** Called by the guard while dirty; the returned fn unregisters. */
export function registerUnsavedEditor(controller: UnsavedEditorController): () => void;

/** "ran" → call your handler now (clean editor, unchanged behaviour).
 *  "held" → the existing dialog is open; the guard will call `run` on Discard. */
export function requestGuardedAction(run: () => void | Promise<void>): "ran" | "held";
```

- No React, no DOM, no `window` → testable with the repo's `node:test` runner.
- Registration is keyed (last writer wins, unregister is idempotent), so a composer unmount (navigation, workspace change, save) can never leave a stale controller behind — requirement 7.
- A single shared module instance is what makes the shell reachable from the composer. Risk noted in §7.1.

### 4.2 Guard changes (`components/ui/unsaved-changes-guard.tsx`)

- `useUnsavedChangesGuard({ dirty, onDiscard? })` gains an optional `onDiscard` callback.
- While `dirty`, the hook registers a controller whose `isDirty()` reads the current `dirty` and whose `confirm(run)` reuses the **same** `pending`/`busyRef` machinery, so a shell action and a link click can never both open a dialog.
- `discard()` gains the shell branch: capture `run`, close the dialog, call `onDiscard()` (composer resets to saved props), then `await run()` — guarded by a `firedRef`/`running` state so the action runs **exactly once** and both buttons are disabled while it is in flight (requirement 4, 7).
- `stay()` already preserves edits/session/workspace; unchanged.
- The original proposal kept the dialog's `role="alertdialog"`, initial focus on **Keep editing**, Escape/overlay/close = stay, focus restoration and z-80 stacking. Action-specific destructive labels were subsequently approved (§8); the later dialog-only animation-centering correction is recorded in §11.

### 4.3 Shell wiring (two call sites)

`components/auth/logout-button.tsx` — the existing body is extracted verbatim into `performSignOut()` and gated:

```ts
function handleLogout() {
  if (requestGuardedAction(performSignOut) === "ran") void performSignOut();
  // "held": the guard owns the click; nothing is called until Discard.
}
```

`pending` is only set inside `performSignOut`, so the button is never disabled/`"Logging out…"` before confirmation, and `supabase.auth.signOut({ scope: "local" })`, `router.replace("/login")`, `router.refresh()` are byte-for-byte unchanged.

`components/app-shell/WorkspaceSwitcher.tsx` — same pattern inside `handleChange`:

```ts
if (workspaceId === activeWorkspaceId) return;
if (requestGuardedAction(() => applySwitch(workspaceId)) === "ran") void applySwitch(workspaceId);
```

`applySwitch` is today's body (pending → action → `router.refresh()`, error surface unchanged). Because the guard can only be dirty while the composer is mounted, every other page keeps byte-identical behaviour; with a clean editor `requestGuardedAction` returns `"ran"` synchronously, so no timing change either.

### 4.4 Surface dismissal (the one UX nuance)

For S2 and W4 the control lives inside the phone drawer (Radix modal, `z-[70]`, own focus trap) and for S1 inside the account menu (custom, closes on outside focus). Options considered:

1. Leave them open and let Radix's focus-scope stack hand focus to the composer dialog. Works visually (dialog is `z-[80]`) but leaves a modal open underneath and makes focus restoration race with `MobileNav`'s `onCloseAutoFocus`.
2. **Close the surface first, then open the confirmation** — proposed: `LogoutButton` gains an optional `dismissSurface?: () => void` (Topbar passes the menu's `close`, `MobileNav`/`AccountPanel` pass the drawer's `onClose`). It is called synchronously *before* the guard is asked, so the drawer/menu is gone when the dialog appears and there is exactly one modal on screen.
3. Close from inside the guard — rejected: the guard would need to know about shell surfaces.

Suggested defaults for focus after **Stay** (`dismissSurface` destroyed the invoking element): the guard already falls back to `fallbackFocusSelector` (the composer's title field) whenever the invoker is disconnected, so focus never lands on `<body>`. Optionally, a per-request `focusFallbackSelector` could send focus back to the menu/drawer trigger; proposed as an opt-in only if review wants it (it would need one stable id per trigger).

### 4.5 Composer changes

`components/updates/UpdateComposer.tsx` — pass `onDiscard` that resets `title`/`body` to `initialTitle`/`initialBody`. This is what satisfies requirement 9: on a confirmed workspace switch the draft is dropped *before* the action runs, so nothing can survive into the new workspace, and it also makes the existing "Discard changes" semantics explicit rather than incidental.

### 4.6 Explicitly unchanged

`supabase/auth` logic, `setActiveWorkspaceAction`, `saveUpdateContent`, RLS/migrations, `proxy.ts` middleware, `app/(app)/layout.tsx` redirects, session refresh, Razorpay/billing/pricing/marketing, other composers, the `/reset-password` `signOut()` call. Forced sign-out and session expiry are untouched: middleware redirects and server-side `redirect("/login")` never pass through the client guard, and `beforeunload` never fires for client-side router navigation.

## 5. Affected files

**Changed**

| File | Change |
| --- | --- |
| `lib/ui/unsaved-edits-registry.ts` | **new** — DOM-free registry + `registerUnsavedEditor` / `requestGuardedAction` |
| `components/ui/unsaved-changes-guard.tsx` | register a controller while dirty; `onDiscard`; shell-action branch in `discard()` with exactly-once semantics and in-flight disabling |
| `components/updates/UpdateComposer.tsx` | pass `onDiscard` (reset to saved props) |
| `components/auth/logout-button.tsx` | gate the existing handler behind `requestGuardedAction`; optional `dismissSurface` |
| `components/app-shell/WorkspaceSwitcher.tsx` | gate `handleChange` the same way |
| `components/app-shell/Topbar.tsx` | pass `close` from the account menu as `dismissSurface` |
| `components/app-shell/MobileNav.tsx` / `AccountPanel.tsx` | thread `dismissSurface` (drawer close) to the sign-out control |
| `tests/lib/unsaved-edits-registry.test.ts` | **new** |
| `tests/components/unsaved-edits-shell.test.ts` | **new** |
| `docs/RODUCQ_UNSAVED_EDITS_GUARD.md` | replace the "sign out / workspace switch are out of scope" rows with the new behaviour and limits |
| `scripts/verify-unsaved-edits.mjs` | add sign-out and workspace-switch scenarios to the existing browser harness (see §7.3) |

**Untouched**: `app/(app)/actions.ts`, `app/(app)/updates/[id]/actions.ts`, `lib/supabase/**`, `supabase/**` (migrations/RLS), `proxy.ts`, `app/(auth)/**`, payments/billing/marketing files, every other composer.

One test constraint noted: `tests/components/forma-phase-f.test.ts:177` asserts `<LogoutButton\s+role="menuitem"` — `role` must stay the **first** prop in Topbar, and the new prop must be added after it. No existing test is weakened or deleted.

## 6. Regression tests proposed

1. `tests/lib/unsaved-edits-registry.test.ts` — register/unregister/idempotence; `requestGuardedAction` returns `"ran"` with no controller or a clean one and calls nothing itself; returns `"held"` while dirty and defers `run`; `run` executes exactly once even if Discard is triggered twice; a stale controller from an unmounted composer cannot hold an action.
2. `tests/components/unsaved-edits-shell.test.ts` (structural, same convention as the existing `update-unsaved-guard.test.ts`) —
   - `LogoutButton` consults the guard **before** `supabase.auth.signOut` and keeps the exact `scope:"local"` + `router.replace("/login")` + `router.refresh()` sequence;
   - `WorkspaceSwitcher` consults the guard before `setActiveWorkspaceAction`, keeps the same-workspace early return, the error surface and the single `router.refresh()`;
   - guard reuses the shared dialog, keeps `role="alertdialog"`, "Keep editing" focus, Escape = stay;
   - no provider, no `history.*` writes, no router patching, no global blocker (assertions mirror the existing suite, not weaker);
   - untouched server/auth files verified by absence of edits (e.g. the action still contains no "unsaved" reference).
3. Existing 1301 tests must stay green — the two suites above are additive.

## 7. Risks and limitations

**7.1 Module-instance sharing.** The registry relies on the composer and the shell resolving the *same* module instance in the client bundle. Next places shared client modules in a common chunk, so this should hold; if a future refactor lazy-loads the composer behind its own chunk boundary, the registry would silently stop working. Mitigation: keep the module free of side effects, add the structural test, and (Phase 5) assert in a real browser that signing out while dirty opens the dialog. Fallback design if it ever breaks: a `document`-dispatched request/acknowledge `CustomEvent` — same contract, no shared module, more indirection. Rejected for now.

**7.2 Two modal surfaces.** Sign-out closes its account menu or drawer first (§4.4). A workspace switch from the drawer leaves the drawer underneath the guard; the guard is above it (`z-[80]` > `z-[70]`), and the current browser matrix verifies focus isolation and return to the drawer switcher (§11).

**7.3 Browser availability — original checkpoint, since resolved.** Playwright's download hosts and Debian mirrors were blocked, so the first checkpoint did not have usable Chromium. The later run used an npm-packaged local Chromium and locally built NSS/NSPR libraries without retrying the blocked downloads. The seven-width result and remaining limits are recorded in §11.

**7.4 Other limitations, unchanged from the shipped guard.** Native `beforeunload` wording is not customisable; Back/Forward is only cancellable where the Navigation API exists; a tab crash/OS shutdown cannot be guarded; with JavaScript disabled nothing here runs (and the editor cannot save either).

**7.5 Behaviour changes worth stating.** (i) Signing out or switching with a dirty editor requires a decision. (ii) A confirmed switch **discards** the draft by design; it is not restored in the new workspace. (iii) The title remains generic, while the destructive button names sign-out or workspace switch. (iv) Sign-out still ignores a Supabase error and always routes to `/login` — unchanged here.

**7.6 Non-goals.** No autosave, no draft persistence, no cross-tab coordination, no guard on other composers (intake "Start over" etc.), no change to session expiry or forced sign-out.

## 8. Decisions taken at the approval checkpoint

1. **Registry, not a provider** — approved as proposed.
2. **Action-specific destructive label** — "Discard and sign out" / "Discard and switch workspace"; the title, description, "Keep editing" and every other string are unchanged.
3. **Focus returns to the shell trigger** after "Keep editing": `#account-menu-trigger` for the account menu, `[data-app-menu-trigger]` (first visible) for the phone menu / dock "More", and `#workspace-trigger-…` for each switcher instance; the composer's title field remains the last-resort fallback.
4. **Browser matrix** — originally pending at this checkpoint; subsequently run with the corrected fixture and approved UI corrections (§11).

## 9. Verification

### 9.1 Original implementation checkpoint

These are the earlier implementation results; the current patch's final gates are in §11.4.

```
npm ci                    # clean, 0 vulnerabilities
npm test                  # 1322 passed, 0 failed (338 suites) — was 1301/331 on the baseline
npx tsc --noEmit          # clean
npm run lint              # clean
npm run build             # clean
npm run verify:db         # "All database checks passed ✔"
npm run verify:pdf        # "pdf audit passed ✔"
```

New suites (no existing test was deleted or weakened):

- `tests/lib/unsaved-edits-registry.test.ts` — 9 tests: no editor → `"ran"`; dirty → `"held"` with the original request and nothing run; a busy dialog **drops** the request instead of signing out; a throwing controller fails open; unregister disarms; the last mount wins and an older unmount cannot clear it.
- `tests/components/unsaved-edits-shell.test.ts` — 13 tests: the guard is consulted before the single `auth.signOut` / `setActiveWorkspaceAction` call site; the original handlers, error surface, `disabled={pending}`, `scope:"local"`, one `router.refresh`, the same-workspace early return, all three trigger ids and all six surface/focus hooks are asserted; the dialog, its copy and its a11y semantics are unchanged; the draft is dropped on discard; auth, the server action and the recovery-flow sign-out are untouched; still no provider, no history writes, no router patch.

One existing assertion in `tests/components/update-unsaved-guard.test.ts` was **tightened**, not loosened: the composer's hook call now also passes `onDiscard`, so the regex matches `useUnsavedChangesGuard({ dirty, onDiscard: … })` and still fails if the `dirty` argument or the dialog binding disappears.

The dirty/discard/focus behaviour was exercised end-to-end in this environment with a **jsdom harness driving the real components** (`UpdateComposer`, `UnsavedChangesGuard`, `LogoutButton`, `WorkspaceSwitcher`, `MobileNav`, Radix dialog as shipped; only the third-party Radix `Select` primitive replaced by a semantic stand-in; fictional stubs for Supabase, the two server actions and `next/navigation`). 22 scenarios, 0 console errors:

| Scenario | Result |
| --- | --- |
| Dirty → Sign out | dialog opens, `signOut` **0 calls**, focus on "Keep editing" |
| Dirty → Sign out → Keep editing | dialog closes, draft intact, still dirty, focus back on the account-menu trigger |
| Dirty → Sign out → Discard and sign out | `signOut({scope:"local"})` **1 call**, `router.replace` 1, `router.refresh` 1, draft dropped |
| Dirty → switch workspace | dialog opens, server action **0 calls**, no refresh |
| Dirty → switch → Keep editing | workspace unchanged, draft intact |
| Dirty → switch → Discard and switch workspace | action **1 call** with the target id, refresh 1, draft dropped, no repeated dialog |
| Clean → sign out / switch | no dialog, original handlers run immediately (1 call each) |
| Failed save → Sign out | error shown, still dirty, dialog appears, `signOut` 0 calls |
| Successful save → Sign out | no dialog, sign-out 1 call |
| Double-click on the destructive action | action runs **once** |
| Phone drawer (390): drawer → Log out | dialog opens, `signOut` 0 calls, drawer closed, safe action focused, focus returns to a shell control after staying |

### 9.2 Browser matrix — original checkpoint

The first implementation checkpoint extended the fictional-fixture harness but could not run it because Chromium and its libraries were unavailable. That historical limitation was later resolved; §11 gives the actual final run, its fixture corrections, failures found along the way, and remaining limitations.

## 10. Limitations specific to this extension

| Scenario | Behaviour | Why |
| --- | --- | --- |
| A destructive shell action that does not call `requestGuardedAction()` | Not held | The guard cannot see programmatic handlers; the registry is the contract, and `tests/components/unsaved-edits-shell.test.ts` pins the two that exist today. |
| Two dialog surfaces | Sign-out closes its shell surface; a drawer workspace switch retains the drawer behind the guard | The guard paints above the drawer (`z-[80]` > `z-[70]`); the browser matrix checks focus isolation and return in both paths. |
| Focus after "Keep editing" | Returns to the shell trigger, else the composer's title field | The invoking menu item/drawer button unmounts with its surface; the trigger is the nearest stable control. |
| Module-instance sharing | The composer and the shell must resolve the same registry module | True for the current bundle graph (shared client chunk); a future lazy chunk boundary would silently disarm it, which is why a real-browser sign-out check stays in the harness. |
| Draft after a confirmed switch | Discarded, never restored | Requirement: unsaved editor data must not persist across workspaces. |
| Forced sign-out / session expiry | Unchanged and never held | Middleware redirects and server-side `redirect()` do not pass through the client guard; `/reset-password` keeps its own unguarded sign-out. |
| Sign-out with a Supabase error | Still ignored, still routes to `/login` | Pre-existing behaviour, deliberately not changed. |

The limitations of the underlying guard (native `beforeunload` wording, Back/Forward without the Navigation API, tab crash, JavaScript disabled) are unchanged and documented in [RODUCQ_UNSAVED_EDITS_GUARD.md](./RODUCQ_UNSAVED_EDITS_GUARD.md).

## 11. Follow-up: mobile obstruction, shell matrix and approved UI corrections

### 11.1 Reproduction and root causes

The original browser attempt did **not** prove a production sign-out failure: its fictional auth service used a different loopback port, which the app's unchanged production `connect-src 'self'` CSP blocked. The app navigated to login after clearing the fixture cookie, but the fixture recorded zero logout requests. The existing handler ignores a returned sign-out error; that behavior was not changed or validated against a real service. The harness now uses a loopback **same-origin proxy**, retains CSP, records method/scope/bearer presence, and continues to require **exactly one** authenticated local-scope logout request. Its direct `workspace_members` fixture also returns both fictional memberships (or the requested filtered one), so the real switcher renders.

The corrected browser checks then exposed four UI problems. Each application correction was separately approved:

| Finding | Root cause | Narrow correction |
| --- | --- | --- |
| Account menu obstructed at 320×568 | The sticky topbar is a z-30 stacking context; the fixed phone dock (z-40) and timer (z-50) could cover the menu, and the menu needed room to scroll. The unforced Log out click was intercepted by the dock. | `app/globals.css` raises the topbar to z-60 only while its Account menu is open and gives the phone menu a safe-area-aware maximum height. Existing scrolling remains; drawer/dialog remain above it. |
| Dirty workspace selection via Enter immediately dismissed its dialog | Radix selected on Enter keydown and the browser's default activation clicked the newly focused **Keep editing** button. Space and pointer did not show this effect. | `WorkspaceSwitcher.tsx` prevents that Enter default in the workspace Select content's bubbling phase, after the option handler. Clean behavior, Space, pointer, focus and exactly-once writes are tested. |
| Drawer workspace option pointer target obstructed at 320/375/390 | The portalled panel Select was z-50, behind the z-70 drawer scrim. | Only the panel switcher's phone popup is z-75, below the z-80 guard; its tablet/desktop z-index remains z-50. The shared Select is unchanged. |
| Normal-motion guard entrance clipped at 390 | The shared zoom keyframes temporarily replaced the dialog's `translate(-50%, -50%)` centering transform. The pre-fix right edge reached 544px in a 390px viewport. | Only this guard dialog supplies centered enter/exit translate variables; its existing fade/zoom and the shared dialog component remain in place. |

Earlier failed attempts are retained in [the evidence directory](./evidence/roducq-shell-actions/before/): the [320px menu ledger](./evidence/roducq-shell-actions/before/menu-obstruction-ledger.json), the [66-case intermediate ledger](./evidence/roducq-shell-actions/before/intermediate-ledger.json), [Enter/Space/pointer traces](./evidence/roducq-shell-actions/before/keyboard-observations.json), and [pre-fix animation frames](./evidence/roducq-shell-actions/before/motion-observations.json). The intermediate run had 61 passed and 5 failed; it is **not** the final result.

### 11.2 Final real-browser matrix

On 2026-10-28, headless Chromium **153.0.8010.0**, Playwright **1.63.0**, axe-core **4.14.0**, Node **22.22.3** and Next **16.4.3** ran the production build against a fictional same-origin loopback fixture. Locale `en-US`, timezone `UTC`, device scale factor 1, service workers blocked, external browser requests blocked; reduced motion except for explicitly named normal-motion cases. No real account, live Supabase project, customer data or production deployment was used.

**66/66 scenarios passed**, with **0 browser console/page/HTTP errors** and **0 blocked external requests**. The [machine-readable ledger](./evidence/roducq-shell-actions/ledger.json), [run log](./evidence/roducq-shell-actions/run.log), [build log](./evidence/roducq-shell-actions/build.log) and [server log](./evidence/roducq-shell-actions/server.log) are retained. The harness executes all independent cases even after a failure, records each failure, and exits nonzero if any case fails.

- **35 topbar cases:** clean switch and sign-out plus dirty sign-out/switch in light and dark, at **320×568, 375×667, 390×844, 768×900, 1024×900, 1200×900 and 1440×900**. Every clean case scrolls through all **16** Account-menu items, checks 44px minimum dimensions, viewport bounds and `elementFromPoint` at each item's center, then verifies Escape and focus restoration. Pointer clicks are not forced.
- Dirty cases check the labelled dialog, initial safe focus, tab trapping, visible background control isolation, Escape, backdrop, keyboard Keep editing, restoration of both draft fields/session/workspace and focus, and no action before confirmation. Confirmed logout requires exactly one authenticated `POST /auth/v1/logout?scope=local`; confirmed switch requires exactly one profile workspace write and a dropped draft. Clean actions have no dialog.
- **2 rail cases:** keyboard Enter and Space in the compact 768px rail and full 1440px panel, including cancellation/focus and one confirmed switch. **6 drawer cases:** sign-out and switch at each of 320/375/390, including keyboard and unforced pointer selection, Keep editing, focus restoration and one confirmed action.
- **2 normal-motion cases:** sign-out and workspace switch at 390px. Layout and 44px targets are checked after the running animation settles; separately, every captured open/closed animation frame must remain in the viewport. The frame data are [sign-out](./evidence/roducq-shell-actions/motion-frames-shell-sign-out-light-no-preference-390.json) (71 frames) and [switch](./evidence/roducq-shell-actions/motion-frames-shell-switch-workspace-light-no-preference-390.json) (86 frames).
- **21 retained cases:** clean editor, seven generic dialog layouts, navigation, Stay/Escape, Back/Forward, reload/close, save success/failure, original shell actions, full-page navigation, no JavaScript, generic normal motion, three generic axe scans, and the browser-error/network gate.

Screenshots from the run are retained under [screenshots/roducq-shell-actions](./screenshots/roducq-shell-actions/), including Account-menu targets at [320](./screenshots/roducq-shell-actions/account-menu-targets-320.png), [375](./screenshots/roducq-shell-actions/account-menu-targets-375.png), [390](./screenshots/roducq-shell-actions/account-menu-targets-390.png), [768](./screenshots/roducq-shell-actions/account-menu-targets-768.png), [1024](./screenshots/roducq-shell-actions/account-menu-targets-1024.png), [1200](./screenshots/roducq-shell-actions/account-menu-targets-1200.png) and [1440](./screenshots/roducq-shell-actions/account-menu-targets-1440.png), plus [dark 375](./screenshots/roducq-shell-actions/shell-switch-workspace-dark-reduce-375.png) and [drawer switch 320](./screenshots/roducq-shell-actions/drawer-switch-workspace-320.png). Baseline screenshots of the [menu obstruction](./screenshots/roducq-shell-actions/before-menu-obstruction-320.png), [drawer obstruction](./screenshots/roducq-shell-actions/before-drawer-obstruction-320.png) and [motion clipping](./screenshots/roducq-shell-actions/before-motion-clipping-390.png) are retained separately.

### 11.3 Axe results — incomplete is not a pass

The final run completed **41 scans**, **0 violations**, and **55 incomplete rule occurrences**:

| Rule | Scans with incomplete result | Nodes in each affected scan | Required follow-up |
| --- | ---: | ---: | --- |
| `aria-hidden-focus` | 41 | 12 nodes in 38 scans; 13 in 3 scans | Manually review focusable content and Radix focus guards under `aria-hidden`; the scripted focus trap and background-control checks do not resolve axe's incomplete result. |
| `color-contrast` | 14 | 3–5 nodes per scan | Manually verify contrast where axe could not determine the background, including gradients. |

The rule/node counts repeat across scans and are not unique elements. **Both rules remain UNVERIFIED by axe; 0 violations is not a WCAG certification.** All per-node selectors and summaries are in the ledger.

### 11.4 Final automated gates

| Command | Result |
| --- | --- |
| `npm test` | **1,327 passed, 0 failed, 333 suites** |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed |
| `npm run build` | Passed |
| `npm run verify:db` | Passed (offline PGlite, not live Supabase) |
| `npm run verify:pdf` | Passed: 14 documents, 20 pages, 0 overflow/structure/content findings |

Complete command logs are in [final-gates](./evidence/roducq-shell-actions/final-gates/); tracked text logs have terminal carriage returns and trailing whitespace normalized. The final application diff changes only `app/globals.css`, `components/app-shell/WorkspaceSwitcher.tsx` and the guard's dialog animation variables; the remaining changes are the browser harness, additive tests, this audit and evidence. Authentication/session handlers, server actions, Supabase, schema/RLS, billing, payments, marketing and pricing code are unchanged.

### 11.5 Reproduction and remaining limits

With an installed Chromium and its system libraries:

```sh
npm ci
CHROMIUM_PATH=/path/to/chromium EVIDENCE_DIR=/absolute/path/to/a/new/empty-directory \
  node scripts/verify-unsaved-edits.mjs
```

This sandbox used Chromium from `@sparticuz/chromium@153.0.0` and locally built Mozilla NSS/NSPR libraries via `LD_LIBRARY_PATH`; no package manifest or lockfile change was needed. Playwright CDN downloads and apt mirrors were blocked and were not repeatedly retried. The harness refuses real `.env` files and an existing `resp-next`, builds an isolated production app with fictional credentials and removes only its own temporary build.

**UNVERIFIED:** live authentication, session failure handling and production authorization/RLS; physical devices, virtual keyboards, non-zero safe-area insets, other browser engines, older browsers and real assistive technology. Offline PGlite exercises selected RLS policies, not a live project. The other limitations in §10 and the original guard document remain. The browser evidence uses fictional responses and does not establish real network/service behavior.
