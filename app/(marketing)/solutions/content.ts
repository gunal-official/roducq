/**
 * /solutions content — the Forma-referenced practice showcase.
 *
 * WHY THIS FILE EXISTS. Every string a visitor reads on /solutions
 * lives here, exactly like app/(marketing)/home/content.ts, so the
 * page components stay markup-only and tests can assert the copy
 * against the product instead of against itself.
 *
 * DESIGN REFERENCE. The composition, section order, spacing, type
 * scale and motion of this page follow the live capture of
 * https://forma-visuvate.framer.website/solutions (see
 * docs/FORMA_SOLUTIONS_REFERENCE.md for the measured values).
 * Nothing else comes from it: no Forma logo, asset, photograph,
 * marketing sentence, role name or mock datum is reproduced. Every
 * word below describes roducq, in the voice established by the
 * homepage and pricing copy.
 *
 * TAXONOMY. The reference groups its showcase by the customer's
 * line of work. Roducq's established taxonomy — the same four
 * practices the homepage Teams band uses — replaces it: solo
 * practices, design studios, agencies, consultancies. The count
 * (four) matches the reference's measured four-category structure;
 * the labels are Roducq's own.
 *
 * MOCK DATA. Every client name, engagement and figure inside
 * MOCKS and SOLUTIONS_CHECKLIST is fabricated sample content for
 * illustration, exactly like the reference's own mock UIs. None of
 * it is a real customer, a real engagement or a real measurement,
 * and the tests treat these strings as display-only.
 *
 * TRUTHFULNESS. No invented prices, no invented customers, no
 * invented capability. The plan band reuses the pricing page's own
 * framing (per-workspace billing, no feature paywalls), and every
 * surface depicted — intake, brief, proposal, plan, update, time,
 * invoice, share link, webhook — exists in the app today.
 */

/**
 * The page hero: eyebrow, two-part headline, lead.
 *
 * THE SPLIT IS THE SENTENCE. "Different client work." is the ink line;
 * "One writing workspace." is the gradient unit — the same
 * Title + Highlight composition the reference measures on its own
 * hero (docs/FORMA_SOLUTIONS_REFERENCE.md §4.1), applied to the
 * approved copy. The reference's headline fits on one line at
 * 1440px; this copy is 1,349px at the same 67.2px step, so the
 * highlight becomes the second line. That break is content-driven,
 * not an inserted <br>.
 */
export const SOLUTIONS_HERO = {
  eyebrow: "Solutions",
  /** Rendered in ink, one masked span per word (measured cadence). */
  titleBefore: "Different client work.",
  /** Rendered in the accent gradient, as one animated unit. */
  titleAfter: "One writing workspace.",
  title: "Different client work. One writing workspace.",
  intro:
    "From a solo engagement to a shared client account, keep the original request connected to the brief, proposal, plan and update it becomes.",
} as const;

/**
 * The sticky jump chips between the hero and the showcase. The
 * reference publishes one anchor chip per category; the anchors are
 * the article ids rendered by the showcase below.
 */
export const SECTION_NAV: readonly {
  index: string;
  label: string;
  href: string;
}[] = [
  { index: "01", label: "Solo practices", href: "#solo-practices" },
  { index: "02", label: "Design studios", href: "#design-studios" },
  { index: "03", label: "Agencies", href: "#agencies" },
  { index: "04", label: "Consultancies", href: "#consultancies" },
] as const;

/** The label above every category's workflow list. */
export const WORKFLOWS_LABEL = "What each practice sets up first";

export interface PracticeWorkflow {
  /** The bold lead-in sentence. */
  lead: string;
  /** The supporting sentence. */
  text: string;
}

export interface PracticeCategory {
  /** Anchor id — the section nav chip links here. */
  id: string;
  index: string;
  label: string;
  title: string;
  copy: string;
  workflows: readonly [PracticeWorkflow, PracticeWorkflow, PracticeWorkflow];
  templates: readonly string[];
  /** Key into MOCKS — the miniature surface this practice leans on. */
  mock: "trail" | "brief" | "proposal" | "week";
}

