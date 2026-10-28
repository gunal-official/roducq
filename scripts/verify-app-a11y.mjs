#!/usr/bin/env node
/**
 * App accessibility + timer regression, using a fictional loopback fixture.
 * This is NOT a production/RLS test. See main() for safe cleanup guards.
 *
 * npm ci
 * CHROMIUM_PATH=/path/to/chromium node scripts/verify-app-a11y.mjs
 *
 * The script builds with a fictional loopback-only Supabase substitute and a
 * sanitized environment. It refuses to run if Next could load a real .env
 * file or if resp-next already exists; it never kills listeners, removes a
 * directory it did not create, or connects the browser to external hosts.
 * Screenshots and a JSON ledger are left in a newly created OS temp directory.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import { installFixtureNetwork } from "./responsive/phase-f.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";
const FIRST_TOKEN = "44444444-4444-4444-8444-444444444444";
const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1440];
const HEIGHTS = { 320: 568, 375: 667, 390: 844, 768: 900, 1024: 900, 1200: 900, 1440: 900 };
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const browserErrors = [];
const today = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const created = "2026-01-10T10:00:00.000Z";

function initialState(overrides = {}) {
  return {
    role: "owner", status: "draft", link: "none", token: FIRST_TOKEN,
    pipeline: false, updates: null, invoices: [], contracts: [], title: "Fictional weekly update",
    body: "The fictional milestone is on track.", failStatus: false, statusDelayMs: 900, timerDelayMs: 0, failTimer: false, multi: false, writes: [], requests: [], ...overrides,
  };
}
let state = initialState();
function reset(overrides = {}) { state = initialState(overrides); }
function updateRow() {
  return {
    id: ID, workspace_id: WORKSPACE, status: state.status, title: state.title,
    body: state.body, client_name: null, created_at: created, updated_at: created, plan: null, plan_id: null, template_id: null,
  };
}
function briefRow() {
  return {
    id: ID, workspace_id: WORKSPACE, title: "Fictional project brief", status: "draft",
    created_at: created, updated_at: created, content: "Example brief", content_md: "Example brief",
    sources: [], questions: [],
  };
}
function invoice(id, due, status = "sent") {
  return { id, workspace_id: WORKSPACE, title: "Fictional invoice", invoice_number: 1, client_name: null,
    items: [], tax_percent: 0, status, due_date: due, paid_at: null, created_at: created, updated_at: created };
}
function contract(id, expiry, status = "sent") {
  return { id, workspace_id: WORKSPACE, title: "Fictional contract", status,
    expires_on: expiry, created_at: created, updated_at: created };
}
const overdue = () => invoice("inv-overdue", today(-1));
const expiring = () => contract("contract-soon", today(5));

async function bodyOf(req) {
  const parts = [];
  for await (const chunk of req) parts.push(chunk);
  const raw = Buffer.concat(parts).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}
function send(req, res, data, status = 200, extra = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": req.headers["access-control-request-headers"] || "*", ...extra,
  });
  res.end(JSON.stringify(data));
}
function single(req, row) {
  // PostgREST's maybeSingle() accepts an array for zero/one records.
  if (req.headers.accept?.includes("application/vnd.pgrst.object+json")) return row ?? null;
  return row == null ? [] : [row];
}

function fixtureServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const pathname = url.pathname;
      if (req.method === "OPTIONS") return send(req, res, {});
      const payload = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) ? await bodyOf(req) : {};
      state.requests.push({ method: req.method, path: pathname });
      if (pathname === "/auth/v1/user") return send(req, res, {
        id: USER, email: "fictional@example.test", aud: "authenticated", role: "authenticated",
        app_metadata: {}, user_metadata: { full_name: "Fictional User" },
      });
      if (pathname === "/rest/v1/rpc/get_shared_document") {
        const valid = state.link === "active" && payload.p_token === state.token;
        return send(req, res, valid ? [{ status: state.status, title: state.title,
          client_name: null, body: state.body, updated_at: created }] : []);
      }
      if (pathname === "/rest/v1/rpc/get_user_memberships") return send(req, res, [{
        workspace_id: WORKSPACE, workspace_name: "Fictional Studio", role: state.role,
      }]);
      if (pathname === "/rest/v1/profiles") return send(req, res, single(req, {
        id: USER, email: "fictional@example.test", full_name: "Fictional User",
        onboarding_completed: true, active_workspace_id: WORKSPACE,
      }));
      if (pathname === "/rest/v1/workspaces") return send(req, res, single(req, {
        id: WORKSPACE, name: "Fictional Studio", created_at: created,
        plan_tier: "starter", razorpay_subscription_status: null,
      }));
      if (pathname === "/rest/v1/workspace_members") {
        const member = { user_id: USER, workspace_id: WORKSPACE, role: state.role, created_at: created,
          workspace: { id: WORKSPACE, name: "Fictional Studio", created_at: created,
            plan_tier: "starter", razorpay_subscription_status: null } };
        const other = { user_id: USER, workspace_id: "77777777-7777-4777-8777-777777777777", role: state.role, created_at: created,
          workspace: { id: "77777777-7777-4777-8777-777777777777", name: "Second Fictional Studio", created_at: created,
            plan_tier: "starter", razorpay_subscription_status: null } };
        return send(req, res, state.multi ? [member, other] : single(req, member));
      }
      if (pathname === "/rest/v1/updates") {
        if (req.method === "PATCH") {
          state.writes.push({ path: pathname, method: req.method, body: payload });
          if (payload.status !== undefined) {
            await new Promise((resolve) => setTimeout(resolve, state.statusDelayMs));
            if (state.failStatus) return send(req, res, { code: "SYNTHETIC", message: "Synthetic status save failure", details: null, hint: null }, 400);
            state.status = payload.status;
          }
          if (payload.title !== undefined) state.title = payload.title;
          if (payload.body !== undefined) state.body = payload.body;
          return send(req, res, []);
        }
        const isDetail = url.searchParams.has("id");
        return send(req, res, isDetail ? single(req, updateRow()) : (state.updates ?? (state.pipeline ? [updateRow()] : [])));
      }
      if (pathname === "/rest/v1/share_links") {
        if (req.method === "POST") {
          state.writes.push({ path: pathname, method: req.method, body: payload });
          state.link = "active";
          state.token = payload.token || FIRST_TOKEN;
          return send(req, res, []);
        }
        if (req.method === "PATCH") {
          state.writes.push({ path: pathname, method: req.method, body: payload });
          state.link = payload.revoked_at === null ? "active" : "revoked";
          if (payload.token) state.token = payload.token;
          return send(req, res, []);
        }
        const row = state.link === "none" ? null : {
          id: "55555555-5555-4555-8555-555555555555", workspace_id: WORKSPACE,
          document_type: "update", document_id: ID, token: state.token, created_at: created,
          revoked_at: state.link === "revoked" ? created : null,
        };
        return send(req, res, single(req, row));
      }
      if (pathname === "/rest/v1/time_entries") {
        if (req.method === "POST") {
          state.writes.push({ path: pathname, method: req.method, body: payload });
          if (state.timerDelayMs) await new Promise((resolve) => setTimeout(resolve, state.timerDelayMs));
          if (state.failTimer) return send(req, res, { code: "SYNTHETIC", message: "Synthetic time save failure", details: null, hint: null }, 400);
        }
        return send(req, res, []);
      }
      if (pathname === "/rest/v1/briefs") return send(req, res, state.pipeline ? [briefRow()] : []);
      if (pathname === "/rest/v1/invoices") return send(req, res, state.invoices);
      if (pathname === "/rest/v1/contracts") return send(req, res, state.contracts);
      if (pathname.startsWith("/rest/v1/")) return send(req, res, []);
      return send(req, res, { error: "Unknown fixture endpoint" }, 404);
    } catch (error) {
      console.error("Fixture server error:", error);
      if (!res.headersSent) send(req, res, { error: "Fixture server error" }, 500);
      else res.end();
    }
  });
}
async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}
async function freePort() {
  const server = createNetServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port; // Next fails normally if another process claims it; we never terminate that process.
}
function run(command, args, env, logfile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    child.stdout.on("data", (d) => { log += d; });
    child.stderr.on("data", (d) => { log += d; });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      writeFileSync(logfile, log);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code ?? signal}; see ${logfile}\n${log.slice(-5000)}`));
    });
  });
}
async function waitForServer(url, child) {
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error("Fixture Next process exited before startup");
    try { const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1500) }); if (response.status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Fixture Next process did not start within 60 seconds");
}
function sessionCookie() {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER, aud: "authenticated", exp: 2000000000, iat: 1750000000 })}.fictional`;
  const session = { access_token: token, refresh_token: "fictional-local-refresh",
    token_type: "bearer", expires_in: 3600, expires_at: 2000000000,
    user: { id: USER, email: "fictional@example.test", aud: "authenticated", role: "authenticated",
      app_metadata: {}, user_metadata: { full_name: "Fictional User" } } };
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}
async function newContext(browser, base, stubOrigin, { width = 1440, scheme = "light", auth = true, motion = "reduce" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: HEIGHTS[width] }, colorScheme: scheme, deviceScaleFactor: 1,
    locale: "en-US", timezoneId: "UTC", reducedMotion: motion, serviceWorkers: "block" });
  if (auth) await context.addCookies([{ name: "sb-127-auth-token", value: sessionCookie(), url: base }]);
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base || url.origin === stubOrigin) return route.continue();
    return route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push({ type: "pageerror", message: error.message }));
  page.on("response", (response) => {
    if (response.url().startsWith(base) && response.status() >= 400)
      browserErrors.push({ type: "http", status: response.status(), url: response.url() });
  });
  await installFixtureNetwork(page, base, stubOrigin);
  await context.grantPermissions(["local-network-access", "clipboard-read", "clipboard-write"], { origin: base });
  return { context, page };
}
async function goto(page, base, route, scheme) {
  const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, `GET ${route}: expected HTTP 200`);
  await page.locator("main").waitFor();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction((wanted) => document.documentElement.classList.contains("dark") === (wanted === "dark"), scheme);
}

async function focusSnapshot(page) {
  return page.evaluate(() => {
    const e = document.activeElement;
    return { tag: e?.tagName, id: e?.id || null, role: e?.getAttribute("role"), label: e?.getAttribute("aria-label") };
  });
}
async function axeResult(page) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: AXE });
  return page.evaluate(async (tags) => {
    const report = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    const rules = (kind) => report[kind].map((rule) => ({
      id: rule.id, impact: rule.impact,
      nodes: rule.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
    }));
    return { violations: rules("violations"), incomplete: rules("incomplete"),
      colorContrast: report.violations.some((r) => r.id === "color-contrast") ? "violation" :
        report.incomplete.some((r) => r.id === "color-contrast") ? "incomplete" :
          report.passes.some((r) => r.id === "color-contrast") ? "pass" : "inapplicable" };
  }, AXE_TAGS);
}

/** Pixel comparison of actual composited backgrounds, NOT an axe pass.
 * Canvas decodes the browser's own paired PNGs, avoiding optional external
 * image dependencies. Only the wordmark's text color is temporarily hidden;
 * layout, gradient, and ancestors are unchanged between captures. */
