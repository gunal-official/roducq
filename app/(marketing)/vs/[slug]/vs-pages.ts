/**
 * /vs content map (Step 13 → 34(b) → comparisons hub). Data-driven so adding a
 * competitor is one more entry here — rows ship as plain copy, never fetched,
 * never rendered from a DB. /vs/[slug] renders one entry; /vs lists them all.
 * Unknown slugs are 404s (page.tsx).
 *
 * Comparisons stay factual (product shape, not prices) and non-disparaging.
 * Competitor details come from vendor product pages and third-party reviews
 * as of October 2026 — see VS_LIMITATION_NOTE, shown on every comparison.
 */
export interface VsComparisonRow {
  feature: string;
  roducq: string;
  competitor: string;
}

export interface VsPageEntry {
  slug: string;
  competitor: string;
  /** One line shown on the /vs hub card. */
  summary: string;
  heading: string;
  intro: string;
  rows: VsComparisonRow[];
  takeaway: string;
}

/**
 * Shown on the hub and every detail page. Keep it honest: what the comparison
 * is based on, how stale it can get, and what roducq deliberately doesn't do.
 */
export const VS_LIMITATION_NOTE =
  "How to read these: competitor details describe publicly listed product features as of October 2026, drawn from vendor sites and third-party reviews. Products and plans change, and these tables are not exhaustive — check the vendor's current site before you decide. roducq is the narrower tool: it doesn't take card payments on invoices, collect e-signatures, or run accounting. A contract is marked signed inside the app.";

