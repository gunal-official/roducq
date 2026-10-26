"use client";

import { useMemo, useRef, useState } from "react";

import {
  FileDown,
  FileText,
  FileUp,
  Hash,
  Inbox,
  Link2,
  Search,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import {
  CATALOG,
  CATEGORIES,
  INTEGRATIONS,
  type IntegrationEntry,
  type IntegrationIcon,
} from "@/app/(marketing)/integrations/content";

/**
 * The catalog — search, category filters and the card grid.
 *
 * MEASURED GEOMETRY (docs/FORMA_INTEGRATIONS_REFERENCE.md §4):
 *
 *   search field   340 x 48, white, 10px radius, 13px magnifier inset
 *   input          15px, placeholder "Search integrations"
 *   chip row       flex, gap 6px, wraps, 39.7px tall per chip
 *   chip           999px radius, padding 9px 16px, 14px label
 *   active chip    #1b1426 fill, white label (the reference's dark pill)
 *   idle chip      #ffffff fill, ink label
 *   count line     13.5px, padding-top 18px
 *   grid           3 cols at >= 1200, 2 at >= 1024, 1 below; gap 14px
 *   card           14px radius, padding 25 / 19 / 18px by width
 *   card hover     background -> #f9f7fc (--lm-canvas), INSTANT (0s)
 *   empty state    a heading, a sentence and one action
 *
 * WHY THIS IS A CLIENT COMPONENT AND STILL NO-JS SAFE. Filtering needs state,
 * but nothing here fetches: the initial render is `category = "all"`,
 * `query = ""`, so the server HTML contains all seven cards with their full
 * copy. Without JavaScript the page is complete and readable; only the two
 * controls stop responding, and they are honest buttons rather than links, so
 * nothing breaks.
 *
 * A DELIBERATE DEVIATION, APPROVED AT THE CONTENT GATE. The reference's chips
 * look like filters and filter nothing — the capture clicked all five and the
 * grid never changed (reference §4.4). Dead controls are the one thing the
 * brief ruled out, so these chips work. The visuals are the reference's: same
 * dark active pill, same white idle pill, same 999px radius and 14px label.
 * The semantics are a toggle-button group with `aria-pressed`, which is the
 * accessible pattern for "a set of mutually exclusive filters" that does not
 * claim to be a tablist.
 *
 * NOTHING HERE IS A CONNECT BUTTON. Cards are inert: no `button`, no `a`, no
 * hand cursor — matching the measured reference, where a card click changes
 * nothing (no navigation, no dialog). The reference's decorative ↗ arrow is
 * omitted rather than reproduced, because an arrow on an inert surface is a
 * promise the page cannot keep (approved at the content gate).
 *
 * REDUCED MOTION. There is no entrance animation in this band — measured: no
 * WAAPI entry targets a card or any node inside the catalog — so there is
 * nothing to suppress. The only motion is the hover tint, which is a colour
 * change and remains under `prefers-reduced-motion`.
 */

const ICONS: Record<IntegrationIcon, LucideIcon> = {
  chat: Hash,
  docs: FileText,
  mail: Inbox,
  webhook: Webhook,
  pdf: FileDown,
  file: FileUp,
  share: Link2,
};

/** The status chip's tone, as complete literal Tailwind strings. */
const STATUS_CLASS: Record<IntegrationEntry["status"], string> = {
  "read-only": "bg-lm-mint text-lm-success",
  native: "bg-lm-surface-accent text-lm-ink-accent",
};

const STATUS_LABEL: Record<IntegrationEntry["status"], string> = {
  "read-only": "Read-only",
  native: "Native",
};

function matches(entry: IntegrationEntry, category: string, query: string) {
  if (category !== "all" && entry.category !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const categoryLabel =
    CATEGORIES.find((c) => c.id === entry.category)?.label.toLowerCase() ?? "";
  return (
    entry.name.toLowerCase().includes(q) ||
    entry.copy.toLowerCase().includes(q) ||
    categoryLabel.includes(q) ||
    STATUS_LABEL[entry.status].toLowerCase().includes(q)
  );
}

export function IntegrationsCatalog() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const visible = useMemo(
    () => INTEGRATIONS.filter((entry) => matches(entry, category, query)),
    [category, query],
  );
  const total = INTEGRATIONS.length;
  const external = INTEGRATIONS.filter((entry) => entry.kind === "external").length;
  const native = INTEGRATIONS.filter((entry) => entry.kind === "native").length;
  const filtering = category !== "all" || query.trim().length > 0;
  const activeCategory = CATEGORIES.find((c) => c.id === category)?.label ?? "All";

  function clear() {
    setCategory("all");
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <section
      id="catalog"
      aria-labelledby="catalog-heading"
      className="scroll-mt-20 bg-lm-card pb-5"
    >
      <div className="lm-shell">
        {/* The band's own label is visually hidden: the reference's catalog
            has no visible heading, and its H1 already names the page. */}
        <h2 id="catalog-heading" className="sr-only">
          Integrations catalog
        </h2>

        <div className="flex flex-col gap-3.5">
          {/* Search. A visible placeholder is not a label, so the input keeps
              a real (hidden) one and a role="search" wrapper. */}
          <div role="search" className="w-full max-w-[340px]">
            <label htmlFor="integration-search" className="sr-only">
              {CATALOG.searchLabel}
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-lm-button border border-lm-border-soft bg-lm-card px-4 transition-colors duration-200 focus-within:border-lm-border-strong">
              <Search
                className="h-[13px] w-[13px] shrink-0 text-lm-muted-slate"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id="integration-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.preventDefault();
                    setQuery("");
                  }
                }}
                placeholder={CATALOG.searchPlaceholder}
                autoComplete="off"
                className="h-full w-full min-w-0 bg-transparent text-lm-15 text-lm-ink placeholder:text-lm-muted-slate focus:outline-none"
              />
            </div>
          </div>

          {/* Category filters. A toggle group, not a tablist: every chip is
              independently pressable and `aria-pressed` carries the state. */}
          <div
            role="group"
            aria-label={CATALOG.filterLabel}
            className="flex flex-wrap items-center gap-1.5"
          >
            {CATEGORIES.map((chip) => {
              const active = chip.id === category;
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(chip.id)}
                  className={[
                    "inline-flex min-h-11 items-center rounded-lm-pill px-4 py-[9px] text-lm-14 transition-colors duration-200",
                    active
                      ? "bg-lm-ink text-lm-on-accent"
                      : "bg-lm-card text-lm-ink hover:bg-lm-surface-accent",
                  ].join(" ")}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* The count. Derived from the data every render — the reference
              hardcodes "12 integrations", and a hardcoded count is exactly
              how an integrations page starts lying. */}
          {/* `data-catalog-count` is read by
              scripts/verify-integrations-page.mjs, which asserts after every
              chip press and every search term that the number shown and the
              number of cards rendered are the same number. */}
          <p data-catalog-count="" className="pt-[18px] text-lm-13-5 text-lm-ink">
            {filtering
              ? `${visible.length} of ${total} shown · ${activeCategory}`
              : `${total} integrations · ${external} external, ${native} native`}
          </p>

          {/* Announced on every change; the visible count above is the same
              fact for sighted users. */}
          <p aria-live="polite" className="sr-only">
            {visible.length === 0
              ? CATALOG.empty.title
              : `${visible.length} integration${visible.length === 1 ? "" : "s"} shown`}
          </p>

          {visible.length > 0 ? (
            <ul className="mt-3.5 grid list-none grid-cols-1 gap-3.5 min-[1024px]:grid-cols-2 min-[1200px]:grid-cols-3">
              {visible.map((entry) => {
                const Icon = ICONS[entry.icon];
                const categoryLabel =
                  CATEGORIES.find((c) => c.id === entry.category)?.label ?? "";
                return (
                  <li
                    key={entry.name}
                    className="flex flex-col rounded-lm-card bg-lm-card p-[18px] hover:bg-lm-canvas min-[1024px]:p-[19px] min-[1200px]:p-6.25"
                  >
                    <div className="flex items-start gap-4">
                      {/* 42px tile, 8px radius, white on the card. */}
                      <span
                        aria-hidden="true"
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lm-row bg-lm-card"
                      >
                        <Icon className="h-[21px] w-[21px] text-lm-muted-slate" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lm-17 font-lm-semibold tracking-[-0.02em] text-lm-ink">
                          {entry.name}
                        </h3>
                        <p className="mt-[4.5px] text-lm-15 leading-[1.6] text-lm-muted-slate">
                          {entry.copy}
                        </p>
                      </div>
                    </div>

                    {/* The meta row. MEASURED: a 1px dashed rule, then a
                        13px inset, a 12px category label and a 21px chip. */}
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-lm-border-soft pt-[13px]">
                      <span className="text-lm-12 text-lm-muted-slate">
                        {categoryLabel}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-lm-pill px-2 py-0.5 text-lm-chip font-lm-semibold ${STATUS_CLASS[entry.status]}`}
                      >
                        {STATUS_LABEL[entry.status]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3.5 rounded-lm-card bg-lm-canvas-alt px-6 py-10 text-center">
              <p className="text-lm-17 font-lm-semibold text-lm-ink">
                {CATALOG.empty.title}
              </p>
              <p className="mx-auto mt-2 max-w-[420px] text-lm-15 text-lm-muted-slate">
                {CATALOG.empty.body}
              </p>
              <button
                type="button"
                onClick={clear}
                className="mt-5 inline-flex min-h-11 items-center rounded-lm-button bg-lm-accent px-4 text-lm-14 font-lm-semibold text-lm-on-accent transition-colors hover:bg-lm-accent-strong"
              >
                {CATALOG.empty.action}
              </button>
            </div>
          )}

          <p className="mt-2 max-w-[640px] text-lm-14 text-lm-muted-slate">
            {CATALOG.note}
          </p>
        </div>
      </div>
    </section>
  );
}
