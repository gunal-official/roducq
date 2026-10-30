/**
 * /integrations content — the Forma-referenced integration catalog.
 *
 * WHY THIS FILE EXISTS. Every string a visitor reads on /integrations lives
 * here, exactly like app/(marketing)/home/content.ts, .../solutions/content.ts
 * and .../features/content.ts, so the page components stay markup-only and
 * tests can assert the copy against the product instead of against itself.
 *
 * DESIGN REFERENCE. The composition, section order, spacing, type scale and
 * motion of this page follow the live capture of
 * https://forma-visuvate.framer.website/integrations — see
 * docs/FORMA_INTEGRATIONS_REFERENCE.md for every measured value and
 * docs/FORMA_INTEGRATIONS_PAGE_AUDIT.md for the build record. Nothing else
 * comes from it: no Forma logo, brand glyph, category name, marketing
 * sentence, count, status label or mock datum is reproduced.
 *
 * TRUTHFULNESS — THE ONE RULE THIS FILE IS BUILT AROUND. An integrations page
 * is a promise, so every entry here carries an `evidence` list naming the
 * file and symbol that makes it real. tests/components/integrations-page.test.ts
 * reads those files and fails if a symbol disappears, which means a future
 * refactor that removes an integration cannot leave this page advertising it.
 * The page therefore publishes SEVEN entries — three external connectors and
 * four native capabilities — because that is what the codebase supports
 * (docs/FORMA_INTEGRATIONS_CAPABILITY_AUDIT.md). It is deliberately not
 * padded out to the reference's twelve.
 *
 * NO BRAND GLYPHS. The reference draws twelve vendor logos as SVG sprites.
 * Roducq ships none of those logos and must not: each card takes a generic
 * glyph from the icon library the rest of the marketing surface already uses.
 *
 * READ-ONLY IS THE HEADLINE FACT. Roducq's Slack and Notion connections pull
 * items into the Inbox; nothing is ever posted back (lib/integrations/sync.ts
 * is a read-only client). The reference's "syncs both ways" claim is
 * therefore absent from this page by design, and each connector card carries a
 * "Read-only" chip rather than an "Available" one.
 */

/** How a catalogue entry relates to the product. */
export type IntegrationKind = "external" | "native";

/**
 * The chip a card carries. Deliberately NOT the reference's
 * Available/Beta pair: "Available" says nothing about direction, and this
 * page has to say read-only out loud.
 */
export type IntegrationStatus = "read-only" | "native";

/** Icon keys — mapped to real components in the card, never in data. */
export type IntegrationIcon =
  | "chat"
  | "docs"
  | "mail"
  | "webhook"
  | "pdf"
  | "file"
  | "share";

export interface IntegrationCategory {
  id: string;
  label: string;
}

/**
 * Seven filters, and the first one is not a category.
 *
 * MEASURED, AND A DELIBERATE DEVIATION. The reference's chip row has six
 * entries and filters nothing: the capture clicked all five category chips
 * and the grid stayed at 12 cards (docs/FORMA_INTEGRATIONS_REFERENCE.md
 * §4.4). Shipping dead controls was the one thing the content gate ruled out,
 * so these chips are real filters with `aria-pressed` state — the reference's
 * visual design (dark pill for the active chip, 999px radius, 14px labels)
 * on a control that works.
 *
 * Six categories, matching the reference's six-chip shape; Roducq's own
 * taxonomy replaces its task-manager one (Communication / Calendar / Docs /
 * Planning / Design). No category exists that has no card.
 */
export const CATEGORIES: readonly IntegrationCategory[] = [
  { id: "all", label: "All" },
  { id: "chat", label: "Chat" },
  { id: "docs", label: "Docs & notes" },
  { id: "email", label: "Email" },
  { id: "automation", label: "Automation" },
  { id: "files", label: "Files & exports" },
  { id: "sharing", label: "Sharing" },
] as const;

/** One catalogue entry, with the code that backs it. */
export interface IntegrationEntry {
  /** Card title. A product name for a connector, a capability name for native. */
  name: string;
  copy: string;
  /** Id from CATEGORIES. Never "all". */
  category: string;
  kind: IntegrationKind;
  status: IntegrationStatus;
  icon: IntegrationIcon;
  /**
   * The proof. Each pair is a repository path and a symbol that must exist in
   * it; the test suite resolves every one. An entry with no working evidence
   * does not belong on this page.
   */
  evidence: readonly { file: string; symbol: string }[];
}

/**
 * The catalogue. SEVEN entries: 3 external connectors + 4 native capabilities.
 *
 * Ordering is deliberate: the three connectors first (they are what a visitor
 * looking for "integrations" means), then the native outputs that carry work
 * back out. The reference's ordering is by category; this one is by direction.
 */
