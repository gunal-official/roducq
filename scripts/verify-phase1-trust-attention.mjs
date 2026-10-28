#!/usr/bin/env node
/**
 * Phase 1 synthetic browser regression. This is NOT a production/RLS test.
 *
 * npm ci
 * CHROMIUM_PATH=/path/to/chromium node scripts/verify-phase1-trust-attention.mjs
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
const WIDTHS = [375, 390, 768, 1024, 1200, 1440, 1920];
const STATUS_BANDS = {
  draft: "Draft saved. A public link can be created while this update is still a draft.",
  sent: "Marked sent. Changing this status does not send the update; share a link or export it separately.",
};
const SHARE = {
  none: { chip: "No public link", value: "No link", hint: "No public link has been created.", control: "Create share link" },
  active: { chip: "Public link live", value: "Live", hint: "Anyone with the link can view the latest saved update.", control: "Revoke link" },
  revoked: { chip: "Public link revoked", value: "Revoked", hint: "This link no longer works.", control: "Regenerate link" },
};
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const browserErrors = [];
const today = (offset = 0) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const created = "2026-01-10T10:00:00.000Z";

function initialState(overrides = {}) {
  return {
    role: "owner", status: "draft", link: "none", token: FIRST_TOKEN,
    pipeline: false, updates: null, invoices: [], contracts: [], title: "Fictional weekly update",
    body: "The fictional milestone is on track.", writes: [], requests: [], ...overrides,
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
      if (pathname === "/rest/v1/workspace_members") return send(req, res, single(req, {
        user_id: USER, workspace_id: WORKSPACE, role: state.role, created_at: created,
        workspace: { id: WORKSPACE, name: "Fictional Studio", created_at: created,
          plan_tier: "starter", razorpay_subscription_status: null },
      }));
      if (pathname === "/rest/v1/updates") {
        if (req.method === "PATCH") {
          state.writes.push({ path: pathname, method: req.method, body: payload });
          if (payload.status !== undefined) state.status = payload.status;
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
async function newContext(browser, base, stubOrigin, { width = 1440, scheme = "light", auth = true } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme,
    reducedMotion: "reduce", serviceWorkers: "block" });
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
  await page.waitForFunction((wanted) => document.documentElement.classList.contains("dark") === (wanted === "dark"), scheme);
}
async function exact(page, text, count = 1) {
  const target = page.locator("main").getByText(text, { exact: true });
  if (count) await target.first().waitFor({ state: "visible" });
  assert.equal(await target.count(), count, `Expected ${count} occurrence(s) of ${JSON.stringify(text)}`);
}
async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector("main");
    return { viewport: root.clientWidth, documentOverflow: root.scrollWidth - root.clientWidth,
      mainOverflow: main.scrollWidth - main.clientWidth };
  });
  assert.ok(result.documentOverflow <= 1, `${label}: document horizontal overflow ${JSON.stringify(result)}`);
  assert.ok(result.mainOverflow <= 1, `${label}: main horizontal overflow ${JSON.stringify(result)}`);
}
async function targetSize(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box && box.width >= 43.5 && box.height >= 43.5, `${label}: target smaller than 44px ${JSON.stringify(box)}`);
}
async function scan(page, ledger, label) {
  await page.addScriptTag({ path: AXE });
  const result = await page.evaluate(async (tags) => {
    const report = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return {
      violations: report.violations.map((r) => ({ id: r.id, impact: r.impact, nodes: r.nodes.map((n) => ({ target: n.target, html: n.html, summary: n.failureSummary })) })),
      incomplete: report.incomplete.map((r) => ({ id: r.id, nodes: r.nodes.map((n) => ({ target: n.target, html: n.html, summary: n.failureSummary })) })),
      contrast: ["violations", "incomplete", "passes", "inapplicable"].flatMap((kind) =>
        report[kind].filter((r) => r.id === "color-contrast").map((r) => ({ kind, nodes: r.nodes.length }))),
    };
  }, AXE_TAGS);
  ledger.axe.push({ label, ...result });
  // The unchanged compact, single-workspace shell contains a labelled generic
  // div. Record it (do not claim a clean scan) while still failing on every
  // other violation. This fixture deliberately exercises that existing case.
  const unexpected = result.violations.flatMap((rule) => rule.nodes
    .filter((node) => !(rule.id === "aria-prohibited-attr" && node.html.startsWith("<div ") &&
      node.html.includes('aria-label="Workspace: Fictional Studio"')))
    .map((node) => ({ rule: rule.id, ...node })));
  assert.deepEqual(unexpected, [], `${label}: unexpected axe violations ${JSON.stringify(unexpected)}`);
}
async function checkDetail(page, base, scheme, status, link, ledger, takeScan, output, width) {
  reset({ status, link });
  await goto(page, base, `/updates/${ID}`, scheme);
  await exact(page, STATUS_BANDS[status]);
  await exact(page, SHARE[link].chip);
  await exact(page, SHARE[link].value);
  await exact(page, SHARE[link].hint);
  const section = page.locator("#update-share");
  await section.getByRole("button", { name: SHARE[link].control, exact: true }).waitFor();
  await targetSize(section.getByRole("button", { name: SHARE[link].control, exact: true }), `${status}/${link} share control`);
  assert.equal(await section.getByRole("button", { name: "Copy share link", exact: true }).count(), link === "active" ? 1 : 0);
  assert.equal(await section.getByRole("button", { name: "Revoke link", exact: true }).count(), link === "active" ? 1 : 0);
  if (link === "active") await targetSize(section.getByRole("button", { name: "Copy share link", exact: true }), "Copy share link");
  const selector = page.getByRole("combobox", { name: "Update status" });
  await targetSize(selector, "Update status selector");
  const describedBy = await selector.getAttribute("aria-describedby");
  assert.ok(describedBy, "Status selector must reference its help text");
  assert.equal(await page.locator(`[id=${JSON.stringify(describedBy)}]`).innerText(), "Changing the status does not send this update.");
  assert.match(await page.locator("main").innerText(), /Read-only link to the latest saved update\. Sharing it is up to you\./);
  assert.doesNotMatch(await page.locator("main").innerText(), /(?:link (?:was|has been) (?:opened|viewed)|delivered to the client)/i);
  await geometry(page, `${scheme}/${width}/detail/${status}/${link}`);
  ledger.rendered.push({ scheme, width, page: "detail", status, link });
  if (takeScan) await scan(page, ledger, `${scheme}/${width}/detail/${status}/${link}`);
  if (output && status === "sent" && link === "revoked") {
    await section.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, `${scheme}-${width}-revoked.png`), fullPage: true });
  }
}
async function checkDashboard(page, base, scheme, width, ledger, output, withAttention) {
  reset(withAttention ? { invoices: [overdue()], contracts: [expiring()] } : {});
  await goto(page, base, "/dashboard", scheme);
  await exact(page, "Your pipeline is empty");
  if (withAttention) {
    await exact(page, "Needs you");
    await exact(page, "1 invoice past the due date");
    await exact(page, "1 contract offer expiring within 30 days");
    const ordered = await page.evaluate(() => {
      const main = document.querySelector("main");
      const find = (text) => [...main.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === text);
      const attention = find("Needs you"), empty = find("Your pipeline is empty");
      return Boolean(attention && empty && (attention.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING));
    });
    assert.ok(ordered, "Needs you must precede the empty pipeline");
    await targetSize(page.getByRole("link", { name: /1 invoice past the due date/ }), "Overdue invoice attention link");
    await targetSize(page.getByRole("link", { name: /1 contract offer expiring within 30 days/ }), "Expiring contract attention link");
    await scan(page, ledger, `${scheme}/${width}/dashboard/attention`);
    await page.screenshot({ path: path.join(output, `${scheme}-${width}-attention.png`), fullPage: true });
  } else {
    await exact(page, "Needs you", 0);
  }
  await geometry(page, `${scheme}/${width}/dashboard/${withAttention ? "attention" : "empty"}`);
  ledger.rendered.push({ scheme, width, page: "dashboard", attention: withAttention });
}
async function checkList(page, base, scheme, width, ledger) {
  reset({ pipeline: true });
  state.updates = [
    { ...updateRow(), title: "Fictional draft", status: "draft" },
    { ...updateRow(), id: "66666666-6666-4666-8666-666666666666", title: "Fictional marked sent", status: "sent" },
  ];
  await goto(page, base, "/updates", scheme);
  await exact(page, "Fictional draft");
  await exact(page, "Fictional marked sent");
  await exact(page, "Write and save updates from plans. Drafts can be shared by link; changing the status does not send an update.");
  await exact(page, "Status only; this does not confirm delivery.");
  const filters = page.getByRole("group", { name: "Filter updates by status" });
  await targetSize(filters.getByRole("button", { name: /Marked sent/ }), "Marked sent filter");
  await geometry(page, `${scheme}/${width}/updates-list`);
  await scan(page, ledger, `${scheme}/${width}/updates-list`);
  ledger.rendered.push({ scheme, width, page: "updates-list" });
}
async function checkPublic(browser, base, stubOrigin, scheme, width, ledger) {
  reset({ status: "draft", link: "active" });
  const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme, auth: false });
  try {
    assert.equal((await context.cookies()).length, 0, "Public fixture starts without a session");
    await goto(page, base, `/share/${FIRST_TOKEN}`, scheme);
    await exact(page, state.title);
    await exact(page, "Draft");
    await exact(page, state.body);
    await geometry(page, `${scheme}/${width}/public-draft`);
    await scan(page, ledger, `${scheme}/${width}/public-draft`);
    ledger.rendered.push({ scheme, width, page: "public-draft", anonymous: true });
  } finally { await context.close(); }
}
async function dashboardCases(page, base, ledger) {
  const cases = [
    { name: "invoice only", invoices: [overdue()], contracts: [], attention: true, invoice: 1, contract: 0 },
    { name: "contract only", invoices: [], contracts: [expiring()], attention: true, invoice: 0, contract: 1 },
    { name: "both", invoices: [overdue()], contracts: [expiring()], attention: true, invoice: 1, contract: 1 },
    { name: "neither", invoices: [], contracts: [], attention: false, invoice: 0, contract: 0 },
    { name: "viewer invoice suppressed", role: "viewer", invoices: [overdue()], contracts: [], attention: false, invoice: 0, contract: 0 },
    { name: "viewer contract retained", role: "viewer", invoices: [overdue()], contracts: [expiring()], attention: true, invoice: 0, contract: 1 },
    { name: "member money visible", role: "member", invoices: [overdue()], contracts: [], attention: true, invoice: 1, contract: 0 },
    { name: "populated without attention", pipeline: true, status: "sent", invoices: [], contracts: [], attention: true, invoice: 0, contract: 0, populated: true },
    { name: "populated with attention", pipeline: true, invoices: [overdue()], contracts: [expiring()], attention: true, invoice: 1, contract: 1, populated: true },
    { name: "inclusive dates and statuses", invoices: [invoice("i1", today(-1)), invoice("i2", today(), "sent"),
        invoice("i3", today(-1), "draft"), invoice("i4", today(-1), "paid"), invoice("i5", null, "sent")],
      contracts: [contract("c1", today()), contract("c2", today(30)), contract("c3", today(-1)), contract("c4", today(31)),
        contract("c5", today(3), "signed"), contract("c6", today(3), "void"), contract("c7", null)],
      attention: true, invoice: 1, contract: 2 },
  ];
  for (const c of cases) {
    reset(c);
    await goto(page, base, "/dashboard", "light");
    await exact(page, "Needs you", c.attention ? 1 : 0);
    if (c.populated) await exact(page, "Your pipeline is empty", 0);
    else await exact(page, "Your pipeline is empty");
    if (c.invoice) await exact(page, `${c.invoice} invoice${c.invoice === 1 ? "" : "s"} past the due date`);
    else assert.equal(await page.locator("main").getByText(/invoices? past the due date/).count(), 0, c.name);
    if (c.contract) await exact(page, `${c.contract} contract offer${c.contract === 1 ? "" : "s"} expiring within 30 days`);
    else assert.equal(await page.locator("main").getByText(/contract offers? expiring within 30 days/).count(), 0, c.name);
    if (c.populated && !c.invoice && !c.contract) {
      await exact(page, "Nothing pressing — everything is moving on schedule.");
      await exact(page, "Status: marked sent");
    }
    if (c.populated && c.invoice) await exact(page, "1 update marked as draft");
    if (c.role === "viewer") {
      assert.equal(state.requests.filter((r) => r.path === "/rest/v1/invoices" || r.path === "/rest/v1/time_entries").length, 0,
        "Viewer must not fetch money data");
      assert.ok(state.requests.some((r) => r.path === "/rest/v1/contracts"), "Existing viewer contract fetch remains unchanged");
    }
    await geometry(page, `dashboard/${c.name}`);
    ledger.dashboardCases.push(c.name);
  }
}
async function publicPage(browser, base, stubOrigin, token, expected, status = null, expectedBody = null) {
  const { context, page } = await newContext(browser, base, stubOrigin, { auth: false });
  try {
    await goto(page, base, `/share/${token}`, "light");
    await exact(page, expected);
    if (status) await exact(page, status);
    if (expectedBody) await exact(page, expectedBody);
  } finally { await context.close(); }
}
async function interactions(browser, page, context, base, stubOrigin, ledger) {
  // Status is a stored label, not a share-link operation or delivery event.
  reset({ status: "draft", link: "none" });
  await goto(page, base, `/updates/${ID}`, "light");
  const select = page.getByRole("combobox", { name: "Update status" });
  await select.focus();
  await page.keyboard.press("Enter");
  const markedOption = page.getByRole("option", { name: "Marked sent" });
  await markedOption.waitFor();
  await page.getByRole("option", { name: "Draft", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option" && document.activeElement.textContent?.includes("Marked sent"));
  await page.keyboard.press("Enter");
  try {
    await page.waitForFunction(() => document.querySelector('button[role="combobox"][aria-label="Update status"]')?.textContent?.includes("Marked sent"), null, { timeout: 10_000 });
  } catch (error) {
    console.error("Status interaction diagnostic:", JSON.stringify({ status: state.status, writes: state.writes,
      focused: await page.evaluate(() => document.activeElement?.outerHTML), main: (await page.locator("main").innerText()).slice(-3000) }));
    throw error;
  }
  await page.waitForFunction(() => !document.querySelector('button[role="combobox"][aria-label="Update status"]')?.disabled);
  const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName,
    label: document.activeElement?.getAttribute("aria-label") }));
  ledger.focus.push({ action: "status change completes", ...focus });
  // The existing selector disables its trigger while saving; a keyboard
  // user can lose focus to BODY. Record this without treating it as a pass.
  assert.ok(focus.tag === "BODY" || focus.label === "Update status", `Unexpected focus target: ${JSON.stringify(focus)}`);
  await select.focus();
  assert.equal(await select.evaluate((el) => document.activeElement === el), true);
  assert.equal(state.status, "sent");
  assert.deepEqual(state.writes.map(({ path: p, body }) => ({ path: p, body })), [{ path: "/rest/v1/updates", body: { status: "sent" } }]);
  await exact(page, STATUS_BANDS.sent);
  await publicPage(browser, base, stubOrigin, FIRST_TOKEN, "This link is invalid or has been revoked");
  await select.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Marked sent" }).focus();
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option" && document.activeElement.textContent?.trim() === "Draft");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector('button[role="combobox"][aria-label="Update status"]')?.textContent?.trim() === "Draft");
  await page.waitForFunction(() => !document.querySelector('button[role="combobox"][aria-label="Update status"]')?.disabled);
  assert.deepEqual(state.writes.map(({ path: p, body }) => ({ path: p, body })), [
    { path: "/rest/v1/updates", body: { status: "sent" } },
    { path: "/rest/v1/updates", body: { status: "draft" } },
  ]);
  await exact(page, STATUS_BANDS.draft);
  ledger.interactions.push("keyboard draft/sent changes write only the stored status; no link is created");

  // Create a draft link, copy it, revoke it, and regenerate to a new token.
  reset({ status: "draft", link: "none" });
  await goto(page, base, `/updates/${ID}`, "light");
  const share = page.locator("#update-share");
  await share.getByRole("button", { name: "Create share link" }).click();
  await exact(page, "Public link live");
  const first = state.token;
  assert.equal(state.link, "active");
  await publicPage(browser, base, stubOrigin, first, state.title, "Draft");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill("Saved fictional revision");
  await page.getByRole("textbox", { name: "Body (markdown)" }).fill("Fictional updated body.");
  await page.getByRole("button", { name: "Save update" }).click();
  await page.getByText("All changes saved", { exact: true }).waitFor();
  assert.equal(state.title, "Saved fictional revision");
  assert.equal(state.body, "Fictional updated body.");
  await publicPage(browser, base, stubOrigin, first, "Saved fictional revision", "Draft", "Fictional updated body.");
  const copy = share.getByRole("button", { name: "Copy share link" });
  await copy.focus();
  await copy.press("Enter");
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `${base}/share/${first}`);
  await share.getByRole("button", { name: "Revoke link" }).click();
  await exact(page, "Public link revoked");
  assert.equal(state.link, "revoked");
  await publicPage(browser, base, stubOrigin, first, "This link is invalid or has been revoked");
  await share.getByRole("button", { name: "Regenerate link" }).click();
  await exact(page, "Public link live");
  assert.equal(state.link, "active");
  assert.notEqual(state.token, first, "Regenerate must rotate the fixture token");
  await publicPage(browser, base, stubOrigin, first, "This link is invalid or has been revoked");
  await publicPage(browser, base, stubOrigin, state.token, state.title, "Draft");
  ledger.interactions.push("draft link create/copy/revoke/regenerate, saved edits and anonymous visibility");

  reset({ status: "sent", link: "active" });
  await publicPage(browser, base, stubOrigin, state.token, state.title, "Marked sent");
  ledger.interactions.push("sent public update displays Marked sent without changing access");

  reset({ pipeline: true, updates: [
    { ...updateRow(), id: ID, title: "Fictional draft", status: "draft" },
    { ...updateRow(), id: "66666666-6666-4666-8666-666666666666", title: "Fictional marked sent", status: "sent" },
  ] });
  await goto(page, base, "/updates", "light");
  await exact(page, "Fictional draft");
  await exact(page, "Fictional marked sent");
  const filters = page.getByRole("group", { name: "Filter updates by status" });
  const sentFilter = filters.getByRole("button", { name: /Marked sent/ });
  await targetSize(sentFilter, "Marked sent filter");
  await sentFilter.focus();
  await sentFilter.press("Enter");
  await exact(page, "Fictional draft", 0);
  await exact(page, "Fictional marked sent");
  assert.equal(await sentFilter.getAttribute("aria-pressed"), "true");
  await filters.getByRole("button", { name: /Draft/ }).click();
  await exact(page, "Fictional draft");
  await exact(page, "Fictional marked sent", 0);
  ledger.interactions.push("draft/sent list filtering retains its stored-status semantics");

  reset({ role: "viewer", status: "draft", link: "none" });
  await goto(page, base, `/updates/${ID}`, "light");
  assert.equal(await page.getByRole("combobox", { name: "Update status" }).count(), 0, "Viewer status selector stays hidden");
  assert.equal(await page.locator("#update-composer").count(), 0, "Viewer composer stays hidden");
  await page.locator("#update-share").getByRole("button", { name: "Create share link" }).click();
  await exact(page, "View only — you can't make changes.");
  assert.equal(state.writes.length, 0, "Viewer must not write through guarded action");
  ledger.interactions.push("viewer cannot create a link through the existing action guard");
}

async function main() {
  for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    assert.ok(!existsSync(path.join(ROOT, name)), `Refusing to load ${name}; run from a clean isolated checkout`);
  }
  const executablePath = process.env.CHROMIUM_PATH;
  assert.ok(executablePath && existsSync(executablePath), "Set CHROMIUM_PATH to an installed Chromium executable");
  const dist = path.join(ROOT, "resp-next");
  const output = mkdtempSync(path.join(tmpdir(), "roducq-phase1-evidence-"));
  const home = mkdtempSync(path.join(tmpdir(), "roducq-phase1-home-"));
  const stub = fixtureServer();
  let child, browser, ownsDist = false, serverLog = "";
  const ledger = { widths: WIDTHS, output, rendered: [], dashboardCases: [], interactions: [], focus: [], axe: [], browserErrors };
  try {
    // Atomic creation is our ownership marker: never remove an existing directory.
    mkdirSync(dist);
    ownsDist = true;
    const stubPort = await listen(stub);
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const stubOrigin = `http://127.0.0.1:${stubPort}`;
    const env = { PATH: process.env.PATH || "/usr/bin:/bin", HOME: home, NODE_ENV: "production", TZ: "UTC",
      NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: "resp-next", NEXT_PUBLIC_SUPABASE_URL: stubOrigin,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-local-anon-key", AUTH_SECRET: "fictional-local-secret",
      HOST: "stub-project.supabase.co" };
    console.log(`Fixture output: ${output}\nBuilding with loopback-only synthetic services...`);
    await run(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "build"], env, path.join(output, "build.log"));
    child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"],
      { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => { serverLog += d; });
    child.stderr.on("data", (d) => { serverLog += d; });
    child.once("error", (error) => { serverLog += `\n${error.stack}`; });
    await waitForServer(`${base}/`, child);
    browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"],
      env: { ...env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || "" } });
    {
      const { context, page } = await newContext(browser, base, stubOrigin);
      try {
        await dashboardCases(page, base, ledger);
        await interactions(browser, page, context, base, stubOrigin, ledger);
      } finally { await context.close(); }
    }
    const schemes = [{ scheme: "light", widths: WIDTHS }, { scheme: "dark", widths: [375, 1440] }];
    for (const { scheme, widths } of schemes) for (const width of widths) {
      console.log(`Checking ${scheme} ${width}px`);
      const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme });
      try {
        for (const status of ["draft", "sent"]) for (const link of ["none", "active", "revoked"]) {
          await checkDetail(page, base, scheme, status, link, ledger, status === "sent" && link === "revoked", output, width);
        }
        await checkDashboard(page, base, scheme, width, ledger, output, true);
        await checkDashboard(page, base, scheme, width, ledger, output, false);
        await checkList(page, base, scheme, width, ledger);
        await checkPublic(browser, base, stubOrigin, scheme, width, ledger);
      } finally { await context.close(); }
    }
    assert.deepEqual(browserErrors, [], `Browser runtime/HTTP failures: ${JSON.stringify(browserErrors)}`);
    writeFileSync(path.join(output, "server.log"), serverLog);
    writeFileSync(path.join(output, "results.json"), JSON.stringify(ledger, null, 2));
    console.log(JSON.stringify({ rendered: ledger.rendered.length, dashboardCases: ledger.dashboardCases.length,
      interactions: ledger.interactions.length, axeScans: ledger.axe.length,
      axeViolations: ledger.axe.reduce((n, r) => n + r.violations.length, 0),
      axeIncomplete: ledger.axe.reduce((n, r) => n + r.incomplete.length, 0),
      focusAfterStatusSave: ledger.focus[0],
      note: "Any recorded shell violations or incomplete axe rules require review; they are not passes.", output }, null, 2));
  } catch (error) {
    writeFileSync(path.join(output, "partial-results.json"), JSON.stringify(ledger, null, 2));
    writeFileSync(path.join(output, "server.log"), serverLog);
    throw error;
  } finally {
    if (browser) await browser.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 5000))]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
    if (stub.listening) await new Promise((resolve) => stub.close(resolve));
    rmSync(home, { recursive: true, force: true });
    if (ownsDist) rmSync(dist, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