export const VS_PAGES: Record<string, VsPageEntry> = {
  notion: {
    slug: "notion",
    competitor: "Notion",
    summary: "A general-purpose workspace, versus a pipeline already built for client work.",
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
    summary: "The business around the work, versus the writing trail behind it.",
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
  honeybook: {
    slug: "honeybook",
    competitor: "HoneyBook",
    summary: "A client workflow platform for independent pros: proposals, contracts, invoices, scheduling.",
    heading: "roducq vs HoneyBook",
    intro:
      "HoneyBook is built for independent professionals who run bookings end to end: lead forms, proposals, contracts, invoices, payments and scheduling in one client workspace. roducq covers the earlier half of that journey — turning raw client messages into a brief, a proposal, a plan and an update.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Lead forms and an inquiry pipeline that bring new clients into projects.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Projects are organized around the booking; scope is captured in proposals and Smart Files.",
      },
      {
        feature: "Proposals & contracts",
        roducq:
          "Generated stage by stage from the brief; a contract is marked signed in the app.",
        competitor:
          "Proposals and contracts with digital signatures, linked to invoices and payment steps.",
      },
      {
        feature: "Getting paid",
        roducq:
          "Invoices with line items and tax, exported as a PDF — payment happens wherever you already take it.",
        competitor:
          "Online invoice payments by card or bank transfer, payment plans, and automated reminders.",
      },
      {
        feature: "Scheduling",
        roducq:
          "Not a scheduling tool — meetings stay in your own calendar app.",
        competitor: "Calendar scheduling with Google and Outlook sync.",
      },
      {
        feature: "Client portal",
        roducq:
          "Token-gated, revocable read-only links scoped to a single update or document.",
        competitor:
          "One login where clients see messages, files, invoices and contracts.",
      },
    ],
    takeaway:
      "If your work is booking-to-payment for a service business, HoneyBook covers the whole client journey in one product. If the pain is the writing trail — messy intake, briefs, plans and updates — roducq starts from the messages you already have. The two can sit side by side.",
  },
  dubsado: {
    slug: "dubsado",
    competitor: "Dubsado",
    summary: "Client management with forms, workflow automation and client portals.",
    heading: "roducq vs Dubsado",
    intro:
      "Dubsado is a client management platform for service businesses: lead capture forms, proposals, contracts, invoices, scheduling, automated workflows and client portals. roducq shares some of that ground and is narrower — it focuses on turning client messages into the documents and updates that follow.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Lead capture forms and questionnaires that collect client details.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Forms gather the details; scope is written into proposals and contracts.",
      },
      {
        feature: "Workflows",
        roducq:
          "A fixed pipeline: intake, brief, proposal, plan, update, each stage feeding the next.",
        competitor:
          "Workflow automation: sequences of emails, tasks and documents that run from a client's status.",
      },
      {
        feature: "Proposals & contracts",
        roducq:
          "Generated from the brief — scope, deliverables and budget carry through.",
        competitor:
          "Proposals with packages and pricing, plus contracts with e-signatures and smart fields that fill in client details.",
      },
      {
        feature: "Getting paid",
        roducq:
          "Invoices with line items and tax, exported as a PDF.",
        competitor:
          "Invoices with flexible payment plans and payment collection.",
      },
      {
        feature: "Client portal",
        roducq:
          "Token-gated, revocable read-only links scoped to one document.",
        competitor:
          "A password-protected portal showing a client's contracts, invoices, files and emails.",
      },
    ],
    takeaway:
      "If you want to automate a long client lifecycle — many forms, flows and recurring steps — Dubsado is built for that, and it takes real setup time. If you want the writing side assembled from the start, roducq is the lighter route.",
  },
  "17hats": {
    slug: "17hats",
    competitor: "17hats",
    summary: "Client admin in one place: quotes, contracts, invoices, scheduling and bookkeeping.",
    heading: "roducq vs 17hats",
    intro:
      "17hats puts client administration in one place: quotes, contracts, invoices, online scheduling, workflows and built-in bookkeeping. It's designed to move a client from first contact to paid booking without switching tools. roducq is the writing layer — from raw messages to briefs, proposals, plans and updates.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Client records and online scheduling pages that take bookings directly.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Reusable quote and questionnaire templates for each client's scope.",
      },
      {
        feature: "Proposals & contracts",
        roducq:
          "Generated stage by stage from the brief; a contract is marked signed in the app.",
        competitor:
          "Quotes, contracts and invoices chained in a workflow — completing one can trigger the next.",
      },
      {
        feature: "Bookkeeping",
        roducq:
          "No ledger. Invoices and hours export cleanly for the accounting tool you already use.",
        competitor:
          "Built-in accounting: ledger, accounts payable and receivable, and financial reports.",
      },
      {
        feature: "Getting paid",
        roducq:
          "Invoices with line items and tax, exported as a PDF — payment happens wherever you already take it.",
        competitor:
          "Invoices with online payment processing and automated follow-up through workflows.",
      },
      {
        feature: "Scheduling",
        roducq:
          "Not a scheduling tool — meetings stay in your own calendar app.",
        competitor:
          "Online scheduling where a booking confirmation can trigger a workflow.",
      },
    ],
    takeaway:
      "If you want client admin and bookkeeping in one subscription, with booking-triggered workflows, 17hats is built for that. If you want the writing trail — messages in, brief out, update sent — roducq is narrower on purpose and leaves the bookkeeping to other tools.",
  },
  freshbooks: {
    slug: "freshbooks",
    competitor: "FreshBooks",
    summary: "Accounting and invoicing for small businesses, with time and expense tracking.",
    heading: "roducq vs FreshBooks",
    intro:
      "FreshBooks is accounting software for small businesses. Its center of gravity is invoicing, expenses, time tracking, payments and bookkeeping, with a mobile app for sending invoices and logging receipts. roducq sits on the other side of the money: the client writing that comes before the invoice.",
    rows: [
      {
        feature: "Core job",
        roducq:
          "Client writing: intake, briefs, proposals, plans and updates.",
        competitor:
          "Accounting: invoices, expenses, reports and bookkeeping.",
      },
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Client records and estimates; intake isn't the focus.",
      },
      {
        feature: "Proposals & estimates",
        roducq:
          "Proposals generated from the brief, stage by stage.",
        competitor:
          "Estimates and proposals sent to clients from the same account as invoices.",
      },
      {
        feature: "Getting paid",
        roducq:
          "Invoices with line items and tax, exported as a PDF.",
        competitor:
          "Online card and bank payments, recurring invoices, and overdue notifications.",
      },
      {
        feature: "Time & expenses",
        roducq:
          "An hours log with a timer, kept alongside each client's work.",
        competitor:
          "Time tracking, receipt capture for expenses, and mileage tracking.",
      },
      {
        feature: "Accounting",
        roducq:
          "No ledger, reconciliation or reports.",
        competitor:
          "Double-entry accounting, bank reconciliation, balance sheets and project profitability.",
      },
    ],
    takeaway:
      "If you need invoicing, expenses and bookkeeping in one place for your accountant, FreshBooks is built for that. If the bottleneck is turning client conversations into scoped work and updates, roducq starts there. Many small firms will run an accounting tool alongside roducq.",
  },
  clickup: {
    slug: "clickup",
    competitor: "ClickUp",
    summary: "All-in-one project management: tasks, docs, goals and views for any team.",
    heading: "roducq vs ClickUp",
    intro:
      "ClickUp is a general-purpose work platform: tasks, docs, goals, chat, time tracking and many views — list, board, Gantt, calendar — with automations and AI features built in. It can run almost any team's work. roducq is smaller on purpose: it runs the client-work pipeline from first message to update.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Tasks, forms and docs you configure in a workspace; the intake shape is yours to build.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Docs and task templates; the brief structure is designed by you.",
      },
      {
        feature: "Proposals & plans",
        roducq:
          "Generated stage by stage — scope, deliverables and budget carry through automatically.",
        competitor:
          "Docs and task lists, written by hand or from templates.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — weekly updates without re-typing.",
        competitor:
          "Dashboards and guest access show progress; written updates are composed by you, with optional AI summaries.",
      },
      {
        feature: "Time tracking",
        roducq:
          "An hours log with a timer, tied to client work.",
        competitor:
          "Time tracking on tasks, with reports and dashboards.",
      },
      {
        feature: "Setup cost",
        roducq:
          "Nothing to design — the pipeline already exists; you just run client work through it.",
        competitor:
          "Flexible by design: spaces, lists, custom fields and views to set up yourself.",
      },
    ],
    takeaway:
      "If you need one tool for every kind of team work — sprints, Gantt charts, a flexible structure — ClickUp is built for that breadth. If your work is client work and you want the pipeline already assembled, roducq is the narrower tool.",
  },
  basecamp: {
    slug: "basecamp",
    competitor: "Basecamp",
    summary: "A project hub with message boards, to-dos, schedules and client guest access.",
    heading: "roducq vs Basecamp",
    intro:
      "Basecamp organizes each project into message boards, to-dos, a schedule, docs and files, and group chat, with clients invited as guests to specific projects. Its strength is simplicity and calm communication. roducq is a client-work pipeline: it starts from the raw messages and produces the brief, proposal, plan and update.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Clients post and reply on the project's message boards.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Scope lives in docs and message threads; there's no generated brief.",
      },
      {
        feature: "Proposals & plans",
        roducq:
          "Generated stage by stage — scope, deliverables and budget carry through automatically.",
        competitor:
          "To-do lists and schedules describe the plan; proposals are written in docs.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — the weekly update without re-typing it.",
        competitor:
          "Automatic check-ins and hill charts show progress; updates are posted to message boards.",
      },
      {
        feature: "Client access",
        roducq:
          "Token-gated, revocable read-only links scoped to a single update.",
        competitor:
          "Clients join a project as guests and see the tools you share with them.",
      },
      {
        feature: "Scheduling",
        roducq:
          "Not a scheduling tool — meetings stay in your own calendar app.",
        competitor:
          "A project schedule of dated to-dos and milestones, with calendar sync.",
      },
    ],
    takeaway:
      "If your team and clients need one calm place to talk, schedule and share files, Basecamp is a strong fit, and roducq doesn't replace it. If the pain is the writing trail — messages turning into briefs, proposals and updates — roducq is built for that step. The two can work together.",
  },
  pandadoc: {
    slug: "pandadoc",
    competitor: "PandaDoc",
    summary: "Document automation and e-signature for proposals, quotes and contracts.",
    heading: "roducq vs PandaDoc",
    intro:
      "PandaDoc is document automation for sales and operations teams: a drag-and-drop editor, reusable templates and pricing tables, approvals, engagement tracking, e-signatures and CRM integrations. roducq makes the same kind of document — proposals and contracts — but starts from raw client conversations rather than a sales pipeline.",
    rows: [
      {
        feature: "Client intake",
        roducq:
          "Paste raw emails, call notes, chat logs — every message stays verbatim, threaded onto its brief.",
        competitor:
          "Deal data from your CRM pre-fills documents; intake happens in the CRM.",
      },
      {
        feature: "Structured briefs",
        roducq:
          "Gap-flagged brief drafts with tracked open questions and full edit history.",
        competitor:
          "Reusable templates and content libraries for each document type.",
      },
      {
        feature: "Proposals & contracts",
        roducq:
          "Generated stage by stage from the brief; a contract is marked signed in the app.",
        competitor:
          "Editor, pricing tables, approvals and e-signatures in one workflow; CPQ on higher tiers.",
      },
      {
        feature: "Client updates",
        roducq:
          "Composed from plan progress — weekly updates without re-typing.",
        competitor:
          "Engagement tracking shows when a recipient opens and reads a document; ongoing updates aren't the focus.",
      },
      {
        feature: "Sharing with a client",
        roducq:
          "Token-gated, revocable read-only links scoped to one document.",
        competitor:
          "Shared documents with e-signature and real-time view tracking.",
      },
      {
        feature: "Setup cost",
        roducq:
          "Nothing to design — the pipeline already exists; you just run client work through it.",
        competitor:
          "Templates and content you build, plus integrations with HubSpot, Salesforce and others.",
      },
    ],
    takeaway:
      "If your team sends high volumes of sales proposals and quotes that need CRM data, approvals and CPQ, PandaDoc is built for that. If you run a small client-work practice that wants intake, briefs, proposals and updates connected, roducq starts from the messages instead.",
  },
};

/** Entries in display order (alphabetical by competitor) for the /vs hub. */
export const VS_PAGE_LIST: VsPageEntry[] = Object.values(VS_PAGES).sort((a, b) =>
  a.competitor.localeCompare(b.competitor),
);
