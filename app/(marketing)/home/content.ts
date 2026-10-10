/**
 * Home page content — the redesigned landing surface (2026-10-10).
 *
 * WHY THIS FILE IS SEPARATE. The page (../page.tsx) is markup only; every
 * string a visitor reads lives here. That split is what lets
 * tests/components/home.test.ts import the copy directly (through jiti) and
 * assert it against the product instead of against itself — the same
 * arrangement pricing/plans.ts has with the pricing page.
 *
 * SECTIONS A–G. The landing surface is seven bands, in this order:
 *
 *   A  Hero            — the promise, and the two ways in (/signup, /vs)
 *   B  Capability rail — the eight things the product actually ships
 *   C  The pipeline    — intake → brief → proposal → plan → update
 *   D  Feature grid    — what surrounds the pipeline
 *   E  Compare teaser  — honest pointers at /vs
 *   F  Pricing teaser  — honest pointers at /pricing
 *   G  Closing CTA     — plus the "what roducq doesn't do" callout
 *
 * TRUTHFULNESS. Every claim below is checkable against code that ships
 * today, and the tests fail if the copy outruns it. Two rules in
 * particular:
 *
 *   - No invented numbers. The only figure on this page is the free
 *     plan's $0, which is the same figure pricing/plans.ts publishes.
 *   - The limits are on the page, not in the small print. `LIMITATION`
 *     says plainly that roducq collects no e-signatures and takes no
 *     payments, because lib/pdf/layout.ts prints signature *lines* and
 *     nothing in the app ever touches a card.
 *
 * NO DYNAMIC CLASSES. Per-item colour comes from an explicit lookup
 * (`TONE_*_CLASS`) whose values are complete literal Tailwind strings, so
 * the compiler can see every class that exists. The page never builds a
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

/** Icon keys — mapped to real components in ../page.tsx, never in data. */
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
  | "plug";

/* ── A. Hero ────────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: "Client-work writing studio",
  title: "Messy client messages in. Polished proposals out.",
  intro:
    "roducq is the writing trail behind a client engagement. Paste what your client actually sent — an email, call notes, a chat thread — and carry it through a gap-flagged brief, a proposal, a delivery plan and the weekly update, without re-typing any of it.",
  /** The primary way in. */
  primaryCta: { label: "Start free", href: "/signup" },
  /** The compare path — every /vs page ends with the same honest framing. */
  secondaryCta: { label: "Compare roducq", href: "/vs" },
  // Deliberately free of the word "card": that word is reserved for the
  // payment-collection limit in LIMITATION, and using it here in its
  // "no credit card to sign up" sense muddles the two.
  note: "The whole pipeline is free, with no trial clock to watch.",
};

/* ── B. Capability rail ─────────────────────────────────────────────────── */

export const RAIL = {
  lead: "Built for the part of client work nobody tools up: the writing.",
  items: [
    "Gap-flagged briefs",
    "Proposal version history",
    "Deliverable checklists",
    "Weekly client updates",
    "Revocable share links",
    "Contracts and invoices",
    "Time tracking and reports",
    "Slack and Notion intake",
  ],
};

/* ── C. The pipeline ────────────────────────────────────────────────────── */

export const PIPELINE_SECTION = {
  eyebrow: "The pipeline",
  title: "One pipeline, five stages.",
  intro:
    "Each stage hands its structure to the next. Nothing is re-typed between them, and the source material stays attached the whole way through.",
};

export interface PipelineStep {
  /** 1-based, rendered as the card's index. */
  step: number;
  icon: IconKey;
  tone: Tone;
  title: string;
  copy: string;
}

