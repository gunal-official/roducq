/**
 * /features content — the Forma-referenced product showcase.
 *
 * WHY THIS FILE EXISTS. Every string a visitor reads on /features
 * lives here, exactly like app/(marketing)/home/content.ts and
 * app/(marketing)/solutions/content.ts, so the page components stay
 * markup-only and tests can assert the copy against the product
 * instead of against themselves.
 *
 * DESIGN REFERENCE. The composition, section order, spacing, type
 * scale and motion of this page follow the live capture of
 * https://forma-visuvate.framer.website/features (see
 * docs/FORMA_FEATURES_PAGE_AUDIT.md for every measured value).
 * Nothing else comes from it: no Forma logo, asset, sentence,
 * task-manager term, ticket id or mock datum is reproduced. Every
 * word below describes roducq, in the voice established by the
 * homepage and the /solutions copy.
 *
 * TRUTHFULNESS. Each article maps to a surface the product ships:
 * events/webhooks (lib/events.ts, lib/webhook-dispatch.ts), plans
 * (plans table), updates and time entries, integrations
 * (lib/integrations), reports (lib/reports.ts), roles
 * (docs/roles-spec.md) and proposal versions. The reference's
 * calendar, board/timeline views, two-way sync, command menu, CSV/JSON
 * export and task comments are deliberately NOT reproduced — roducq
 * provides none of them.
 *
 * MOCK DATA. Every client name, engagement and figure inside
 * FEATURE_MOCKS is fabricated sample content for illustration, the
 * same convention /solutions uses. None of it is a real customer, a
 * real engagement or a measured outcome, and every miniature carries
 * the MOCK_DISCLOSURE line on the page itself.
 */

/**
 * The page hero: eyebrow, two-part headline, lead, two ways in.
 *
 * THE SPLIT IS THE SENTENCE. "Capture, structure, and send" is the
 * ink line; "client work in one workspace." is the gradient unit —
 * the reference's measured Title + Highlight composition, applied to
 * approved Roducq copy. The tri-verb mirrors the reference's own
 * three-verb headline rhythm while naming real Roducq stages:
 * intake capture, structured briefs/proposals, sent updates.
 */
export const FEATURES_HERO = {
  eyebrow: "Features",
  /** Rendered in ink, one masked span per word (measured cadence). */
  titleBefore: "Capture, structure, and send",
  /** Rendered in the accent gradient, as one animated unit. */
  titleAfter: "client work in one workspace.",
  /** Screen-reader and SEO form of the split headline. */
  title: "Capture, structure, and send client work in one workspace.",
  intro:
    "roducq brings client intake, briefs, proposals, plans and updates together in one workspace, then carries each stage's structure into the next — so routine updates and handoffs happen without re-typing anything.",
  primaryCta: { label: "Start free", href: "/signup" },
  /** Roducq has no demo product, so the reference's "Try the demo"
   *  slot takes the same secondary action the rest of the shell uses. */
  secondaryCta: { label: "Talk to us", href: "mailto:contact@nanexi.com" },
} as const;

/**
 * The sticky jump chips between the hero and the showcase. Six chips,
 * one per article; the anchors are the article ids the showcase renders.
 */
export const SECTION_NAV: readonly {
  index: string;
  label: string;
  href: string;
}[] = [
  { index: "01", label: "Automations", href: "#automations" },
  { index: "02", label: "Projects & plans", href: "#projects" },
  { index: "03", label: "Updates & time", href: "#cadence" },
  { index: "04", label: "Integrations", href: "#connected" },
  { index: "05", label: "Insights", href: "#insights" },
  { index: "06", label: "Collaboration", href: "#collaboration" },
] as const;

export interface FeaturePoint {
  /** The bold lead-in phrase. */
  lead: string;
  /** The supporting sentence. */
  text: string;
}

export interface FeatureArticle {
  /** Anchor id — the section nav chip links here. */
  id: string;
  index: string;
  label: string;
  title: string;
  copy: string;
  points: readonly [FeaturePoint, FeaturePoint, FeaturePoint];
  /** Key into FEATURE_MOCKS — the miniature this article leans on. */
  mock: FeatureMockKey;
  /** The one article the reference gives a text link (its 04 band). */
  link?: { label: string; href: string };
}

