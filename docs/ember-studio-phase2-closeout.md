# Ember Studio — Phase 2 closeout: responsive application shell & navigation

Phase 1 (PR #28) delivered the design tokens, radii, motion and typography.
Phase 2 rebuilds the application shell around them without touching page
content (that is Phase 3).

## What changed

### Desktop sidebar (`components/app-shell/Sidebar.tsx`)
- 256px on `desk:` (was 232px), warm `bg-card` surface with a subtle
  `border-r border-border` hairline; the 64px icon rail (tab–desk) is
  unchanged so tablet content keeps its width.
- Sections (Workspace / Money / Account) are accessible disclosures:
  `aria-expanded` + `aria-controls`, chevron affordance, state persisted in
  `localStorage` (`roducq.sidebar.collapsed`) through a
  `useSyncExternalStore` store — SSR always renders expanded, so server and
  client markup agree; cross-tab `storage` events stay in sync.
- Collapsing a section never affects the tablet rail (`hidden max-desk:flex`).
- Active row: soft ember pill + accent icon chip + a 3px terracotta
  indicator sliver (`before:w-[3px] before:bg-accent`), 24px tall, vertically
  centred on the row.

### Topbar (`components/app-shell/Topbar.tsx`)
- Translucent chrome: `bg-surface-translucent` (new Phase-1 token
  `--bg-translucent` = `color-mix(in srgb, var(--ember-background) 82%,
  transparent)`) + `backdrop-blur-md` + bottom hairline; both themes resolve
  the mix against their own background, so light and dark stay warm.
- Search, workspace switcher, avatar/account menu untouched; the Inbox
  shortcut remains the *supported* notifications affordance — the product has
  no notification service, so no bell/counter is faked.

### Phone navigation (`components/app-shell/MobileTabBar.tsx`, new)
- Fixed bottom tab bar (<tab only): Pipeline · Inbox · Briefs · Proposals +
  **More** → five slots, five is the cap. The More tab opens the existing
  `MobileNav` drawer, which still lists every route (permissions-filtered),
  so nothing is unreachable.
- 56px (`min-h-14`) tabs beat the 44px touch-target floor; icon + label rows,
  `aria-current="page"`, terracotta 3px top indicator mirroring the sidebar
  sliver; translucent + blurred like the topbar.
- Safe areas: bar pads `pb-[env(safe-area-inset-bottom,0px)]`, root layout
  now ships `viewportFit: "cover"`, `globals.css` gives `<main>` a
  screen-scoped bottom clearance of `calc(5rem + env(safe-area-inset-bottom,
  0px))` below 600px, and the floating TimeTimer docks above the bar
  (`bottom-[calc(5rem_+_env(...))] tab:bottom-5`).
- Drawer open state is *derived* (`openedOn === pathname`): navigating from
  inside the drawer dismisses it without any setState-in-effect; Escape,
  overlay and close button all work as before.

### Unique active route (`components/app-shell/nav-items.ts`)
- `isNavActive(pathname, href)` resolves the registry-wide most-specific
  match: on `/intake/inbox` only Inbox lights; Intake no longer shares the
  highlight. Sidebar, drawer and tab bar all consume it. `isActive` remains
  as the raw matcher (tests document both).

### Preserved contracts
- Permissions (`MONEY_HREFS` / `canSeeMoney`), auth redirects, workspace
  switching, print flattening (`.app-shell` / `.app-main` / `.app-topbar,
  .app-sidebar` rules), search form semantics, 44px targets, radii and token
  rules, icon system — all unchanged. The tab bar is `print:hidden`.

## Evidence

- `npm run verify:responsive` (Chromium, 39 pages × 320/375/414/600/768/
  1024/1440): `overflowX=0 off=0 cut=0 tap<44=0` everywhere. The single
  finding is a pre-existing 3px text cutoff on the *marketing* `/vs/dubsado`
  card at 320px — outside the shell, unchanged by this phase.
- `SHELL_SHOTS=1` (new opt-in mode in the audit script) captures the
  interactive shell states committed to `docs/screenshots/`:
  `shell-desktop-light.png`, `shell-desktop-dark.png`,
  `shell-desktop-collapsed.png`, `shell-mobile-light.png`,
  `shell-mobile-dark.png`, `shell-mobile-drawer.png`.

## Verification

```
npm test            # 655 structural + behaviour tests
npm run lint
npx tsc --noEmit
npm run build
npm run verify:db
npm run verify:pdf
npm run verify:responsive            # full audit
SHELL_SHOTS=1 npm run verify:responsive   # + shell evidence shots
```

Chromium note: on machines without Playwright's registry build, the audit
still needs a Chromium binary (see the script's bootstrap message:
`npm run verify:responsive:setup`).
