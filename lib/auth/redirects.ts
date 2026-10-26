const HTTP_ORIGIN = /^https?:\/\//i;

/**
 * Convert a configured origin/host to a normal HTTP(S) origin. Vercel's
 * deployment URL environment variables are host-only; configured site URLs
 * may include a scheme and path. Credentials and non-web protocols are never
 * accepted as trusted origins.
 */
export function normalizeTrustedOrigin(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(HTTP_ORIGIN.test(raw) ? raw : `https://${raw}`);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Use a request origin only when it exactly matches deployment-controlled
 * configuration. The request URL can contain a client-supplied Host value,
 * so it must never itself establish trust. Unknown hosts fall back to the
 * configured application origin.
 */
function configuredOriginAllowlist(
  configuredOrigins: readonly (string | undefined)[],
  fallbackOrigin: string
): Set<string> {
  return new Set(
    [...configuredOrigins, fallbackOrigin]
      .map(normalizeTrustedOrigin)
      .filter((origin): origin is string => origin !== null)
  );
}

/** True only when the request origin matches a deployment-configured origin. */
export function isTrustedAppRequestOrigin(
  requestUrl: string,
  configuredOrigins: readonly (string | undefined)[],
  fallbackOrigin: string
): boolean {
  let requestOrigin: string | null = null;
  try {
    requestOrigin = normalizeTrustedOrigin(new URL(requestUrl).origin);
  } catch {
    return false;
  }
  return Boolean(
    requestOrigin &&
      configuredOriginAllowlist(configuredOrigins, fallbackOrigin).has(requestOrigin)
  );
}

export function trustedAppOriginForRequest(
  requestUrl: string,
  configuredOrigins: readonly (string | undefined)[],
  fallbackOrigin: string
): string {
  const fallback = normalizeTrustedOrigin(fallbackOrigin);
  if (!fallback) {
    throw new Error("A valid trusted application origin is required.");
  }

  if (isTrustedAppRequestOrigin(requestUrl, configuredOrigins, fallbackOrigin)) {
    return normalizeTrustedOrigin(new URL(requestUrl).origin)!;
  }
  return fallback;
}

function hasBackslashAfterDecoding(value: string): boolean {
  let candidate = value;
  // Query parameters have already been decoded once by URLSearchParams. Peel
  // additional percent-encoding layers so malformed unrelated escapes do
  // not hide a nested %5c. This is inspection only; the navigated path stays
  // unchanged.
  for (let i = 0; i < 8; i++) {
    if (candidate.includes("\\") || /%5c/i.test(candidate)) return true;
    const decoded = candidate.replace(/%([0-9a-f]{2})/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    );
    if (decoded === candidate) return false;
    candidate = decoded;
  }
  return candidate.includes("\\") || /%5c/i.test(candidate);
}

/**
 * Validate and return an absolute path on the trusted app origin. Rooted
 * relative paths are kept verbatim (including query/hash) so invite tokens
 * and other internal return state are preserved. The origin is supplied by
 * deployment configuration, never inferred from an untrusted Host header.
 */
export function safeSameOriginPath(
  value: string | null,
  trustedOrigin: string,
  fallback: string
): string {
  const origin = normalizeTrustedOrigin(trustedOrigin);
  if (
    !origin ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    hasBackslashAfterDecoding(value)
  ) {
    return fallback;
  }

  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? value : fallback;
  } catch {
    return fallback;
  }
}
