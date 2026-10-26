/**
 * Copy and verified release records for /changelog.
 *
 * Truthfulness rules enforced by tests/components/changelog-page.test.ts:
 *   - Every entry MUST be classified "VERIFIED RELEASED" with a real
 *     merged commit on `main`, a real GitHub PR link, and a real
 *     production deployment ID from `gh api repos/gunal-official/roducq/deployments`.
 *   - Every entry MUST carry an `evidence` pointer (`file` + `symbol`)
 *     checked against the working tree at test time.
 *   - No fabricated semantic version numbers, unshipped features,
 *     testimonials, third-party template brand names, or live payment
 *     processing claims may appear anywhere in this module.
 */

export type ChangelogBadgeKind = "new" | "improved" | "fixed";

export type ChangelogFilterId = "all" | ChangelogBadgeKind;

export interface ChangelogEvidence {
  readonly file: string;
  readonly symbol: string;
}

export interface ChangelogEntry {
  readonly id: string;
  /** Human-readable release date displayed in the sticky Meta column. */
  readonly date: string;
  /** ISO-8601 date (`YYYY-MM-DD`) bound to `<time dateTime={...}>`. */
  readonly isoDate: string;
  /** Short verification label replacing the reference's Version line. */
  readonly sourceLabel: string;
  /** Canonical GitHub PR URL backing this shipped update. */
  readonly sourceHref: string;
  /** Merge commit SHA on `main` verified in `git log`. */
  readonly commitSha: string;
  /** GitHub/Vercel Production deployment ID verified via GitHub API. */
  readonly deploymentId: number;
  readonly classification: "VERIFIED RELEASED";
  readonly badges: readonly ChangelogBadgeKind[];
  readonly title: string;
  readonly summary: string;
  readonly bullets: readonly string[];
  readonly evidence: readonly ChangelogEvidence[];
}

export interface ChangelogFilterOption {
  readonly id: ChangelogFilterId;
  readonly label: string;
}

export interface ChangelogChecklistItem {
  readonly label: string;
  readonly state: "Done" | "Next" | "Later";
}

export const CHANGELOG_HERO = {
  eyebrow: "Changelog",
  titleBefore: "What's new",
  titleAfter: "in roducq",
  intro:
    "Verified product updates, interface improvements, and fixes shipped to roducq, most recent first.",
} as const;

export const CHANGELOG_FILTERS: readonly ChangelogFilterOption[] = [
  { id: "all", label: "All updates" },
  { id: "new", label: "New" },
  { id: "improved", label: "Improved" },
  { id: "fixed", label: "Fixed" },
];

export const CHANGELOG_BADGE_LABELS: Readonly<
  Record<ChangelogBadgeKind, string>
> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    id: "integrations-directory",
    date: "October 26, 2026",
    isoDate: "2026-10-26",
    sourceLabel: "PR #63",
    sourceHref: "https://github.com/gunal-official/roducq/pull/63",
    commitSha: "cf393b5",
    deploymentId: 7323560435,
    classification: "VERIFIED RELEASED",
    badges: ["new"],
    title: "Integrations directory and connection guide",
    summary:
      "Published /integrations with a searchable catalog of every live connection, export format, and read-only share surface in roducq.",
    bullets: [
      "Filter live surfaces across Documents & intake, Proposals & plans, Billing & contracts, and Sharing & email.",
      "Documented the three-step connection flow from workspace signup through tokenized read-only client links.",
      "Labeled read-only share surfaces distinctly from native file exports and optional inbound webhooks.",
    ],
    evidence: [
      { file: "app/(marketing)/integrations/content.ts", symbol: "INTEGRATIONS" },
      { file: "app/(marketing)/integrations/page.tsx", symbol: "IntegrationsPage" },
    ],
  },
  {
    id: "features-overview",
    date: "October 26, 2026",
    isoDate: "2026-10-26",
    sourceLabel: "PR #62",
    sourceHref: "https://github.com/gunal-official/roducq/pull/62",
    commitSha: "f196a92",
    deploymentId: 7322223828,
    classification: "VERIFIED RELEASED",
    badges: ["new"],
    title: "Features overview across all six workflow pillars",
    summary:
      "Launched /features with an interactive tour of Client intake, AI briefs, Proposals, Project plans, Status updates, and Contracts & invoices.",
    bullets: [
      "Added a sticky six-pillar jump bar with scroll-synced active section tracking.",
      "Paired each workflow pillar with truthful UI previews showing intake notes, flagged brief gaps, and read-only client links.",
    ],
    evidence: [
      { file: "app/(marketing)/features/content.ts", symbol: "FEATURES" },
      { file: "app/(marketing)/features/page.tsx", symbol: "FeaturesPage" },
    ],
  },
  {
    id: "solutions-by-practice",
    date: "October 25, 2026",
    isoDate: "2026-10-25",
    sourceLabel: "PRs #55–#59",
    sourceHref: "https://github.com/gunal-official/roducq/pull/55",
    commitSha: "d2266eb",
    deploymentId: 7316434663,
    classification: "VERIFIED RELEASED",
    badges: ["new"],
    title: "Solutions pages by practice type",
    summary:
      "Published /solutions to show how Solo practices, Design studios, Agencies, and Consultancies manage client writing and project workflows in roducq.",
    bullets: [
      "Added dedicated sections for Solo practices, Design studios, Agencies, and Consultancies with interactive product previews.",
      "Included plan guidance and direct signup links tailored to each practice stage.",
    ],
    evidence: [
      { file: "app/(marketing)/solutions/content.ts", symbol: "CATEGORIES" },
      { file: "app/(marketing)/solutions/page.tsx", symbol: "SolutionsPage" },
    ],
  },
  {
    id: "pricing-and-lcp-fix",
    date: "October 18, 2026",
    isoDate: "2026-10-18",
    sourceLabel: "PRs #52–#54",
    sourceHref: "https://github.com/gunal-official/roducq/pull/52",
    commitSha: "3315a1f",
    deploymentId: 7211564488,
    classification: "VERIFIED RELEASED",
    badges: ["new", "fixed"],
    title: "Dedicated pricing page and faster mobile hero paint",
    summary:
      "Shipped /pricing with monthly and annual plan comparisons and reworked hero headline animations so mobile Largest Contentful Paint stays fast.",
    bullets: [
      "Published Solo ($29/mo), Studio ($79/mo), and Agency ($199/mo) plan details with an honest notice while live checkout remains disabled.",
      "Replaced opacity-zero hero word fades with clip-path reveals so headlines paint immediately on mobile connections.",
      "Added a smooth Back to top control in the shared marketing footer.",
    ],
    evidence: [
      { file: "app/(marketing)/pricing/page.tsx", symbol: "PricingPage" },
      { file: "components/marketing/SiteFooter.tsx", symbol: "SiteFooter" },
    ],
  },
  {
    id: "marketing-home-and-social-cards",
    date: "October 18, 2026",
    isoDate: "2026-10-18",
    sourceLabel: "PRs #46–#51",
    sourceHref: "https://github.com/gunal-official/roducq/pull/46",
    commitSha: "6212b4e",
    deploymentId: 7210772595,
    classification: "VERIFIED RELEASED",
    badges: ["new", "improved"],
    title: "Redesigned marketing home and social preview cards",
    summary:
      "Rebuilt the public landing experience with a unified visual design system, Motion.dev animations, dark-mode support, and generated Open Graph images.",
    bullets: [
      "Added interactive workflow tabs, feature bento cards, FAQ accordion, and dark-mode token support.",
      "Shipped dynamic Open Graph and Twitter card images across public routes.",
    ],
    evidence: [
      { file: "app/(marketing)/home/content.ts", symbol: "HERO" },
      { file: "app/opengraph-image.tsx", symbol: "Image" },
    ],
  },
  {
    id: "workspace-refresh-and-hardening",
    date: "October 16, 2026",
    isoDate: "2026-10-16",
    sourceLabel: "PRs #24–#40",
    sourceHref: "https://github.com/gunal-official/roducq/pull/40",
    commitSha: "2926fce",
    deploymentId: 7180260725,
    classification: "VERIFIED RELEASED",
    badges: ["improved", "fixed"],
    title: "Workspace visual refresh and security hardening",
    summary:
      "Extended a unified workspace design system across signed-in screens and completed security, accessibility, and performance improvements.",
    bullets: [
      "Refreshed Pipeline, Intake, Inbox, Briefs, Proposals, Plans, Updates, Invoices, Time, Contracts, Reports, and Settings screens plus auth flows.",
      "Hardened HTTP security headers, keyboard focus states, and database query indexes.",
    ],
    evidence: [
      { file: "components/app-shell/nav-items.ts", symbol: "NAV_ITEMS" },
      { file: "next.config.mjs", symbol: "headers" },
    ],
  },
  {
    id: "file-intake-search-and-comparisons",
    date: "October 10, 2026",
    isoDate: "2026-10-10",
    sourceLabel: "PRs #20, #22, #23",
    sourceHref: "https://github.com/gunal-official/roducq/pull/22",
    commitSha: "7f41589",
    deploymentId: 7076938607,
    classification: "VERIFIED RELEASED",
    badges: ["new"],
    title: "File intake uploads, global workspace search, and /vs comparisons",
    summary:
      "Added document upload parsing in Intake, cross-workspace search, and honest side-by-side comparison pages.",
    bullets: [
      "Upload DOCX, PDF, TXT, and Markdown files directly into client intake.",
      "Search briefs, proposals, plans, updates, invoices, and contracts from /search with viewer-safe money redaction.",
      "Published the /vs hub and nine side-by-side comparison pages with verified trade-offs.",
    ],
    evidence: [
      { file: "lib/search.ts", symbol: "SEARCH_GROUPS" },
      { file: "app/(marketing)/vs/[slug]/vs-pages.ts", symbol: "VS_PAGE_LIST" },
    ],
  },
  {
    id: "core-client-ops-launch",
    date: "October 2, 2026",
    isoDate: "2026-10-02",
    sourceLabel: "PRs #1–#9",
    sourceHref: "https://github.com/gunal-official/roducq/pull/9",
    commitSha: "8fbfac3",
    deploymentId: 6978823397,
    classification: "VERIFIED RELEASED",
    badges: ["new", "improved"],
    title: "Core client-ops pipeline, PDF exports, and roducq launch",
    summary:
      "Launched roducq with workspaces, client intake, AI brief generation with gap detection, proposals, plans, updates, time tracking, contracts, invoices, PDF downloads, and tokenized read-only share links.",
    bullets: [],
    evidence: [
      {
        file: "supabase/migrations/20260922000000_workspace_auth_init.sql",
        symbol: "workspaces",
      },
      {
        file: "supabase/migrations/20260922123000_briefs_schema.sql",
        symbol: "briefs",
      },
    ],
  },
];

