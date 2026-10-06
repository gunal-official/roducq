/**
 * Proposal version history (Queue item #7) — pure helpers shared by the
 * proposal detail page's "Version history" card and the read-only
 * snapshot view. Dependency-free presentational logic — kept out of the
 * .tsx files so the zero-dep node:test runner can load it (same
 * convention as lib/to-messages.ts).
 */

import type {
  ProposalVersionContent,
  ProposalVersionReason,
} from "@/lib/types/proposal";

export const PROPOSAL_VERSION_REASONS = [
  "created",
  "edited",
  "restored",
] as const satisfies readonly ProposalVersionReason[];

/**
 * One-line label for WHY a snapshot exists, rendered in the history
 * list. Snapshots freeze the state that was CREATED / displaced, so the
 * verb describes what the row holds, not what happened next.
 */
export function versionReasonLabel(reason: ProposalVersionReason): string {
  switch (reason) {
    case "created":
      return "Initial snapshot";
    case "edited":
      return "Before an edit";
    case "restored":
      return "Before a restore";
  }
}

/** jsonb round-trips key order deterministically (sorted), so a
 *  serialised comparison of DB-sourced deliverables is stable. */
function sameDeliverables(
  a: ProposalVersionContent["deliverables"],
  b: ProposalVersionContent["deliverables"]
): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

/**
 * Would restoring this version change anything? False when the snapshot
 * is exactly the proposal's CURRENT content — e.g. the initial snapshot
 * of a proposal that has never been edited. The UI disables restore for
 * those rows ("Current"); the database independently refuses the no-op
 * (already_current), so this is purely the friendly layer.
 */
export function versionMatchesCurrent(
  version: ProposalVersionContent,
  current: ProposalVersionContent
): boolean {
  return (
    version.title === current.title &&
    version.client_name === current.client_name &&
    version.status === current.status &&
    version.budget_timeline === current.budget_timeline &&
    sameDeliverables(version.deliverables, current.deliverables)
  );
}
