/**
 * Home page content — the Forma-referenced landing surface (redesign 2026-10-17).
 *
 * WHY THIS FILE IS SEPARATE. The page (../page.tsx) and the components in
 * components/marketing/landing/** are markup only; homepage copy lives here,
 * while tiny client-safe announcement/footer labels live in chrome-content.ts
 * so the shared shell does not bundle every page string. That split lets
 * tests/components/home.test.ts import copy directly and assert it against
 * the product instead of against itself — like pricing's content module.
 *
 * DESIGN REFERENCE. The visual system, the section order and the rhythm of
 * this page follow https://forma-visuvate.framer.website/. Nothing else
 * comes from it: no logo, no illustration, no photograph and no marketing
 * sentence is reproduced. Every word below describes roducq.
 *
 * SECTIONS A–J, in the reference's order:
 *
 *   A  Announcement   — one line, one link, dismissible-free
 *   B  Header         — components/marketing/SiteHeader.tsx
 *   C  Hero           — promise, two ways in, the product frame
 *   D  Features       — the four jobs, each with its own visual
 *   E  Getting started— three steps and one engagement timeline
 *   F  Integrations   — the connectors and outputs that really exist
 *   G  Teams          — the same workspace, four different shapes
 *   H  Pricing        — three approved plans and one informational panel
 *   I  FAQ            — the six questions asked before signing up
 *   J  Final CTA      — plus the "what roducq doesn't do" callout
 *
 * TRUTHFULNESS. Every claim below is checkable against code that ships
 * today, and the tests fail if the copy outruns it. Three rules:
 *
 *   - Approved monthly prices are reused from the pricing-page presentation;
 *     this page does not read live billing configuration or imply paid-plan
 *     checkout/entitlements that are not implemented.
 *   - No invented customers. There is no testimonial section, because
 *     roducq has no quotable customer consent to publish.
 *   - The limits are on the page, not in the small print. `LIMITATION`
 *     says plainly that roducq collects no e-signatures and takes no
 *     payments, because lib/pdf/layout.ts prints signature *lines* and
 *     nothing in the app ever touches a card.
 *
 * NO DYNAMIC CLASSES. Per-item colour comes from an explicit lookup
 * (`TONE_*_CLASS`) whose values are complete literal Tailwind strings, so
 * the compiler can see every class that exists. Nothing downstream builds a
 * class at runtime — see the "design tokens" block in the test file.
 */

export { ANNOUNCEMENT, HOME_ANNOUNCEMENT, HOME_FOOTER_CTA } from "./chrome-content.ts";

/** The tints a card or chip may take, keyed to real Tailwind tokens. */
export type Tone = "accent" | "info" | "success" | "muted";

/**
 * Explicit class maps — one complete literal string per tone.
 *
 * These exist so nothing downstream ever writes `bg-${tone}-soft`. A
 * template-interpolated class is invisible to Tailwind's scanner and
 * silently disappears from the production stylesheet; a lookup in a map
 * like this one is scanned, compiled and testable.
 */
export const TONE_CHIP_CLASS: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  muted: "bg-muted text-muted-foreground",
};

/** The hairline rule that tops a pipeline card, keyed to the same tones. */
export const TONE_RULE_CLASS: Record<Tone, string> = {
  accent: "bg-accent",
  info: "bg-info",
  success: "bg-success",
  muted: "bg-border",
};

/** Icon keys — mapped to real components in the page, never in data. */
export type IconKey =
  | "intake"
  | "brief"
  | "proposal"
  | "plan"
  | "update"
  | "share"
  | "template"
  | "money"
  | "time"
  | "search"
  | "plug"
  | "mail"
  | "chat"
  | "note"
  | "webhook"
  | "pdf"
  | "shield"
  | "sparkles";

/* ── A. Announcement ───────────────────────────────────────────────────── */


/* ── C. Hero ───────────────────────────────────────────────────────────── */

/**
 * The reference sets its headline as two masked lines that rise on load:
 * dark first line, purple-emphasized second line.
 *
 * `emphasis` is the substring rendered in the accent ink; it must appear
 * verbatim inside one of the lines (asserted by the tests).
 */
