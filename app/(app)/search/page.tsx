/**
 * /search — global workspace search: the topbar box, wired. One plain
 * GET form (topbar or the refine box here) → server-rendered grouped
 * results across the operational entities, newest first, six per group.
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
            className="rounded-[2px] bg-accent/15 px-0.5 text-text"
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
      <Link
        href={href}
        className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-muted"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            <Highlighted text={hit.title} q={q} />
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <Highlighted text={hit.clientName} q={q} />
            {hit.clientName ? " · " : ""}
            {statusLabel(hit.status)} · {timeAgo(hit.updatedAt)}
          </p>
        </div>
        {hit.code && <Badge variant="secondary">{hit.code}</Badge>}
      </Link>
    </li>
  );
}

/** The centered empty/prompt card (icon-chip pattern, Step 33). */
function MessageCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="icon-chip icon-chip-muted h-10 w-10">
          <Search className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="font-medium">{title}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {children}
      </CardContent>
    </Card>
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{scope}</p>
      </div>

      {/* Refine box — the same plain GET form as the topbar, seeded with
          the current query. Works without JavaScript. */}
      <form action="/search" role="search" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <label htmlFor="search-refine" className="sr-only">
            Search your workspace
          </label>
          <Input
            id="search-refine"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search title or client…"
            autoFocus={!q}
            className="h-11 w-full rounded-full border-transparent bg-muted pl-10 shadow-none"
          />
        </div>
        <Button type="submit" className="h-11 rounded-full px-5">
          Search
        </Button>
      </form>

      {!q || !context ? (
        // No usable query: a prompt, not an error — two characters is the
        // floor (SEARCH_MIN_CHARS).
        <MessageCard
          title="Search your workspace"
          hint="Type at least two characters — a project title or a client name — then press Enter."
        />
      ) : total === 0 ? (
        <MessageCard
          title={`No results for “${q}”`}
          hint="Check the spelling, or try a client name — search covers titles and client names only."
        >
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {searchableGroups(context.canSeeMoney).map((group) => (
              <Button key={group.key} asChild variant="secondary" size="sm">
                <Link href={group.listHref}>{group.label}</Link>
              </Button>
            ))}
          </div>
        </MessageCard>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground" role="status">
            {total} result{total === 1 ? "" : "s"} for “{q}”
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.map((group) => {
              const hits = results?.[group.key] ?? [];
              const Icon = GROUP_ICONS[group.key];
              return (
                <Card key={group.key} className="animate-rise-in">
                  <CardHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border px-5 py-3.5">
                    <span className="icon-chip icon-chip-muted h-8 w-8">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <Badge variant="secondary" className="ml-auto">
                      {hits.length === SEARCH_GROUP_LIMIT
                        ? `${SEARCH_GROUP_LIMIT}+`
                        : hits.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-2">
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
                        className="flex min-h-11 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-text"
                      >
                        View all {group.label.toLowerCase()} →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