export const INTEGRATIONS: readonly IntegrationEntry[] = [
  {
    name: "Slack",
    copy:
      "Import the newest messages from up to eight channels and turn any one into a brief.",
    category: "chat",
    kind: "external",
    status: "read-only",
    icon: "chat",
    evidence: [
      { file: "lib/integrations/oauth.ts", symbol: "SLACK_AUTHORIZE_URL" },
      { file: "lib/integrations/sync.ts", symbol: "fetchImportedItems" },
      { file: "components/settings/IntegrationsCard.tsx", symbol: "IntegrationsCard" },
    ],
  },
  {
    name: "Notion",
    copy:
      "Pull recent pages in as plain text, then attach the page to the brief it becomes.",
    category: "docs",
    kind: "external",
    status: "read-only",
    icon: "docs",
    evidence: [
      { file: "lib/integrations/oauth.ts", symbol: "NOTION_AUTHORIZE_URL" },
      { file: "lib/integrations/sync.ts", symbol: "fetchImportedItems" },
      { file: "components/intake/IntegrationStaging.tsx", symbol: "IntegrationStaging" },
    ],
  },
  {
    name: "Connected mailbox",
    copy:
      "Connect Gmail or Outlook and stage incoming client mail in the Inbox, ready to brief.",
    category: "email",
    kind: "external",
    status: "read-only",
    icon: "mail",
    evidence: [
      { file: "lib/email/oauth.ts", symbol: "GMAIL_SCOPE" },
      { file: "lib/email/sync.ts", symbol: "fetchInboxMessages" },
      { file: "components/settings/MailboxCard.tsx", symbol: "MailboxCard" },
    ],
  },
  {
    name: "Signed webhooks",
    copy:
      "Send ten workspace events to any endpoint you control, signed with an HMAC you can verify.",
    category: "automation",
    kind: "native",
    status: "native",
    icon: "webhook",
    evidence: [
      { file: "lib/webhooks.ts", symbol: "signPayload" },
      { file: "lib/events.ts", symbol: "EVENT_TYPES" },
      { file: "components/settings/WebhooksCard.tsx", symbol: "WebhooksCard" },
    ],
  },
  {
    name: "PDF export",
    copy:
      "Export invoices, contracts, proposals, updates, plans, time and reports with your letterhead.",
    category: "files",
    kind: "native",
    status: "native",
    icon: "pdf",
    evidence: [
      { file: "lib/pdf/documents.ts", symbol: "buildInvoicePdf" },
      { file: "app/api/pdf/[kind]/[id]/route.ts", symbol: "KINDS" },
      { file: "components/settings/WorkspaceBrandingCard.tsx", symbol: "WorkspaceBrandingCard" },
    ],
  },
  {
    name: "File import",
    copy:
      "Drop a DOCX, PDF, TXT or MD file into intake and its text lands in the source box, ready to edit.",
    category: "files",
    kind: "native",
    status: "native",
    icon: "file",
    evidence: [
      { file: "lib/intake/extract.ts", symbol: "extractUploadText" },
      { file: "lib/intake/shared.ts", symbol: "MAX_UPLOAD_BYTES" },
      { file: "app/api/intake/extract/route.ts", symbol: "POST" },
    ],
  },
  {
    name: "Client links",
    copy:
      "Share an update or an invoice behind a token link a client can open without an account, and revoke it.",
    category: "sharing",
    kind: "native",
    status: "native",
    icon: "share",
    evidence: [
      { file: "lib/data/shares.ts", symbol: "getSharedDocumentByToken" },
      { file: "lib/invoice-sharing.ts", symbol: "canShareInvoice" },
      { file: "app/share/[token]/page.tsx", symbol: "SharePage" },
    ],
  },
] as const;

/** The catalog's own furniture. */
export const CATALOG = {
  searchLabel: "Search integrations",
  searchPlaceholder: "Search integrations",
  filterLabel: "Filter by category",
  /** Rendered when a filter/search matches nothing. */
  empty: {
    title: "No integrations match",
    body: "Clear the search or pick another category to see everything roducq connects to.",
    action: "Clear filters",
  },
  /** The disclaimer under the grid: what "integration" means here. */
  note:
    "External connections import into roducq and never write back. Native capabilities run inside your workspace.",
} as const;

/** Counts the page states, derived so they cannot drift from the data. */
export function catalogCounts(entries: readonly IntegrationEntry[]) {
  return {
    total: entries.length,
    external: entries.filter((entry) => entry.kind === "external").length,
    native: entries.filter((entry) => entry.kind === "native").length,
  };
}

