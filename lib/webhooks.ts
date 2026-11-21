/**
 * Outbound webhooks (Phase: events/webhooks foundation) — PURE helpers:
 * HMAC signing/verification (Stripe-style scheme), URL normalization
 * (SSRF guard), retry schedule, and delivery body/header builders.
 * Zero dependencies: node:crypto only. Impure dispatch lives in
 * lib/webhook-dispatch.ts.
 *
 * Signature scheme (header `X-Roducq-Signature`):
 *   signed_payload = `${timestampSec}.${rawBody}`
 *   v1 = hex(HMAC_SHA256(signing_secret, signed_payload))
 *   header = `t=${timestampSec},v1=${v1}` (multiple v1= values allowed
 *   for rotation; every candidate is checked).
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-roducq-signature";
export const EVENT_HEADER = "x-roducq-event";
export const DELIVERY_HEADER = "x-roducq-delivery";
/** Signature freshness window for inbound verification (seconds). */
export const SIGNATURE_TOLERANCE_SEC = 300;
/** Attempt schedule: 1 immediate try + retries after these backoffs. */
export const RETRY_BACKOFF_MS: readonly number[] = [15_000, 60_000];

export function generateSigningSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export function computeSignature(
  secret: string,
  timestampSec: number,
  raw: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestampSec}.${raw}`)
    .digest("hex");
}

export function signPayload(
  secret: string,
  timestampSec: number,
  raw: string
): string {
  return `t=${timestampSec},v1=${computeSignature(secret, timestampSec, raw)}`;
}

export function verifySignedPayload(input: {
  secret: string;
  header: string;
  raw: string;
  nowSec: number;
  toleranceSec?: number;
}): { ok: true } | { ok: false; reason: "malformed" | "stale" | "mismatch" } {
  const parts = input.header.split(",").map((p) => p.trim());
  let timestampSec: number | null = null;
  const candidates: string[] = [];
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (key === "t") {
      const t = Number(value);
      if (!Number.isFinite(t)) return { ok: false, reason: "malformed" };
      timestampSec = t;
    } else if (key === "v1") {
      candidates.push(value);
    }
  }
  if (timestampSec === null || candidates.length === 0) {
    return { ok: false, reason: "malformed" };
  }
  const tolerance = input.toleranceSec ?? SIGNATURE_TOLERANCE_SEC;
  if (Math.abs(input.nowSec - timestampSec) > tolerance) {
    return { ok: false, reason: "stale" };
  }
  const expected = Buffer.from(
    computeSignature(input.secret, timestampSec, input.raw),
    "utf8"
  );
  for (const candidate of candidates) {
    const got = Buffer.from(candidate, "utf8");
    if (got.length === expected.length && timingSafeEqual(got, expected)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "mismatch" };
}

/**
 * SSRF guard (hardened): https is required, and the destination host must
 * resolve to a PUBLIC address space. Plain http is allowed only for
 * loopback hosts (local development receivers).
 *
 * WHY THE ADDRESS CHECK EXISTS. A workspace owner registers webhook URLs,
 * and the server then POSTs to them on every event (lib/webhook-dispatch).
 * Without an address check that is a server-side request forgery primitive:
 * an owner could point a "webhook" at 169.254.169.254 to read cloud
 * instance credentials, or at 10.x/192.168.x to probe the private network,
 * and the delivery status is echoed back into the Settings UI.
 *
 * WHAT IS REJECTED (by literal address, never by DNS lookup):
 *   loopback            127.0.0.0/8, ::1, localhost, 0.0.0.0
 *   private             10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
 *   link-local          169.254.0.0/16, fe80::/10
 *   cloud metadata      metadata.google.internal, instance-data,
 *                       metadata.goog, 100.100.100.200 (Alibaba)
 *   other non-public    CGNAT 100.64.0.0/10, IPv4-mapped ::ffff:0:0/96,
 *                       unspecified ::, multicast/broadcast, reserved
 *
 * KNOWN LIMITATION (documented, not silently ignored): this is a
 * SYNTHETIC (literal-address) check, not a DNS-resolving one. A hostname
 * that resolves to a private address — e.g. `internal.example.com` — or a
 * DNS-rebinding name cannot be caught here without doing a lookup at
 * registration time AND pinning the resolved address for the later
 * delivery. That is a dispatcher-level change; this function closes the
 * direct-address hole, which is the reachable one today.
 */

/** Hostnames that resolve to cloud metadata services regardless of address. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "metadata",
]);

/** Why a host is refused — used to build the user-facing error. */
type HostVerdict = { ok: true } | { ok: false; reason: string };

const PRIVATE_REASON = "private or internal address";

function parseIpv4(hostname: string): number[] | null {
  // URL already normalises dotted-quad and numeric forms into a canonical
  // a.b.c.d string, so this only has to handle that shape.
  const parts = hostname.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    octets.push(value);
  }
  return octets;
}

function ipv4Verdict(octets: number[]): HostVerdict {
  const [a, b] = octets;
  if (a === 127) return { ok: false, reason: "loopback address" };
  if (a === 0) return { ok: false, reason: "unspecified address" };
  if (a === 10) return { ok: false, reason: PRIVATE_REASON };
  if (a === 172 && b >= 16 && b <= 31) return { ok: false, reason: PRIVATE_REASON };
  if (a === 192 && b === 168) return { ok: false, reason: PRIVATE_REASON };
  if (a === 169 && b === 254) return { ok: false, reason: "cloud metadata / link-local address" };
  if (a === 100 && b >= 64 && b <= 127) return { ok: false, reason: "carrier-grade NAT address" };
  if (a >= 224) return { ok: false, reason: "multicast or reserved address" };
  return { ok: true };
}

/**
 * Extract the IPv6 hextets of a URL hostname, or null when it is not IPv6.
 * `URL` wraps IPv6 literals in brackets and compresses runs of zeroes, so
 * `::1`, `::ffff:127.0.0.1` and `fe80::1` all arrive in canonical form.
 */
function parseIpv6(hostname: string): number[] | null {
  if (!hostname.startsWith("[") || !hostname.endsWith("]")) return null;
  const inner = hostname.slice(1, -1);
  if (!inner.includes(":")) return null;

  // An embedded dotted-quad tail (::ffff:127.0.0.1) becomes two hextets.
  let source = inner;
  const lastColon = source.lastIndexOf(":");
  const tail = source.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    const high = ((v4[0] << 8) | v4[1]).toString(16);
    const low = ((v4[2] << 8) | v4[3]).toString(16);
    source = `${source.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const [head, rest] = source.includes("::")
    ? source.split("::")
    : [source, undefined];
  const headParts = head ? head.split(":") : [];
  const restParts = rest === undefined ? [] : rest ? rest.split(":") : [];
  const missing = 8 - headParts.length - restParts.length;
  if (rest === undefined && headParts.length !== 8) return null;
  if (missing < 0) return null;

  const groups = [
    ...headParts,
    ...Array.from({ length: missing }, () => "0"),
    ...restParts,
  ];
  if (groups.length !== 8) return null;

  const hextets: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    hextets.push(Number.parseInt(group, 16));
  }
  return hextets;
}

