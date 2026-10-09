/**
 * Unit tests for lib/integrations/handler.ts (connect/callback HTTP).
 * Run with: npm test
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildOAuthState } from "../../lib/email/state.ts";
import {
  earlyIntegrationCallback,
  handleIntegrationCallback,
  handleIntegrationConnect,
  missingOAuthCodeResponse,
} from "../../lib/integrations/handler.ts";

const ORIGIN = "https://roducq.nanexi.com";
const USER = "user-1";
const WS = "ws-1";
const OWNER = { userId: USER, workspaceId: WS, role: "owner" as const };

const ENV_KEYS = [
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "NOTION_CLIENT_ID",
  "NOTION_CLIENT_SECRET",
  "AUTH_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "EMAIL_TOKEN_ENCRYPTION_KEY",
  "INTEGRATIONS_TOKEN_ENCRYPTION_KEY",
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

const CONFIGURED = {
  SLACK_CLIENT_ID: "slack-id",
  SLACK_CLIENT_SECRET: "slack-secret",
  NOTION_CLIENT_ID: "notion-id",
  NOTION_CLIENT_SECRET: "notion-secret",
  AUTH_SECRET: "oauth-state-secret",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("connect", () => {
  test("unauthenticated → 302 /login (curl -I is never 404)", async () => {
    await withEnv(CONFIGURED, () => {
      const res = handleIntegrationConnect({
        origin: ORIGIN,
        provider: "slack",
        auth: { userId: null, workspaceId: null, role: null },
      });
      assert.equal(res.status, 302);
      assert.match(res.headers.get("location") ?? "", /\/login\?next=/);
    });
  });

  test("owner + slack env → 302 to slack.com/oauth/v2/authorize", async () => {
    await withEnv(CONFIGURED, () => {
      const res = handleIntegrationConnect({
        origin: ORIGIN,
        provider: "slack",
        auth: OWNER,
      });
      assert.equal(res.status, 302);
      const loc = res.headers.get("location") ?? "";
      assert.match(loc, /^https:\/\/slack.com\/oauth\/v2\/authorize/);
      const u = new URL(loc);
      assert.equal(u.searchParams.get("client_id"), "slack-id");
      assert.equal(
        u.searchParams.get("redirect_uri"),
        `${ORIGIN}/api/slack/callback`
      );
      assert.ok(u.searchParams.get("state"));
    });
  });

  test("owner + notion env → 302 to api.notion.com authorize", async () => {
    await withEnv(CONFIGURED, () => {
      const res = handleIntegrationConnect({
        origin: ORIGIN,
        provider: "notion",
        auth: OWNER,
      });
      assert.equal(res.status, 302);
      const loc = res.headers.get("location") ?? "";
      assert.match(loc, /^https:\/\/api.notion.com\/v1\/oauth\/authorize/);
      const u = new URL(loc);
      assert.equal(u.searchParams.get("redirect_uri"), `${ORIGIN}/api/notion/callback`);
    });
  });

  test("missing slack env → 302 settings error=not_configured", async () => {
    await withEnv(
      {
        AUTH_SECRET: "oauth-state-secret",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      },
      () => {
        const res = handleIntegrationConnect({
          origin: ORIGIN,
          provider: "slack",
          auth: OWNER,
        });
        assert.equal(res.status, 302);
        assert.equal(
          res.headers.get("location"),
          `${ORIGIN}/settings?slack=error=not_configured`
        );
      }
    );
  });
});

describe("callback", () => {
  test("bare callback → 400 JSON, never 404", () => {
    const res = missingOAuthCodeResponse();
    assert.equal(res.status, 400);
    const early = earlyIntegrationCallback(
      new URL(`${ORIGIN}/api/slack/callback`),
      ORIGIN,
      "slack"
    );
    assert.equal(early?.status, 400);
  });

  test("provider error query → 302 canceled", () => {
    const early = earlyIntegrationCallback(
      new URL(`${ORIGIN}/api/slack/callback?error=access_denied`),
      ORIGIN,
      "slack"
    );
    assert.equal(early?.status, 302);
    assert.equal(
      early?.headers.get("location"),
      `${ORIGIN}/settings?slack=error=canceled`
    );
  });

  test("valid slack code → persist + 302 connected", async () => {
    await withEnv(CONFIGURED, async () => {
      const state = buildOAuthState(USER, WS, "slack");
      assert.ok(state);
      const persisted: unknown[] = [];
      const fetchImpl = (async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            access_token: "xoxb-bot",
            team: { id: "T9", name: "Acme" },
          }),
        }) as unknown as Response) as unknown as typeof fetch;
      const res = await handleIntegrationCallback({
        origin: ORIGIN,
        url: new URL(
          `${ORIGIN}/api/slack/callback?code=abc&state=${encodeURIComponent(state)}`
        ),
        provider: "slack",
        auth: OWNER,
        persist: async (row) => {
          persisted.push(row);
        },
        fetchImpl,
      });
      assert.equal(res.status, 302);
      assert.equal(res.headers.get("location"), `${ORIGIN}/settings?slack=connected`);
      assert.equal(persisted.length, 1);
      const row = persisted[0] as { provider: string; external_id: string; access_token_enc: string };
      assert.equal(row.provider, "slack");
      assert.equal(row.external_id, "T9");
      assert.match(row.access_token_enc, /^v1\./);
    });
  });

  test("tampered state is rejected", async () => {
    await withEnv(CONFIGURED, async () => {
      const res = await handleIntegrationCallback({
        origin: ORIGIN,
        url: new URL(`${ORIGIN}/api/notion/callback?code=abc&state=nope.nope`),
        provider: "notion",
        auth: OWNER,
        persist: async () => {
          throw new Error("should not persist");
        },
      });
      assert.equal(res.status, 302);
      assert.equal(
        res.headers.get("location"),
        `${ORIGIN}/settings?notion=error=state`
      );
    });
  });
});
