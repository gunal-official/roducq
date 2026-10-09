/**
 * /vs/[slug] content map (Step 13 → 34(b)). Data-driven so adding a
 * competitor is one more entry here — rows ship as plain copy, never
 * fetched, never rendered from a DB. Unknown slugs are 404s (page.tsx).
 * Comparisons stay factual (product shape) and non-disparaging.
 */
export interface VsComparisonRow {
  feature: string;
  roducq: string;
  competitor: string;
}

export interface VsPageEntry {
  slug: string;
  competitor: string;
  heading: string;
  intro: string;
  rows: VsComparisonRow[];
  takeaway: string;
}

export const VS_PAGES: Record<string, VsPageEntry> = {
  notion: {
    slug: "notion",
    competitor: "Notion",
    heading: "roducq vs Notion",
    intro:
      "Notion is a great general-purpose workspace — wikis, docs, databases, whatever you build in it. roducq is smaller on purpose: it does one job, the writing trail of client work, with the structure already assembled instead of architected by you.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Store anything in pages; the intake structure is up to you.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor: "A blank page plus whatever template you build.",
      },
      {
        feature: "Proposals & plans",
        roducq:
          "Generated stage by stage — scope, deliverables, and budget carry through automatically.",
        competitor: "Written by hand; no built-in link back to intake.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — weekly updates without re-typing.",
        competitor: "Manual status docs, updated by hand.",
      },
      {
        feature: "Public share links",
        roducq:
          "Token-gated, revocable read-only links scoped to a single update.",
        competitor: "Share whole pages; revoking means unpublishing the page.",
      },
      {
        feature: "Setup cost",
        roducq:
          "Nothing to design — the pipeline already exists; you just run client work through it.",
        competitor: "You architect databases, views, and relations yourself.",
      },
    ],
    takeaway:
      "If your work is client work — especially solo — roducq trades Notion's infinite flexibility for a pipeline that's already assembled. Notion covers the rest.",
  },
  bonsai: {
    slug: "bonsai",
    competitor: "Bonsai",
    heading: "roducq vs Bonsai",
    intro:
      "Bonsai runs the business around your client work — proposals, e-signed contracts, tracked hours, invoices that chase payment, expenses, tax prep. roducq runs the writing: the trail from a raw client message to a brief, a plan, and the weekly update. The two overlap less than the category suggests.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "CRM records with intake forms and scheduling links that qualify a lead before the call.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "No brief stage — scope is written straight into the proposal or contract.",
      },
      {
        feature: "Proposals & contracts",
        roducq:
          "Generated stage by stage from the brief — scope, deliverables and budget carry through; a contract is marked signed in the app.",
        competitor:
          "Proposal templates with interactive pricing and e-signature; an accepted proposal pre-fills the contract.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — the weekly update without re-typing it.",
        competitor:
          "Clients follow tasks and progress in the portal; written updates aren't drafted for you.",
      },
      {
        feature: "Getting paid",
        roducq:
          "Invoices with line items and tax, exported as a PDF — payment happens wherever you already take it.",
        competitor:
          "Invoices pull in tracked hours and expenses, take card payments, and chase late payers automatically.",
      },
      {
        feature: "Sharing with a client",
        roducq:
          "Token-gated, revocable read-only links scoped to a single document.",
        competitor:
          "A branded portal the client signs in to — proposals, contracts, files and invoices in one place.",
      },
    ],
    takeaway:
      "If the job is the business around the work — signed contracts, hours that become invoices, expenses that reconcile at tax time — Bonsai is the fuller suite, and roducq doesn't try to be it. If the job is the writing trail, roducq starts assembled: paste the messages, get the brief, send the update. They cover different halves of a practice, and nothing stops you running both.",
  },
};