async function renderedGradient(page, output, stem) {
  const word = page.locator('.app-sidebar a[aria-label="RoduCQ home"] > span > span');
  if (await word.count() !== 1 || !(await word.isVisible())) return null;
  await page.evaluate(() => document.fonts.ready);
  const nodes = await word.evaluate((el) => {
    const part = el.querySelector("span");
    const range = document.createRange();
    range.selectNodeContents(el.firstChild);
    const rect = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    return [
      { text: "rodu", rect: rect(range.getBoundingClientRect()), color: getComputedStyle(el).color },
      { text: "cq", rect: rect(part.getBoundingClientRect()), color: getComputedStyle(part).color },
    ];
  });
  const beforePath = path.join(output, `${stem}-gradient-text.png`);
  const bgPath = path.join(output, `${stem}-gradient-background.png`);
  const before = await page.screenshot({ path: beforePath, animations: "disabled" });
  let background;
  try {
    await word.evaluate((el) => {
      window.__contrastProbeColors = [el.style.color, el.style.getPropertyPriority("color"),
        el.firstElementChild.style.color, el.firstElementChild.style.getPropertyPriority("color")];
      el.style.setProperty("color", "transparent", "important");
      el.firstElementChild.style.setProperty("color", "transparent", "important");
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    background = await page.screenshot({ path: bgPath, animations: "disabled" });
  } finally {
    await word.evaluate((el) => {
      const [a, ap, b, bp] = window.__contrastProbeColors;
      if (a) el.style.setProperty("color", a, ap); else el.style.removeProperty("color");
      if (b) el.firstElementChild.style.setProperty("color", b, bp); else el.firstElementChild.style.removeProperty("color");
      delete window.__contrastProbeColors;
    });
  }
  const measured = await page.evaluate(async ({ a64, b64, textNodes }) => {
    async function decode(encoded) {
      const raw = atob(encoded), bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      return { pixels: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, width: bitmap.width, height: bitmap.height };
    }
    const a = await decode(a64), b = await decode(b64);
    const lum = (rgb) => {
      const c = rgb.map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
    };
    const ratio = (x, y) => {
      const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
      return (hi + .05) / (lo + .05);
    };
    return textNodes.map((node) => {
      const rgb = node.color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)?.slice(1, 4).map(Number);
      if (!rgb) throw new Error(`Unexpected computed color ${node.color}`);
      const x1 = Math.max(0, Math.floor(node.rect.x)), x2 = Math.min(a.width, Math.ceil(node.rect.x + node.rect.width));
      const y1 = Math.max(0, Math.floor(node.rect.y)), y2 = Math.min(a.height, Math.ceil(node.rect.y + node.rect.height));
      const samples = [], bounds = [];
      for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
        const i = (y * a.width + x) * 4, bg = [b.pixels[i], b.pixels[i + 1], b.pixels[i + 2]];
        const difference = Math.max(...bg.map((v, k) => Math.abs(v - a.pixels[i + k])));
        const value = ratio(rgb, bg);
        bounds.push(value);
        if (difference >= 4) samples.push(value);
      }
      if (!samples.length) throw new Error(`No rendered pixels for ${node.text}`);
      samples.sort((x, y) => x - y); bounds.sort((x, y) => x - y);
      const round = (n) => Math.round(n * 1000) / 1000;
      return { ...node, foregroundRgb: rgb, measuredGlyphPixels: samples.length,
        glyphRatio: { min: round(samples[0]), median: round(samples[Math.floor(samples.length / 2)]),
          max: round(samples.at(-1)), meets45BeforeRounding: samples[0] >= 4.5 },
        entireBoundingBoxRatio: { min: round(bounds[0]), max: round(bounds.at(-1)) } };
    });
  }, { a64: before.toString("base64"), b64: background.toString("base64"), textNodes: nodes });
  for (const node of measured) assert.equal(node.glyphRatio.meets45BeforeRounding, true, `${stem}: ${node.text} below 4.5:1 on its rendered gradient`);
  return { nodes: measured, beforeScreenshot: path.basename(beforePath), backgroundScreenshot: path.basename(bgPath),
    method: "Computed foreground versus paired Chromium screenshot background at glyph pixels (difference >=4/255), WCAG relative luminance; axe incompletes remain incomplete." };
}

