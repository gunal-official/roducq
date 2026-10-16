# Forma Phase B — application shell and authentication

Phase A established the Forma foundation: the purple/lavender token
system, the Manrope type scale, the radius and shadow vocabulary, the
motion system and the print story. Phase B applies that foundation to
the surfaces a person actually touches all day — the desktop sidebar,
the desktop topbar, the tablet rail, the phone bottom bar, the phone
More drawer, the workspace and account controls, and the three
authentication screens.

Nothing in this phase is a token-only change. Every shell surface was
rebuilt, and every screen it carries was re-laid out.

---

## 1. What changed

| Surface | Before | After |
| --- | --- | --- |
| Desktop rail | Flat list of links, no identity | Full-height plane: brand, workspace card, grouped collapsible nav, account footer |
| Desktop topbar | Opaque bar, text-only workspace | Translucent glass bar (blur + hairline), monogram tile, inline search, inbox, account menu |
| Tablet rail | Same list squeezed | 64px icon rail — monogram tile, icons only, labels for screen readers |
| Phone bottom bar | Flat tab strip | Floating lavender dock, 4 destinations + More, safe-area aware |
| Phone More drawer | Plain list | Slide-in panel: brand, workspace, grouped routes, account plane with theme switch and sign-out |
| Workspace control | Text dropdown | One component in three surfaces (panel / compact / inline), monogram tile, static label when there is nothing to switch to |
| Account control | Menu only | Shared account plane (rail + drawer) with a persistent Light/Dark/System switch |
| Auth screens | Centred card on a plain page | Split screen: plum brand panel with an original pipeline artwork + a form column |

## 2. The brand mark

`components/app-shell/RoduMark.tsx` is an original SVG, not a font glyph:

* a squircle plate carrying a plum → purple → purple-hover gradient;
* a monoline **R** drawn as a single stroked path (stem, bowl, leg) in
  `white`, so it stays crisp at any size and follows the theme;
* a live "spark" in the corner with an expanding ring, so the mark reads
  as alive rather than as a static badge.

Every colour is a token reference (`var(--forma-*)`) or the `white`
keyword — the palette stays centralised in `app/globals.css`, exactly as
the Phase A design-guide gate requires.

**The gradient ids are per-instance.** A shared id is a real bug, not a
style preference: `url(#id)` resolves to the *first* matching element in
the document, so a copy inside a `display:none` subtree — the auth brand
panel below 1024px — becomes the paint server for every other copy, and
Chromium refuses to paint a gradient that lives in a hidden subtree. The
plate would silently disappear below the split band. The ids come from
React's `useId()`, sanitised into a valid fragment.

## 3. The shell grid

The app shell is a rail plus a content column:

```
phone  (<600)   topbar / content / floating bottom bar
tablet (600+)   64px icon rail │ topbar + content
desktop(1024+)  256px labelled │ topbar + content
```

The placement lives in `app/globals.css`, **unlayered**:

```css
@media screen and (min-width: 600px) {
  .app-sidebar { grid-column: 1; grid-row: 1 / span 2; }
  .app-topbar  { grid-column: 2; grid-row: 1; }
  .app-main    { grid-column: 2; grid-row: 2; }
}
```

Unlayered declarations outrank every layered one, and Tailwind's grid
utilities sit in the `utilities` cascade layer. So the placement wins
over `col-span-2` on the topbar wrapper **without that wrapper's class
list changing** — the print stylesheet and the structural tests both
depend on that class list verbatim.

The rail never scrolls the page: it is a fixed-height column and the
navigation list inside it scrolls instead, so the brand and the account
controls stay put. A sticky gradient fade at the bottom of that list
signals "there is more below" without a scrollbar.

## 4. Motion

Phase B adds three movements, all transform/opacity only so nothing
reflows:

| Keyframe | Used by |
| --- | --- |
| `forma-rise` | the auth card arriving |
| `forma-draw` | the brand glyph stroking itself on |
| `forma-drift` | the auth artwork's floating cards |

**No Phase B entrance animation uses `animation-fill-mode: both`.** A
`both` fill pins an element to the keyframe's `from` state while the
animation has not started — and an animation inside a `display:none`
subtree never starts. That is precisely how a real card, or the brand
glyph, ends up invisible: it is stuck on the `from` keyframe forever.
Without a fill mode the element keeps its own style before and after the
animation, so a motion that never runs costs nothing but the movement.
The draw dash lives *inside* the keyframes for the same reason, so a
mark that never animates is still fully drawn.

Everything is killed under `prefers-reduced-motion: reduce`, like the
rest of the system.

## 5. The authentication screens

`app/(auth)/layout.tsx` splits the routes in two:

* a **plum brand panel** with a fine grid, the pipeline artwork in the
  upper right (work moving along one continuous ribbon — intake, brief,
  proposal, invoice) and the headline at the foot;
* a **form column** carrying the shared `AuthCard` and `AuthField`.

The artwork is decoration: it is `aria-hidden`, it lives in its own
clipping layer so the panel never reports horizontal overflow, and it is
dropped entirely below 1024px, where the form takes the full width.

**Business logic is untouched.** The login screen keeps its `?next=`
same-site guard (default `/intake`) and its Google SSO; signup keeps
`?invite=` and the email-confirmation notice; onboarding still creates
the workspace through `createWorkspaceAction`; the config notice still
appears when Supabase is not configured.

## 6. Evidence

* `npm run verify:responsive` — all 20 app-shell and auth pages are
  clean at 320, 375, 414, 600, 768, 1024 and 1440px: no overflow, no
  offenders, no cut-offs, no tap target under 44px, no page errors. The
  remaining findings are the pre-existing marketing-page issues, byte
  for byte identical to the Phase A baseline.
* `docs/screenshots/` — the shell and the auth screens re-shot in light
  and dark at 375, 768 and 1440px.
* `tests/components/phase-b-shell.test.ts` — the structural gates for
  everything in this document.