export const HERO = {
  eyebrow: "A clearer client-work process",
  titleLines: ["From first client message", "to a clear proposal"],
  emphasis: "clear proposal",
  /** Screen-reader and SEO form of the headline, since the visual form is
   *  split across two masked lines. */
  title: "From first client message to a clear proposal",
  intro:
    "Capture the original context, shape a brief with open questions surfaced, draft a proposal from it, and prepare client updates from real project progress.",
  primaryCta: { label: "Create an account", href: "/signup" },
  secondaryCta: { label: "Explore solutions", href: "/solutions" },
  note: "Creating an account does not purchase or activate a paid plan.",
};

/**
 * The "works with" strip under the hero note. Every entry is a connector or
 * an output that exists in the code today — lib/integrations (slack,
 * notion), app/api/email (a connected mailbox), lib/webhooks.ts, lib/pdf.
 * The row links nowhere by design: it is a fact, not a funnel.
 */
export const CONNECTS_WITH = {
  lead: "Works with",
  items: ["Slack", "Notion", "Email inbox", "Webhooks", "PDF export"],
};

/* ── D. Features ───────────────────────────────────────────────────────── */

export const FEATURES_SECTION = {
  eyebrow: "Features",
  /** Split like the reference's headline so the emphasis can be accented. */
  titleBefore: "Four parts of",
  titleAfter: "clearer client work",
  title: "Four parts of clearer client work",
  intro:
    "Capture what clients share, structure the brief, draft a proposal, and prepare updates from the work in progress.",
  disclosure: "Illustrative interface examples · fictional client work",
  cta: { label: "See all features", href: "/features" },
};

export interface FeatureBlock {
  /** Uppercase label above the heading, e.g. "Intake". */
  label: string;
  title: string;
  copy: string;
  icon: IconKey;
  tone: Tone;
}

/**
 * The four jobs. Deliberately four, matching the reference's composition:
 * intake → brief → proposal → plan+update. Each one is a real surface under
 * app/(app)/, and each visual in components/marketing/landing/FeatureVisual
 * is drawn from that surface's actual fields.
 */
export const FEATURE_BLOCKS: readonly FeatureBlock[] = [
  {
    label: "Intake",
    title: "Every client message, captured verbatim",
    copy: "Paste an email, call notes or a chat log, upload a file, or pull the thread straight in from Slack, Notion or a connected mailbox. The original stays immutable and threaded onto whatever it becomes.",
    icon: "intake",
    tone: "accent",
  },
  {
    label: "Briefs",
    title: "Gaps flagged instead of quietly guessed",
    copy: "Get a structured draft back with the vague parts raised as tracked open questions. Edit it inline; every field change lands in the edit history you can read back.",
    icon: "brief",
    tone: "accent",
  },
  {
    label: "Proposals",
    title: "Every save is a version you can restore",
    copy: "Generate a client-ready proposal from any brief, with scope, deliverables and budget carried over. Each save is an immutable version you can diff and roll back to.",
    icon: "proposal",
    tone: "info",
  },
  {
    label: "Plans & updates",
    title: "Draft a client update from plan progress",
    copy: "Turn proposal deliverables into a working plan, track progress, then shape a client-update draft from the work completed. Share supported updates behind a link you can revoke.",
    icon: "update",
    tone: "success",
  },
];

/* ── E. Getting started ────────────────────────────────────────────────── */

export const STEPS_SECTION = {
  eyebrow: "Getting started",
  titleBefore: "Three steps from",
  titleAfter: "context to client work",
  title: "Three steps from context to client work",
  intro:
    "Start with the client’s original context, shape a structured brief, then carry its details into a proposal and project updates.",
  connectsLead: "Bring context from",
};

export interface Step {
  /** Rendered as the card's index; a separate string from the title so the
   *  truthfulness sweep never sees a number next to a noun. */
  index: string;
  title: string;
  copy: string;
  /** Short capability chips under the copy. */
  chips: string[];
}