async function statusProbe(page, base, scheme, width, scenario = "success") {
  const reverse = scenario === "reverse";
  reset({ status: reverse ? "sent" : "draft", link: "none", failStatus: scenario === "error",
    statusDelayMs: scenario === "guard" ? 1400 : 900 });
  await goto(page, base, `/updates/${ID}`, scheme);
  const trigger = page.getByRole("combobox", { name: "Update status" });
  await trigger.focus();
  const before = await focusSnapshot(page);
  assert.equal(before.label, "Update status");
  await page.keyboard.press("Enter");
  const wanted = reverse ? "Draft" : "Marked sent";
  await page.getByRole("option", { name: wanted, exact: true }).waitFor({ state: "visible" });
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option" && document.activeElement?.getAttribute("data-state") === "checked");
  await page.keyboard.press(reverse ? "ArrowUp" : "ArrowDown");
  await page.waitForFunction((label) => document.activeElement?.getAttribute("role") === "option" && document.activeElement?.textContent?.trim() === label, wanted);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector('[aria-label="Update status"]')?.getAttribute("aria-disabled") === "true");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Update status", null, { timeout: 3000 });
  const during = await focusSnapshot(page);
  assert.equal(await trigger.evaluate((el) => el.disabled), false, "Pending status must stay natively focusable");
  let moved = null;
  if (scenario === "move-focus") {
    await page.locator("#global-search").focus();
    moved = await focusSnapshot(page);
    assert.equal(moved.id, "global-search");
  }
  if (scenario === "guard") {
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("d");
    const box = await trigger.boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false", "Pending selection reopened");
    // The optimistic pending state can render before the first request
    // reaches the fixture. Reject duplicates now; require exactly one after
    // the pending save completes below.
    assert.ok(state.writes.filter((w) => w.path === "/rest/v1/updates").length <= 1, "Pending selection submitted twice");
  }
  await page.waitForFunction(() => document.querySelector('[aria-label="Update status"]')?.getAttribute("aria-disabled") === "false", null, { timeout: 15000 });
  if (scenario === "error") await page.getByRole("alert").filter({ hasText: "Synthetic status save failure" }).waitFor();
  await page.waitForTimeout(120);
  const after = await focusSnapshot(page);
  if (scenario === "move-focus") assert.equal(after.id, "global-search", "Save stole deliberate focus");
  else assert.equal(after.label, "Update status", `Focus lost after ${scenario}: ${JSON.stringify(after)}`);
  assert.equal(state.status, scenario === "error" ? "draft" : reverse ? "draft" : "sent");
  assert.equal(state.writes.filter((w) => w.path === "/rest/v1/updates").length, 1);
  const display = (await trigger.innerText()).trim();
  assert.equal(display, state.status === "sent" ? "Marked sent" : "Draft");
  return { scheme, width, scenario, before, during, moved, after, display, fixtureStatus: state.status,
    error: scenario === "error" ? await page.getByRole("alert").filter({ hasText: "Synthetic status save failure" }).innerText() : null };
}

