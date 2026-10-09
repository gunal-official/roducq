/**
 * Unit tests for lib/integrations/oauth.ts (Slack + Notion OAuth plumbing).
 * Run with: npm test
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_SLACK_BOT_SCOPES,
  NOTION_AUTHORIZE_URL,
  NOTION_TOKEN_URL,
  NOTION_VERSION,
  SLACK_AUTHORIZE_URL,
  SLACK_TOKEN_URL,
  exchangeCode,
  notionAuthUrl,
  notionEnv,
  revokeToken,
  slackAuthUrl,
  slackEnv,
} from "../../lib/integrations/oauth.ts";

const SLACK_REDIRECT = "https://roducq.nanexi.com/api/slack/callback";
const NOTION_REDIRECT = "https://roducq.nanexi.com/api/notion/callback";
const STATE = "state-123";

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

const ENV_KEYS = [
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_BOT_SCOPES",
  "SLACK_USER_SCOPES",
  "SLACK_SIGNING_SECRET",
  "NOTION_CLIENT_ID",
  "NOTION_CLIENT_SECRET",
] as const;

async function withEnv(
  env: Record<string, string>,
  fn: () => void | Promise<void>
) {
  const saved = ENV_KEYS.map((k) => [k, process.env[k]] as const);
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  try {
    await fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("auth URL builders", () => {
  test("slackAuthUrl: oauth v2 authorize with bot scopes + state", () => {
    const u = new URL(slackAuthUrl("slack-id", SLACK_REDIRECT, STATE));
    assert.equal(u.origin + u.pathname, SLACK_AUTHORIZE_URL);
    assert.equal(u.searchParams.get("client_id"), "slack-id");
    assert.equal(u.searchParams.get("redirect_uri"), SLACK_REDIRECT);
    assert.equal(u.searchParams.get("scope"), DEFAULT_SLACK_BOT_SCOPES);
    assert.equal(u.searchParams.get("state"), STATE);
    assert.equal(u.searchParams.get("user_scope"), null);
  });

  test("notionAuthUrl: v1 authorize with response_type=code and owner=user", () => {
    const u = new URL(notionAuthUrl("notion-id", NOTION_REDIRECT, STATE));
    assert.equal(u.origin + u.pathname, NOTION_AUTHORIZE_URL);
    assert.equal(u.searchParams.get("client_id"), "notion-id");
    assert.equal(u.searchParams.get("response_type"), "code");
    assert.equal(u.searchParams.get("owner"), "user");
    assert.equal(u.searchParams.get("redirect_uri"), NOTION_REDIRECT);
    assert.equal(u.searchParams.get("state"), STATE);
  });
});

describe("providerEnv", () => {
  test("slack pair from SLACK_*", async () => {
    await withEnv(
      { SLACK_CLIENT_ID: "s", SLACK_CLIENT_SECRET: "ss" },
      () => {
        const env = slackEnv();
        assert.equal(env?.clientId, "s");
        assert.equal(env?.clientSecret, "ss");
        assert.equal(env?.botScopes, DEFAULT_SLACK_BOT_SCOPES);
      }
    );
  });

  test("missing half of the pair → null", async () => {
    await withEnv({ SLACK_CLIENT_ID: "s" }, () => {
      assert.equal(slackEnv(), null);
    });
    await withEnv({ NOTION_CLIENT_SECRET: "n" }, () => {
      assert.equal(notionEnv(), null);
    });
  });

  test("SLACK_BOT_SCOPES overrides the default", async () => {
    await withEnv(
      {
        SLACK_CLIENT_ID: "s",
        SLACK_CLIENT_SECRET: "ss",
        SLACK_BOT_SCOPES: "chat:write,channels:read",
      },
      () => {
        assert.equal(slackEnv()?.botScopes, "chat:write,channels:read");
      }
    );
  });
});

describe("exchangeCode", () => {
  test("slack: posts the form to oauth.v2.access and reads team + bot token", async () => {
    const { f, calls } = fakeFetch(() => ({
      status: 200,
      body: {
        ok: true,
        access_token: "xoxb-bot",
        token_type: "bot",
        scope: "chat:write",
        bot_user_id: "U0BOT",
        app_id: "A0APP",
        team: { id: "T9TK3CUKW", name: "Slack Softball Team" },
        authed_user: { id: "U1234" },
      },
    }));
    const result = await exchangeCode({
      provider: "slack",
      code: "1234567890",
      clientId: "slack-id",
      clientSecret: "slack-secret",
      redirectUri: SLACK_REDIRECT,
      fetchImpl: f,
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, SLACK_TOKEN_URL);
    const form = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(form.get("code"), "1234567890");
    assert.equal(form.get("client_id"), "slack-id");
    assert.equal(form.get("client_secret"), "slack-secret");
    assert.equal(form.get("redirect_uri"), SLACK_REDIRECT);
    assert.equal(result.accessToken, "xoxb-bot");
    assert.equal(result.externalId, "T9TK3CUKW");
    assert.equal(result.displayName, "Slack Softball Team");
    assert.equal(result.refreshToken, null);
    assert.equal(result.metadata.bot_user_id, "U0BOT");
  });

  test("slack: HTTP 200 + ok:false throws the error code", async () => {
    const { f } = fakeFetch(() => ({
      status: 200,
      body: { ok: false, error: "invalid_code" },
    }));
    await assert.rejects(
      exchangeCode({
        provider: "slack",
        code: "bad",
        clientId: "x",
        clientSecret: "y",
        redirectUri: SLACK_REDIRECT,
        fetchImpl: f,
      }),
      /invalid_code/
    );
  });

  test("notion: posts JSON with Basic auth to the token endpoint", async () => {
    const { f, calls } = fakeFetch(() => ({
      status: 200,
      body: {
        access_token: "secret_nt",
        token_type: "bearer",
        bot_id: "bot-1",
        workspace_id: "ws-notion",
        workspace_name: "Client wiki",
      },
    }));
    const result = await exchangeCode({
      provider: "notion",
      code: "nt-code",
      clientId: "notion-id",
      clientSecret: "notion-secret",
      redirectUri: NOTION_REDIRECT,
      fetchImpl: f,
    });
    assert.equal(calls[0].url, NOTION_TOKEN_URL);
    const headers = calls[0].init?.headers as Record<string, string>;
    const expected =
      "Basic " + Buffer.from("notion-id:notion-secret").toString("base64");
    assert.equal(headers.authorization, expected);
    assert.equal(headers["notion-version"], NOTION_VERSION);
    const body = JSON.parse(String(calls[0].init?.body));
    assert.equal(body.grant_type, "authorization_code");
    assert.equal(body.code, "nt-code");
    assert.equal(body.redirect_uri, NOTION_REDIRECT);
    assert.equal(result.accessToken, "secret_nt");
    assert.equal(result.externalId, "ws-notion");
    assert.equal(result.displayName, "Client wiki");
  });

  test("notion provider errors pass through the message", async () => {
    const { f } = fakeFetch(() => ({
      status: 400,
      body: {
        object: "error",
        status: 400,
        code: "invalid_grant",
        message: "Invalid code",
      },
    }));
    await assert.rejects(
      exchangeCode({
        provider: "notion",
        code: "bad",
        clientId: "x",
        clientSecret: "y",
        redirectUri: NOTION_REDIRECT,
        fetchImpl: f,
      }),
      /Invalid code/
    );
  });
});

describe("revokeToken", () => {
  test("slack success → { ok: true }", async () => {
    const { f, calls } = fakeFetch(() => ({ status: 200, body: { ok: true } }));
    const r = await revokeToken({
      provider: "slack",
      accessToken: "xoxb-bot",
      clientId: "x",
      clientSecret: "y",
      fetchImpl: f,
    });
    assert.deepEqual(r, { ok: true });
    assert.equal(calls[0].url, "https://slack.com/api/auth.revoke");
  });

  test("network failure → { ok: false } (disconnect must never throw)", async () => {
    const f = (async () => {
      throw new Error("fetch failed");
    }) as unknown as typeof fetch;
    const r = await revokeToken({
      provider: "notion",
      accessToken: "secret_nt",
      clientId: "x",
      clientSecret: "y",
      fetchImpl: f,
    });
    assert.equal(r.ok, false);
    assert.match(r.error ?? "", /fetch failed/);
  });
});
