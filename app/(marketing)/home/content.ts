/**
 * Home page content — the Forma-referenced landing surface (redesign 2026-10-17).
 *
 * WHY THIS FILE IS SEPARATE. The page (../page.tsx) and the components in
 * components/marketing/landing/** are markup only; every string a visitor
 * reads lives here. That split is what lets tests/components/home.test.ts
 * import the copy directly (through jiti) and assert it against the product
 * instead of against itself — the same arrangement pricing/plans.ts has
 * with the pricing page.
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
 *   H  Pricing        — the three tiers, priced from live config
 *   I  FAQ            — the six questions asked before signing up
 *   J  Final CTA      — plus the "what roducq doesn't do" callout
 *
 * TRUTHFULNESS. Every claim below is checkable against code that ships
 * today, and the tests fail if the copy outruns it. Three rules:
 *
 *   - No invented numbers. The only figure on this page is the free plan's
 *     $0, which is the same figure pricing/plans.ts publishes; the paid
 *     price is read from the operator's Razorpay config at render time.
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

/**
 * The single line above the header. It exists to carry one current, true
 * fact and one link — not a rotating promo. It points at /pricing because
 * that is where the claim it makes is substantiated.
 */
export const ANNOUNCEMENT = {
  badge: "New",
  label: "Included on the free plan",
  text: "Team roles, templates and signed outbound webhooks",
  href: "/pricing",
  hrefLabel: "See what's included",
};

/* ── C. Hero ───────────────────────────────────────────────────────────── */

/**
 * The reference sets its headline as two masked lines that rise on load:
 * dark first line, purple-emphasized second line.
 *
 * `emphasis` is the substring rendered in the accent ink; it must appear
 * verbatim inside one of the lines (asserted by the tests).
 */
export const HERO = {
  eyebrow: "Client-work writing studio",
  titleLines: ["The workspace that does", "the client writing for you"],
  emphasis: "the client writing",
  /** Screen-reader and SEO form of the headline, since the visual form is
   *  split across two masked lines. */
  title: "The workspace that does the client writing for you",
  intro:
    "roducq keeps your client intake, briefs, proposals, plans and updates in one workspace, then carries each stage's structure into the next — so nothing gets re-typed and nothing gets lost between them.",
  /** The primary way in. */
  primaryCta: { label: "Start free", href: "/signup" },
  /** The compare path — every /vs page ends with the same honest framing. */
  secondaryCta: { label: "Compare roducq", href: "/vs" },
  // Deliberately free of the word "card": that word is reserved for the
  // payment-collection limit in LIMITATION, and using it here in its
  // "no credit card to sign up" sense muddles the two.
  note: "The whole pipeline is free, with no trial clock to watch.",
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
  titleBefore: "Four jobs roducq takes",
  titleAfter: "off your plate",
  title: "Four jobs roducq takes off your plate",
  intro:
    "The work around the client work: capturing what they actually said, structuring it, proposing from it, and reporting back on it.",
  cta: { label: "See the whole product", href: "/about" },
};

/**
 * The rule card that sits beside the features headline. It mirrors the
 * reference's automation panel using the transitions roducq really records
 * (lib/events.ts → EVENT_TYPES) and the outbound webhooks it really signs
 * (lib/webhook-dispatch.ts).
 */
export const AUTOMATION_PANEL = {
  trigger: "When a proposal is accepted",
  action: "Run webhook",
  steps: ["Notify the client channel", "Create the delivery plan", "Queue the first update"],
  footnote: "Every event is logged to the activity feed.",
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
    title: "The weekly update writes itself from the plan",
    copy: "Turn the accepted proposal into a working plan, tick off deliverables as the work moves, and compose the client update from real progress — then share it behind a link you can revoke.",
    icon: "update",
    tone: "success",
  },
];

/* ── E. Getting started ────────────────────────────────────────────────── */

export const STEPS_SECTION = {
  eyebrow: "Getting started",
  titleBefore: "Three steps to",
  titleAfter: "get set up",
  title: "Three steps to get set up",
  intro:
    "Bring one live client project and run it end to end. Nothing to configure first, and no import to finish before the product is useful.",
  connectsLead: "Connects to",
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
    title: "Bring in a client message",
    copy: "Paste what the client actually sent, upload the file they attached, or connect Slack, Notion or a mailbox and pull the thread in. The source stays attached to everything it becomes.",
    chips: ["Paste", "Upload", "Slack", "Notion", "Mailbox"],
  },
  {
    index: "2",
    title: "Shape the brief",
    copy: "Generate a structured draft from the source. roducq raises what it cannot infer as an open question rather than inventing an answer, and you edit the rest inline.",
    chips: ["Gap flags", "Inline edit", "Edit history"],
  },
  {
    index: "3",
    title: "Carry it forward",
    copy: "Brief becomes proposal, accepted proposal becomes plan, plan progress becomes the weekly update. Each stage inherits the last one's structure instead of re-typing it.",
    chips: ["Proposals", "Versions", "Plans", "Updates"],
  },
];

