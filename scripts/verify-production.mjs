#!/usr/bin/env node
/**
 * verify:production — launch smoke checks against a RUNNING production
 * server (`npm run build && npm start`), with no browser required.
 *
 * WHAT IT PROVES (server/HTML level only):
 *   • the marketing routes render 200 with complete metadata (title,
 *     description, canonical, Open Graph, Twitter card, theme-color)
 *   • the generated social image, apple icon, favicon, sitemap.xml and
 *     robots.txt all resolve
 *   • the production security headers are present and X-Powered-By is not
 *   • every internal link published on the landing page resolves
 *     (authenticated app routes may redirect to /login — that is the
 *     expected auth behaviour, recorded, not failed)
 *   • an unknown route 404s; the landing JSON-LD parses
 *   • local loopback TTFB/total timing for the landing page (labelled
 *     local evidence — NOT a Core Web Vitals field measurement)
 *
 * WHAT IT CANNOT PROVE: layout, animation, INP/LCP in a real browser.
 * Those need scripts/verify-motion.mjs (Chromium) — see
 * docs/PRODUCTION_LAUNCH_READINESS.md §5/§13 for the sandbox limitation.
 *
 * RUN
 *   npm run build && npm start                 # terminal 1
 *   npm run verify:production                  # terminal 2
 * Env: PROD_BASE (default http://127.0.0.1:3000)
 */