export const STEPS: readonly Step[] = [
  {
    index: "1",
    title: "Capture client context",
    copy: "Paste a message, upload a supported file, or import a read-only source from Slack, Notion, Gmail or Outlook. Keep the original wording attached to the work it informs.",
    chips: ["Paste", "Upload", "Slack", "Notion", "Mailbox"],
  },
  {
    index: "2",
    title: "Shape a clear brief",
    copy: "Draft a structured brief from the source. Roducq surfaces details it cannot infer as open questions for you to resolve, rather than filling gaps with guesses.",
    chips: ["Structured draft", "Open questions", "Edit history"],
  },
  {
    index: "3",
    title: "Draft and keep clients updated",
    copy: "Use brief details to draft a proposal, turn its deliverables into a plan, then compose a client update from recorded progress.",
    chips: ["Proposal drafts", "Plans", "Client updates"],
  },
];

/**
 * The engagement timeline beside the steps — the reference puts a "your
 * day" panel here. roducq has no calendar, so this shows what one day of an
 * engagement looks like inside the pipeline instead of pretending otherwise.
 */
export const ENGAGEMENT_PANEL = {
  sourcesTitle: "ILLUSTRATIVE SOURCES",
  sources: ["Slack import", "Notion import", "Mailbox", "Uploaded files"],
  hubName: "roducq",
  hubSubtitle: "Your workspace",
  workspace: "Fictional studio · example",
  workspaceMeta: "4 members",
  date: "MONDAY · EXAMPLE",
  heading: "One engagement, one day",
  cta: { label: "Create an account", href: "/signup" },
  events: [
    { time: "09:00", label: "Client context captured", detail: "Kickoff notes kept with the source" },
    { time: "10:30", label: "Brief draft shaped", detail: "Open questions surfaced for review" },
    { time: "14:00", label: "Proposal draft prepared", detail: "Scope and deliverables carried forward" },
    { time: "16:00", label: "Client update drafted", detail: "Based on recorded plan progress" },
  ],
};

/** The onboarding checklist chip the reference floats over the CTA section. */
export const ONBOARDING_CHECKLIST = {
  title: "Getting started",
  progress: "2 of 4",
  items: [
    { label: "Create your workspace", state: "Done" as const },
    { label: "Paste a client message", state: "Done" as const },
    { label: "Generate your first brief", state: "Next" as const },
    { label: "Invite your team", state: "Later" as const },
  ],
};

/* ── F. Integrations ───────────────────────────────────────────────────── */

export const INTEGRATIONS_SECTION = {
  eyebrow: "Integrations",
  titleBefore: "Bring client context",
  titleAfter: "into one workspace",
  title: "Bring client context into one workspace",
  intro:
    "Import from Slack, Notion or a read-only mailbox. Roducq also supports file intake, signed outbound webhooks, PDF export and share links for supported documents.",
  cta: { label: "Explore integrations", href: "/integrations" },
};

export interface IntegrationCard {
  name: string;
  kind: "Connector" | "Roducq capability";
  copy: string;
  icon: IconKey;
  tone: Tone;
}

/**
 * Six cards in a three-column × two-row grid matching the Forma reference:
 * three inbound OAuth or mailbox connectors (lib/integrations, app/api/email),
 * the signed outbound webhook dispatcher, and two document/sharing outputs
 * that ship in the same product.
 */
export const INTEGRATION_CARDS: readonly IntegrationCard[] = [
  {
    name: "Slack",
    kind: "Connector",
    copy: "Import recent client messages into intake. The connection is read-only; Roducq does not post to Slack.",
    icon: "chat",
    tone: "accent",
  },
  {
    name: "Notion",
    kind: "Connector",
    copy: "Import accessible pages as source material. Roducq does not write changes back to Notion.",
    icon: "note",
    tone: "accent",
  },
  {
    name: "Email inbox",
    kind: "Connector",
    copy: "Connect a Gmail or Outlook mailbox to read messages for client intake. Roducq does not send email.",
    icon: "mail",
    tone: "accent",
  },
  {
    name: "Webhooks",
    kind: "Roducq capability",
    copy: "Send signed outbound events for transitions Roducq records to an endpoint you control.",
    icon: "webhook",
    tone: "info",
  },
  {
    name: "PDF export",
    kind: "Roducq capability",
    copy: "Export proposals, plans, updates, contracts, invoices and time reports as PDFs.",
    icon: "pdf",
    tone: "info",
  },
  {
    name: "Share links",
    kind: "Roducq capability",
    copy: "Create revocable, read-only public links for client updates and invoices.",
    icon: "share",
    tone: "success",
  },
];

