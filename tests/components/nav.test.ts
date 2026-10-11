import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  isActive,
  isNavActive,
  mobileTabItems,
  MOBILE_TAB_HREFS,
  MONEY_HREFS,
  NAV_GROUPS,
  NAV_ITEMS,
  visibleGroups,
} from "../../components/app-shell/nav-items.ts";

// Structural tests (built-in node:test — zero test deps) asserting the
// Phase-2 responsive shell contract against the real source files.
const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("Navigation (Step 33)", () => {
  it("one nav model carries every section with a semantic icon", () => {
    const src = read("components/app-shell/nav-items.ts");
    for (const label of ["Intake", "Inbox", "Briefs", "Proposals", "Plans", "Updates", "Invoices", "Time", "Contracts", "Reports", "Settings"]) {
      assert.ok(src.includes(`label: "${label}"`));
    }
    for (const icon of ["PenLine", "Inbox", "ClipboardList", "FileText", "ListChecks", "MessageSquare", "Receipt", "Clock", "FileSignature", "BarChart3", "Settings"]) {
      assert.ok(src.includes(`icon: ${icon}`));
    }
    assert.ok(src.includes("MONEY_HREFS")); // viewer money-hiding stays wired
  });

  it("mobile drawer shows every item as a 44px icon+label row and closes on choose", () => {
    const src = read("components/app-shell/MobileNav.tsx");
    assert.ok(src.includes("min-h-11"));
    assert.ok(src.includes("h-5 w-5")); // 20px nav icons
    assert.ok(src.includes("animate-slide-in"));
    assert.ok(src.includes("onClick={onClose}"));
    assert.ok(src.includes('aria-current={active ? "page" : undefined}'));
  });

  it("sidebar: 64px icon rail on tablet, 256px labeled nav on desktop", () => {
    const src = read("components/app-shell/Sidebar.tsx");
    assert.ok(src.includes('w-[64px]'));
    assert.ok(src.includes('desk:w-[256px]'));
    assert.ok(src.includes("max-desk:sr-only")); // labels collapse to the rail
    assert.ok(src.includes("title={label}")); // rail keeps a hover tooltip
    // The shell grid matches the sidebar bands exactly.
    assert.ok(read("app/(app)/layout.tsx").includes("desk:grid-cols-[256px_1fr]"));
  });

  it("sidebar sections are accessible disclosures with a 3px active indicator", () => {
    const src = read("components/app-shell/Sidebar.tsx");
    assert.ok(src.includes("aria-expanded={!isCollapsed}"));
    assert.ok(src.includes("aria-controls={navId}"));
    assert.ok(src.includes("roducq.sidebar.collapsed")); // collapse state persists
    assert.ok(src.includes("before:w-[3px]")); // 3px terracotta sliver
    assert.ok(src.includes("before:bg-accent"));
    assert.ok(src.includes("isNavActive(pathname, href)")); // unique highlight
    // Collapsing a section never hides the rail icons (tablet keeps them).
    assert.ok(src.includes("hidden max-desk:flex"));
  });

  it("phone bottom tab bar: fixed, safe-area aware, ≤5 slots, More opens the drawer", () => {
    const src = read("components/app-shell/MobileTabBar.tsx");
    assert.ok(src.includes("fixed inset-x-0 bottom-0"));
    assert.ok(src.includes("tab:hidden")); // phones only — tablet keeps the rail
    assert.ok(src.includes("pb-[env(safe-area-inset-bottom,0px)]"));
    assert.ok(src.includes("min-h-14")); // 56px tabs beat the 44px floor
    assert.ok(src.includes('aria-label="More navigation"'));
    assert.ok(src.includes("aria-expanded={moreOpen}"));
    assert.ok(src.includes("<MobileNav")); // remaining routes live in the drawer
    assert.ok(src.includes('aria-current={active ? "page" : undefined}'));
    assert.ok(src.includes("e.key === \"Escape\"")); // drawer closes on Escape
    assert.ok(src.includes("print:hidden"));
    // Four destinations + More = five slots.
    assert.equal(MOBILE_TAB_HREFS.length, 4);
    for (const canSeeMoney of [true, false]) {
      assert.ok(mobileTabItems(canSeeMoney).length + 1 <= 5);
    }
    // No money route can leak into the bar for viewers.
    for (const item of mobileTabItems(false)) {
      assert.ok(!MONEY_HREFS.has(item.href));
    }
    // <main> clears the bar on phones (safe-area aware), screen only.
    const css = read("app/globals.css");
    assert.ok(css.includes("@media screen and (max-width: 599.98px)"));
    assert.ok(css.includes("calc(5rem + env(safe-area-inset-bottom, 0px))"));
    // The floating timer docks above the bar on phones.
    assert.ok(read("components/time/TimeTimer.tsx").includes("bottom-[calc(5rem_+_env(safe-area-inset-bottom,0px))]"));
    assert.ok(read("components/time/TimeTimer.tsx").includes("tab:bottom-5"));
    // iOS reports real insets only with viewport-fit=cover.
    assert.ok(read("app/layout.tsx").includes("viewportFit: \"cover\""));
  });

  it("topbar: hamburger for the drawer, Escape closes, search never clips", () => {
    const src = read("components/app-shell/Topbar.tsx");
    assert.ok(src.includes("tab:hidden")); // hamburger only below tab
    assert.ok(src.includes('aria-label="Open menu"'));
    assert.ok(src.includes('e.key === "Escape"'));
    assert.ok(src.includes("order-last w-full sm:order-none")); // full-width search row on mobile
    // Phase 2: translucent chrome with backdrop blur.
    assert.ok(src.includes("bg-surface-translucent"));
    assert.ok(src.includes("backdrop-blur-md"));
    assert.ok(read("app/globals.css").includes("--bg-translucent: color-mix(in srgb, var(--ember-background) 82%, transparent)"));
    assert.ok(read("tailwind.config.ts").includes("translucent: \"var(--bg-translucent)\""));
  });

  it("shell bands are the user-specified 600/1024 breakpoints", () => {
    assert.ok(read("tailwind.config.ts").includes('tab: "600px"'));
    assert.ok(read("tailwind.config.ts").includes('desk: "1024px"'));
  });

  it("motion system respects prefers-reduced-motion", () => {
    const src = read("app/globals.css");
    assert.ok(src.includes("prefers-reduced-motion: reduce"));
    assert.ok(src.includes("stroke-width: 1.5")); // one icon stroke everywhere
  });
});