const BASE = (process.env.PROD_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");

const failures = [];
const notes = [];
function check(condition, message, detail) {
  if (!condition) failures.push(detail ? `${message} — ${detail}` : message);
}
function note(message) {
  notes.push(message);
}

async function get(path, { redirect = "follow", headers } = {}) {
  const started = performance.now();
  const res = await fetch(`${BASE}${path}`, { redirect, headers });
  const ttfb = performance.now() - started;
  const body = await res.text();
  return { res, body, ttfb, total: performance.now() - started };
}

const MARKETING = ["/", "/about", "/pricing", "/vs", "/vs/notion"];

async function main() {
  console.log(`verify:production → ${BASE}`);

  // ── Marketing routes + metadata ─────────────────────────────────────
  let landingHtml = "";
  for (const path of MARKETING) {
    const { res, body } = await get(path);
    check(res.status === 200, `${path} status`, `got ${res.status}`);
    if (path === "/") landingHtml = body;
    for (const needle of ["<title>", 'name="description"', 'rel="canonical"', 'property="og:title"', 'property="og:image"', 'name="twitter:card"', 'name="theme-color"']) {
      check(body.includes(needle), `${path} metadata`, `missing ${needle}`);
    }
    const canonical = body.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? "";
    check(
      canonical !== "" && new URL(canonical, BASE).pathname.replace(/\/$/, "") === path.replace(/\/$/, ""),
      `${path} canonical`,
      `canonical="${canonical}"`,
    );
    check(!body.toLowerCase().includes("forma-visuvate"), `${path} brand leakage`, "reference brand in HTML");
  }
  note("metadata checked on /, /about, /pricing, /vs, /vs/notion");

  // JSON-LD parses and names roducq.
  const ld = landingHtml.match(/type="application\/ld\+json">([^<]+)</)?.[1];
  check(Boolean(ld), "/ JSON-LD present");
  if (ld) {
    try {
      const parsed = JSON.parse(ld);
      check(parsed["@type"] === "WebSite" && parsed.name === "roducq", "/ JSON-LD identity", JSON.stringify(parsed).slice(0, 120));
    } catch {
      check(false, "/ JSON-LD parses");
    }
  }

  // ── Generated assets resolve ────────────────────────────────────────
  const ogImage = landingHtml.match(/property="og:image" content="([^"]+)"/)?.[1];
  check(Boolean(ogImage), "/ og:image URL present");
  if (ogImage) {
    const ogPath = new URL(ogImage, BASE).pathname;
    const { res } = await get(ogPath);
    check(res.status === 200 && (res.headers.get("content-type") || "").includes("image/"), "og:image resolves", `${ogPath} → ${res.status} ${res.headers.get("content-type")}`);
  }
  for (const [path, type] of [["/apple-icon", "image/"], ["/icon.svg", "image/svg"], ["/sitemap.xml", "xml"], ["/robots.txt", "text/plain"]]) {
    const { res, body } = await get(path);
    check(res.status === 200 && (res.headers.get("content-type") || "").includes(type), `${path} resolves`, `${res.status} ${res.headers.get("content-type")}`);
    if (path === "/sitemap.xml") {
      for (const p of ["/about", "/pricing", "/vs", "/vs/notion"]) check(body.includes(p), "sitemap lists marketing routes", `missing ${p}`);
      check(!body.includes("/dashboard"), "sitemap excludes app routes");
    }
    if (path === "/robots.txt") {
      check(body.includes("Disallow: /api/"), "robots disallows /api/");
      check(body.includes("Sitemap:"), "robots references sitemap");
    }
  }

  // ── Security headers (production mode only sets them) ───────────────
  {
    const { res } = await get("/");
    const h = res.headers;
    check((h.get("strict-transport-security") || "").includes("max-age="), "HSTS header");
    check(h.get("x-content-type-options") === "nosniff", "nosniff header");
    check(h.get("x-frame-options") === "DENY", "frame denial header");
    check((h.get("content-security-policy") || "").includes("default-src 'self'"), "CSP header");
    check(h.get("x-powered-by") === null, "X-Powered-By absent", `got ${h.get("x-powered-by")}`);
  }

  // ── Protected route and public-route boundaries ─────────────────────
  {
    const { res } = await get("/search", { redirect: "manual" });
    const location = res.headers.get("location");
    check(res.status === 307, "/search requires authentication", `got ${res.status}`);
    check(
      Boolean(location) && new URL(location, BASE).pathname === "/login",
      "/search redirects to /login",
      `got ${location}`
    );

    for (const path of ["/", "/pricing", "/share/not-a-uuid", "/invoice/not-a-uuid"]) {
      const { res: publicResponse } = await get(path, { redirect: "manual" });
      check(publicResponse.status === 200, `${path} remains public`, `got ${publicResponse.status}`);
      check(
        !publicResponse.headers.has("location"),
        `${path} is not redirected by the auth guard`,
        `got ${publicResponse.headers.get("location")}`
      );
    }

    const { res: lookalike } = await get("/searching", { redirect: "manual" });
    check(lookalike.status === 404, "/search prefix has an exact path boundary", `got ${lookalike.status}`);

    const { res: callback } = await get(
      "/auth/callback?code=smoke-test-code&next=%2F%5C%5Cattacker.example",
      { redirect: "manual", headers: { host: "attacker.example" } }
    );
    const callbackLocation = callback.headers.get("location");
    check(callback.status === 307 && Boolean(callbackLocation), "callback returns a safe redirect");
    if (callbackLocation) {
      const callbackTarget = new URL(callbackLocation, BASE);
      check(callbackTarget.hostname !== "attacker.example", "callback never trusts request Host", callbackLocation);
      check(callbackTarget.pathname === "/login", "callback error returns to login", callbackLocation);
    }
  }
  note("/search redirects to /login; marketing and public token routes remain public; callback Host is allowlisted");

  // ── Landing link crawl ──────────────────────────────────────────────
  const hrefs = [...new Set([...landingHtml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))]
    .filter((h) => h.startsWith("/") && !h.startsWith("/_next") && !h.startsWith("/icon.svg"));
  for (const href of hrefs) {
    const path = href.split("#")[0] || "/";
    const { res } = await get(path);
    const finalPath = new URL(res.url).pathname;
    const authRedirect = finalPath === "/login" && path !== "/login";
    check(res.status < 400, `link ${path}`, `→ ${res.status} (final ${finalPath})`);
    if (authRedirect) note(`link ${path} → auth redirect to /login (expected)`);
  }
  note(`crawled ${hrefs.length} internal landing links`);

  // ── 404 behaviour ───────────────────────────────────────────────────
  {
    const { res } = await get("/production-smoke-no-such-route");
    check(res.status === 404, "unknown route 404s", `got ${res.status}`);
  }

  // ── Local timing (loopback; NOT field CWV) ──────────────────────────
  {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const { ttfb, total, res } = await get("/");
      check(res.status === 200, "/ timing sample status");
      samples.push({ ttfb: Math.round(ttfb), total: Math.round(total) });
    }
    note(`local loopback / timing (TTFB+transfer, ms): ${samples.map((s) => `${s.ttfb}/${s.total}`).join(", ")}`);
  }

  for (const n of notes) console.log(`  · ${n}`);
  if (failures.length) {
    console.error(`\nFAIL (${failures.length}):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("\nPASS — production smoke checks green (browser CWV not covered by this harness).");
}

main().catch((err) => {
  console.error(`verify:production could not run: ${err.message}`);
  console.error("Is the production server running?  npm run build && npm start");
  process.exit(1);
});
