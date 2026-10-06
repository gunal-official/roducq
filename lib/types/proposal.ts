/**
 * Types matching supabase/migrations/20260923000000_proposals_schema.sql.
 * Proposals share the deliverables element shape with briefs, so the
 * element type is imported rather than duplicated.
 */

import type { BriefDeliverable } from "@/lib/types/brief";

export type ProposalStatus = "draft" | "sent" | "accepted" | "declined";

export interface Proposal {
  id: string;
  workspace_id: string;
  /** The brief this proposal was generated from (NOT NULL in the DB). */
  brief_id: string;
  title: string;
  client_name: string | null;
  status: ProposalStatus;
  budget_timeline: string | null;
  deliverables: BriefDeliverable[];
  created_at: string; // timestamptz → ISO string
  updated_at: string;
}

/** Summary row for the /proposals list (as returned by getProposals). */
export interface ProposalSummary {
  id: string;
  title: string;
  client_name: string | null;
  status: ProposalStatus;
  updated_at: string;
  deliverablesTotal: number;
  deliverablesDone: number;
}

/** Proposal with its source brief embedded (as returned by
 *  getProposalById) — powers the "View source brief" link on the detail
 *  page. */
export interface ProposalWithBrief extends Proposal {
  brief: { id: string; title: string } | null;
}

/* ── Version history (Queue #7) — mirrors
 *  supabase/migrations/20261006000000_proposal_versions.sql. A version is
 *  an immutable snapshot of every mutable content column of a proposal.
 *  reason: 'created' = the creation state, 'edited' = a state displaced
 *  by an edit, 'restored' = a state displaced by a restore. */

export type ProposalVersionReason = "created" | "edited" | "restored";

/** Full snapshot row (as returned by getProposalVersionById). */
export interface ProposalVersion {
  id: string;
  workspace_id: string;
  proposal_id: string;
  /** 1-based, strictly increasing per proposal, no gaps. */
  version_number: number;
  reason: ProposalVersionReason;
  title: string;
  client_name: string | null;
  status: ProposalStatus;
  budget_timeline: string | null;
  deliverables: BriefDeliverable[];
  /** Who created/displaced this state; null = unknown/system. */
  created_by: string | null;
  created_at: string; // timestamptz → ISO string
}

/** The five content fields a snapshot freezes — the "current content"
 *  shape versionMatchesCurrent() compares against. */
export interface ProposalVersionContent {
  title: string;
  client_name: string | null;
  status: ProposalStatus;
  budget_timeline: string | null;
  deliverables: BriefDeliverable[];
}
