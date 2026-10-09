/**
 * Unit tests for lib/integrations/crypto.ts (key resolution).
 * Run with: npm test
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  hasIntegrationKey,
  integrationKeyHex,
  tokenDecrypt,
  tokenEncrypt,
} from "../../lib/integrations/crypto.ts";

const ENV_KEYS = [
  "EMAIL_TOKEN_ENCRYPTION_KEY",
  "INTEGRATIONS_TOKEN_ENCRYPTION_KEY",
  "AUTH_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
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

describe("integrationKeyHex", () => {
  test("no material → null", async () => {
    await withEnv({}, () => {
      assert.equal(integrationKeyHex(), null);
      assert.equal(hasIntegrationKey(), false);
    });
  });

  test("AUTH_SECRET derives a 64-hex AES key that round-trips", async () => {
    await withEnv({ AUTH_SECRET: "oauth-state-secret" }, () => {
      const key = integrationKeyHex();
      assert.ok(key);
      assert.equal(key.length, 64);
      assert.match(key, /^[0-9a-f]{64}$/);
      const payload = tokenEncrypt("xoxb-bot", key);
      assert.equal(tokenDecrypt(payload, key), "xoxb-bot");
      assert.equal(hasIntegrationKey(), true);
    });
  });

  test("EMAIL_TOKEN_ENCRYPTION_KEY wins over AUTH_SECRET", async () => {
    const emailKey = "a".repeat(64);
    await withEnv(
      { EMAIL_TOKEN_ENCRYPTION_KEY: emailKey, AUTH_SECRET: "other" },
      () => {
        assert.equal(integrationKeyHex(), emailKey);
      }
    );
  });
});