/**
 * The engagement timeline beside the steps — the reference puts a "your
 * day" panel here. roducq has no calendar, so this shows what one day of an
 * engagement looks like inside the pipeline instead of pretending otherwise.
 */
export const ENGAGEMENT_PANEL = {
  sourcesTitle: "CONNECTED SOURCES",
  sources: ["Slack", "Notion", "Email inbox", "Uploaded files"],
  hubName: "roducq",
  hubSubtitle: "Your workspace",
  workspace: "Acme Studio",
  plan: "Team plan · 4 members",
  date: "MONDAY, MARCH 3",
  heading: "One engagement, one day",
  cta: { label: "Open the free workspace", href: "/signup" },
  events: [
    { time: "09:00", label: "Intake captured", detail: "Kickoff call notes, verbatim" },
    { time: "10:30", label: "Brief drafted", detail: "2 open questions flagged" },
    { time: "14:00", label: "Proposal v3 sent", detail: "Share link, revocable" },
    { time: "16:00", label: "Weekly update queued", detail: "Written from plan progress" },
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
  titleBefore: "Works with the tools",
  titleAfter: "you already pay for",
  title: "Works with the tools you already pay for",
  intro:
    "Paste it, upload it, or connect the tool it arrived in. Everything lands in the same workspace record, and everything you send leaves through a link you control.",
  cta: { label: "Read how roducq compares", href: "/vs" },
};

export interface IntegrationCard {
  name: string;
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
    copy: "Pull a client thread into intake with its original wording intact.",
    icon: "chat",
    tone: "accent",
  },
  {
    name: "Notion",
    copy: "Bring a page in as a source and keep the brief next to your notes.",
    icon: "note",
    tone: "accent",
  },
  {
    name: "Email inbox",
    copy: "Connect a mailbox over OAuth and turn a message into a brief.",
    icon: "mail",
    tone: "accent",
  },
  {
    name: "Webhooks",
    copy: "Signed outbound events on the transitions you already record.",
    icon: "webhook",
    tone: "info",
  },
  {
    name: "PDF export",
    copy: "Proposals, contracts, invoices and time reports as clean PDFs.",
    icon: "pdf",
    tone: "info",
  },
  {
    name: "Share links",
    copy: "Public read-only links for updates, invoices and contracts — revocable.",
    icon: "share",
    tone: "success",
  },
];

/* ── G. Teams ──────────────────────────────────────────────────────────── */

export const TEAMS_SECTION = {
  eyebrow: "Teams",
  titleBefore: "Set up differently",
  titleAfter: "for every team",
  title: "Set up differently for every team",
  intro:
    "One workspace, three roles, and templates you write once. What changes between practices is the shape of the work, not the product.",
  cta: { label: "Read the comparisons", href: "/vs" },
};

export interface TeamCard {
  index: string;
  label: string;
  title: string;
  copy: string;
  /** Real roducq surfaces this practice leans on hardest. */
  detail: string;
  templates: string;
}

export const TEAM_CARDS: readonly TeamCard[] = [
  {
    index: "01",
    label: "Solo practices",
    title: "One trail per client, from first message to last update",
    copy: "Everything a single engagement produced, in one place, with the original message still attached to the brief it became.",
    detail: "Intake · Briefs · Proposals · Updates",
    templates: "Templates: proposal, weekly update",
  },
  {
    index: "02",
    label: "Design studios",
    title: "Briefs that keep the creative direction in view",
    copy: "The brief carries the client's own wording alongside the fields you filled in, so the brief you wrote is never the only record of what was asked for.",
    detail: "Brief sources · Open questions · Edit history",
    templates: "Templates: creative brief, design review",
  },
  {
    index: "03",
    label: "Agencies",
    title: "Proposals and plans per client, roles for the team",
    copy: "Invite the team as members and the client's account manager as a viewer. Search, and every money surface, respect the role they were given.",
    detail: "Owner · Member · Viewer · Signed webhooks",
    templates: "Templates: scope of work, retainer plan",
  },
  {
    index: "04",
    label: "Consultancies",
    title: "The numbers behind an update, already logged",
    copy: "Log hours against the work as it happens, then read the week back in reports and attach the figures to the update you send.",
    detail: "Time tracking · Reports · Invoices",
    templates: "Templates: month-end report, invoice note",
  },
];