async function timerDockGeometry(page, phase) {
  return page.evaluate((which) => {
    const main = document.querySelector("main");
    const timer = which === "idle" ? [...document.querySelectorAll("button")].find((e) => e.textContent.trim() === "Start timer") :
      document.querySelector('[aria-label="What are you working on?"]')?.parentElement;
    if (!main || !timer) throw new Error(`Missing main or ${which} timer`);
    const rect = (r) => ({ x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2), bottom: +r.bottom.toFixed(2) });
    const m = main.getBoundingClientRect(), t = timer.getBoundingClientRect();
    const controls = [...main.querySelectorAll('button, input:not([type="hidden"]), textarea, select, a[href], [role="combobox"]')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0);
    const max = Math.max(0, main.scrollHeight - main.clientHeight), original = main.scrollTop;
    const positions = []; for (let y = 0; y < max; y += 8) positions.push(y); positions.push(max);
    const hits = [];
    for (const y of positions) {
      main.scrollTop = y;
      for (const field of controls) {
        const f = field.getBoundingClientRect();
        const x1 = Math.max(f.left, t.left, m.left, 0), x2 = Math.min(f.right, t.right, m.right, innerWidth);
        const y1 = Math.max(f.top, t.top, m.top, 0), y2 = Math.min(f.bottom, t.bottom, m.bottom, innerHeight);
        if (x2 <= x1 || y2 <= y1) continue;
        const hit = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
        if (timer.contains(hit)) hits.push({ scrollTop: main.scrollTop, tag: field.tagName,
          label: field.getAttribute("aria-label") || field.id || field.textContent.trim().slice(0, 80),
          intersection: { width: +(x2 - x1).toFixed(2), height: +(y2 - y1).toFixed(2) } });
      }
    }
    main.scrollTop = original;
    return { phase: which, main: rect(m), timer: rect(t), gap: +(t.top - m.bottom).toFixed(2),
      maxScroll: max, positions: positions.length, controls: controls.length, hits,
      horizontalOverflow: { document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        main: main.scrollWidth - main.clientWidth } };
  }, phase);
}

