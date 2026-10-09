/**
 * Slack + Notion intake import — fetch + normalize recent messages/pages
 * from a connected workspace. Zero dependencies (fetch only).
 *
 * Both providers are normalized to ONE shape (ImportedItem); staging
 * dedupe is the DB's job (unique(connection_id, external_id)), so an
 * import is idempotent no matter how often it runs. A batch is also
 * deduped in-process so a single upsert never ships duplicate keys.
 *
 * Read-only against the provider (Slack conversations.history /
 * Notion search + block children). The app never posts to Slack or
 * writes Notion pages.
 *
 * Every network function takes an optional `fetchImpl` so provider
 * fixtures are unit-testable (tests/lib/integrations-sync.test.ts).
 */

import { NOTION_VERSION, type IntegrationProvider } from "./oauth.ts";

export const MAX_IMPORT_ITEMS = 25;
export const SLACK_CHANNEL_CAP = 8;
export const SLACK_HISTORY_PER_CHANNEL = 10;

export type ImportedItem = {
  externalId: string;
  provider: IntegrationProvider;
  title: string;
  author: string;
  snippet: string | null;
  bodyText: string | null;
  permalink: string | null;
  /** ISO timestamp. */
  occurredAt: string;
  metadata: Record<string, unknown>;
};

/** Provider rejected the token (expired/revoked) — the caller marks the
 *  connection needs_reauth instead of retrying. */
export class IntegrationAuthError extends Error {}

const SLACK_USERS_URL = "https://slack.com/api/users.list";
const SLACK_CONVERSATIONS_URL = "https://slack.com/api/conversations.list";
const SLACK_HISTORY_URL = "https://slack.com/api/conversations.history";
const NOTION_SEARCH_URL = "https://api.notion.com/v1/search";

const SLACK_AUTH_ERRORS = new Set([
  "invalid_auth",
  "not_authed",
  "token_revoked",
  "account_inactive",
  "invalid_token",
]);

const SKIP_SLACK_SUBTYPES = new Set([
  "channel_join",
  "channel_leave",
  "channel_topic",
  "channel_purpose",
  "channel_name",
  "channel_archive",
  "channel_unarchive",
  "group_join",
  "group_leave",
  "group_topic",
  "group_purpose",
  "group_name",
  "group_archive",
  "group_unarchive",
  "bot_add",
  "bot_remove",
  "pinned_item",
  "unpinned_item",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function headerAuth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, accept: "application/json" };
}

/** Slack ts ("1355517523.000005") → ISO. Invalid input → epoch. */
export function slackTsToIso(ts: string): string {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return new Date(0).toISOString();
  return new Date(n * 1000).toISOString();
}

