import "server-only";

import { createClient } from "@/lib/supabase/server";
import { invoiceNumberLabel } from "@/lib/utils";
import {
  buildOrFilter,
  searchableGroups,
  SEARCH_GROUP_LIMIT,
  type SearchGroupKey,
  type SearchHit,
  type SearchResults,
} from "@/lib/search";

/**
 * Server-side data access for global search (/search). Same conventions
 * as lib/data/briefs.ts: cookie-authenticated server client, so RLS
 * scopes every read to workspaces the caller belongs to, and the
 * explicit workspace_id pin keeps a multi-workspace user's results
 * unmerged (Step 16). Call only with an active session.
 *
 * One PostgREST query per group (title OR client_name ilike, newest
 * first, capped at SEARCH_GROUP_LIMIT), all fired in parallel. Viewer
 * money-hiding is applied BEFORE querying — money groups are dropped
 * from the query list entirely (RLS would return zero rows anyway; not
 * asking is cheaper and clearer).
 */

/** Both searchable text columns, shared by every entity. */
const MATCH_FIELDS = ["title", "client_name"] as const;

interface HitRow {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  updated_at: string;
}

/** Invoices additionally carry their per-workspace number. */
interface InvoiceHitRow extends HitRow {
  invoice_number: number;
}

export async function searchWorkspace(input: {
  workspaceId: string;
  /** Viewer flag — money groups (invoices) are skipped when false. */
  canSeeMoney: boolean;
  /** The NORMALIZED query (normalizeSearchQuery output, never raw). */
  q: string;
}): Promise<SearchResults> {
  const supabase = await createClient();
  const pattern = buildOrFilter(MATCH_FIELDS, input.q);
  const groups = searchableGroups(input.canSeeMoney);

  const entries = await Promise.all(
    groups.map(
      async (group): Promise<readonly [SearchGroupKey, SearchHit[]]> => {
        // The invoice branch is spelled out (not a conditional select
        // string) so supabase-js's type-level select parser sees one
        // literal per call — and because it rides invoice_number along.
        if (group.key === "invoices") {
          const { data, error } = await supabase
            .from("invoices")
            .select(
              "id, title, client_name, status, updated_at, invoice_number"
            )
            .eq("workspace_id", input.workspaceId)
            .or(pattern)
            .order("updated_at", { ascending: false })
            .limit(SEARCH_GROUP_LIMIT);

          if (error) throw error;

          const rows = (data ?? []) as InvoiceHitRow[];
          return [
            group.key,
            rows.map((row) => ({
              id: row.id,
              title: row.title,
              clientName: row.client_name,
              status: row.status,
              updatedAt: row.updated_at,
              code: invoiceNumberLabel(row.invoice_number),
            })),
          ] as const;
        }

        // Table name == group key (locked by tests/lib/search.test.ts).
        const { data, error } = await supabase
          .from(group.key)
          .select("id, title, client_name, status, updated_at")
          .eq("workspace_id", input.workspaceId)
          .or(pattern)
          .order("updated_at", { ascending: false })
          .limit(SEARCH_GROUP_LIMIT);

        if (error) throw error;

        const rows = (data ?? []) as HitRow[];
        return [
          group.key,
          rows.map((row) => ({
            id: row.id,
            title: row.title,
            clientName: row.client_name,
            status: row.status,
            updatedAt: row.updated_at,
          })),
        ] as const;
      }
    )
  );

  return Object.fromEntries(entries) as SearchResults;
}