/**
 * The four categories, in the reference's measured order: each is
 * numbered, labelled, headlined, described, and paired with three
 * first workflows and the templates that practice really starts
 * from (the same template names the homepage Teams band publishes).
 */
export const CATEGORIES: readonly PracticeCategory[] = [
  {
    id: "solo-practices",
    index: "01",
    label: "Solo practices",
    title: "One trail per client, end to end",
    copy: "The original message, the brief it became, the proposal, and every update after it stay threaded on one client trail. Nothing is retyped, and nothing is lost between inboxes.",
    workflows: [
      {
        lead: "One intake, one brief.",
        text: "Paste the email or the call notes; roducq drafts the brief with the original message still attached.",
      },
      {
        lead: "Proposals from the brief.",
        text: "Scope, deliverables and budget carry over, and every save is a version you can restore.",
      },
      {
        lead: "Updates that write themselves.",
        text: "Tick off the plan as it moves and the weekly update composes from real progress.",
      },
    ],
    templates: ["proposal", "weekly update"],
    mock: "trail",
  },
  {
    id: "design-studios",
    index: "02",
    label: "Design studios",
    title: "Creative direction that survives the handoff",
    copy: "The brief keeps the client's own wording beside the fields you filled in, and the vague parts are raised as open questions instead of quietly guessed. What was approved stays recorded against the version it was approved on.",
    workflows: [
      {
        lead: "Both records on the brief.",
        text: "The client's own wording sits beside your structured fields, so the brief you wrote is never the only account of the ask.",
      },
      {
        lead: "Open questions, tracked.",
        text: "Vague parts are flagged for the client instead of filled in with guesses.",
      },
      {
        lead: "Reviews against a version.",
        text: "Comments resolve on the version they were made on, and the approval is recorded, not remembered.",
      },
    ],
    templates: ["creative brief", "design review"],
    mock: "brief",
  },
  {
    id: "agencies",
    index: "03",
    label: "Agencies",
    title: "Proposals that become working plans",
    copy: "Invite the team as members and the client's account manager as view-only; search and every money surface respect the role each person was given. When a proposal is accepted, its scope becomes the plan the delivery runs on.",
    workflows: [
      {
        lead: "Roles per workspace.",
        text: "Owners run the workspace, members do the work, and viewers see only what you share.",
      },
      {
        lead: "Scope that becomes the plan.",
        text: "Accepting the proposal turns deliverables into a plan the team can tick off.",
      },
      {
        lead: "Share links you can revoke.",
        text: "Clients follow progress behind a link, with no account to manage.",
      },
    ],
    templates: ["scope of work", "retainer plan"],
    mock: "proposal",
  },
  {
    id: "consultancies",
    index: "04",
    label: "Consultancies",
    title: "Reports that write themselves from the week",
    copy: "Log hours against the plan as the week happens, then read it back in reports and attach the figures to the client update. Month-end is one screen: time, invoices and the update all read from the same week.",
    workflows: [
      {
        lead: "Hours as they happen.",
        text: "Log time against the plan while the week is still fresh.",
      },
      {
        lead: "Figures into the update.",
        text: "The hours you logged land in the weekly update and the invoice note.",
      },
      {
        lead: "Month-end on one screen.",
        text: "Time, invoices and reports read from the same week — no spreadsheet reconciliation.",
      },
    ],
    templates: ["month-end report", "invoice note"],
    mock: "week",
  },
] as const;

/** The templates line that closes every category block. */
export const TEMPLATES_LABEL = "Templates";

/**
 * The disclosure every miniature carries, visibly, in both places it
 * renders (the sticky stage on desktop and inline under each category
 * below 1200px). The mock data is invented — see the MOCKS note below
 * — and this is the sentence that says so on the page itself rather
 * than only in a source comment.
 */
export const MOCK_DISCLOSURE = "Illustrative example · fictional client";

/* ── Fabricated miniature surfaces (mock data) ────────────────────── */

