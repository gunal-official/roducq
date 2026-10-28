/**
 * /about — owner-approved copy for the Forma About recreation
 * (approved 2026-10-28; proposal + claim audit in
 * docs/FORMA_ABOUT_REFERENCE.md §6–§7).
 *
 * Every product statement here is already published elsewhere on the
 * site (the previous /about, home/content.ts, /changelog, /pricing
 * disclosures) or is one of the owner's final wording decisions. Do
 * not add company facts — founders, team, statistics, testimonials,
 * funding, milestones — without a verifiable source; none exist in
 * the product today.
 */

export const ABOUT_HERO = {
  eyebrow: "About",
  /** Rendered in ink, one masked span per word. */
  titleBefore: "Why we are",
  /** Rendered in the measured brand gradient. */
  titleAfter: "building roducq",
  intro:
    "Client work starts as scattered communication — an email here, call notes there, a “quick question” in chat. roducq is the writing studio that turns that raw material into briefs, proposals, plans, and updates.",
} as const;

export const ABOUT_STORY = {
  title: "Where the context gets lost",
  paragraphs: [
    {
      emphasis: true,
      text: "On most engagements, the brief lives in an email thread, the changes in chat, the deadline in a calendar, and the context in someone's head. Freelance designers, developers, writers, and small studios spend a large share of every week turning that into documents that agree with each other.",
    },
    {
      emphasis: false,
      text: "roducq takes that raw material as-is and structures it. Paste a client email, call notes, or a chat log and get a structured draft that flags what's vague or missing as tracked open questions. Every source stays verbatim and attached to its brief, and each stage carries the last one's structure forward: briefs become proposals, proposals become plans, plans drive client updates.",
    },
    {
      emphasis: false,
      /* Owner's final wording (replaces the mirrored success-metric
         sentence from the reference). */
      text: "Our goal is to reduce the repeated work of turning scattered client conversations into clear, useful documents.",
    },
  ],
} as const;

export const ABOUT_PRINCIPLES = {
  eyebrow: "Principles",
  title: "How we make product decisions",
  items: [
    {
      number: "01",
      title: "Start from what the client said",
      description:
        "Paste the email, the call notes, or the chat log. roducq drafts from the real words, not from a blank template.",
    },
    {
      number: "02",
      title: "Gaps are flagged, not guessed",
      description:
        "What's vague or missing is surfaced as a tracked open question, so you ask early instead of discovering it late.",
    },
    {
      number: "03",
      title: "Every source stays attached",
      description:
        "Each pasted message stays verbatim and immutable, threaded onto its brief — you can always point back to what the client actually said.",
    },
    {
      number: "04",
      title: "One pipeline, not a pile of docs",
      description:
        "Briefs become proposals, proposals become plans, plans drive client updates. Each stage carries the last one's structure forward instead of starting over.",
    },
    {
      number: "05",
      title: "We say what it doesn't do",
      description:
        "roducq writes the work; it doesn't collect signatures or payments. The limits are written on the page, not in the small print.",
    },
  ],
} as const;

/**
 * The reference's three cards are Changelog / Security / Contact.
 * Roducq has no /security page, so — with the layout preserved — that
 * slot carries the comparison hub the LIMITATION block already links
 * to (home/content.ts). Contact is the published Studio address from
 * /pricing (pricing-content.ts).
 */
export const ABOUT_CARDS = [
  {
    eyebrow: "Changelog",
    title: "See what shipped recently",
    /* The /changelog page's own published description. */
    description:
      "Verified product updates, interface improvements, and fixes — ordered most recent first.",
    linkLabel: "Read the changelog",
    href: "/changelog",
  },
  {
    eyebrow: "Compare",
    title: "Where roducq fits — and doesn't",
    description:
      "Side-by-side comparisons with the tools freelancers and studios already use, including the work roducq leaves to them.",
    linkLabel: "Read the comparisons",
    href: "/vs",
  },
  {
    eyebrow: "Contact",
    title: "Send us feedback",
    description:
      "Questions, bug reports, and feature requests go to the people building roducq. It's in early access, so feedback shapes what ships next.",
    linkLabel: "Get in touch",
    href: "mailto:hello@roducq.dev",
  },
] as const;

export const ABOUT_CTA = {
  /* Two masked lines, the second in the pale gradient — the
     reference's closing-headline treatment. */
  titleLine1: "Try roducq with",
  titleLine2: "your own client work",
  intro:
    "Start free, paste your first client message, and watch it become a brief.",
  primaryCta: { label: "Create account", href: "/signup" },
  secondaryCta: { label: "See pricing", href: "/pricing" },
  /* Owner's final wording; verifiable per docs/FORMA_PRICING_REDESIGN.md
     ("signup does not purchase or activate a paid plan"). */
  note: "Creating an account does not activate a paid plan.",
  checklistTitle: "From message to brief",
  checklistProgress: "2 of 4",
  checklistItems: [
    { label: "Paste the client message", state: "Done" },
    { label: "Review the flagged gaps", state: "Done" },
    { label: "Draft the brief", state: "Next" },
    { label: "Share the update link", state: "Later" },
  ],
  /* Required label wherever illustrative customer data appears. */
  illustrationLabel: "Illustrative example · fictional client",
} as const;