/** Drop empty / duplicate-by-externalId items, keep first-seen order. */
export function dedupeImportedItems(items: ImportedItem[]): ImportedItem[] {
  const seen = new Set<string>();
  const out: ImportedItem[] = [];
  for (const item of items) {
    const id = item.externalId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function snippetOf(text: string | null | undefined, max = 280): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function titleOf(text: string | null | undefined, fallback: string): string {
  const line = (text ?? "").split(/\n/)[0]?.trim() ?? "";
  if (!line) return fallback;
  return line.length <= 80 ? line : `${line.slice(0, 79)}…`;
}

type SlackMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  username?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
  thread_ts?: string;
};

type SlackChannel = {
  id?: string;
  name?: string;
  is_member?: boolean;
  is_im?: boolean;
  is_mpim?: boolean;
  user?: string;
};

export function slackExternalId(channelId: string, ts: string): string {
  return `${channelId}:${ts}`;
}

export function normalizeSlackMessage(opts: {
  channelId: string;
  channelName: string;
  message: SlackMessage;
  users: Map<string, string>;
}): ImportedItem | null {
  const { channelId, channelName, message, users } = opts;
  if (!message.ts) return null;
  if (message.type && message.type !== "message") return null;
  if (message.subtype && SKIP_SLACK_SUBTYPES.has(message.subtype)) return null;
  const text = (message.text ?? "").trim();
  if (!text) return null;

  const userId = message.user ?? "";
  const author =
    (userId && users.get(userId)) ||
    message.username ||
    userId ||
    (message.bot_id ? "Slack bot" : "Slack");
  const channelLabel = channelName.startsWith("#")
    ? channelName
    : channelName
      ? `#${channelName}`
      : channelId;

  return {
    externalId: slackExternalId(channelId, message.ts),
    provider: "slack",
    title: titleOf(text, channelLabel),
    author,
    snippet: snippetOf(text),
    bodyText: text,
    permalink: null,
    occurredAt: slackTsToIso(message.ts),
    metadata: {
      channel_id: channelId,
      channel_name: channelName || null,
      ts: message.ts,
      thread_ts: message.thread_ts ?? null,
      user_id: userId || null,
      subtype: message.subtype ?? null,
    },
  };
}

type NotionRichText = { plain_text?: string };
type NotionBlock = {
  type?: string;
  paragraph?: { rich_text?: NotionRichText[] };
  heading_1?: { rich_text?: NotionRichText[] };
  heading_2?: { rich_text?: NotionRichText[] };
  heading_3?: { rich_text?: NotionRichText[] };
  bulleted_list_item?: { rich_text?: NotionRichText[] };
  numbered_list_item?: { rich_text?: NotionRichText[] };
  to_do?: { rich_text?: NotionRichText[]; checked?: boolean };
  quote?: { rich_text?: NotionRichText[] };
  callout?: { rich_text?: NotionRichText[] };
  toggle?: { rich_text?: NotionRichText[] };
  code?: { rich_text?: NotionRichText[] };
};
type NotionPage = {
  id?: string;
  url?: string;
  created_time?: string;
  last_edited_time?: string;
  created_by?: { id?: string };
  properties?: Record<string, { type?: string; title?: NotionRichText[] }>;
};

export function notionRichText(parts: NotionRichText[] | undefined): string {
  return (parts ?? []).map((p) => p.plain_text ?? "").join("");
}

export function notionPageTitle(page: NotionPage): string {
  const props = page.properties ?? {};
  for (const value of Object.values(props)) {
    if (value?.type === "title") {
      const t = notionRichText(value.title).trim();
      if (t) return t;
    }
  }
  return "Untitled";
}

export function notionBlocksToText(blocks: NotionBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type ?? "";
    if (type === "paragraph") {
      const t = notionRichText(block.paragraph?.rich_text).trim();
      if (t) lines.push(t);
    } else if (type === "heading_1") {
      const t = notionRichText(block.heading_1?.rich_text).trim();
      if (t) lines.push(`# ${t}`);
    } else if (type === "heading_2") {
      const t = notionRichText(block.heading_2?.rich_text).trim();
      if (t) lines.push(`## ${t}`);
    } else if (type === "heading_3") {
      const t = notionRichText(block.heading_3?.rich_text).trim();
      if (t) lines.push(`### ${t}`);
    } else if (type === "bulleted_list_item") {
      const t = notionRichText(block.bulleted_list_item?.rich_text).trim();
      if (t) lines.push(`- ${t}`);
    } else if (type === "numbered_list_item") {
      const t = notionRichText(block.numbered_list_item?.rich_text).trim();
      if (t) lines.push(`- ${t}`);
    } else if (type === "to_do") {
      const t = notionRichText(block.to_do?.rich_text).trim();
      if (t) lines.push(`${block.to_do?.checked ? "[x]" : "[ ]"} ${t}`);
    } else if (type === "quote" || type === "callout") {
      const t = notionRichText(
        (type === "quote" ? block.quote?.rich_text : block.callout?.rich_text)
      ).trim();
      if (t) lines.push(t);
    } else if (type === "toggle") {
      const t = notionRichText(block.toggle?.rich_text).trim();
      if (t) lines.push(t);
    } else if (type === "code") {
      const t = notionRichText(block.code?.rich_text).trim();
      if (t) lines.push(t);
    }
  }
  return lines.join("\n").trim();
}

export function normalizeNotionPage(opts: {
  page: NotionPage;
  bodyText: string | null;
}): ImportedItem {
  const title = notionPageTitle(opts.page);
  const body = opts.bodyText?.trim() || null;
  const occurredAt =
    opts.page.last_edited_time ||
    opts.page.created_time ||
    new Date(0).toISOString();
  return {
    externalId: String(opts.page.id ?? ""),
    provider: "notion",
    title,
    author: "Notion",
    snippet: snippetOf(body ?? title),
    bodyText: body ?? title,
    permalink: opts.page.url ?? null,
    occurredAt,
    metadata: {
      page_id: opts.page.id ?? null,
      created_time: opts.page.created_time ?? null,
      last_edited_time: opts.page.last_edited_time ?? null,
    },
  };
}

async function slackJson(
  f: typeof fetch,
  url: string,
  token: string
): Promise<Record<string, unknown>> {
  const res = await f(url, { headers: headerAuth(token) });
  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<
    string,
    unknown
  >;
  if (res.status === 401 || SLACK_AUTH_ERRORS.has(String(json.error ?? ""))) {
    throw new IntegrationAuthError(
      "Slack rejected the token — re-connect the workspace."
    );
  }
  if (!res.ok) {
    throw new Error(`Slack import failed (HTTP ${res.status}).`);
  }
  if (json.ok === false) {
    const err = String(json.error || "unknown_error");
    if (SLACK_AUTH_ERRORS.has(err)) {
      throw new IntegrationAuthError(
        "Slack rejected the token — re-connect the workspace."
      );
    }
    if (err === "missing_scope") {
      throw new Error(
        "Slack is missing history/read scopes — add channels:history, channels:read (and groups:/im:/mpim: as needed) on the Slack app, then reconnect."
      );
    }
    throw new Error(`Slack import failed (${err}).`);
  }
  return json;
}

