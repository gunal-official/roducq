/**
 * Unit tests for lib/integrations/sync.ts (Slack + Notion import + dedupe).
 * Run with: npm test
 *
 * Provider fixtures normalized to the one ImportedItem shape, request
 * shape (URL + bearer + Notion-Version), in-batch dedupe, the 25-item
 * cap, and failure semantics (401 / invalid_auth → IntegrationAuthError
 * so callers mark the connection needs_reauth; missing_scope → plain
 * Error with a reconnect hint).
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { NOTION_VERSION } from "../../lib/integrations/oauth.ts";
import {
  IntegrationAuthError,
  MAX_IMPORT_ITEMS,
  dedupeImportedItems,
  fetchImportedItems,
  normalizeNotionPage,
  normalizeSlackMessage,
  notionBlocksToText,
  notionPageTitle,
  slackExternalId,
  slackTsToIso,
  type ImportedItem,
} from "../../lib/integrations/sync.ts";

type FakeResult = { status: number; body?: unknown };
function fakeFetch(handler: (url: string, init?: RequestInit) => FakeResult) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = handler(url, init);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { f, calls };
}

function item(partial: Partial<ImportedItem> & { externalId: string }): ImportedItem {
  return {
    provider: "slack",
    title: partial.externalId,
    author: "Ada",
    snippet: null,
    bodyText: null,
    permalink: null,
    occurredAt: "2026-10-09T00:00:00.000Z",
    metadata: {},
    ...partial,
  };
}

describe("dedupeImportedItems", () => {
  test("drops empty ids and keeps the first of each externalId", () => {
    const out = dedupeImportedItems([
      item({ externalId: "C1:1.0", title: "first" }),
      item({ externalId: "C1:1.0", title: "duplicate" }),
      item({ externalId: "  ", title: "blank" }),
      item({ externalId: "C1:2.0", title: "second" }),
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0].title, "first");
    assert.equal(out[1].title, "second");
  });
});

describe("slack helpers", () => {
  test("slackTsToIso converts seconds.ts to ISO; invalid → epoch", () => {
    assert.equal(slackTsToIso("1712345678.000100"), new Date(1712345678.0001 * 1000).toISOString());
    assert.equal(slackTsToIso("nope"), new Date(0).toISOString());
    assert.equal(slackTsToIso(""), new Date(0).toISOString());
  });

  test("slackExternalId is channel:ts (the DB unique key half)", () => {
    assert.equal(slackExternalId("C09ABC", "1712345678.000100"), "C09ABC:1712345678.000100");
  });

  test("normalizeSlackMessage skips joins / empty text and resolves user names", () => {
    const users = new Map([["U1", "Ada Client"]]);
    const join = normalizeSlackMessage({
      channelId: "C1",
      channelName: "general",
      message: { ts: "1.0", subtype: "channel_join", user: "U1", text: "<@U1> joined" },
      users,
    });
    assert.equal(join, null);

    const empty = normalizeSlackMessage({
      channelId: "C1",
      channelName: "general",
      message: { ts: "1.1", user: "U1", text: "  " },
      users,
    });
    assert.equal(empty, null);

    const ok = normalizeSlackMessage({
      channelId: "C1",
      channelName: "general",
      message: {
        ts: "1712345678.000100",
        user: "U1",
        text: "Kickoff notes for the rebrand\nBudget is 5k.",
      },
      users,
    });
    assert.ok(ok);
    assert.equal(ok.externalId, "C1:1712345678.000100");
    assert.equal(ok.provider, "slack");
    assert.equal(ok.author, "Ada Client");
    assert.equal(ok.title, "Kickoff notes for the rebrand");
    assert.equal(ok.bodyText, "Kickoff notes for the rebrand\nBudget is 5k.");
    assert.equal(ok.metadata.channel_id, "C1");
  });
});

describe("notion helpers", () => {
  test("notionPageTitle reads the title property, else Untitled", () => {
    assert.equal(
      notionPageTitle({
        properties: {
          Name: { type: "title", title: [{ plain_text: "Client wiki" }] },
        },
      }),
      "Client wiki"
    );
    assert.equal(notionPageTitle({ properties: {} }), "Untitled");
  });

  test("notionBlocksToText flattens headings, lists, todos, quotes", () => {
    const text = notionBlocksToText([
      { type: "heading_1", heading_1: { rich_text: [{ plain_text: "Scope" }] } },
      { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Do the " }, { plain_text: "thing." }] } },
      { type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ plain_text: "Logo" }] } },
      { type: "to_do", to_do: { rich_text: [{ plain_text: "Invoice" }], checked: true } },
      { type: "quote", quote: { rich_text: [{ plain_text: "Ship Friday" }] } },
      { type: "image" },
    ]);
    assert.equal(text, "# Scope\nDo the thing.\n- Logo\n[x] Invoice\nShip Friday");
  });

  test("normalizeNotionPage uses last_edited_time + url", () => {
    const item = normalizeNotionPage({
      page: {
        id: "page-1",
        url: "https://www.notion.so/page-1",
        last_edited_time: "2026-10-09T12:00:00.000Z",
        properties: { title: { type: "title", title: [{ plain_text: "Brief notes" }] } },
      },
      bodyText: "Hello from Notion.",
    });
    assert.equal(item.externalId, "page-1");
    assert.equal(item.provider, "notion");
    assert.equal(item.title, "Brief notes");
    assert.equal(item.bodyText, "Hello from Notion.");
    assert.equal(item.permalink, "https://www.notion.so/page-1");
    assert.equal(item.occurredAt, "2026-10-09T12:00:00.000Z");
  });
});

describe("Slack fetchImportedItems", () => {
  test("lists conversations, pulls history, resolves names, newest-first cap", async () => {
    const { f, calls } = fakeFetch((url) => {
      if (url.startsWith("https://slack.com/api/users.list")) {
        return {
          status: 200,
          body: { ok: true, members: [{ id: "U1", profile: { real_name: "Ada Client" } }] },
        };
      }
      if (url.startsWith("https://slack.com/api/conversations.list")) {
        return {
          status: 200,
          body: {
            ok: true,
            channels: [
              { id: "C1", name: "general" },
              { id: "C2", name: "client" },
            ],
          },
        };
      }
      if (url.includes("conversations.history") && url.includes("channel=C1")) {
        return {
          status: 200,
          body: {
            ok: true,
            messages: [
              { type: "message", user: "U1", ts: "1712345678.000200", text: "Newer kickoff" },
              { type: "message", subtype: "channel_join", user: "U1", ts: "1712345678.000050", text: "joined" },
            ],
          },
        };
      }
      if (url.includes("conversations.history") && url.includes("channel=C2")) {
        return {
          status: 200,
          body: {
            ok: true,
            messages: [
              { type: "message", user: "U1", ts: "1712345678.000100", text: "Older notes" },
              { type: "message", user: "U1", ts: "1712345678.000200", text: "Newer kickoff" },
            ],
          },
        };
      }
      return { status: 500, body: { ok: false, error: "unexpected" } };
    });

    const items = await fetchImportedItems({
      provider: "slack",
      accessToken: "xoxb-bot",
      fetchImpl: f,
    });

    assert.ok(calls[0].url.startsWith("https://slack.com/api/users.list"));
    assert.equal(
      (calls[0].init?.headers as Record<string, string>)?.authorization,
      "Bearer xoxb-bot"
    );
    const listCall = calls.find((c) => c.url.startsWith("https://slack.com/api/conversations.list"));
    assert.ok(listCall);
    assert.match(listCall.url, /types=/);
    assert.match(listCall.url, /exclude_archived=true/);

    // Same text in two channels is two ids (channel:ts); join is skipped;
    // C2's duplicate ts 000200 is a different channel so it stays until
    // in-batch dedupe by externalId (C1:… vs C2:…). Newest first.
    assert.ok(items.length >= 2);
    assert.equal(items[0].occurredAt >= items[items.length - 1].occurredAt, true);
    assert.ok(items.every((i) => i.provider === "slack"));
    assert.ok(items.some((i) => i.author === "Ada Client"));
    assert.ok(items.every((i) => i.externalId.includes(":")));
    const ids = items.map((i) => i.externalId);
    assert.equal(new Set(ids).size, ids.length);
  });

  test("invalid_auth → IntegrationAuthError (re-auth, not retry)", async () => {
    const { f } = fakeFetch(() => ({
      status: 200,
      body: { ok: false, error: "invalid_auth" },
    }));
    await assert.rejects(
      fetchImportedItems({ provider: "slack", accessToken: "dead", fetchImpl: f }),
      (e: Error) => e instanceof IntegrationAuthError && /re-connect/.test(e.message)
    );
  });

  test("missing_scope → plain Error with reconnect hint", async () => {
    const { f } = fakeFetch((url) => {
      if (url.startsWith("https://slack.com/api/users.list")) {
        return { status: 200, body: { ok: true, members: [] } };
      }
      return { status: 200, body: { ok: false, error: "missing_scope" } };
    });
    await assert.rejects(
      fetchImportedItems({ provider: "slack", accessToken: "xoxb", fetchImpl: f }),
      (e: Error) =>
        !(e instanceof IntegrationAuthError) && /missing history\/read scopes/.test(e.message)
    );
  });

  test("HTTP 401 → IntegrationAuthError", async () => {
    const { f } = fakeFetch(() => ({ status: 401, body: { ok: false, error: "invalid_auth" } }));
    await assert.rejects(
      fetchImportedItems({ provider: "slack", accessToken: "dead", fetchImpl: f }),
      (e: Error) => e instanceof IntegrationAuthError
    );
  });
});

describe("Notion fetchImportedItems", () => {
  test("searches pages, pulls block children, exact request shape", async () => {
    const { f, calls } = fakeFetch((url, init) => {
      if (url === "https://api.notion.com/v1/search") {
        assert.equal(init?.method, "POST");
        const headers = init?.headers as Record<string, string>;
        assert.equal(headers.authorization, "Bearer nt");
        assert.equal(headers["notion-version"], NOTION_VERSION);
        const body = JSON.parse(String(init?.body));
        assert.equal(body.page_size, MAX_IMPORT_ITEMS);
        assert.equal(body.filter.value, "page");
        return {
          status: 200,
          body: {
            results: [
              {
                id: "page-1",
                url: "https://www.notion.so/page-1",
                last_edited_time: "2026-10-09T12:00:00.000Z",
                properties: {
                  title: { type: "title", title: [{ plain_text: "Kickoff" }] },
                },
              },
              {
                id: "page-1",
                url: "https://www.notion.so/page-1-dup",
                last_edited_time: "2026-10-09T11:00:00.000Z",
                properties: {
                  title: { type: "title", title: [{ plain_text: "Duplicate id" }] },
                },
              },
            ],
          },
        };
      }
      if (url.startsWith("https://api.notion.com/v1/blocks/page-1/children")) {
        return {
          status: 200,
          body: {
            results: [
              { type: "paragraph", paragraph: { rich_text: [{ plain_text: "Ship the rebrand." }] } },
            ],
          },
        };
      }
      return { status: 500, body: {} };
    });

    const items = await fetchImportedItems({
      provider: "notion",
      accessToken: "nt",
      fetchImpl: f,
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].externalId, "page-1");
    assert.equal(items[0].title, "Kickoff");
    assert.equal(items[0].bodyText, "Ship the rebrand.");
    assert.equal(items[0].permalink, "https://www.notion.so/page-1");
    assert.ok(calls.some((c) => c.url.includes("/v1/blocks/page-1/children")));
  });

  test("401 → IntegrationAuthError", async () => {
    const { f } = fakeFetch(() => ({ status: 401, body: { message: "Unauthorized" } }));
    await assert.rejects(
      fetchImportedItems({ provider: "notion", accessToken: "dead", fetchImpl: f }),
      (e: Error) => e instanceof IntegrationAuthError && /re-connect/.test(e.message)
    );
  });
});