export type FeatureMockKey =
  | "automation"
  | "plan"
  | "update"
  | "connections"
  | "rollup"
  | "roster";

/**
 * The six articles, in the reference's measured order. Each is
 * numbered, labelled, headlined, described, paired with three
 * bold-lead points and one fabricated miniature of a real surface.
 */
export const FEATURES: readonly FeatureArticle[] = [
  {
    id: "automations",
    index: "01",
    label: "Automations",
    title: "Hand-offs that carry themselves forward",
    copy: "Each stage inherits the structure of the last, so the brief, proposal, plan and update stay connected without anyone re-typing them. When a recorded transition happens, roducq can notify your own systems and logs exactly what ran.",
    points: [
      {
        lead: "Structure carries forward, not re-typed.",
        text: "A brief drafted from intake becomes a proposal, and an accepted proposal becomes the delivery plan — every field carries over.",
      },
      {
        lead: "Signed webhooks on real transitions.",
        text: "Owners register endpoints in Settings; roducq signs every delivery and only emits the ten event types the workspace records.",
      },
      {
        lead: "A log of every run.",
        text: "Each event is written to the activity feed, and every webhook delivery keeps an auditable success or failure record.",
      },
    ],
    mock: "automation",
  },
  {
    id: "projects",
    index: "02",
    label: "Projects & plans",
    title: "Every accepted proposal becomes a working plan",
    copy: "A plan is built from the proposal's scope and deliverables, so the team ticks off the work the client actually approved. The same checklist drives status, updates and the time logged against it.",
    points: [
      {
        lead: "Deliverables become the checklist.",
        text: "Tasks are copied from the accepted proposal and ticked in place, with the source proposal still attached.",
      },
      {
        lead: "One status the whole workspace sees.",
        text: "Each plan reads not started, in progress or done — the same three states on every surface.",
      },
      {
        lead: "Templates for repeated work.",
        text: "Owners write proposal and update templates once, so the next engagement starts from a checklist the team has used before.",
      },
    ],
    mock: "plan",
  },
  {
    id: "cadence",
    index: "03",
    label: "Updates & time",
    title: "The weekly update writes itself from real progress",
    copy: "Tick the plan as the week moves and the client update composes from those changes, ready to edit. Log hours against the same work and share the result behind a link the client does not need an account to open.",
    points: [
      {
        lead: "Composed from the plan, not memory.",
        text: "The update drafts from completed and open plan tasks, then stays fully editable as markdown before you send.",
      },
      {
        lead: "Hours logged by the day.",
        text: "The time log groups entries by the day the work happened and keeps them attached to the right brief.",
      },
      {
        lead: "Shared behind a link you can revoke.",
        text: "Clients read updates through a token link with no account, and revoking it closes access immediately.",
      },
    ],
    mock: "update",
  },
  {
    id: "connected",
    index: "04",
    label: "Integrations",
    title: "Bring the work in from the tools you already use",
    copy: "Connect Slack, Notion or a mailbox and pull client messages straight into intake with their original wording intact. roducq reads from those tools — it never writes back to them — and sends outbound through webhooks, PDFs and share links instead.",
    points: [
      {
        lead: "Quick to connect.",
        text: "Sign in with OAuth from Settings; an expired token is surfaced for re-authorisation instead of failing silently.",
      },
      {
        lead: "Sources, not copies.",
        text: "The original message stays attached to the brief it becomes, and the connectors stay read-only against your tools.",
      },
      {
        lead: "Outbound on your terms.",
        text: "Signed webhooks, revocable share links and PDF export leave the workspace only where you configured them.",
      },
    ],
    mock: "connections",
    link: { label: "Browse all integrations", href: "/#integrations" },
  },
  {
    id: "insights",
    index: "05",
    label: "Insights",
    title: "One rollup instead of another status meeting",
    copy: "Reports read live from the workspace's invoices, contracts, time entries and briefs, so the month-end picture is computed rather than assembled. The same hours appear in the report, the update and the invoice note.",
    points: [
      {
        lead: "Computed live from your data.",
        text: "Money, hours and contracts roll up on one screen, with draft, sent and paid states kept separate.",
      },
      {
        lead: "Hours by brief.",
        text: "The month's time is grouped by brief, with a General row for work not tied to one engagement.",
      },
      {
        lead: "The figures travel into the update.",
        text: "Logged hours land in the weekly update and invoice notes, so the client sees the same numbers you do.",
      },
    ],
    mock: "rollup",
  },
  {
    id: "collaboration",
    index: "06",
    label: "Collaboration",
    title: "One workspace, clear roles, clients on a link",
    copy: "Every workspace has owners, members and viewers, with row-level security enforcing what each person can see and edit. Clients follow specific engagements as viewers while the team keeps working, and every proposal save is a version you can restore.",
    points: [
      {
        lead: "Three roles, enforced by row-level security.",
        text: "Owners run the workspace, members do the work, and viewers never see invoices, time entries or money surfaces.",
      },
      {
        lead: "Clients follow progress without an account.",
        text: "Invite a client as a viewer, or share a revocable link scoped to the engagement you choose.",
      },
      {
        lead: "Every proposal save is a restorable version.",
        text: "Each save snapshots the proposal, so you can diff versions and roll back to an earlier draft.",
      },
    ],
    mock: "roster",
  },
] as const;