async function timerProbe(page, base, width, output, scheme = "light") {
  reset({ timerDelayMs: 1100 });
  await goto(page, base, "/intake", scheme);
  await page.locator("#intake-context").waitFor({ state: "visible" });
  const idle = await timerDockGeometry(page, "idle");
  if (width < 1024) {
    assert.ok(idle.gap >= -0.01, `${width}: idle timer overlaps the scrollport: ${JSON.stringify(idle)}`);
    assert.deepEqual(idle.hits, [], `${width}: idle timer blocks main controls`);
  }
  assert.ok(idle.horizontalOverflow.document <= 1 && idle.horizontalOverflow.main <= 1, `${width}: horizontal overflow`);
  await page.getByRole("button", { name: "Start timer" }).click();
  const runningInput = page.getByRole("textbox", { name: "What are you working on?" });
  await runningInput.fill("Fictional accessibility session");
  const storedBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1")));
  assert.equal(storedBefore.label, "Fictional accessibility session");
  if (width === 375) {
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Stop", exact: true }).waitFor();
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1")));
    assert.deepEqual(restored, storedBefore, "Reload changed the running timer");
    assert.equal(await page.getByRole("textbox", { name: "What are you working on?" }).inputValue(), storedBefore.label);
  }
  const running = await timerDockGeometry(page, "running");
  if (width < 1024) {
    assert.ok(running.gap >= -0.01, `${width}: running timer overlaps the scrollport: ${JSON.stringify(running)}`);
    assert.deepEqual(running.hits, [], `${width}: running timer blocks main controls`);
  }
  // Keyboard focus must scroll both formerly obscured controls into the real
  // scrollport; a center-point hit must reach the control, not the dock.
  const focusedControls = [];
  for (const control of [page.locator("#intake-context"), page.getByRole("button", { name: "Add a file" })]) {
    await control.focus();
    const info = await control.evaluate((el) => {
      const r = el.getBoundingClientRect(), main = document.querySelector("main").getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
      return { label: el.id || el.textContent.trim(), focused: document.activeElement === el,
        centerInScrollport: x >= main.left && x <= main.right && y >= main.top && y <= main.bottom,
        hitOwnControl: hit === el || el.contains(hit), width: r.width, height: r.height };
    });
    assert.equal(info.focused && info.centerInScrollport && info.hitOwnControl, true, `${width}: focused control obscured ${JSON.stringify(info)}`);
    assert.ok(info.width >= 43.5 && info.height >= 43.5);
    focusedControls.push(info);
  }
  const stop = page.getByRole("button", { name: "Stop", exact: true });
  await stop.focus(); await page.keyboard.press("Enter");
  const result = { width, height: HEIGHTS[width], idle, running, focusedControls, modal: width < 1024, actions: [], storedBefore };
  if (width >= 1024) {
    assert.equal(await page.getByRole("dialog", { name: "Log this session" }).count(), 0, "Desktop stop form became modal");
    await page.getByRole("textbox", { name: "What did you work on?" }).waitFor();
    await page.getByRole("button", { name: "Keep running" }).click();
    assert.equal(await page.getByRole("button", { name: "Stop", exact: true }).count(), 1);
    result.actions.push("desktop remains non-modal; Keep running");
    await page.getByRole("button", { name: "Discard this session" }).click();
    assert.equal(await page.evaluate(() => localStorage.getItem("roducq.timer.v1")), null);
    result.actions.push("discard clears local timer");
    return result;
  }
  const dialog = page.getByRole("dialog", { name: "Log this session" });
  async function checkOpen() {
    await dialog.waitFor({ state: "visible" });
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "What did you work on?");
    assert.equal(await dialog.getAttribute("aria-modal"), "true");
  }
  async function checkClosed() {
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Stop" && document.activeElement?.tagName === "BUTTON", null, { timeout: 5000 });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1")));
    assert.equal(stored.startedAt, storedBefore.startedAt, "Dismissal changed the timer start");
    assert.equal(stored.label, storedBefore.label, "Dismissal changed the timer label");
    assert.equal(state.writes.filter((w) => w.path === "/rest/v1/time_entries").length, 0, "Dismissal saved time");
  }
  async function reopen() {
    await page.getByRole("button", { name: "Stop", exact: true }).press("Enter");
    await checkOpen();
  }
  await checkOpen();
  const modalGeometry = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const controls = [...el.querySelectorAll('button,input,[role="combobox"]')].map((control) => {
      const c = control.getBoundingClientRect();
      return { label: control.getAttribute("aria-label") || control.textContent.trim(), width: c.width, height: c.height,
        insideHorizontally: c.left >= r.left - 0.5 && c.right <= r.right + 0.5 };
    });
    return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, controls };
  });
  assert.ok(modalGeometry.x >= 0 && modalGeometry.y >= 0 && modalGeometry.bottom <= modalGeometry.viewportHeight + 0.5);
  for (const control of modalGeometry.controls) {
    assert.ok(control.width >= 43.5 && control.height >= 43.5 && control.insideHorizontally, `${width}: clipped or undersized modal control ${JSON.stringify(control)}`);
  }
  if (width === 320) assert.ok(modalGeometry.controls.find((c) => c.label === "Worked on").width >= 154, "Date control too narrow for its native picker at 320px");
  result.modalGeometry = modalGeometry;
  const modalAxe = await axeResult(page);
  assert.deepEqual(modalAxe.violations, [], `${width}: modal axe violations`);
  result.modalAxe = modalAxe;
  await page.screenshot({ path: path.join(output, `timer-${width}-modal.png`), animations: "disabled" });
  // All Tab navigation stays inside; an attempted programmatic background
  // focus is pulled back by the modal's focus scope.
  for (const key of ["Tab", "Shift+Tab"]) for (let i = 0; i < 10; i++) {
    await page.keyboard.press(key);
    assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true, `${width}: ${key} escaped timer dialog`);
  }
  const blocked = await page.evaluate(() => {
    const search = document.querySelector("#global-search");
    const rect = search.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { hitTag: hit?.tagName, searchIsHit: hit === search || search.contains(hit),
      backgroundHidden: Boolean(search.closest('[aria-hidden="true"]')), bodyPointerEvents: getComputedStyle(document.body).pointerEvents };
  });
  assert.equal(blocked.searchIsHit, false, `${width}: background search receives pointer hit`);
  assert.equal(blocked.backgroundHidden, true, `${width}: background not hidden from accessibility tree`);
  result.backgroundBlocked = blocked;
  await page.keyboard.press("Escape"); await checkClosed(); result.actions.push("Escape restores Stop focus without saving");
  await reopen();
  await dialog.getByRole("button", { name: "Close timer form" }).click(); await checkClosed();
  result.actions.push("Close restores Stop focus without saving");
  await reopen();
  await dialog.getByRole("button", { name: "Keep running" }).click(); await checkClosed();
  result.actions.push("Keep running restores Stop focus without saving");
  if (width === 375) {
    const elapsed = page.locator('[aria-label="What are you working on?"]').locator("..").locator(":scope > span").first();
    const beforeTick = await elapsed.innerText();
    await page.waitForFunction((before) => document.querySelector('[aria-label="What are you working on?"]')?.parentElement?.querySelector('span')?.textContent?.trim() !== before, beforeTick, { timeout: 3000 });
    result.actions.push("resumed timer continues counting");
  }
  await reopen();
  // The nested Radix Select must be visible and usable above the scrim.
  const brief = dialog.getByRole("combobox", { name: "Brief" });
  await brief.click();
  await page.getByRole("option", { name: "General (no brief)" }).click();
  // Radix temporarily hides the parent dialog from the accessibility tree
  // while the nested Select exits; wait for that animation/cleanup.
  await page.waitForFunction(() => document.querySelector('[aria-label="Brief"]')?.getAttribute("aria-expanded") === "false");
  await dialog.waitFor({ state: "visible" });
  await brief.click();
  await page.getByRole("option", { name: "General (no brief)" }).waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector('[aria-label="Brief"]')?.getAttribute("aria-expanded") === "false");
  await dialog.waitFor({ state: "visible" });
  result.actions.push("nested brief select is accessible above scrim; Escape closes the select first");
  const label = dialog.getByRole("textbox", { name: "What did you work on?" });
  await label.fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const error = dialog.getByRole("alert");
  await error.waitFor({ state: "visible" });
  assert.equal(await error.innerText(), "Description is required.");
  assert.equal(await label.getAttribute("aria-invalid"), "true");
  assert.equal(await label.getAttribute("aria-describedby"), await error.getAttribute("id"));
  assert.equal(await dialog.isVisible(), true);
  await label.fill("Fictional accessibility session");
  const minutes = dialog.getByRole("spinbutton", { name: "Minutes" });
  await minutes.fill("0");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="alert"]')].some((el) => el.textContent.includes("Duration must be a whole number")));
  assert.equal(await minutes.getAttribute("aria-invalid"), "true");
  assert.equal(await minutes.getAttribute("aria-describedby"), await error.getAttribute("id"));
  await minutes.fill("5");
  const date = dialog.getByLabel("Worked on");
  const savedDate = await date.inputValue();
  await date.fill("");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="alert"]')].some((el) => el.textContent.includes("Pick a valid date.")));
  assert.equal(await date.getAttribute("aria-invalid"), "true");
  assert.equal(await date.getAttribute("aria-describedby"), await error.getAttribute("id"));
  await date.fill(savedDate);
  result.actions.push("validation errors are announced and associated with each field without saving");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Saving…" }).waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  assert.equal(await dialog.isVisible(), true, "Pending save dismissed via Escape");
  await page.getByRole("button", { name: "Start timer" }).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Start timer", null, { timeout: 5000 });
  assert.equal(await page.evaluate(() => localStorage.getItem("roducq.timer.v1")), null);
  const writes = state.writes.filter((w) => w.path === "/rest/v1/time_entries");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body.description, "Fictional accessibility session");
  assert.equal(writes[0].body.duration_minutes, 5);
  result.savedFixtureEntry = writes[0].body;
  result.actions.push("save writes once, clears timer, and focuses Start timer");
  return result;
}

