import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { INTEGRATION_CARDS } from "../../app/(marketing)/home/content.ts";

const SOURCE = readFileSync(
  new URL("../../components/marketing/landing/IntegrationsSection.tsx", import.meta.url),
  "utf8",
);

const CARD_LINK = SOURCE.match(
  /<Link\s+href="\/integrations"([\s\S]*?)>([\s\S]*?)<\/Link>/,
);

describe("homepage integration card accessible link names", () => {
  it("derives each link name from its visible card content, without an overriding label", () => {
    assert.ok(CARD_LINK, "integration cards render as links to /integrations");
    assert.match(SOURCE, /INTEGRATION_CARDS\.map\(\(item,\s*index\)\s*=>/);
    const attributes = CARD_LINK[1] ?? "";
    const children = CARD_LINK[2] ?? "";

    // aria-label / aria-labelledby would replace the link's descendant text
    // in its computed accessible name. Keep the full visible card content as
    // the native link name so every visible label remains announced.
    assert.doesNotMatch(attributes, /\baria-label(?:ledby)?\s*=/);
    assert.match(children, /\{item\.kind\}/, "the visible category is inside the link");
    assert.match(children, /<h3[\s\S]*?\{item\.name\}[\s\S]*?<\/h3>/, "the visible card title is inside the link");
    assert.match(children, /\{item\.copy\}/, "the visible description is inside the link");
    assert.match(children, /<Icon[\s\S]*?aria-hidden="true"/, "decorative icon stays out of the computed name");
  });

  it("keeps visible category/title/description text for all six integration cards", () => {
    assert.equal(INTEGRATION_CARDS.length, 6);
    for (const card of INTEGRATION_CARDS) {
      assert.ok(card.kind.trim(), `${card.name} has a visible category`);
      assert.ok(card.name.trim(), "each card has a visible title");
      assert.ok(card.copy.trim(), `${card.name} has a visible description`);
    }
  });
});
