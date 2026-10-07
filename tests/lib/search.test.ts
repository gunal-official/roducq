/**
 * Unit tests for lib/search.ts — the pure layer of global search.
 * Built-in node:test only. Assertions lock the documented contracts of
 * each helper's doc comment (tests/lib/utils.test.ts precedent).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  buildOrFilter,
  countResults,
  escapeLikePattern,
  highlightSegments,
  normalizeSearchQuery,
  searchableGroups,
  SEARCH_GROUPS,
  SEARCH_GROUP_LIMIT,
  SEARCH_MAX_CHARS,
  SEARCH_MIN_CHARS,
  statusLabel,
} from "../../lib/search.ts";

describe("normalizeSearchQuery", () => {
  test("missing / empty / whitespace / too-short values → null", () => {
    assert.equal(normalizeSearchQuery(undefined), null);
    assert.equal(normalizeSearchQuery(null), null);
    assert.equal(normalizeSearchQuery(""), null);
    assert.equal(normalizeSearchQuery("   "), null);
    assert.equal(normalizeSearchQuery("a"), null); // below SEARCH_MIN_CHARS
    assert.equal(normalizeSearchQuery(" a "), null);
  });

  test("trims and collapses internal whitespace", () => {
    assert.equal(normalizeSearchQuery("  Brightloop   Co.  "), "Brightloop Co.");
    assert.equal(normalizeSearchQuery("a\tb\nc"), "a b c");
  });

  test("a repeated param answers with the first value — no fallback", () => {
    assert.equal(normalizeSearchQuery(["bright", "loop"]), "bright");
    // An unusable first value never falls through to later ones.
    assert.equal(normalizeSearchQuery(["", "bright"]), null);
  });

  test("caps at SEARCH_MAX_CHARS without splitting a surrogate pair", () => {
    assert.equal(SEARCH_MIN_CHARS, 2);
    // 100 'a' + a 2-code-unit emoji → the cut keeps whole code points and
    // lands exactly on the cap.
    const capped = normalizeSearchQuery("a".repeat(100) + "🙂")!;
    assert.equal([...capped].length, SEARCH_MAX_CHARS);
    assert.ok(capped.startsWith("a".repeat(100)));
    // A 150-char query is truncated, not passed through.
    const long = normalizeSearchQuery("b".repeat(150))!;
    assert.equal(long.length, SEARCH_MAX_CHARS);
  });
});

describe("escapeLikePattern", () => {
  test("escapes the Postgres LIKE wildcards and the escape char itself", () => {
    assert.equal(escapeLikePattern("100%"), "100\\%");
    assert.equal(escapeLikePattern("a_b"), "a\\_b");
    assert.equal(escapeLikePattern("back\\slash"), "back\\\\slash");
    assert.equal(escapeLikePattern("plain text"), "plain text");
  });
});

describe("buildOrFilter", () => {
  test("one quoted ilike condition per field, comma-joined", () => {
    assert.equal(
      buildOrFilter(["title", "client_name"], "Brightloop"),
      'title.ilike."%Brightloop%",client_name.ilike."%Brightloop%"'
    );
  });

  test("user input cannot break the condition grammar", () => {
    // Commas / parens are safe inside the double-quoted value.
    assert.equal(
      buildOrFilter(["title"], "Acme (East), Inc."),
      'title.ilike."%Acme (East), Inc.%"'
    );
    // A literal double quote is backslash-escaped for the transport.
    assert.equal(
      buildOrFilter(["title"], 'Acme "x"'),
      'title.ilike."%Acme \\"x\\"%"'
    );
    // LIKE wildcards in the query match themselves, not anything.
    assert.equal(
      buildOrFilter(["title"], "100%"),
      'title.ilike."%100\\%%"'
    );
    assert.equal(
      buildOrFilter(["title"], "a_b"),
      'title.ilike."%a\\_b%"'
    );
  });
});

describe("highlightSegments", () => {
  test("no text / no needle → a single plain (or empty) segment", () => {
    assert.deepEqual(highlightSegments(null, "x"), []);
    assert.deepEqual(highlightSegments(undefined, "x"), []);
    assert.deepEqual(highlightSegments("Hello", ""), [{ text: "Hello", hit: false }]);
    assert.deepEqual(highlightSegments("Hello", "   "), [{ text: "Hello", hit: false }]);
  });

  test("case-insensitive, every occurrence, matches inside words", () => {
    assert.deepEqual(highlightSegments("Brightloop bright", "bright"), [
      { text: "Bright", hit: true }, // the hit inside "Brightloop"
      { text: "loop ", hit: false },
      { text: "bright", hit: true },
    ]);
    assert.deepEqual(highlightSegments("Alpha", "zzz"), [
      { text: "Alpha", hit: false },
    ]);
  });

  test("segments always reassemble into the original text", () => {
    const text = "Relaunch proposal — Brightloop Co. relaunch";
    for (const q of ["relaunch", "BRI", "— B", "zz"]) {
      const joined = highlightSegments(text, q)
        .map((s) => s.text)
        .join("");
      assert.equal(joined, text, `q=${q}`);
    }
  });

  test("length-shifting lowercasing degrades to no highlight, never corruption", () => {
    // "İ".toLowerCase() has length 2 — the guard must bail out whole.
    assert.deepEqual(highlightSegments("İstanbul", "i"), [
      { text: "İstanbul", hit: false },
    ]);
  });
});

describe("SEARCH_GROUPS registry", () => {
  test("display order matches the app nav order", () => {
    assert.deepEqual(
      SEARCH_GROUPS.map((g) => g.key),
      ["briefs", "proposals", "plans", "updates", "invoices", "contracts"]
    );
  });

  test("group key == DB table name; hrefs are well-formed; labels unique", () => {
    const labels = new Set<string>();
    for (const group of SEARCH_GROUPS) {
      assert.match(group.key, /^[a-z_]+$/);
      assert.ok(group.listHref.startsWith(`/${group.key}`));
      const uuid = "00000000-0000-0000-0000-000000000000";
      assert.equal(group.detailHref(uuid), `/${group.key}/${uuid}`);
      assert.equal(typeof group.money, "boolean");
      labels.add(group.label);
    }
    assert.equal(labels.size, SEARCH_GROUPS.length);
  });

  test("only invoices are money — the Step 29 hide rule mirrors MONEY_HREFS", () => {
    assert.deepEqual(
      SEARCH_GROUPS.filter((g) => g.money).map((g) => g.key),
      ["invoices"]
    );
  });

  test("searchableGroups drops money groups for viewers", () => {
    const memberKeys = searchableGroups(true).map((g) => g.key);
    const viewerKeys = searchableGroups(false).map((g) => g.key);
    assert.equal(memberKeys.length, SEARCH_GROUPS.length);
    assert.deepEqual(viewerKeys, [
      "briefs",
      "proposals",
      "plans",
      "updates",
      "contracts",
    ]);
    assert.ok(!viewerKeys.includes("invoices"));
  });
});

describe("countResults / statusLabel / limits", () => {
  test("countResults sums across groups and tolerates missing ones", () => {
    assert.equal(countResults({}), 0);
    assert.equal(
      countResults({ briefs: [{ id: "1" } as never], plans: [] }),
      1
    );
    assert.equal(
      countResults({
        briefs: [
          { id: "1" } as never,
          { id: "2" } as never,
        ],
        invoices: [{ id: "3" } as never],
      }),
      3
    );
  });

  test("statusLabel turns snake_case statuses into badge copy", () => {
    assert.equal(statusLabel("not_started"), "not started");
    assert.equal(statusLabel("in_progress"), "in progress");
    assert.equal(statusLabel("draft"), "draft");
  });

  test("the limits are the documented values", () => {
    assert.equal(SEARCH_MIN_CHARS, 2);
    assert.equal(SEARCH_MAX_CHARS, 100);
    assert.equal(SEARCH_GROUP_LIMIT, 6);
  });
});