/** The five stages, in product order. Each one hands its structure to the next. */
export const PIPELINE: readonly PipelineStep[] = [
  {
    step: 1,
    icon: "intake",
    tone: "accent",
    title: "Intake",
    copy: "Paste a client email, call notes or a chat log — or pull a thread straight in from Slack, Notion, a connected mailbox or an uploaded file. The original stays verbatim and immutable, threaded onto whatever it becomes.",
  },
  {
    step: 2,
    icon: "brief",
    tone: "accent",
    title: "Brief",
    copy: "Get a structured draft back with the vague parts flagged as open questions instead of quietly guessed. Edit it inline; every field change lands in the edit history.",
  },
  {
    step: 3,
    icon: "proposal",
    tone: "info",
    title: "Proposal",
    copy: "Generate a client-ready proposal from any brief, with scope, deliverables and budget carried over. Each save is an immutable version you can diff and restore.",
  },
  {
    step: 4,
    icon: "plan",
    tone: "info",
    title: "Plan",
    copy: "Turn the accepted proposal into a working plan: deliverables become tasks you tick off as the work moves, and the plan is what the update is written from.",
  },
  {
    step: 5,
    icon: "update",
    tone: "success",
    title: "Update",
    copy: "Compose the weekly client update from real plan progress — no re-typing, no forgotten wins. Send it as a public link you can revoke whenever you like.",
  },
];

/* ── D. Feature grid ────────────────────────────────────────────────────── */

export const FEATURES_SECTION = {
  eyebrow: "Around the pipeline",
  title: "The pieces you need once the writing is done.",
  intro:
    "None of these are the point of roducq. They are here so a client engagement does not spill back out into five other tools.",
};

export interface HomeFeature {
  icon: IconKey;
  tone: Tone;
  title: string;
  copy: string;
}

/** Supporting surfaces — real today, but deliberately not part of the pipeline. */
export const FEATURES: readonly HomeFeature[] = [
  {
    icon: "share",
    tone: "accent",
    title: "Share links you control",
    copy: "Updates, invoices and contracts each get a read-only public link. Regenerate the token or revoke it outright, and the old URL stops working immediately.",
  },
  {
    icon: "template",
    tone: "accent",
    title: "Workspace templates",
    copy: "Save the follow-ups, scopes and sign-offs you write again and again, and reuse them for the next client who asks the same question.",
  },
  {
    icon: "money",
    tone: "info",
    title: "Invoices and contracts",
    copy: "Line items, tax and totals computed for you; contracts carry their own PDF. Both export cleanly, and a draft invoice stays unshareable until you send it.",
  },
  {
    icon: "time",
    tone: "info",
    title: "Time and reports",
    copy: "Log hours as you go and read the week back in reports, so the numbers behind an update are ones you already have.",
  },
  {
    icon: "search",
    tone: "success",
    title: "Search that respects roles",
    copy: "One box across briefs, proposals, plans, updates, invoices and contracts. A viewer never sees a result they could not open — money surfaces stay hidden from them.",
  },
  {
    icon: "plug",
    tone: "success",
    title: "Integrations and webhooks",
    copy: "Import from Slack, Notion or a connected mailbox, then broadcast signed outbound webhooks to anything you run that listens.",
  },
];

/* ── E. Compare teaser ──────────────────────────────────────────────────── */

/**
 * The competitor chips are NOT listed here — the page reads the live
 * VS_PAGE_LIST so this page can never name a comparison /vs doesn't have.
 */
export const COMPARE = {
  eyebrow: "Comparisons",
  title: "Pick the tool closest to your work.",
  intro:
    "roducq is deliberately narrower than the suites below. Each comparison says what the other tool covers and what roducq leaves out — including the parts it does not do at all.",
  cta: { label: "See all comparisons", href: "/vs" },
};

/* ── F. Pricing teaser ──────────────────────────────────────────────────── */

export const PRICING_TEASER = {
  eyebrow: "Pricing",
  title: "Free to start. Billed per workspace, never per seat.",
  intro:
    "Everything that ships today sits on the free plan — the full pipeline, team invites with roles, templates and webhooks. The paid plan is the same product with a Stripe subscription behind it, and it cancels any time.",
  bullets: [
    "$0 for the whole product, for as long as you like",
    "One subscription per workspace, not per person",
    "No brief, seat or AI limits on any plan",
  ],
  cta: { label: "See pricing", href: "/pricing" },
};

/* ── G. Closing CTA + the limits callout ────────────────────────────────── */

export const CLOSING = {
  title: "Ready when your next client email lands.",
  intro:
    "Bring one live client project and run it end to end — intake through weekly update — on the free plan. Nothing to cancel, because there is nothing to pay yet.",
  primaryCta: { label: "Start free", href: "/signup" },
  secondaryCta: { label: "Talk to us", href: "mailto:hello@roducq.dev" },
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
