/**
 * /search — global workspace search: the topbar box, wired. One plain
 * GET form (topbar or the refine box here) → server-rendered grouped
 * results across the operational entities, newest first, six per group.
 *
 * PHASE E: the page is a Forma financial plane (forma-search) — the
 * refine form lives in a lavender hero band beside the search drawing
 * (the same plain GET form, no JavaScript required), results render as
 * group cards with lavender hit rows, and the prompt/empty states use
 * the shared EmptyState vocabulary. The query, ranking, permission
 * gates and highlight logic are untouched.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. Type a client fragment ("Bright") in the topbar search and press
 *      Enter → this page lists that client's briefs, proposals, plans,
 *      updates, invoices and contracts, query highlighted in each title.
 *   2. Hits link into the entity's detail page; "View all …" under a
 *      group links to its list. The refine box keeps the current query.
 *   3. As a viewer (roster → role viewer): identical page minus the
 *      Invoices group — money is hidden before the query is even sent
 *      (RLS would hide the rows regardless).
 *   4. Hostile queries are inert: `100%`, `a_b`, `Acme "x", Inc.` search
 *      for themselves (wildcards escaped, PostgREST or= value quoted) —
 *      and an empty or one-character query lands on the "type more"
 *      state instead of searching.
 */

import Link from "next/link";
import {
  ClipboardList,
  FileSignature,
  FileText,
  ListChecks,
  MessageSquare,
  Receipt,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionCard } from "@/components/ui/page";
import { SearchArt } from "@/components/workflow/FinancialArt";
import { searchWorkspace } from "@/lib/data/search";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import {
  countResults,
  highlightSegments,
  normalizeSearchQuery,
  searchableGroups,
  SEARCH_GROUP_LIMIT,
  statusLabel,
  type SearchGroupDef,
  type SearchHit,
} from "@/lib/search";
import { timeAgo } from "@/lib/utils";

/** Group key → nav icon (semantic icon registry, docs/icon-audit.md). */
const GROUP_ICONS: Record<SearchGroupDef["key"], LucideIcon> = {
  briefs: ClipboardList,
  proposals: FileText,
  plans: ListChecks,
  updates: MessageSquare,
  invoices: Receipt,
  contracts: FileSignature,
};

/** Query text with every occurrence wrapped in a styled <mark>. */
function Highlighted({ text, q }: { text: string | null; q: string }) {
  if (!text) return null;
  return (
    <>
      {highlightSegments(text, q).map((segment, i) =>
        segment.hit ? (
          <mark
            key={i}
            className="rounded-sm bg-highlight-soft px-0.5 text-text"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}

/** One hit row: title (highlighted) + client · status · updated, code chip. */
function HitLink({ hit, href, q }: { hit: SearchHit; href: string; q: string }) {
  return (
    <li>
      <Link href={href} className="search-hit min-h-11">
        <div className="min-w-0 flex-1">
          <p className="search-hit-title">
            <Highlighted text={hit.title} q={q} />
          </p>
          <p className="search-hit-meta">
            <Highlighted text={hit.clientName} q={q} />
            {hit.clientName ? " · " : ""}
            {statusLabel(hit.status)} · {timeAgo(hit.updatedAt)}
          </p>
        </div>
        {hit.code && (
          <Badge variant="secondary" className="search-hit-code">
            {hit.code}
          </Badge>
        )}
      </Link>
    </li>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  // (app) layout guarantees a membership; a null context only covers the
  // theoretical race and renders the prompt state (briefs page precedent).
  const context = await getWorkspaceContext();
  const q = normalizeSearchQuery(params.q);

  // Search only with a usable query AND a workspace to scope to. Viewer
  // money-hiding is applied inside searchWorkspace (money groups are not
  // even queried — RLS would return zero rows regardless).
  const results =
    q && context
      ? await searchWorkspace({
          workspaceId: context.id,
          canSeeMoney: context.canSeeMoney,
          q,
        })
      : null;
  const total = results ? countResults(results) : 0;
  const groups =
    results && context
      ? searchableGroups(context.canSeeMoney).filter(
          (group) => (results[group.key]?.length ?? 0) > 0
        )
      : [];

  const scope = context
    ? `Across briefs, proposals, plans, updates, contracts${
        context.canSeeMoney ? ", invoices" : ""
      } in ${context.name}.`
    : "Across your workspace.";

  return (
    <div className="forma-core forma-search mx-auto max-w-6xl">
      <h1 className="sr-only">Search</h1>

      {/* The hero band: the refine form is the same plain GET form as the
          topbar, seeded with the current query. Works without JavaScript. */}
      <section className="search-hero" aria-label="Search your workspace">
        <form action="/search" role="search" className="search-hero-form">
          <label htmlFor="search-refine" className="forma-kicker">
            Search your workspace
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="search-refine"
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search title or client…"
              autoFocus={!q}
              className="search-hero-input pl-10"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="search-hero-meta">
              Covers titles and client names · two characters minimum ·
              newest first, six per group.
            </p>
            <Button type="submit" className="h-11 rounded-control px-5">
              Search
            </Button>
          </div>
        </form>
        <div className="search-hero-art">
          <SearchArt />
        </div>
      </section>

      {!q || !context ? (
        // No usable query: a prompt, not an error — two characters is the
        // floor (SEARCH_MIN_CHARS).
        <EmptyState
          icon={Search}
          title="Search your workspace"
          description={scope}
          tone="muted"
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Search}
          title={`No results for “${q}”`}
          description="Check the spelling, or try a client name — search covers titles and client names only."
          tone="muted"
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {searchableGroups(context.canSeeMoney).map((group) => (
                <Button key={group.key} asChild variant="secondary" size="sm">
                  <Link href={group.listHref}>{group.label}</Link>
                </Button>
              ))}
            </div>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            {total} result{total === 1 ? "" : "s"} for “{q}” — {scope}
          </p>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            {groups.map((group) => {
              const hits = results?.[group.key] ?? [];
              const Icon = GROUP_ICONS[group.key];
              return (
                <SectionCard
                  key={group.key}
                  icon={Icon}
                  title={group.label}
                  tone="accent"
                  actions={
                    <Badge variant="secondary">
                      {hits.length === SEARCH_GROUP_LIMIT
                        ? `${SEARCH_GROUP_LIMIT}+`
                        : hits.length}
                    </Badge>
                  }
                  bodyClassName="p-2"
                >
                  <ul className="space-y-0.5">
                    {hits.map((hit) => (
                      <HitLink
                        key={hit.id}
                        hit={hit}
                        href={group.detailHref(hit.id)}
                        q={q}
                      />
                    ))}
                  </ul>
                  <div className="mt-1 border-t border-border">
                    <Link
                      href={group.listHref}
                      className="search-more min-h-11"
                    >
                      View all {group.label.toLowerCase()} →
                    </Link>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
