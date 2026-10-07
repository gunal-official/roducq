/**
 * Global workspace search (the topbar box → /search) — the pure,
 * dependency-free layer: query normalization, PostgREST `or=` filter
 * construction (user input demands TWO levels of escaping), highlight
 * segmentation and the group registry that fixes result ordering.
 *
 * Kept out of the page and data files so the zero-dep node:test runner
 * can lock every rule (same convention as lib/proposal-versions.ts).
 * Nothing here touches the DB, React or cookies.
 */

/** Shorter than this the query is noise ("a", single initials). */
export const SEARCH_MIN_CHARS = 2;

/** Bound the pattern + the URL (a novel pasted into the box is a list
 *  filter's job, not global search's). */
export const SEARCH_MAX_CHARS = 100;

/** Hits per group — search is a jump surface, not a report; every group
 *  card links to the full list for the rest. */
export const SEARCH_GROUP_LIMIT = 6;

/** The searchable entities. Table name == group key (lib/data/search.ts
 *  relies on that), display order == the app nav order (Workspace items
 *  first, then Money). */
export type SearchGroupKey =
  | "briefs"
  | "proposals"
  | "plans"
  | "updates"
  | "invoices"
  | "contracts";

export interface SearchGroupDef {
  key: SearchGroupKey;
  label: string;
  /** The entity's list page — "View all" link + empty-state suggestions. */
  listHref: string;
  /** Detail-page href builder for a hit. */
  detailHref: (id: string) => string;
  /** Money surfaces are queried + rendered for members only — viewers
   *  get neither the rows (RLS already hides them) nor the group card
   *  (Step 29 hide rule, same gate as MONEY_HREFS in the nav). */
  money: boolean;
}

/** Fixed display order: nav order (Briefs → Proposals → Plans → Updates,
 *  then Money's Invoices/Contracts). Tests lock the order. */
export const SEARCH_GROUPS: readonly SearchGroupDef[] = [
  {
    key: "briefs",
    label: "Briefs",
    listHref: "/briefs",
    detailHref: (id) => `/briefs/${id}`,
    money: false,
  },
  {
    key: "proposals",
    label: "Proposals",
    listHref: "/proposals",
    detailHref: (id) => `/proposals/${id}`,
    money: false,
  },
  {
    key: "plans",
    label: "Plans",
    listHref: "/plans",
    detailHref: (id) => `/plans/${id}`,
    money: false,
  },
  {
    key: "updates",
    label: "Updates",
    listHref: "/updates",
    detailHref: (id) => `/updates/${id}`,
    money: false,
  },
  {
    key: "invoices",
    label: "Invoices",
    listHref: "/invoices",
    detailHref: (id) => `/invoices/${id}`,
    money: true,
  },
  {
    key: "contracts",
    label: "Contracts",
    listHref: "/contracts",
    detailHref: (id) => `/contracts/${id}`,
    money: false,
  },
];

/** Groups this viewer may see — money groups dropped for viewers. */
export function searchableGroups(canSeeMoney: boolean): readonly SearchGroupDef[] {
  return SEARCH_GROUPS.filter((group) => canSeeMoney || !group.money);
}

/**
 * One search hit, shape-normalized across entities by lib/data/search.ts
 * (each list query selects down to exactly these fields). `status` stays
 * a plain string — statuses are per-entity unions and search renders one
 * neutral badge, not per-entity StatusBadge components.
 */
export interface SearchHit {
  id: string;
  title: string;
  clientName: string | null;
  status: string;
  updatedAt: string;
  /** Secondary code chip — the INV-000N label for invoices. */
  code?: string;
}

export type SearchResults = Partial<Record<SearchGroupKey, SearchHit[]>>;

/** Total hits across groups (drives "N results" + the no-results state). */
export function countResults(results: SearchResults): number {
  return Object.values(results).reduce(
    (total, hits) => total + (hits?.length ?? 0),
    0
  );
}

/**
 * Raw `?q=` value → a sane query, or null when there is nothing worth
 * searching. Trims, collapses internal whitespace, caps at
 * SEARCH_MAX_CHARS (code-point-safe — a surrogate pair is never split at
 * the cut, the file-intake precedent) and refuses too-short queries.
 * A repeated param (?q=a&q=b) answers with the first value.
 */
export function normalizeSearchQuery(
  raw: string | string[] | null | undefined
): string | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "string") return null;
  const collapsed = first.trim().replace(/\s+/g, " ");
  if (collapsed.length < SEARCH_MIN_CHARS) return null;
  return [...collapsed].slice(0, SEARCH_MAX_CHARS).join("");
}

/**
 * Postgres LIKE wildcards in the QUERY must be literal: `%` and `_` (and
 * the escape char itself) are backslash-escaped so "100%" matches
 * "100%", not "100<anything>".
 */
export function escapeLikePattern(query: string): string {
  return query.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * The PostgREST `or=` filter for "title OR client_name contains query".
 *
 * Values are DOUBLE-QUOTED — that is the documented way a value may
 * contain the condition separators (`,` `(` `)`) — and a literal `"`
 * inside is backslash-escaped for the transport. With both escapings a
 * query like `Acme "x", Inc.` becomes one safe pattern per field:
 *
 *   title.ilike."%Acme \"x\", Inc.%",client_name.ilike."%Acme \"x\", Inc.%"
 *
 * The ilike itself stays case-insensitive; no lowercasing needed.
 */
export function buildOrFilter(
  fields: readonly string[],
  query: string
): string {
  const likeEscaped = escapeLikePattern(query);
  const transportEscaped = likeEscaped.replace(/"/g, '\\"');
  return fields
    .map((field) => `${field}.ilike."%${transportEscaped}%"`)
    .join(",");
}

/** One rendered slice of a hit's title / client name. */
export interface HighlightSegment {
  text: string;
  /** true = matches the query → renders inside <mark>. */
  hit: boolean;
}

/**
 * Split `text` into query-matching and plain segments (case-insensitive,
 * every occurrence) so the page can wrap the hits in <mark> without
 * dangerouslySetInnerHTML. Falls back to one plain segment when there is
 * nothing to match or when lowercasing would shift indices (the İ-class
 * of code points) — a missing highlight never breaks the render.
 */
export function highlightSegments(
  text: string | null | undefined,
  query: string
): HighlightSegment[] {
  if (!text) return [];
  const needle = query.trim();
  if (!needle) return [{ text, hit: false }];

  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  // Index-shift guard: toLowerCase() can change string length for a few
  // code points; slicing by mismatched indices would corrupt the output.
  if (lowerText.length !== text.length || lowerNeedle.length !== needle.length) {
    return [{ text, hit: false }];
  }

  const segments: HighlightSegment[] = [];
  let from = 0;
  while (from < text.length) {
    const at = lowerText.indexOf(lowerNeedle, from);
    if (at === -1) {
      segments.push({ text: text.slice(from), hit: false });
      break;
    }
    if (at > from) segments.push({ text: text.slice(from, at), hit: false });
    segments.push({ text: text.slice(at, at + needle.length), hit: true });
    from = at + needle.length;
  }
  return segments;
}

/** Status chip copy: the DB's snake_case → spaces ("not_started" →
 *  "not started"). No title-casing — the entity lists keep lowercase
 *  badges, so search matches them. */
export function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
