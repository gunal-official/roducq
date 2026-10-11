/**
 * Shared app-route registry (Step 31 → Step 34 ui.webp shell): one source of
 * truth for the Sidebar (tab+), the icon rail (tab–desk) and the mobile
 * drawer (<tab). Grouped like the design language (uppercase micro-labels).
 * Icons are semantic (docs/icon-audit.md): nav = 20px, stroke 1.5 (global),
 * decorative = aria-hidden (link text carries meaning).
 */
import {
  BarChart3,
  ClipboardList,
  Clock,
  FileSignature,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PenLine,
  Receipt,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Pipeline", href: "/", icon: LayoutDashboard },
      { label: "Intake", href: "/intake", icon: PenLine },
      { label: "Inbox", href: "/intake/inbox", icon: Inbox },
      { label: "Briefs", href: "/briefs", icon: ClipboardList },
      { label: "Proposals", href: "/proposals", icon: FileText },
      { label: "Plans", href: "/plans", icon: ListChecks },
      { label: "Updates", href: "/updates", icon: MessageSquare },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Time", href: "/time", icon: Clock },
      { label: "Contracts", href: "/contracts", icon: FileSignature },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/settings", icon: Settings }],
  },
];

/** Flat view (menus built from groups use this). */
export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap(
  (group) => group.items
);

/** Money surfaces — hidden from viewers (Step 29 hide rule). */
export const MONEY_HREFS = new Set(["/invoices", "/time"]);

/** Raw matcher: exact page, or any nested page under the section. Note this
 *  alone lights BOTH /intake and /intake/inbox on the inbox page — shell
 *  highlighting must go through isNavActive (most-specific-match wins). */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Every registered nav href (specificity resolution is registry-wide). */
const NAV_HREFS: readonly string[] = NAV_ITEMS.map((item) => item.href);

/** Unique active-route matcher (Phase 2 fix): when a pathname matches
 *  several registered hrefs by prefix (e.g. /intake/inbox matches both
 *  /intake and /intake/inbox), ONLY the most specific one is active, so
 *  Intake and Inbox never light up together. */
export function isNavActive(pathname: string, href: string): boolean {
  if (!isActive(pathname, href)) return false;
  return !NAV_HREFS.some(
    (other) =>
      other.length > href.length && isActive(pathname, other)
  );
}

/** Phone bottom-bar destinations (Phase 2): the four highest-traffic routes,
 *  none of them money-gated, so every role sees the same bar. The fifth slot
 *  is the "More" tab, which opens the full MobileNav drawer for the rest. */
export const MOBILE_TAB_HREFS: readonly string[] = [
  "/",
  "/intake/inbox",
  "/briefs",
  "/proposals",
];

/** Bottom-bar items in tab order, honoring the viewer money-hide rule. */
export function mobileTabItems(canSeeMoney: boolean): NavItem[] {
  return MOBILE_TAB_HREFS.map((href) => NAV_ITEMS.find((i) => i.href === href)).filter(
    (item): item is NavItem =>
      !!item && (canSeeMoney || !MONEY_HREFS.has(item.href))
  );
}

/** Groups minus money items the viewer may not see. */
export function visibleGroups(canSeeMoney: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => canSeeMoney || !MONEY_HREFS.has(item.href)
    ),
  })).filter((group) => group.items.length > 0);
}