/**
 * The hero. Same three-element composition the reference measures
 * (eyebrow, two-part headline, one lead) and the same split the approved
 * /solutions hero uses: an ink sentence, then the gradient unit on its own
 * line.
 */
export const INTEGRATIONS_HERO = {
  eyebrow: "Integrations",
  /** Rendered in ink, one masked span per word (measured cadence). */
  titleBefore: "Bring the work in.",
  /** Rendered in the accent gradient, as one animated unit. */
  titleAfter: "Send the work out.",
  title: "Bring the work in. Send the work out.",
  intro:
    "Slack, Notion and a connected mailbox feed the Inbox; signed webhooks, PDFs and share links carry the finished work back out.",
} as const;

/**
 * Band 2 — "How connecting works".
 *
 * MEASURED TYPE: the reference's band heading is 54px at weight 400, and its
 * lead is 18px inside a 500px measure. Both differ from the hero's 600-weight
 * display step, so both are stated explicitly in the component.
 */
export const CONNECTING_STEPS = {
  eyebrow: "How connecting works",
  title: "Three steps, no shared password",
  intro:
    "Anyone who owns the workspace can connect an app; nobody has to hand over a login.",
  items: [
    {
      number: "01",
      title: "Connect as the owner",
      copy:
        "Approve the connection from Settings with the provider's own sign-in. Roducq stores an encrypted token, never a password.",
    },
    {
      number: "02",
      title: "Import what matters",
      copy:
        "Pull the newest messages or pages into the Inbox. Every item keeps a link back to where it came from.",
    },
    {
      number: "03",
      title: "Turn a message into a brief",
      copy:
        "Anything staged in the Inbox becomes a brief through the same pipeline a pasted email does.",
    },
  ],
} as const;

/**
 * Band 3 — "Request an integration".
 *
 * THE REFERENCE'S FORM IS NOT REPRODUCIBLE. Its card posts to a Framer form
 * endpoint that has no Roducq equivalent, and the mandate forbids inventing a
 * backend. So the band keeps the reference's two-column composition and its
 * white 24px card, and the card states what to send plus one honest
 * `mailto:` action — no submit button that goes nowhere.
 */
export const REQUEST = {
  eyebrow: "Request an integration",
  title: "Missing an app you need?",
  intro:
    "Roducq builds connections one at a time, and only when the connection is real. Tell us what you need and we will say whether it is possible.",
  card: {
    title: "What to include",
    rows: [
      "The app, and what you would want it to do",
      "Whether you need to import, export, or both",
      "The workspace you have in mind, if it is already live",
    ],
    /** One action, and it leaves the page: no fake pending state. */
    cta: {
      label: "Email the request",
      href: "mailto:contact@nanexi.com?subject=Integration%20request&body=App%3A%20%0D%0AWhat%20it%20should%20do%3A%20%0D%0AImport%2C%20export%20or%20both%3A%20%0D%0A",
    },
    note: "Opens your email app with the details pre-filled.",
  },
} as const;

/**
 * Band 4 — the closing CTA. Reuses the homepage's approved closing copy
 * verbatim (CLOSING in app/(marketing)/home/content.ts), restated here so this
 * page's content module is self-contained and testable on its own — the same
 * arrangement SOLUTIONS_CLOSING and FEATURES_CLOSING already use.
 */
export const INTEGRATIONS_CLOSING = {
  lines: ["Try roducq with", "your own", "client project"] as const,
  title: "Try roducq with your own client project",
  intro:
    "Start on the free plan, connect one app, and watch a client message become a brief without a retype.",
  primaryCta: { label: "Start free", href: "/signup" },
  // Same pair as SOLUTIONS_CLOSING and FEATURES_CLOSING: the closing band is
  // shared furniture, so its two actions are too.
  secondaryCta: { label: "Talk to us", href: "mailto:contact@nanexi.com" },
  note: "The whole pipeline is free, with no trial clock to watch.",
} as const;

/**
 * The miniature beside the closing headline.
 *
 * FABRICATED SAMPLE STATE, like every other marketing miniature: it shows what
 * Settings → Integrations renders (a connected provider, a re-auth prompt, an
 * unconnected slot), with no invented figure and no real workspace. The
 * disclosure string is rendered with it.
 */
export const CONNECTIONS_MOCK = {
  title: "Connections",
  progress: "2 of 4",
  items: [
    { label: "Slack", state: "Done" as const },
    { label: "Notion", state: "Done" as const },
    { label: "Mailbox", state: "Next" as const },
    { label: "Signed webhooks", state: "Later" as const },
  ],
} as const;

export const MOCK_DISCLOSURE = "Illustrative example · fictional workspace";