/* ── G. Teams ──────────────────────────────────────────────────────────── */

export const TEAMS_SECTION = {
  eyebrow: "Teams",
  titleBefore: "Made for different",
  titleAfter: "shapes of client work",
  title: "Made for different shapes of client work",
  intro:
    "Solo practices, design studios, agencies and consultancies can keep client context, briefs, proposals and project updates connected in one workspace.",
  disclosure: "Illustrative examples · fictional client work",
  cta: { label: "Explore solutions", href: "/solutions" },
};

export interface TeamCard {
  index: string;
  label: string;
  title: string;
  copy: string;
  /** Real roducq surfaces this practice leans on hardest. */
  detail: string;
  workflow: string;
}

export const TEAM_CARDS: readonly TeamCard[] = [
  {
    index: "01",
    label: "Solo practices",
    title: "Keep each client engagement together",
    copy: "Carry the original client context into a structured brief, then use the brief as the starting point for proposals and updates.",
    detail: "Intake · Briefs · Proposals · Updates",
    workflow: "Workflow: one client engagement",
  },
  {
    index: "02",
    label: "Design studios",
    title: "Keep creative direction attached to the brief",
    copy: "Keep source wording alongside the structured brief, with open questions visible for review before proposal details are drafted.",
    detail: "Brief sources · Open questions · Edit history",
    workflow: "Workflow: source → brief → proposal",
  },
  {
    index: "03",
    label: "Agencies",
    title: "Give a small team a clearer client-work trail",
    copy: "Use workspace roles for the team, draft proposals from client briefs, and track deliverables in a project plan.",
    detail: "Owner · Member · Viewer roles",
    workflow: "Workflow: brief → proposal → plan",
  },
  {
    index: "04",
    label: "Consultancies",
    title: "Bring logged work into client updates",
    copy: "Track time and project progress, review the work in reports, and compose client updates from the details that matter.",
    detail: "Time tracking · Reports · Client updates",
    workflow: "Workflow: time → report → update",
  },
];

/* ── H. Pricing ────────────────────────────────────────────────────────── */

/**
 * The pricing band renders the owner-approved marketing presentation in
 * app/(marketing)/pricing/pricing-content.ts. It does not read Razorpay config
 * or imply that these cards activate checkout or entitlements.
 */
export const PRICING_SECTION = {
  eyebrow: "Pricing",
  titleBefore: "Plans for",
  titleAfter: "client work",
  title: "Plans for client work",
  intro:
    "Three approved monthly plan prices, with clear notes about current limits and what account creation does—and does not—do.",
  cta: { label: "See full plan details", href: "/pricing" },
};

/* ── I. FAQ ────────────────────────────────────────────────────────────── */

export const FAQ_SECTION = {
  eyebrow: "FAQ",
  titleBefore: "Questions before",
  titleAfter: "getting started",
  title: "Questions before getting started",
  intro: "Something else on your mind?",
  /** Inline mailto — roducq has no support form or hosted help centre. */
  contact: { label: "Send us a message", href: "mailto:contact@nanexi.com" },
  cta: { label: "See plan details", href: "/pricing" },
};

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * Six answers, each pointing at the code that makes it true. The two about
 * signatures and money are deliberately negative — they repeat the
 * LIMITATION contract rather than softening it.
 */
