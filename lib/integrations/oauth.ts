/**
 * OAuth plumbing for Slack + Notion workspace connections.
 * Zero dependencies (fetch + URL only), same shape as lib/email/oauth:
 * auth URL builders, authorization-code exchange, best-effort revoke.
 *
 * Every network function takes an optional `fetchImpl` so the exact
 * request shape is unit-testable.
 */

export type IntegrationProvider = "slack" | "notion";

export const DEFAULT_SLACK_BOT_SCOPES = "chat:write";
export const SLACK_AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
export const SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access";
export const SLACK_REVOKE_URL = "https://slack.com/api/auth.revoke";

export const NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
export const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
export const NOTION_REVOKE_URL = "https://api.notion.com/v1/oauth/revoke";
export const NOTION_VERSION = "2022-06-28";

export function slackBotScopes(): string {
  const raw = process.env.SLACK_BOT_SCOPES?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_SLACK_BOT_SCOPES;
}

export function slackEnv(): {
  clientId: string;
  clientSecret: string;
  botScopes: string;
  signingSecret: string | null;
} | null {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    botScopes: slackBotScopes(),
    signingSecret: process.env.SLACK_SIGNING_SECRET || null,
  };
}

export function notionEnv(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function providerEnv(
  provider: IntegrationProvider
): { clientId: string; clientSecret: string } | null {
  return provider === "slack" ? slackEnv() : notionEnv();
}

export function slackAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string = DEFAULT_SLACK_BOT_SCOPES
): string {
  const p = new URLSearchParams({
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
  });
  const userScope = process.env.SLACK_USER_SCOPES?.trim();
  if (userScope) p.set("user_scope", userScope);
  return `${SLACK_AUTHORIZE_URL}?${p.toString()}`;
}

export function notionAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });
  return `${NOTION_AUTHORIZE_URL}?${p.toString()}`;
}

export function authorizeUrl(
  provider: IntegrationProvider,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  return provider === "slack"
    ? slackAuthUrl(clientId, redirectUri, state, slackBotScopes())
    : notionAuthUrl(clientId, redirectUri, state);
}

export type IntegrationTokenResult = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  externalId: string;
  displayName: string;
  metadata: Record<string, unknown>;
};

function tokenError(res: Response, json: Record<string, unknown>): Error {
  return new Error(
    String(
      json.error_description ||
        json.message ||
        json.error ||
        `Provider returned HTTP ${res.status}.`
    )
  );
}

function expiresAtFrom(json: Record<string, unknown>): string | null {
  if (!json.expires_in) return null;
  const seconds = Number(json.expires_in);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Exchange the authorization code for tokens. Throws on provider failure. */
export async function exchangeCode(opts: {
  provider: IntegrationProvider;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<IntegrationTokenResult> {
  const f = opts.fetchImpl ?? fetch;
  if (opts.provider === "slack") {
    const res = await f(SLACK_TOKEN_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: opts.clientId,
        client_secret: opts.clientSecret,
        code: opts.code,
        redirect_uri: opts.redirectUri,
      }).toString(),
    });
    const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<
      string,
      unknown
    >;
    // Slack returns HTTP 200 with `{ ok: false, error }` on most failures.
    if (!res.ok || json.ok === false) throw tokenError(res as never, json);
    const team = asRecord(json.team);
    const authed = asRecord(json.authed_user);
    const accessToken = String(json.access_token || authed.access_token || "");
    if (!accessToken) throw new Error("Slack did not return an access token.");
    const externalId = String(team.id || authed.id || "unknown");
    const displayName = String(team.name || "Slack workspace");
    return {
      accessToken,
      refreshToken: json.refresh_token ? String(json.refresh_token) : null,
      expiresAt: expiresAtFrom(json),
      externalId,
      displayName,
      metadata: {
        team_id: team.id ?? null,
        team_name: team.name ?? null,
        bot_user_id: json.bot_user_id ?? null,
        app_id: json.app_id ?? null,
        scope: json.scope ?? null,
        authed_user_id: authed.id ?? null,
        token_type: json.token_type ?? "bot",
      },
    };
  }

  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString(
    "base64"
  );
  const res = await f(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/json",
      accept: "application/json",
      "notion-version": NOTION_VERSION,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: opts.redirectUri,
    }),
  });
  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<
    string,
    unknown
  >;
  if (!res.ok) throw tokenError(res as never, json);
  const accessToken = String(json.access_token ?? "");
  if (!accessToken) throw new Error("Notion did not return an access token.");
  const workspaceId = String(json.workspace_id || json.bot_id || "unknown");
  const displayName = String(json.workspace_name || "Notion workspace");
  return {
    accessToken,
    refreshToken: json.refresh_token ? String(json.refresh_token) : null,
    expiresAt: expiresAtFrom(json),
    externalId: workspaceId,
    displayName,
    metadata: {
      workspace_id: json.workspace_id ?? null,
      workspace_name: json.workspace_name ?? null,
      workspace_icon: json.workspace_icon ?? null,
      bot_id: json.bot_id ?? null,
      owner: json.owner ?? null,
      token_type: json.token_type ?? "bearer",
    },
  };
}

/** Best-effort revocation — never throws (disconnect must succeed even
 *  when the provider is unreachable). */
export async function revokeToken(opts: {
  provider: IntegrationProvider;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; error?: string }> {
  const f = opts.fetchImpl ?? fetch;
  try {
    if (opts.provider === "slack") {
      const res = await f(SLACK_REVOKE_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${opts.accessToken}`,
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: new URLSearchParams({ token: opts.accessToken }).toString(),
      });
      const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<
        string,
        unknown
      >;
      if (res.ok && json.ok !== false) return { ok: true };
      return {
        ok: false,
        error: String(json.error || `HTTP ${res.status}`),
      };
    }
    const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString(
      "base64"
    );
    const res = await f(NOTION_REVOKE_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/json",
        accept: "application/json",
        "notion-version": NOTION_VERSION,
      },
      body: JSON.stringify({ token: opts.accessToken }),
    });
    return res.ok
      ? { ok: true }
      : { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}
