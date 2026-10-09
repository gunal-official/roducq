/**
 * Structural tests locking Slack/Notion OAuth routes + Settings UI
 * against the real source files.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

describe("Slack/Notion OAuth routes", () => {
  for (const rel of [
    "app/api/slack/connect/route.ts",
    "app/api/slack/callback/route.ts",
    "app/api/notion/connect/route.ts",
    "app/api/notion/callback/route.ts",
  ]) {
    it(`${rel} exports GET + HEAD`, () => {
      const src = read(rel);
      assert.ok(src.includes("export async function GET"));
      assert.ok(/export (async )?function HEAD/.test(src));
    });
  }

  it("slack callback exchanges via oauth.v2.access (handler)", () => {
    const src = read("lib/integrations/oauth.ts");
    assert.ok(src.includes("https://slack.com/api/oauth.v2.access"));
    assert.ok(src.includes("https://slack.com/oauth/v2/authorize"));
  });

  it("notion callback exchanges via api.notion.com/v1/oauth/token", () => {
    const src = read("lib/integrations/oauth.ts");
    assert.ok(src.includes("https://api.notion.com/v1/oauth/token"));
    assert.ok(src.includes("https://api.notion.com/v1/oauth/authorize"));
  });

  it("does not add /api/cron/slack (unscheduled unless implemented)", () => {
    assert.equal(existsSync(new URL("../../app/api/cron/slack/route.ts", import.meta.url)), false);
  });

  it("existing cron routes still accept GET (Vercel Cron)", () => {
    assert.ok(read("app/api/cron/email/route.ts").includes("export async function GET"));
    assert.ok(read("app/api/cron/webhooks/route.ts").includes("export async function GET"));
  });
});

describe("Settings integrations UI", () => {
  it("settings page mounts IntegrationsCard + notice", () => {
    const src = read("app/(app)/settings/page.tsx");
    assert.ok(src.includes("IntegrationsCard"));
    assert.ok(src.includes("IntegrationsNotice"));
    assert.ok(src.includes("getIntegrationConnections"));
  });

  it("card exposes Connect Slack / Connect Notion", () => {
    const src = read("components/settings/IntegrationsCard.tsx");
    assert.ok(src.includes("Connect {label}"));
    assert.ok(src.includes("/api/${provider}/connect"));
    assert.ok(src.includes('label="Slack"'));
    assert.ok(src.includes("Notion"));
    assert.ok(src.includes('data-proof="integrations"'));
  });
});

describe("env docs", () => {
  it(".env.local.example documents Slack, Notion, AUTH_SECRET", () => {
    const src = read(".env.local.example");
    assert.ok(src.includes("SLACK_CLIENT_ID"));
    assert.ok(src.includes("SLACK_CLIENT_SECRET"));
    assert.ok(src.includes("NOTION_CLIENT_ID"));
    assert.ok(src.includes("NOTION_CLIENT_SECRET"));
    assert.ok(src.includes("AUTH_SECRET"));
    assert.ok(src.includes("SLACK_SIGNING_SECRET"));
  });
});