function ipv6Verdict(hextets: number[]): HostVerdict {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  const firstFiveZero = h0 === 0 && h1 === 0 && h2 === 0 && h3 === 0 && h4 === 0;

  // Order matters: ::1 and :: are checked BEFORE the embedded-IPv4 rule,
  // otherwise ::1 would be read as IPv4 0.0.0.1 and misreported.
  if (hextets.every((h) => h === 0)) return { ok: false, reason: "unspecified address" };
  if (firstFiveZero && h5 === 0 && h6 === 0 && h7 === 1) {
    return { ok: false, reason: "loopback address" };
  }

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) — judge the
  // embedded IPv4 address, otherwise ::ffff:169.254.169.254 would slip past.
  if (firstFiveZero && (h5 === 0xffff || h5 === 0)) {
    const inner = ipv4Verdict([h6 >> 8, h6 & 0xff, h7 >> 8, h7 & 0xff]);
    if (!inner.ok) return inner;
  }

  if ((h0 & 0xfe00) === 0xfc00) return { ok: false, reason: PRIVATE_REASON }; // fc00::/7
  if ((h0 & 0xffc0) === 0xfe80) return { ok: false, reason: "link-local address" }; // fe80::/10
  if ((h0 & 0xff00) === 0xff00) return { ok: false, reason: "multicast address" }; // ff00::/8
  return { ok: true };
}

/** Judge a URL hostname (IPv4, IPv6 literal, or DNS name). */
function hostVerdict(hostname: string): HostVerdict {
  // URL lowercases and strips a trailing dot from hostnames; normalise again
  // defensively because "metadata.google.internal." must not bypass the set.
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: "cloud metadata or loopback hostname" };
  }

  const v6 = parseIpv6(host);
  if (v6) return ipv6Verdict(v6);

  const v4 = parseIpv4(host);
  if (v4) return ipv4Verdict(v4);

  // A name with no dot cannot be a public FQDN and is almost always an
  // internal resolver entry ("intranet", "jenkins"). Require a dotted name.
  if (!host.includes(".")) {
    return { ok: false, reason: "single-label (internal) hostname" };
  }
  return { ok: true };
}

/** True for loopback hosts, where plain http is permitted for local dev. */
function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host === "localhost.localdomain") return true;
  const v6 = parseIpv6(host);
  if (v6) {
    return v6.slice(0, 7).every((h) => h === 0) && v6[7] === 1;
  }
  const v4 = parseIpv4(host);
  return v4 !== null && v4[0] === 127;
}

export function normalizeWebhookUrl(
  raw: string
): { ok: true; url: string } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Enter a valid absolute URL." };
  }

  const verdict = hostVerdict(parsed.hostname);
  const loopback = isLoopbackHost(parsed.hostname);

  // Plain http is a local-development affordance only; never for a public
  // destination, and never for a private/metadata one either.
  if (parsed.protocol === "http:" && loopback) {
    return { ok: true, url: parsed.toString() };
  }

  if (!verdict.ok) {
    return {
      ok: false,
      error: `Webhook URLs cannot target ${verdict.reason}. Use a publicly reachable https endpoint.`,
    };
  }

  if (parsed.protocol === "https:") {
    return { ok: true, url: parsed.toString() };
  }

  return {
    ok: false,
    error: "Webhook URLs must use https (http is allowed for localhost only).",
  };
}

/** Attempt n (1-based) → ms to wait before the NEXT attempt, or null when
 *  the schedule is exhausted (3 attempts total). */
export function backoffForAttempt(attempt: number): number | null {
  const idx = attempt - 1;
  return idx >= 0 && idx < RETRY_BACKOFF_MS.length ? RETRY_BACKOFF_MS[idx] : null;
}

export function buildDeliveryBody(row: {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}): string {
  return JSON.stringify({
    id: row.id,
    event_type: row.event_type,
    payload: row.payload,
    created_at: row.created_at,
  });
}

export function buildDeliveryHeaders(
  body: string,
  secret: string,
  timestampSec: number,
  deliveryId: string,
  eventType: string
): Record<string, string> {
  return {
    "content-type": "application/json",
    [SIGNATURE_HEADER]: signPayload(secret, timestampSec, body),
    [EVENT_HEADER]: eventType,
    [DELIVERY_HEADER]: deliveryId,
  };
}