/**
 * The disclosure every miniature carries, visibly, in both places it
 * renders (the sticky stage on desktop and inline under each article
 * below 1200px). The mock data is invented — see the MOCKS note below.
 */
export const MOCK_DISCLOSURE = "Illustrative example · fictional client";

/* ── Fabricated miniature surfaces (mock data) ────────────────────── */

/**
 * FABRICATED SAMPLE DATA. The reference sticks a miniature product UI
 * next to each article; roducq's six miniatures are drawn from its own
 * real surfaces (the event/rule vocabulary, a plan checklist, the
 * update composer, integration settings, the report rollup and the
 * workspace roster). Every client name, engagement and figure below is
 * invented for illustration; no prices and no percentage claims appear.
 */
export const FEATURE_MOCKS = {
  automation: {
    title: "Meridian Retail — Q4 retainer",
    /** Accessible name for the illustration; keeps fictional names in
     *  this content module rather than in the component. */
    ariaLabel:
      "Illustrative automation rule for the Meridian Retail retainer",
    pill: "Active",
    rows: [
      {
        conj: "When",
        cells: ["Proposal status", "changes to", "Accepted"],
      },
      {
        conj: "And",
        cells: ["Workspace", "is", "Meridian Retail"],
      },
      {
        conj: "Then",
        cells: ["Run webhook", "in", "#client-channel"],
      },
      {
        conj: "And",
        cells: ["Create the delivery plan", "for", "Owner"],
      },
    ],
    footer: "Ran just now · “Brand refresh proposal” marked accepted",
  },
  plan: {
    title: "Northwind Bakery — brand refresh",
    ariaLabel:
      "Illustrative working plan for the Northwind Bakery refresh",
    pill: "In progress",
    tasks: [
      { label: "Confirm brand direction", checked: true },
      { label: "Refresh the logo lockup", checked: true },
      { label: "Packaging dielines", checked: true },
      { label: "Menu card copy", checked: false },
      { label: "In-store signage guide", checked: false },
    ],
    footerLabel: "Plan progress",
    footerValue: "3 of 5",
    /** Fill fraction of the progress track (3 of 5). */
    progress: 0.6,
  },
  update: {
    title: "Week of Sep 22",
    ariaLabel:
      "Illustrative weekly client update with a revocable share link",
    pill: "Draft",
    lines: [
      { label: "Packaging dielines", state: "Done" },
      { label: "Menu card copy", state: "In progress" },
      { label: "Logo files awaiting client", state: "Blocked" },
    ],
    share: "Share link · revocable",
    time: "4.5h logged Tuesday",
  },
  connections: {
    title: "Connected sources",
    ariaLabel:
      "Illustrative list of connected sources and outbound channels",
    pill: "3 of 5",
    rows: [
      { label: "Slack", detail: "Client threads import intact", state: "Connected" },
      { label: "Notion", detail: "Pages arrive as sources", state: "Connected" },
      { label: "Email inbox", detail: "OAuth mailbox connected", state: "Connected" },
      { label: "Webhooks", detail: "1 signed endpoint", state: "Configured" },
      { label: "PDF & share links", detail: "Built into every record", state: "Built in" },
    ],
  },
  rollup: {
    title: "Workspace rollup",
    ariaLabel:
      "Illustrative monthly workspace rollup with fictional figures",
    pill: "September",
    stats: [
      { value: "18.5h", label: "Billable hours" },
      { value: "6", label: "Invoices sent" },
      { value: "2", label: "Contracts signed" },
    ],
    bars: [
      { label: "Brand refresh", value: "8.0h", width: 0.86 },
      { label: "Packaging system", value: "6.5h", width: 0.7 },
      { label: "General", value: "4.0h", width: 0.43 },
    ],
    footer: "Download PDF",
  },
  roster: {
    title: "Meridian Retail workspace",
    ariaLabel:
      "Illustrative workspace roster with roles and a restorable proposal version",
    pill: "Owner 1 · Members 3 · View only 2",
    members: [
      { initials: "AR", label: "Owner" },
      { initials: "JK", label: "Member" },
      { initials: "MR", label: "Member" },
      { initials: "LT", label: "Member" },
      { initials: "NB", label: "Viewer · client" },
    ],
    version: "Proposal v3 · restore available",
    questions: "2 open questions on the brief",
  },
} as const;