async function timerSaveFailureProbe(page, base) {
  reset({ failTimer: true, timerDelayMs: 500 }); await goto(page, base, "/intake", "light");
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByRole("textbox", { name: "What are you working on?" }).fill("Fictional failed time entry");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1")));
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Log this session" });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const error = dialog.getByRole("alert"); await error.waitFor();
  assert.equal(await error.innerText(), "Synthetic time save failure");
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1"))), before);
  assert.equal(await dialog.isVisible(), true);
  assert.equal(state.writes.filter((w) => w.path === "/rest/v1/time_entries").length, 1);
  await dialog.getByRole("button", { name: "Keep running" }).click();
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Stop");
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("roducq.timer.v1"))), before);
  await page.getByRole("button", { name: "Discard this session" }).click();
  return { width: 375, alert: "Synthetic time save failure", timerRetained: true, focusRestored: true };
}
async function workspaceProbe(page, base) {
  reset({ pipeline: true });
  await goto(page, base, "/updates", "light");
  const compact = page.getByRole("img", { name: "Workspace: Fictional Studio" });
  assert.equal(await compact.count(), 1, "Single workspace needs a named, noninteractive compact mark");
  assert.equal(await compact.getAttribute("tabindex"), null);
  assert.equal(await compact.getAttribute("title"), "Fictional Studio");
  reset({ multi: true, pipeline: true });
  await goto(page, base, "/updates", "light");
  const select = page.locator('aside[aria-label="Primary"]').getByRole("combobox", { name: "Switch workspace" });
  await select.focus(); await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Fictional Studio", exact: true }).waitFor();
  await page.getByRole("option", { name: "Second Fictional Studio", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Switch workspace");
  assert.equal(state.writes.length, 0, "Opening and dismissing the workspace selector should not write");
  return { width: 768, single: "named static image, not focusable", multi: "named combobox, both options keyboard reachable, Escape restores focus" };
}
async function viewerProbe(page, base) {
  reset({ role: "viewer" }); await goto(page, base, "/intake", "light");
  assert.equal(await page.getByRole("button", { name: "Start timer" }).count(), 0);
  const main = page.locator("main");
  assert.equal(await main.getAttribute("data-has-timer"), null);
  return { width: 375, role: "viewer", timerCount: 0, reservedTimerSpace: false };
}
async function navigationProbe(page, base) {
  reset(); await goto(page, base, "/intake", "light");
  const more = page.getByRole("button", { name: "More navigation" });
  await more.focus(); await page.keyboard.press("Enter");
  const menu = page.getByRole("dialog", { name: /navigation/i });
  await menu.waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "More navigation");
  return { width: 375, openAndEscape: true, focusReturned: "More navigation" };
}
async function shortViewportProbe(page, base) {
  reset(); await goto(page, base, "/intake", "light");
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Log this session" });
  await dialog.waitFor({ state: "visible" });
  // Simulates a reduced layout viewport; this is not a real OS keyboard.
  await page.setViewportSize({ width: 320, height: 320 });
  const geometry = await dialog.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, viewportHeight: innerHeight };
  });
  assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight + 0.5);
  assert.ok(geometry.scrollHeight > geometry.clientHeight, "Short dialog should be scrollable");
  const keep = dialog.getByRole("button", { name: "Keep running" });
  await keep.focus();
  assert.equal(await keep.evaluate((el) => document.activeElement === el), true);
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Stop");
  await page.getByRole("button", { name: "Discard this session" }).click();
  return { width: 320, height: 320, geometry, scrollableAndFocusRestored: true };
}
async function resizeProbe(page, base) {
  reset(); await goto(page, base, "/intake", "light");
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Log this session" });
  await dialog.waitFor({ state: "visible" });
  await page.setViewportSize({ width: 1024, height: 900 });
  await dialog.waitFor({ state: "hidden" });
  const desktopLabel = page.getByRole("textbox", { name: "What did you work on?" });
  await desktopLabel.waitFor({ state: "visible" });
  // The desktop form is intentionally non-modal: the background can receive focus.
  await page.locator("#global-search").focus();
  assert.equal((await focusSnapshot(page)).id, "global-search");
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "What did you work on?");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Stop");
  await page.getByRole("button", { name: "Discard this session" }).click();
  return { widths: [390, 1024, 390], preservedStopState: true, desktopNonModal: true, modalFocusAndReturn: true };
}

