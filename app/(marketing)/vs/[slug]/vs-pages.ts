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
      "Bonsai is a full freelance business suite — proposals, contracts, invoicing, time tracking, expenses, taxes. roducq is smaller on purpose: just the writing trail of client work, pipeline included, nothing to assemble.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "CRM contacts and project records; client messages aren't parsed into briefs.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Proposals and contracts are the built-in document types; briefs aren't a stage.",
      },
      {
        feature: "Proposals & plans",
        roducq:
          "Generated stage by stage — scope, deliverables, and budget carry through automatically.",
        competitor:
          "Strong proposal templates with e-sign; delivery plans aren't generated from them.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — weekly updates without re-typing.",
        competitor:
          "Client portal for files and invoices; weekly writing isn't drafted from plan progress.",
      },
      {
        feature: "Public share links",
        roducq:
          "Token-gated, revocable read-only links scoped to a single update.",
        competitor:
          "Clients sign in to a portal rather than opening per-document links.",
      },
      {
        feature: "Setup cost",
        roducq:
          "Nothing to design — the pipeline already exists; you just run client work through it.",
        competitor:
          "Turn on the modules you need — time, expenses, payments, tax prep.",
      },
    ],
    takeaway:
      "If you want the business back office — contracts, payments, time, tax — Bonsai is the fuller suite. If the writing trail is the job, roducq does just that, already assembled.",
  },
};
