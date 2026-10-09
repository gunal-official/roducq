/**
 * Shared connect/callback logic for Slack + Notion OAuth.
 * Framework-free (Web Fetch API Response) so the exact redirects and the
 * no-code 400 are unit-testable without spinning up Next.
 *
 * Routes stay thin: they resolve the session, then call these helpers.
 */

import { buildOAuthState, verifyOAuthState } from "../email/state.ts";
import { hasIntegrationKey, integrationKeyHex, tokenEncrypt } from "./crypto.ts";
import {
  authorizeUrl,
  exchangeCode,
  providerEnv,
  type IntegrationProvider,
} from "./oauth.ts";

export type IntegrationAuth = {
  userId: string | null;
  workspaceId: string | null;
  role: string | null;
};

export type IntegrationPersistRow = {
  workspace_id: string;
  provider: IntegrationProvider;
  external_id: string;
  display_name: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  status: "active";
  last_error: null;
};

export function integrationCallbackPath(provider: IntegrationProvider): string {
  return `/api/${provider}/callback`;
}

export function integrationConnectPath(provider: IntegrationProvider): string {
  return `/api/${provider}/connect`;
}

export function settingsResultUrl(
  origin: string,
  provider: IntegrationProvider,
  result: string
): string {
  return `${origin}/settings?${provider}=${result}`;
}

function redirect(url: string): Response {
  return Response.redirect(url, 302);
}

function settingsRedirect(
  origin: string,
  provider: IntegrationProvider,
  result: string
): Response {
  return redirect(settingsResultUrl(origin, provider, result));
}

/** Bare callback probe (no `code`, no provider `error`) — 400, never 404. */
export function missingOAuthCodeResponse(): Response {
  return Response.json(
    { error: "Missing authorization code." },
    { status: 400 }
  );
}

/**
 * Fast path used by the callback route BEFORE any auth/DB work so
 * `curl -I /api/{slack,notion}/callback` is a 400 (not a 404/500).
 * Provider cancel (`?error=`) redirects to Settings.
 */
export function earlyIntegrationCallback(
  url: URL,
  origin: string,
  provider: IntegrationProvider
): Response | null {
  if (url.searchParams.get("error")) {
    return settingsRedirect(origin, provider, "error=canceled");
  }
  if (!url.searchParams.get("code")) {
    return missingOAuthCodeResponse();
  }
  return null;
}

export function handleIntegrationConnect(opts: {
  origin: string;
  provider: IntegrationProvider;
  auth: IntegrationAuth;
}): Response {
  const { origin, provider, auth } = opts;
  if (!auth.userId) {
    return redirect(
      `${origin}/login?next=${encodeURIComponent("/settings")}`
    );
  }
  if (!auth.workspaceId || auth.role !== "owner") {
    return settingsRedirect(origin, provider, "error=forbidden");
  }
  const env = providerEnv(provider);
  if (!env) return settingsRedirect(origin, provider, "error=not_configured");
  if (!hasIntegrationKey()) {
    return settingsRedirect(origin, provider, "error=token_key");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return settingsRedirect(origin, provider, "error=service");
  }
  const state = buildOAuthState(auth.userId, auth.workspaceId, provider);
  if (!state) return settingsRedirect(origin, provider, "error=state");

  const redirectUri = `${origin}${integrationCallbackPath(provider)}`;
  return redirect(authorizeUrl(provider, env.clientId, redirectUri, state));
}

export async function handleIntegrationCallback(opts: {
  origin: string;
  url: URL;
  provider: IntegrationProvider;
  auth: IntegrationAuth;
  persist: (row: IntegrationPersistRow) => Promise<void>;
  fetchImpl?: typeof fetch;
}): Promise<Response> {
  const { origin, url, provider, auth } = opts;
  const early = earlyIntegrationCallback(url, origin, provider);
  if (early) return early;

  if (!auth.userId) {
    return settingsRedirect(origin, provider, "error=auth");
  }
  if (!auth.workspaceId || auth.role !== "owner") {
    return settingsRedirect(origin, provider, "error=forbidden");
  }

  const claimed = verifyOAuthState(
    url.searchParams.get("state"),
    auth.userId,
    auth.workspaceId
  );
  if (claimed !== provider) {
    return settingsRedirect(origin, provider, "error=state");
  }

  const env = providerEnv(provider);
  const keyHex = integrationKeyHex();
  if (!env || !keyHex || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return settingsRedirect(origin, provider, "error=not_configured");
  }

  const code = url.searchParams.get("code") ?? "";
  try {
    const tokens = await exchangeCode({
      provider,
      code,
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      redirectUri: `${origin}${integrationCallbackPath(provider)}`,
      fetchImpl: opts.fetchImpl,
    });
    await opts.persist({
      workspace_id: auth.workspaceId,
      provider,
      external_id: tokens.externalId,
      display_name: tokens.displayName,
      access_token_enc: tokenEncrypt(tokens.accessToken, keyHex),
      refresh_token_enc: tokens.refreshToken
        ? tokenEncrypt(tokens.refreshToken, keyHex)
        : null,
      token_expires_at: tokens.expiresAt,
      metadata: tokens.metadata,
      status: "active",
      last_error: null,
    });
    return settingsRedirect(origin, provider, "connected");
  } catch {
    return settingsRedirect(origin, provider, "error=exchange");
  }
}
