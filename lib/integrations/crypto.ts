/**
 * Token-key resolution for Slack/Notion connections.
 *
 * Ciphertext format is the mailbox one (lib/email/crypto, AES-256-GCM).
 * Key material, in order:
 *   1. EMAIL_TOKEN_ENCRYPTION_KEY (64 hex) — already required for mailbox;
 *   2. INTEGRATIONS_TOKEN_ENCRYPTION_KEY (64 hex) — optional dedicated key;
 *   3. SHA-256(AUTH_SECRET or SUPABASE_SERVICE_ROLE_KEY) as 64 hex chars,
 *      so a deployment that already has AUTH_SECRET (OAuth state) or the
 *      service role (callback persist) can encrypt tokens without a new env.
 */

import { createHash } from "node:crypto";

import {
  hasTokenKey,
  tokenDecrypt,
  tokenEncrypt,
} from "../email/crypto.ts";

export { hasTokenKey, tokenDecrypt, tokenEncrypt };

export function integrationKeyHex(): string | null {
  if (hasTokenKey(process.env.EMAIL_TOKEN_ENCRYPTION_KEY)) {
    return process.env.EMAIL_TOKEN_ENCRYPTION_KEY as string;
  }
  if (hasTokenKey(process.env.INTEGRATIONS_TOKEN_ENCRYPTION_KEY)) {
    return process.env.INTEGRATIONS_TOKEN_ENCRYPTION_KEY as string;
  }
  const material =
    process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!material) return null;
  return createHash("sha256").update(material).digest("hex");
}

export function hasIntegrationKey(): boolean {
  return integrationKeyHex() !== null;
}