async function main() {
  for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    assert.ok(!existsSync(path.join(ROOT, name)), `Refusing to load ${name}; use a clean isolated checkout`);
  }
  const executablePath = process.env.CHROMIUM_PATH;
  assert.ok(executablePath && existsSync(executablePath), "Set CHROMIUM_PATH to an installed Chromium executable");
  const dist = path.join(ROOT, "resp-next");
  const output = process.env.EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "roducq-a11y-evidence-"));
  // An explicit evidence directory must be new; never overwrite user files.
  if (process.env.EVIDENCE_DIR) mkdirSync(output);
  const home = mkdtempSync(path.join(tmpdir(), "roducq-a11y-home-"));
  const stub = fixtureServer();
  let ownsDist = false, child, browser, serverLog = "";
  const ledger = { widths: WIDTHS, heights: HEIGHTS, output, settings: { schemes: ["light", "dark"],
    deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce", serviceWorkers: "block",
    network: "browser limited to local app and fictional loopback fixture", statusDelayMs: 900, guardedStressDelayMs: 1400 },
    scans: [], focus: [], timer: [], workspace: null, viewer: null, navigation: null, resize: null, browserErrors };
  try {
    mkdirSync(dist); ownsDist = true; // Atomic ownership: never remove a pre-existing build.
    const stubPort = await listen(stub), port = await freePort();
    const base = `http://127.0.0.1:${port}`, stubOrigin = `http://127.0.0.1:${stubPort}`;
    const env = { PATH: process.env.PATH || "/usr/bin:/bin", HOME: home, NODE_ENV: "production", TZ: "UTC",
      NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: "resp-next", NEXT_PUBLIC_SUPABASE_URL: stubOrigin,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-local-anon-key", AUTH_SECRET: "fictional-local-secret", HOST: "stub-project.supabase.co" };
    console.log(`Evidence: ${output}\nBuilding isolated app with fictional loopback-only services...`);
    await run(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "build"], env, path.join(output, "build.log"));
    child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"],
      { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => { serverLog += d; });
    child.stderr.on("data", (d) => { serverLog += d; });
    await waitForServer(`${base}/`, child);
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
      env: { ...env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || "" } });
    ledger.browserVersion = browser.version();
    ledger.packageVersions = { node: process.version, playwright: require("playwright-core/package.json").version, axe: require("axe-core/package.json").version };
    // Exercise the interaction-heavy paths first so failures are visible early.
    for (const width of WIDTHS) {
      console.log(`Timer, keyboard, and dialog: ${width}x${HEIGHTS[width]}`);
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme: "light" });
      try { ledger.timer.push(await timerProbe(page, base, width, output)); } finally { await context.close(); }
    }
    // Verify the modal in the second theme too, including its axe result.
    ledger.darkTimer = [];
    for (const width of [375, 768]) {
      console.log(`Dark timer and dialog: ${width}`);
      const darkDir = path.join(output, `dark-${width}`); mkdirSync(darkDir);
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme: "dark" });
      try { ledger.darkTimer.push(await timerProbe(page, base, width, darkDir, "dark")); } finally { await context.close(); }
    }
    // Baseline comparison uses reduced motion. Also exercise the dialog and
    // status flow with ordinary motion enabled rather than assuming parity.
    {
      console.log("Timer and status with normal motion: 375x667");
      const motionDir = path.join(output, "normal-motion"); mkdirSync(motionDir);
      const { context, page } = await newContext(browser, base, stubOrigin, { width: 375, scheme: "light", motion: "no-preference" });
      try {
        ledger.normalMotion = { timer: await timerProbe(page, base, 375, motionDir),
          focus: await statusProbe(page, base, "light", 375) };
      } finally { await context.close(); }
    }
    for (const width of [375, 1440]) for (const scenario of ["error", "move-focus", "guard", "reverse"]) {
      console.log(`Status ${scenario}: ${width}`);
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme: "light" });
      try { ledger.focus.push(await statusProbe(page, base, "light", width, scenario)); } finally { await context.close(); }
    }
    for (const [width, kind] of [[768, "workspace"], [375, "viewer"], [375, "navigation"], [390, "resize"], [320, "shortViewport"], [375, "timerSaveFailure"]]) {
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme: "light" });
      try {
        ledger[kind] = await ({ workspace: workspaceProbe, viewer: viewerProbe, navigation: navigationProbe, resize: resizeProbe, shortViewport: shortViewportProbe, timerSaveFailure: timerSaveFailureProbe })[kind](page, base);
      } finally { await context.close(); }
    }
    for (const scheme of ["light", "dark"]) for (const width of WIDTHS) {
      console.log(`Matched axe, gradient, and status: ${scheme} ${width}x${HEIGHTS[width]}`);
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme });
      try {
        for (const route of ["detail", "dashboard", "updates"]) {
          reset(route === "detail" ? { status: "sent", link: "revoked" } : route === "dashboard" ? { invoices: [overdue()], contracts: [expiring()] } : { pipeline: true });
          await goto(page, base, route === "detail" ? `/updates/${ID}` : route === "dashboard" ? "/dashboard" : "/updates", scheme);
          await page.evaluate(() => document.fonts.ready);
          const axe = await axeResult(page);
          assert.deepEqual(axe.violations, [], `${scheme}/${width}/${route}: axe violations`);
          const contrast = width >= 1024 ? await renderedGradient(page, output, `${scheme}-${width}-${route}`) : null;
          ledger.scans.push({ scheme, width, height: HEIGHTS[width], route, ...axe, contrast });
        }
        ledger.focus.push(await statusProbe(page, base, scheme, width));
      } finally { await context.close(); }
    }
    assert.deepEqual(browserErrors, [], `Browser page/HTTP errors: ${JSON.stringify(browserErrors)}`);
    writeFileSync(path.join(output, "results.json"), JSON.stringify(ledger, null, 2));
    const modalScans = [...ledger.timer, ...ledger.darkTimer, ledger.normalMotion.timer].filter((item) => item.modalAxe);
    console.log(JSON.stringify({ browser: ledger.browserVersion, scans: ledger.scans.length, focus: ledger.focus.length,
      timer: ledger.timer.length, incomplete: ledger.scans.reduce((n, s) => n + s.incomplete.length, 0),
      modalScans: modalScans.length, modalIncomplete: modalScans.reduce((n, item) => n + item.modalAxe.incomplete.length, 0), output }, null, 2));
  } catch (error) {
    writeFileSync(path.join(output, "partial-results.json"), JSON.stringify(ledger, null, 2));
    throw error;
  } finally {
    writeFileSync(path.join(output, "server.log"), serverLog);
    if (browser) await browser.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([new Promise((r) => child.once("exit", r)), new Promise((r) => setTimeout(r, 5000))]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    if (stub.listening) await new Promise((r) => stub.close(r));
    rmSync(home, { recursive: true, force: true });
    if (ownsDist) rmSync(dist, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