/**
 * FABRICATED SAMPLE DATA. The reference sticks a miniature product
 * UI next to each category; roducq's miniatures are drawn from its
 * own real surfaces (client trail, brief, proposal, weekly plan).
 * Every client name, engagement and figure below is invented for
 * illustration and is asserted by tests/components/solutions-page.test.ts
 * to never leak into any claim of fact.
 */
export const MOCKS = {
  trail: {
    title: "Northwind Bakery",
    pill: "Active",
    rows: [
      { label: "Kickoff call notes", meta: "Intake · Sep 12" },
      { label: "Brand refresh brief", meta: "Draft · 2 open questions" },
      { label: "Proposal v2", meta: "Sent Sep 18" },
    ],
    footerLabel: "Trail progress",
    footerValue: "3 of 4 steps",
    /** Fill fraction of the progress track (3 of 4). */
    progress: 0.75,
  },
  brief: {
    title: "Harbor Coffee — packaging system",
    pill: "In review",
    rows: [
      { label: "Goals & references", meta: "Attached" },
      { label: "Open questions", meta: "2 tracked" },
      { label: "Edit history", meta: "4 revisions saved" },
    ],
    comment: {
      initials: "AM",
      text: "Keep the dieline in the brief",
      state: "Resolved",
    },
  },
  proposal: {
    title: "Meridian Retail — Q4 retainer",
    /** The status pill crossfades between these two, the way the
     *  reference's mock swaps its own status labels. */
    pillStates: ["Sent", "Accepted"],
    rows: [
      { label: "Version", meta: "v3" },
      { label: "Deliverables", meta: "6" },
      { label: "Team roles", meta: "Owner 1 · Members 3 · View only 2" },
    ],
    footerLabel: "Outbound webhook",
    footerValue: "Signed",
  },
  week: {
    title: "Week of Sep 22",
    pill: "18.5 h",
    items: [
      { label: "Log billable hours", state: "Done" },
      { label: "Draft weekly update", state: "Done" },
      { label: "Send the March invoice", state: "Next" },
      { label: "Month-end review", state: "Later" },
    ],
  },
} as const;

/* ── Choosing a plan ──────────────────────────────────────────────── */

/**
 * The plan band. The copy is the pricing page's own framing,
 * restated: per-workspace billing, no per-seat line, no feature
 * paywalls. No price appears here — the only figure the marketing
 * surface may publish is the free plan's $0, and this band doesn't
 * need it.
 */
export const PLAN_BAND = {
  eyebrow: "Choosing a plan",
  title: "One workspace, one price, the whole pipeline",
  copy: "Billed per workspace, never per seat. One product, no feature paywalls — the paid plan is the same product with a subscription behind it, and it cancels from Settings at any time.",
  primaryCta: { label: "Compare plans", href: "/pricing" },
  secondaryCta: { label: "Talk to us", href: "mailto:hello@roducq.dev" },
} as const;

/* ── Closing CTA ──────────────────────────────────────────────────── */

/**
 * The closing headline reuses the homepage's approved closing copy
 * verbatim (CLOSING in app/(marketing)/home/content.ts); it is
 * restated here so this page's content module is self-contained and
 * testable on its own.
 */
export const SOLUTIONS_CLOSING = {
  lines: ["Try roducq with", "your own", "client project"] as const,
  title: "Try roducq with your own client project",
  intro:
    "Start on the free plan, bring one live engagement, and see how much of the week the pipeline takes care of.",
  primaryCta: { label: "Start free", href: "/signup" },
  secondaryCta: { label: "Talk to us", href: "mailto:hello@roducq.dev" },
  note: "The whole pipeline is free, with no trial clock to watch.",
} as const;

/** The "getting started" miniature beside the closing headline. */
export const SOLUTIONS_CHECKLIST = {
  title: "First project",
  progress: "2 of 4",
  items: [
    { label: "Create your workspace", state: "Done" as const },
    { label: "Bring one live engagement", state: "Done" as const },
    { label: "Send the first update", state: "Next" as const },
    { label: "Invite your client", state: "Later" as const },
  ],
} as const;