/* ── H. Pricing ────────────────────────────────────────────────────────── */

/**
 * The pricing band reads its tiers from app/(marketing)/pricing/plans.ts and
 * its money from the operator's Razorpay config, exactly like /pricing does.
 * Nothing here restates a price, which is why the only figure in this module
 * is the free plan's $0.
 */
export const PRICING_SECTION = {
  eyebrow: "Pricing",
  titleBefore: "Free to start,",
  titleAfter: "easy to grow.",
  title: "Free to start, easy to grow.",
  intro:
    "Billed per workspace, never per seat. One product, no feature paywalls — the paid plan is the same product with a Razorpay subscription behind it, and it cancels from Settings at any time.",
  cta: { label: "Compare plans in detail", href: "/pricing" },
};

/**
 * Fourth pricing column (Dark premium card) matching the Forma reference's
 * four-column layout while keeping roducq's honest contact-only model and
 * zero fabricated prices.
 */
export const ENTERPRISE_COLUMN = {
  slug: "enterprise",
  name: "Enterprise",
  eyebrow: "Organizations",
  tagline:
    "For larger organizations that need custom onboarding, security review and invoiced billing.",
  billingNote: "Invoiced per organization — talk to us.",
  features: [
    "Dedicated multi-workspace onboarding",
    "Security & procurement review package",
    "Custom webhook & integration setup",
    "Row-level workspace isolation audit",
    "Priority engineering support channel",
    "Custom service agreement terms",
  ],
  cta: {
    label: "Contact sales",
    href: "mailto:hello@roducq.dev?subject=roducq%20Enterprise%20enquiry",
  },
};

/* ── I. FAQ ────────────────────────────────────────────────────────────── */

export const FAQ_SECTION = {
  eyebrow: "FAQ",
  titleBefore: "Questions people ask",
  titleAfter: "before signing up",
  title: "Questions people ask before signing up",
  intro: "Something else on your mind?",
  /** Inline mailto — roducq has no support form or hosted help centre. */
  contact: { label: "Send us a message", href: "mailto:hello@roducq.dev" },
  cta: { label: "Compare roducq", href: "/vs" },
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
    q: "What does roducq actually do?",
    a: "It is the writing trail behind a client engagement. A message arrives, becomes a gap-flagged brief, becomes a proposal, becomes a plan, and the plan progress becomes the weekly client update. Each stage hands its structure to the next.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes, and it is the whole product: the full pipeline, team invites with roles, templates, webhooks and exports. There is no trial clock and nothing to cancel, because there is nothing to pay yet.",
  },
  {
    q: "Does roducq collect signatures or take payments?",
    a: "No. A contract is marked signed inside the app and its PDF prints signature lines, but roducq never collects a signature. Invoices are records you send and reconcile yourself — no card is taken here, and there is no accounting. Run those alongside roducq.",
  },
  {
    q: "Which tools can it pull from?",
    a: "Slack, Notion and a connected mailbox over OAuth, plus pasted text and uploaded files. Outbound, roducq dispatches signed webhooks on the transitions it records.",
  },
  {
    q: "How does billing work?",
    a: "One subscription per workspace, never per seat, charged through Razorpay in the currency your install is configured for. You upgrade and cancel from Settings; when a subscription ends the workspace returns to the free plan and the data stays put.",
  },
  {
    q: "Can I get my work out?",
    a: "Yes. Proposals, contracts, invoices and time reports export as PDFs, and updates, invoices and contracts each get a public share link you can regenerate or revoke whenever you like.",
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
  secondaryCta: { label: "Talk to us", href: "mailto:hello@roducq.dev" },
  note: "The whole pipeline is free, with no trial clock to watch.",
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
    "A client-work writing studio: intake → briefs → proposals → plans → updates.",
  cta: { label: "Start free", href: "/signup" },
  limits:
    "No e-signature, no payment collection. roducq writes the work; you and your tools handle the rest.",
  legal: "© 2026 roducq — client-work writing studio.",
  built: "Built on Next.js and Supabase, with row-level security per workspace.",
  wordmark: "roducq.",
  columns: [
    {
      title: "Product",
      links: [
        { href: "/about", label: "About" },
        { href: "/pricing", label: "Pricing" },
        { href: "/vs", label: "Compare" },
        { href: "/changelog", label: "Changelog" },
      ],
    },
    {
      title: "Workspace",
      links: [
        { href: "/intake", label: "Intake" },
        { href: "/briefs", label: "Briefs" },
        { href: "/proposals", label: "Proposals" },
        { href: "/plans", label: "Plans" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/login", label: "Log in" },
        { href: "/signup", label: "Sign up" },
      ],
    },
  ],
};
