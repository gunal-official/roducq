import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  VS_LIMITATION_NOTE,
  VS_PAGE_LIST,
  VS_PAGES,
} from "../../app/(marketing)/vs/[slug]/vs-pages.ts";

// Structural tests (built-in node:test — zero test deps) for the /vs comparisons
// hub: the content map, the detail + hub pages, the shared header/footer links,
// and the responsive-audit route list. Source-level checks, like nav.test.ts.
const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const EXPECTED_SLUGS = [
  "notion",
  "bonsai",
  "honeybook",
  "dubsado",
  "17hats",
  "freshbooks",
  "clickup",
  "basecamp",
  "pandadoc",
];

describe("/vs content map", () => {
  it("carries exactly the nine comparison slugs", () => {
    assert.deepEqual(Object.keys(VS_PAGES).sort(), [...EXPECTED_SLUGS].sort());
    assert.equal(VS_PAGE_LIST.length, EXPECTED_SLUGS.length);
  });

  it("every entry's slug matches its key and every field is filled", () => {
    for (const [key, entry] of Object.entries(VS_PAGES)) {
      assert.equal(entry.slug, key, `slug mismatch for ${key}`);
      assert.ok(entry.competitor.trim(), `${key}: competitor`);
      assert.ok(entry.summary.trim(), `${key}: summary`);
      assert.ok(entry.heading.startsWith("roducq vs "), `${key}: heading`);
      assert.ok(entry.intro.trim(), `${key}: intro`);
      assert.ok(entry.takeaway.trim(), `${key}: takeaway`);
      assert.ok(entry.rows.length >= 4, `${key}: needs at least four comparison rows`);
      for (const row of entry.rows) {
        assert.ok(row.feature.trim(), `${key}: row feature`);
        assert.ok(row.roducq.trim(), `${key}: roducq cell for ${row.feature}`);
        assert.ok(row.competitor.trim(), `${key}: competitor cell for ${row.feature}`);
      }
    }
  });

  it("hub list is alphabetical by competitor and covers every entry once", () => {
    const names = VS_PAGE_LIST.map((e) => e.competitor);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
    assert.equal(new Set(VS_PAGE_LIST.map((e) => e.slug)).size, VS_PAGE_LIST.length);
  });

  it("content stays product-shape: no price figures in comparison cells", () => {
    for (const entry of Object.values(VS_PAGES)) {
      for (const row of entry.rows) {
        for (const cell of [row.roducq, row.competitor]) {
          assert.doesNotMatch(cell, /\$\s?\d/, `${entry.slug}: price figure in "${cell}"`);
        }
      }
    }
  });

  it("limitation note is non-empty and says the comparison may be out of date", () => {
    assert.ok(VS_LIMITATION_NOTE.length > 100);
    assert.match(VS_LIMITATION_NOTE, /October 2026/);
    assert.match(VS_LIMITATION_NOTE, /not exhaustive/);
  });
});

describe("/vs pages (source contract)", () => {
  it("detail page: 404s unknown slugs, links back to /vs, shows the limitation note", () => {
    const src = read("app/(marketing)/vs/[slug]/page.tsx");
    assert.match(src, /export const dynamicParams = false/);
    assert.match(src, /if \(!entry\) notFound\(\)/);
    assert.match(src, /href="\/vs"/);
    assert.match(src, /All comparisons/);
    assert.match(src, /VS_LIMITATION_NOTE/);
  });

  it("hub page: exists at /vs, renders every entry as a link to /vs/<slug>, shows the note", () => {
    const src = read("app/(marketing)/vs/page.tsx");
    assert.match(src, /VS_PAGE_LIST/);
    assert.match(src, /href=\{`\/vs\/\$\{entry\.slug\}`\}/);
    assert.match(src, /VS_LIMITATION_NOTE/);
    assert.match(src, /export const metadata/);
  });

  it("header and footer both link to /vs", () => {
    assert.match(read("components/marketing/SiteHeader.tsx"), /href="\/vs"/);
    assert.match(read("components/marketing/SiteFooter.tsx"), /href="\/vs"/);
  });

  it("responsive harness sweeps /vs and every /vs/<slug>", () => {
    const src = read("scripts/verify-responsive.mjs");
    assert.ok(src.includes('url: "/vs",'));
    for (const slug of EXPECTED_SLUGS) {
      assert.ok(src.includes(`url: "/vs/${slug}"`), `harness missing /vs/${slug}`);
    }
  });
});
