/**
 * /changelog — source, content, truthfulness, and git-provenance tests.
 *
 * Mirrors the offline Node test architecture of solutions-page.test.ts,
 * features-page.test.ts, and integrations-page.test.ts: real module imports
 * + source inspection, zero external test dependencies.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CHANGELOG_BADGE_LABELS,
  CHANGELOG_CHECKLIST,
  CHANGELOG_CLOSING,
  CHANGELOG_ENTRIES,
  CHANGELOG_FILTERS,
  CHANGELOG_HERO,
  MOCK_DISCLOSURE,
  filterChangelogEntries,
} from "../../app/(marketing)/changelog/content.ts";
import { SECTION_NAV as SOLUTIONS_SECTION_NAV } from "../../app/(marketing)/solutions/content.ts";
import { FOOTER } from "../../app/(marketing)/home/content.ts";
import { NAV_ITEMS } from "../../components/app-shell/nav-items.ts";
import { SEARCH_GROUPS } from "../../lib/search.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/changelog/page.tsx");
const CONTENT = read("app/(marketing)/changelog/content.ts");
const HERO_TSX = read(
  "components/marketing/landing/changelog/ChangelogHero.tsx",
);
const FEED_TSX = read(
  "components/marketing/landing/changelog/ChangelogFeed.tsx",
);
const CLOSING_TSX = read(
  "components/marketing/landing/changelog/ChangelogClosingCta.tsx",
);
const HEADER = read("components/marketing/SiteHeader.tsx");
const SITEMAP = read("app/sitemap.ts");
const CSS = read("app/(marketing)/landing.css");
const TAILWIND = read("tailwind.config.ts");
const HARNESS = read("scripts/verify-responsive.mjs");

const CHANGELOG_SOURCES: [string, string][] = [
  ["app/(marketing)/changelog/page.tsx", PAGE],
  ["app/(marketing)/changelog/content.ts", CONTENT],
  ["components/marketing/landing/changelog/ChangelogHero.tsx", HERO_TSX],
  ["components/marketing/landing/changelog/ChangelogFeed.tsx", FEED_TSX],
  ["components/marketing/landing/changelog/ChangelogClosingCta.tsx", CLOSING_TSX],
];

function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object")
    for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}

const PUBLIC_COPY = collectStrings([
  CHANGELOG_HERO,
  CHANGELOG_FILTERS,
  CHANGELOG_BADGE_LABELS,
  CHANGELOG_ENTRIES.map(
    ({ date, sourceLabel, badges, title, summary, bullets }) => ({
      date,
      sourceLabel,
      badges,
      title,
      summary,
      bullets,
    }),
  ),
  CHANGELOG_CLOSING,
  CHANGELOG_CHECKLIST,
  MOCK_DISCLOSURE,
]);

describe("Changelog page — route, metadata, and section composition", () => {
  it("renders Hero -> Feed -> ClosingCta inside the shared marketing layout", () => {
    assert.doesNotMatch(codeOnly(PAGE), /SiteHeader|SiteFooter/);
    assert.doesNotMatch(codeOnly(PAGE), /id="top"/, "layout.tsx already owns #top");
    const heroIdx = PAGE.indexOf("<ChangelogHero");
    const feedIdx = PAGE.indexOf("<ChangelogFeed");
    const ctaIdx = PAGE.indexOf("<ChangelogClosingCta");
    assert.ok(heroIdx > 0 && feedIdx > heroIdx && ctaIdx > feedIdx);
  });

  it("declares complete canonical, Open Graph, and Twitter metadata", () => {
    assert.match(PAGE, /title:\s*"Changelog — roducq"/);
    assert.match(PAGE, /canonical:\s*"\/changelog"/);
    assert.match(PAGE, /images:\s*\[SOCIAL_IMAGE\]/);
    assert.match(PAGE, /images:\s*\[TWITTER_IMAGE\]/);
    assert.doesNotMatch(PAGE, /https?:\/\/roducq/i);
  });
});

describe("Changelog page — hero geometry and LCP safety", () => {
  it("uses the approved hero copy and three-step responsive type scale", () => {
    assert.equal(CHANGELOG_HERO.eyebrow, "Changelog");
    assert.equal(CHANGELOG_HERO.titleBefore, "What's new");
    assert.equal(CHANGELOG_HERO.titleAfter, "in roducq");
    assert.equal(
      CHANGELOG_HERO.intro,
      "Verified product updates, interface improvements, and fixes shipped to roducq, most recent first.",
    );
    assert.match(HERO_TSX, /text-lm-44/);
    assert.match(HERO_TSX, /min-\[1024px\]:text-lm-45-4/);
    assert.match(HERO_TSX, /min-\[1200px\]:text-lm-67/);
    assert.match(HERO_TSX, /lm-hero-accent-inline lm-text-gradient/);
  });

  it("never initializes hero words at opacity 0 and disables hero motion under prefers-reduced-motion", () => {
    assert.doesNotMatch(codeOnly(HERO_TSX), /opacity:\s*0|opacity-0/);
    assert.match(CSS, /\.lm-hero-accent-inline\s*\{/);
    assert.match(
      CSS,
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.lm-hero-accent-inline[\s\S]*?animation:\s*none/,
    );
  });
});

describe("Changelog page — verified release entries and git provenance", () => {
  it("publishes exactly the 8 approved VERIFIED RELEASED entries in newest-first order", () => {
    assert.equal(CHANGELOG_ENTRIES.length, 8);
    for (let i = 0; i < CHANGELOG_ENTRIES.length; i++) {
      const entry = CHANGELOG_ENTRIES[i];
      assert.equal(entry.classification, "VERIFIED RELEASED");
      assert.match(entry.isoDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(
        entry.sourceHref,
        /^https:\/\/github\.com\/gunal-official\/roducq\/pull\/\d+$/,
      );
      assert.ok(entry.deploymentId > 0, `${entry.id}: missing deploymentId`);
      if (i > 0) {
        assert.ok(
          CHANGELOG_ENTRIES[i - 1].isoDate >= entry.isoDate,
          `entries out of reverse-chronological order at ${entry.id}`,
        );
      }
    }
  });

  it("every entry points to real repo files/symbols and a real commit in git history", () => {
    const isShallow =
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        cwd: ROOT,
        encoding: "utf8",
      }).trim() === "true";

    for (const entry of CHANGELOG_ENTRIES) {
      assert.ok(entry.evidence.length >= 1, `${entry.id}: requires evidence`);
      for (const item of entry.evidence) {
        const target = new URL(`../../${item.file}`, import.meta.url);
        assert.ok(existsSync(target), `${entry.id}: missing file ${item.file}`);
        const text = readFileSync(target, "utf8");
        assert.ok(
          text.includes(item.symbol),
          `${entry.id}: symbol "${item.symbol}" missing in ${item.file}`,
        );
      }

      assert.match(entry.commitSha, /^[0-9a-f]{7,40}$/);
      if (!isShallow) {
        const kind = execFileSync(
          "git",
          ["cat-file", "-t", entry.commitSha],
          { cwd: ROOT, encoding: "utf8" },
        ).trim();
        assert.equal(
          kind,
          "commit",
          `${entry.id}: invalid commit ${entry.commitSha}`,
        );
      }
    }
  });

  it("renders semantic <article>, <time>, <h2>, and accessible external PR links", () => {
    assert.match(FEED_TSX, /<article\b/);
    assert.match(FEED_TSX, /<time\s+dateTime=\{entry\.isoDate\}/);
    assert.match(FEED_TSX, /<h2\s+id=\{`\$\{entry\.id\}-heading`\}/);
    assert.match(FEED_TSX, /target="_blank"/);
    assert.match(FEED_TSX, /rel="noopener noreferrer"/);
    assert.match(FEED_TSX, /min-\[1200px\]:sticky/);
    assert.match(FEED_TSX, /min-\[1200px\]:top-27\.5/);
    assert.match(FEED_TSX, /min-\[1200px\]:w-52\.5/);
  });
});

describe("Changelog page — functional category filtering", () => {
  it("exposes All updates, New, Improved, and Fixed filters with exact badge subsets", () => {
    assert.deepEqual(
      CHANGELOG_FILTERS.map((f) => [f.id, f.label]),
      [
        ["all", "All updates"],
        ["new", "New"],
        ["improved", "Improved"],
        ["fixed", "Fixed"],
      ],
    );
    assert.equal(filterChangelogEntries(CHANGELOG_ENTRIES, "all").length, 8);
    assert.equal(filterChangelogEntries(CHANGELOG_ENTRIES, "new").length, 7);
    assert.equal(
      filterChangelogEntries(CHANGELOG_ENTRIES, "improved").length,
      3,
    );
    assert.equal(filterChangelogEntries(CHANGELOG_ENTRIES, "fixed").length, 2);
    for (const kind of ["new", "improved", "fixed"] as const) {
      const subset = filterChangelogEntries(CHANGELOG_ENTRIES, kind);
      assert.ok(subset.every((entry) => entry.badges.includes(kind)));
    }
  });

  it("uses aria-pressed buttons with >=44px touch targets, aria-live announcements, and zero filter animations", () => {
    assert.match(FEED_TSX, /role="group"/);
    assert.match(FEED_TSX, /aria-pressed=\{active\}/);
    assert.match(FEED_TSX, /min-h-11 min-w-11/);
    assert.match(FEED_TSX, /aria-live="polite"/);
    assert.doesNotMatch(FEED_TSX, /framer-motion|motion\/react|AnimatePresence/);
  });
});

describe("Changelog page — truthfulness & content corrections", () => {
  it("contains zero Forma brand references, fabricated version numbers, or testimonials", () => {
    const joined = PUBLIC_COPY.join("\n");
    assert.doesNotMatch(joined, /\bforma\b/i);
    assert.doesNotMatch(PAGE, /\bforma\b/i);
    assert.doesNotMatch(joined, /\bVersion\s+\d/i);
    assert.doesNotMatch(joined, /\bv\d+\.\d+\b/i);
    assert.doesNotMatch(
      joined,
      /\b(Sprint|Kanban|Gantt|Burndown|Slack|Jira|Asana|Trello)\b/i,
    );
  });

  it("Correction 1: Entry 3 (/solutions) uses exact practice labels from solutions/content.ts", () => {
    const solutionsEntry = CHANGELOG_ENTRIES.find(
      (e) => e.id === "solutions-by-practice",
    );
    assert.ok(solutionsEntry);
    assert.equal(
      solutionsEntry.summary,
      "Published /solutions to show how Solo practices, Design studios, Agencies, and Consultancies manage client writing and project workflows in roducq.",
    );
    for (const practice of SOLUTIONS_SECTION_NAV) {
      assert.ok(
        solutionsEntry.summary.includes(practice.label),
        `missing practice category ${practice.label}`,
      );
    }
    const text = [solutionsEntry.summary, ...solutionsEntry.bullets].join(" ");
    assert.doesNotMatch(
      text,
      /solo consultants|retainer teams|multi-lead consultancies/i,
    );
  });

  it("Corrections 2 & 3: Entries 5 and 6 use unified design system wording with real signed-in screen names", () => {
    const marketingEntry = CHANGELOG_ENTRIES.find(
      (e) => e.id === "marketing-home-and-social-cards",
    );
    const workspaceEntry = CHANGELOG_ENTRIES.find(
      (e) => e.id === "workspace-refresh-and-hardening",
    );
    assert.ok(marketingEntry && workspaceEntry);
    assert.equal(
      marketingEntry.summary,
      "Rebuilt the public landing experience with a unified visual design system, Motion.dev animations, dark-mode support, and generated Open Graph images.",
    );
    assert.equal(
      workspaceEntry.summary,
      "Extended a unified workspace design system across signed-in screens and completed security, accessibility, and performance improvements.",
    );
    for (const nav of NAV_ITEMS) {
      assert.ok(
        workspaceEntry.bullets[0].includes(nav.label),
        `workspace bullet missing real nav screen ${nav.label}`,
      );
    }
  });

  it("Correction 4: Entry 7 lists only real SEARCH_GROUPS record types and never claims tasks search", () => {
    const searchEntry = CHANGELOG_ENTRIES.find(
      (e) => e.id === "file-intake-search-and-comparisons",
    );
    assert.ok(searchEntry);
    const searchKeys = SEARCH_GROUPS.map((group) => group.key);
    assert.ok(!searchKeys.includes("tasks" as never));
    const searchBullet = searchEntry.bullets[1];
    for (const key of searchKeys) {
      assert.ok(
        searchBullet.toLowerCase().includes(key),
        `search bullet missing supported group ${key}`,
      );
    }
    assert.doesNotMatch(
      [searchEntry.title, searchEntry.summary, ...searchEntry.bullets].join(" "),
      /\btasks?\b/i,
    );
  });
});

describe("Changelog page — closing CTA, navigation, sitemap, and token hygiene", () => {
  it("wires Closing CTA to /signup and /pricing with honest checkout footnote", () => {
    assert.equal(CHANGELOG_CLOSING.primary.href, "/signup");
    assert.equal(CHANGELOG_CLOSING.secondary.href, "/pricing");
    assert.match(
      CHANGELOG_CLOSING.footnote,
      /live paid checkout is not enabled yet/,
    );
    assert.equal(CHANGELOG_CHECKLIST.length, 4);
    assert.match(CLOSING_TSX, /MOCK_DISCLOSURE/);
  });

  it("registers /changelog in SiteHeader, FOOTER, sitemap.ts, and verify-responsive.mjs without breaking locked invariants", () => {
    // The consistency pass (docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md) put
    // every marketing route on ONE header, so the old per-route `showcase`
    // booleans are gone and the locked nav ternary is gone with them.
    // tests/components/marketing-header.test.ts now owns the full contract;
    // this file keeps asserting that /changelog is one of its destinations.
    assert.ok(HEADER.includes('{ href: "/changelog", label: "Changelog" }'));
    assert.ok(HEADER.includes("const items = NAV;"));
    assert.ok(!HEADER.includes("const showcase ="));
    assert.ok(HEADER.includes('{ href: "/vs", label: "Compare" }'));
    assert.ok(
      FOOTER.columns[0].links.some(
        (link) => link.href === "/changelog" && link.label === "Changelog",
      ),
    );
    assert.ok(SITEMAP.includes('"/changelog"'));
    assert.ok(
      HARNESS.includes(
        '{ slug: "marketing-changelog", url: "/changelog", auth: false }',
      ),
    );
  });

  it("uses named landing tokens with zero raw hex/rgb literals or fixed >=100px widths in components", () => {
    for (const [name, source] of CHANGELOG_SOURCES) {
      if (name.endsWith("content.ts")) continue;
      const stripped = codeOnly(source);
      assert.doesNotMatch(
        stripped,
        /#[0-9a-fA-F]{3,8}\b|\brgba?\(/,
        `${name}: raw colour literal`,
      );
      assert.doesNotMatch(
        stripped,
        /(?<!max-)\bw-\[\d{3,}px\]/,
        `${name}: fixed >=100px arbitrary width`,
      );
    }
    assert.ok(TAILWIND.includes('"lm-28-8"'));
    assert.ok(TAILWIND.includes('"lm-24"'));
    assert.ok(TAILWIND.includes('"lm-changelog"'));
  });
});