async function fetchSlackItems(
  token: string,
  f: typeof fetch
): Promise<ImportedItem[]> {
  const users = new Map<string, string>();
  try {
    const usersJson = await slackJson(
      f,
      `${SLACK_USERS_URL}?limit=200`,
      token
    );
    const members = Array.isArray(usersJson.members) ? usersJson.members : [];
    for (const raw of members) {
      const m = asRecord(raw);
      const profile = asRecord(m.profile);
      const id = String(m.id ?? "");
      const name =
        String(profile.real_name || profile.display_name || m.real_name || m.name || "") ||
        "";
      if (id && name) users.set(id, name);
    }
  } catch (e) {
    if (e instanceof IntegrationAuthError) throw e;
    // names are best-effort — keep going with user ids
  }

  const listJson = await slackJson(
    f,
    `${SLACK_CONVERSATIONS_URL}?exclude_archived=true&limit=20&types=${encodeURIComponent("public_channel,private_channel,im,mpim")}`,
    token
  );
  const channels = (Array.isArray(listJson.channels) ? listJson.channels : [])
    .map((raw) => asRecord(raw) as SlackChannel)
    .filter((c) => Boolean(c.id))
    .slice(0, SLACK_CHANNEL_CAP);

  const collected: ImportedItem[] = [];
  for (const channel of channels) {
    const channelId = String(channel.id);
    try {
      const hist = await slackJson(
        f,
        `${SLACK_HISTORY_URL}?channel=${encodeURIComponent(channelId)}&limit=${SLACK_HISTORY_PER_CHANNEL}`,
        token
      );
      const messages = Array.isArray(hist.messages) ? hist.messages : [];
      const channelName = String(channel.name ?? "");
      for (const raw of messages) {
        const item = normalizeSlackMessage({
          channelId,
          channelName,
          message: asRecord(raw) as SlackMessage,
          users,
        });
        if (item) collected.push(item);
      }
    } catch (e) {
      if (e instanceof IntegrationAuthError) throw e;
      // not_in_channel / missing_scope on a single channel — skip it
    }
  }

  collected.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return dedupeImportedItems(collected).slice(0, MAX_IMPORT_ITEMS);
}

async function fetchNotionItems(
  token: string,
  f: typeof fetch
): Promise<ImportedItem[]> {
  const res = await f(NOTION_SEARCH_URL, {
    method: "POST",
    headers: {
      ...headerAuth(token),
      "content-type": "application/json",
      "notion-version": NOTION_VERSION,
    },
    body: JSON.stringify({
      page_size: MAX_IMPORT_ITEMS,
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
    }),
  });
  if (res.status === 401) {
    throw new IntegrationAuthError(
      "Notion rejected the token — re-connect the workspace."
    );
  }
  if (!res.ok) {
    throw new Error(`Notion import failed (HTTP ${res.status}).`);
  }
  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<
    string,
    unknown
  >;
  const results = Array.isArray(json.results) ? json.results : [];
  const pages = results
    .map((raw) => asRecord(raw) as NotionPage)
    .filter((p) => Boolean(p.id))
    .slice(0, MAX_IMPORT_ITEMS);

  const items: ImportedItem[] = [];
  for (const page of pages) {
    let body: string | null = null;
    try {
      const blockRes = await f(
        `https://api.notion.com/v1/blocks/${encodeURIComponent(String(page.id))}/children?page_size=20`,
        {
          headers: {
            ...headerAuth(token),
            "notion-version": NOTION_VERSION,
          },
        }
      );
      if (blockRes.status === 401) {
        throw new IntegrationAuthError(
          "Notion rejected the token — re-connect the workspace."
        );
      }
      if (blockRes.ok) {
        const blockJson = ((await blockRes.json().catch(() => ({}))) ??
          {}) as Record<string, unknown>;
        const blocks = Array.isArray(blockJson.results)
          ? (blockJson.results as NotionBlock[])
          : [];
        body = notionBlocksToText(blocks) || null;
      }
    } catch (e) {
      if (e instanceof IntegrationAuthError) throw e;
    }
    const item = normalizeNotionPage({ page, bodyText: body });
    if (item.externalId) items.push(item);
  }
  return dedupeImportedItems(items).slice(0, MAX_IMPORT_ITEMS);
}

/** Fetch the latest importable items (newest first, ≤25) for a connected
 *  Slack or Notion workspace. Throws IntegrationAuthError on 401 /
 *  invalid_auth so callers mark the connection needs_reauth. */
export async function fetchImportedItems(opts: {
  provider: IntegrationProvider;
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<ImportedItem[]> {
  const f = opts.fetchImpl ?? fetch;
  return opts.provider === "slack"
    ? fetchSlackItems(opts.accessToken, f)
    : fetchNotionItems(opts.accessToken, f);
}