export const FAQ: readonly FaqItem[] = [
  {
    q: "What does roducq help me do?",
    a: "Bring client context into a structured brief, draft a proposal from that brief, turn proposal deliverables into a plan, and compose client updates from recorded progress. You review and shape the work at each step.",
  },
  {
    q: "Does creating an account purchase or activate a paid plan?",
    a: "No. Creating an account does not purchase or activate a paid plan. Starter, Team and Studio are not mapped to separate paid-plan checkout, so review the plan terms before making a decision.",
  },
  {
    q: "Is annual checkout available?",
    a: "No. The prices shown are monthly, and annual checkout is not available. There is no annual price or discount to select.",
  },
  {
    q: "Are seat and brief limits enforced by plan?",
    a: "Not currently. The listed seat and brief limits are not enforced by Starter, Team or Studio. Team lists an additional $12 per seat after five seats, but additional-seat billing is not currently implemented.",
  },
  {
    q: "Which sources and client links are supported?",
    a: "You can import from Slack, Notion and a connected Gmail or Outlook mailbox; these connections are read-only. Pasted text and supported file uploads are also available. Public read-only links currently support client updates and invoices; read-only brief sharing is not available.",
  },
  {
    q: "Does roducq collect signatures or take payments?",
    a: "No. Roducq does not collect e-signatures or payments and does not provide accounting. Contracts can include signature lines, and invoices are records you manage with your other tools.",
  },
];

/* ── J. Final CTA + the limits callout ─────────────────────────────────── */

/**
 * The reference sets its closing headline one word per masked line. `lines`
 * is that layout, spelled out, so the reveal does not depend on how the
 * browser happens to wrap the string.
 */
export const CLOSING = {
  lines: ["Try roducq with", "your own", "client project"],
  title: "Try roducq with your own client project",
  intro:
    "Start on the free plan, bring one live engagement, and see how much of the week the pipeline takes care of.",
  primaryCta: { label: "Start free", href: "/signup" },
  secondaryCta: { label: "Talk to us", href: "mailto:contact@nanexi.com" },
  note: "The whole pipeline is free, with no trial clock to watch.",
};

/** Homepage-only closing copy; keep CLOSING stable for cross-page baselines. */
export const HOME_CLOSING = {
  lines: ["Bring one client", "project into", "clearer focus"],
  title: "Bring one client project into clearer focus",
  intro:
    "Capture the context, shape the brief, draft a proposal, and keep the next client update grounded in project progress.",
  primaryCta: { label: "Create an account", href: "/signup" },
  secondaryCta: { label: "Explore solutions", href: "/solutions" },
  note: "Creating an account does not purchase or activate a paid plan.",
};

/**
 * The honest-limits callout. This is the block that keeps the landing page
 * from selling something the product is not: roducq writes, structures and
 * sends records — it does not close a contract or move money.
 *
 * `summary` is the short form quoted in the marketing copy and asserted
 * verbatim by tests/components/home.test.ts; `detail` is the explanation
 * underneath it.
 */
export const LIMITATION = {
  title: "What roducq doesn't do",
  summary: "no e-signature, no payment collection",
  detail:
    "A contract is marked signed inside the app, and its PDF prints signature lines — roducq never collects a signature. Invoices are records you send and reconcile yourself; no card is taken here, and there is no accounting. Run those alongside roducq.",
  /** Where the visitor can read the side-by-side version of this. */
  href: "/vs",
  hrefLabel: "Read the comparisons",
};

/* ── Footer ────────────────────────────────────────────────────────────── */

/**
 * The reference footer is a single quiet band. Columns are limited to
 * routes that actually resolve (checked by tests/components/home.test.ts
 * against the app router), so the footer cannot advertise a page that 404s.
 */
export const FOOTER = {
  tagline:
    "Turn client conversations into clear briefs, proposals, plans, and updates — all in one workspace.",
  cta: { label: "Get started", href: "/signup" },
  limits:
    "No e-signature, no payment collection. roducq writes the work; you and your tools handle the rest.",
  legal: "© 2026 roducq. All rights reserved.",
  wordmark: "roducq.",
  columns: [
    {
      title: "Product",
      links: [
        { href: "/features", label: "Features" },
        { href: "/integrations", label: "Integrations" },
        { href: "/pricing", label: "Pricing" },
        { href: "/changelog", label: "Changelog" },
      ],
    },
    {
      title: "Explore",
      links: [
        { href: "/solutions", label: "Solutions" },
        { href: "/vs", label: "Compare" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/contact", label: "Contact" },
        { href: "/security", label: "Security" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ],
    },
  ],
};