/* ── Details band — "Smaller things that save time" ───────────────── */

/**
 * The reference's four cells include a command menu and CSV/JSON
 * export that roducq does not ship. They are replaced by four real
 * capabilities, keeping the measured four-cell structure. `icon` is a
 * lucide-react component name resolved in FeaturesMocks/DetailsBand.
 */
export const DETAILS_BAND = {
  eyebrow: "Details",
  title: "Smaller things that save time",
  cells: [
    {
      icon: "Search",
      title: "Global search",
      copy: "One box covers briefs, proposals, plans, updates, invoices and contracts, with money surfaces hidden from viewers.",
    },
    {
      icon: "MessageCircleQuestion",
      title: "Open questions, tracked",
      copy: "The vague parts of a brief are flagged for the client as tracked questions instead of quietly guessed.",
    },
    {
      icon: "Moon",
      title: "Light and dark",
      copy: "Switch themes from the header, or follow your system setting across every marketing and workspace surface.",
    },
    {
      icon: "FileDown",
      title: "PDF export anytime",
      copy: "Export proposals, contracts, invoices and time reports as clean PDFs — no other export format is promised.",
    },
  ],
} as const;

/* ── Closing CTA ──────────────────────────────────────────────────── */

/**
 * The closing headline reuses the homepage's approved closing copy
 * verbatim (CLOSING in app/(marketing)/home/content.ts and the same
 * restatement /solutions publishes); it is restated here so this
 * page's content module stays self-contained and testable on its own.
 */
export const FEATURES_CLOSING = {
  lines: ["Try roducq with", "your own", "client project"] as const,
  title: "Try roducq with your own client project",
  intro:
    "Start on the free plan, bring one live engagement, and see how much of the week the pipeline takes care of.",
  primaryCta: { label: "Start free", href: "/signup" },
  secondaryCta: { label: "Talk to us", href: "mailto:contact@nanexi.com" },
  note: "The whole pipeline is free, with no trial clock to watch.",
} as const;

/** The "first project" miniature beside the closing headline. */
export const FEATURES_CHECKLIST = {
  title: "First project",
  progress: "2 of 4",
  items: [
    { label: "Create your workspace", state: "Done" as const },
    { label: "Paste a client message", state: "Done" as const },
    { label: "Generate your first brief", state: "Next" as const },
    { label: "Invite your team", state: "Later" as const },
  ],
} as const;