export const CHANGELOG_CLOSING = {
  eyebrow: "Start free",
  titleBefore: "Try roducq on",
  titleAccent: "your next client",
  titleAfter: "",
  body: "Paste a real email or upload a discovery note, generate a brief with flagged gaps, and share a clean proposal link.",
  primary: { label: "Start free", href: "/signup" },
  secondary: { label: "See pricing", href: "/pricing" },
  footnote:
    "Free to start. No credit card required — live paid checkout is not enabled yet.",
  cardTitle: "Getting started",
  cardMeta: "4 steps",
} as const;

export const CHANGELOG_CHECKLIST: readonly ChangelogChecklistItem[] = [
  { label: "Create your workspace", state: "Done" },
  { label: "Add a client note or file", state: "Done" },
  { label: "Generate your first brief", state: "Next" },
  { label: "Share a read-only link", state: "Later" },
];

export const MOCK_DISCLOSURE = "Illustrative sample data";

/** Pure filter helper shared between <ChangelogFeed /> and unit tests. */
export function filterChangelogEntries(
  entries: readonly ChangelogEntry[],
  filterId: ChangelogFilterId,
): readonly ChangelogEntry[] {
  if (filterId === "all") return entries;
  return entries.filter((entry) => entry.badges.includes(filterId));
}