describe("Navigation behavior (Step 34 wrap)", () => {
  it("visibleGroups: viewers lose /invoices and /time, keep the rest", () => {
    const viewer = visibleGroups(false);
    const hrefs = viewer.flatMap((g) => g.items.map((i) => i.href));
    assert.ok(!hrefs.includes("/invoices"));
    assert.ok(!hrefs.includes("/time"));
    for (const kept of ["/", "/intake", "/briefs", "/contracts", "/reports", "/settings"]) {
      assert.ok(hrefs.includes(kept), kept);
    }
    // Money hiding is exactly the MONEY_HREFS set — nothing else drops.
    const owner = visibleGroups(true).flatMap((g) => g.items.map((i) => i.href));
    assert.equal(owner.length, hrefs.length + MONEY_HREFS.size);
  });

  it("visibleGroups never returns an empty group", () => {
    for (const canSeeMoney of [true, false]) {
      for (const group of visibleGroups(canSeeMoney)) {
        assert.ok(group.items.length > 0, group.label);
      }
    }
  });

  it("isActive: exact for /, prefix-with-slash for sections (raw matcher)", () => {
    assert.ok(isActive("/", "/"));
    assert.ok(!isActive("/briefs", "/"));
    assert.ok(isActive("/briefs", "/briefs"));
    assert.ok(isActive("/briefs/abc-123", "/briefs"));
    assert.ok(!isActive("/briefsx", "/briefs"), "no fuzzy prefix matches");
    assert.ok(isActive("/intake/inbox", "/intake"), "raw matcher: prefix matches count");
    assert.ok(isActive("/intake/inbox", "/intake/inbox"));
    assert.ok(!isActive("/intake", "/intake/inbox"));
  });

  it("isNavActive: exactly one destination lights up per route (Phase 2 fix)", () => {
    // The bug: /intake/inbox used to activate Intake AND Inbox together.
    assert.ok(isNavActive("/intake/inbox", "/intake/inbox"));
    assert.ok(!isNavActive("/intake/inbox", "/intake"), "parent must not light when a child matches");
    assert.ok(isNavActive("/intake", "/intake"), "Intake page itself still lights Intake");
    assert.ok(isNavActive("/briefs/abc-123", "/briefs"), "detail pages light their section");
    assert.ok(isNavActive("/", "/"));
    assert.ok(!isNavActive("/dashboard", "/"), "the dashboard rewrite keeps the URL as /");

    // Across the whole registry, every app pathname activates at most one item.
    const pathnames = [
      "/", "/intake", "/intake/inbox", "/briefs", "/briefs/x", "/proposals",
      "/proposals/x/versions/y", "/plans", "/plans/x", "/updates", "/updates/x",
      "/invoices", "/invoices/x", "/time", "/contracts", "/contracts/x",
      "/reports", "/settings", "/search",
    ];
    for (const pathname of pathnames) {
      const active = NAV_ITEMS.filter((item) => isNavActive(pathname, item.href));
      assert.ok(active.length <= 1, `${pathname} lights ${active.map((a) => a.href).join(" + ")}`);
    }
  });

  it("NAV_GROUPS covers every destination exactly once", () => {
    const hrefs = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
    assert.equal(new Set(hrefs).size, hrefs.length, "duplicate hrefs");
    assert.equal(hrefs.length, 12, "7 workspace + 4 money + 1 account");
  });
});
