#!/usr/bin/env node
/**
 * Unsaved-edits guard — browser verification (UX audit P2-02).
 *
 * npm ci
 * CHROMIUM_PATH=/path/to/chromium node scripts/verify-unsaved-edits.mjs
 *
 * Fictional loopback fixture only: this is NOT a production, RLS or live-data
 * test. The script refuses to load a real `.env` or overwrite `resp-next`.
 * A local same-origin proxy exposes the fixture without disabling the app's
 * production CSP; all other browser network requests are blocked. A JSON
 * ledger, console/build/server logs and screenshots are written to a new OS
 * temp directory (or EVIDENCE_DIR), including when an assertion fails.
 *
 * At 320/375/390/768/1024/1200/1440 the shell matrix tests clean and dirty
 * sign-out and workspace switching, cancellation, focus/keyboard isolation,
 * local-scope action counts, light/dark, reduced motion and axe. The existing
 * navigation, unload, save, no-JS and generic-dialog probes are retained.
 * Axe's incomplete checks remain manual-review items, not automated passes.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { createServer as createNetServer } from "node:net";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { format } from "node:util";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");

const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "99999999-9999-4999-8999-999999999999";
const WORKSPACE = "22222222-2222-4222-8222-222222222222";
/** A second fictional workspace, so the switcher renders a real control. */
const WORKSPACE2 = "55555555-5555-4555-8555-555555555555";
const USER = "33333333-3333-4333-8333-333333333333";
const CREATED = "2026-01-10T10:00:00.000Z";
const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1440];
const HEIGHTS = { 320: 568, 375: 667, 390: 844, 768: 900, 1024: 900, 1200: 900, 1440: 900 };
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const TITLE_SAVED = "Fictional weekly update";
const TITLE_EDITED = "Fictional weekly update — edited";
const BODY_SAVED = "The fictional milestone is on track.";
const BODY_EDITED = "Unsaved fictional body edit.";

// ── Fictional fixture ────────────────────────────────────────────────────
let state;
let currentCase = "setup";
const fixtureEvents = [];
function reset(overrides = {}) {
  state = {
    title: TITLE_SAVED,
    body: BODY_SAVED,
    status: "draft",
    failSave: false,
    saves: [],
    // Sign-out / workspace-switch ledger (the fixture runs in this process, so
    // the probes can assert exactly-once semantics without extra endpoints).
    signOuts: [],
    workspaceWrites: [],
    activeWorkspaceId: WORKSPACE,
    ...overrides,
  };
}
reset();

const updateRow = (id, title, body) => ({
  id, workspace_id: WORKSPACE, status: state.status, title, body, client_name: null,
  created_at: CREATED, updated_at: CREATED, plan: null, plan_id: null, template_id: null,
});
const WORKSPACE_NAMES = {
  [WORKSPACE]: "Fictional Studio",
  [WORKSPACE2]: "Fictional Second Studio",
};
const workspaceRow = (id) => ({
  id, name: WORKSPACE_NAMES[id] ?? "Fictional Studio", created_at: CREATED,
  plan_tier: "starter", razorpay_subscription_status: null,
});
const detailRow = () => updateRow(ID, state.title, state.body);
const secondRow = () => updateRow(ID2, "Second fictional update", "Another fictional body.");

async function bodyOf(req) {
  const parts = [];
  for await (const chunk of req) parts.push(chunk);
  const raw = Buffer.concat(parts).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}
function send(req, res, data, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
  });
  res.end(JSON.stringify(data));
}
function single(req, row) {
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
      if (pathname === "/auth/v1/user") return send(req, res, {
        id: USER, email: "fictional@example.test", aud: "authenticated", role: "authenticated",
        app_metadata: {}, user_metadata: { full_name: "Fictional User" },
      });
      if (pathname === "/rest/v1/rpc/get_user_memberships") return send(req, res, [
        { workspace_id: WORKSPACE, workspace_name: "Fictional Studio", role: "owner" },
        { workspace_id: WORKSPACE2, workspace_name: "Fictional Second Studio", role: "owner" },
      ]);
      if (pathname === "/rest/v1/rpc/get_shared_document") return send(req, res, []);
      if (pathname === "/auth/v1/logout" && req.method === "POST") {
        const event = {
          at: Date.now(),
          method: req.method,
          scope: url.searchParams.get("scope"),
          hasBearerToken: Boolean(req.headers.authorization?.startsWith("Bearer ")),
        };
        state.signOuts.push(event);
        fixtureEvents.push({ case: currentCase, type: "logout", ...event });
        res.writeHead(204, { "access-control-allow-origin": "*" });
        return res.end();
      }
      if (pathname === "/rest/v1/profiles") {
        if (req.method === "PATCH") {
          if (payload.active_workspace_id !== undefined) {
            state.workspaceWrites.push(payload.active_workspace_id);
            state.activeWorkspaceId = payload.active_workspace_id;
            fixtureEvents.push({ case: currentCase, type: "workspace-write", at: Date.now(),
              workspaceId: payload.active_workspace_id });
          }
          return send(req, res, []);
        }
        return send(req, res, single(req, {
          id: USER, email: "fictional@example.test", full_name: "Fictional User",
          onboarding_completed: true, active_workspace_id: state.activeWorkspaceId,
        }));
      }
      if (pathname === "/rest/v1/workspaces") {
        const wanted = (url.searchParams.get("id") ?? "").replace(/^eq\./, "");
        const row = workspaceRow(wanted === WORKSPACE2 ? WORKSPACE2 : WORKSPACE);
        return send(req, res, single(req, row));
      }
      if (pathname === "/rest/v1/workspace_members") {
        const wanted = (url.searchParams.get("workspace_id") ?? "").replace(/^eq\./, "");
        const memberships = [WORKSPACE, WORKSPACE2]
          .filter((id) => !wanted || id === wanted)
          .map((id) => ({
            user_id: USER, workspace_id: id, role: "owner", created_at: CREATED,
            workspace: workspaceRow(id),
          }));
        // The shell queries workspace_members directly for every membership;
        // the separate get_user_memberships RPC is not used by this resolver.
        return send(req, res, req.headers.accept?.includes("application/vnd.pgrst.object+json")
          ? memberships[0] ?? null : memberships);
      }
      if (pathname === "/rest/v1/updates") {
        if (req.method === "PATCH") {
          state.saves.push(payload);
          if (state.failSave) {
            return send(req, res, { code: "SYNTHETIC", message: "Synthetic save failure", details: null, hint: null }, 400);
          }
          if (payload.title !== undefined) state.title = payload.title;
          if (payload.body !== undefined) state.body = payload.body;
          if (payload.status !== undefined) state.status = payload.status;
          return send(req, res, []);
        }
        const idParam = url.searchParams.get("id");
        if (idParam?.startsWith("eq.")) {
          const wanted = idParam.slice(3);
          return send(req, res, single(req, wanted === ID2 ? secondRow() : detailRow()));
        }
        if ((url.searchParams.get("select") ?? "").includes("body")) {
          return send(req, res, [
            { id: ID, title: state.title, client_name: null, status: state.status, updated_at: CREATED, body: state.body },
            { id: ID2, title: "Second fictional update", client_name: null, status: "draft", updated_at: CREATED, body: "Another fictional body." },
          ]);
        }
        return send(req, res, [detailRow(), secondRow()]);
      }
      if (pathname === "/rest/v1/share_links") return send(req, res, single(req, null));
      if (pathname.startsWith("/rest/v1/")) return send(req, res, []);
      return send(req, res, { error: "Unknown fixture endpoint" }, 404);
    } catch (error) {
      console.error("Fixture server error:", error);
      if (!res.headersSent) send(req, res, { error: "Fixture server error" }, 500);
      else res.end();
    }
  });
}
// Expose the app and fictional service under one loopback origin. The app's
// production CSP permits 'self' but not a different localhost port. Disabling
// CSP would conceal that distinction, so forward only fixture API paths to the
// stub and everything else to the isolated Next server; no policy is changed.
function sameOriginProxy(stubPort, appPort) {
  return createServer((req, res) => {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const fixture = pathname.startsWith("/auth/v1/") || pathname.startsWith("/rest/v1/");
    const upstream = httpRequest({
      hostname: "127.0.0.1",
      port: fixture ? stubPort : appPort,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, "x-forwarded-host": req.headers.host, "x-forwarded-proto": "http" },
    }, (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end("Local verification upstream unavailable");
    });
    req.pipe(upstream);
  });
}

const listen = (server) => new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
async function freePort() {
  const server = createNetServer();
  const port = await listen(server).then(() => server.address().port);
  await new Promise((resolve) => server.close(resolve));
  return port;
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
      else reject(new Error(`${command} exited ${code ?? signal}; see ${logfile}\n${log.slice(-4000)}`));
    });
  });
}
async function waitForServer(url, child) {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error("Fixture Next process exited before startup");
    try {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1500) });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Fixture Next process did not start within 90 seconds");
}
function sessionCookie() {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER, aud: "authenticated", exp: 2000000000, iat: 1750000000 })}.fictional`;
  const session = {
    access_token: token, refresh_token: "fictional-local-refresh", token_type: "bearer",
    expires_in: 3600, expires_at: 2000000000,
    user: { id: USER, email: "fictional@example.test", aud: "authenticated", role: "authenticated",
      app_metadata: {}, user_metadata: { full_name: "Fictional User" } },
  };
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

// ── Browser helpers ──────────────────────────────────────────────────────
const ledger = {
  settings: { widths: WIDTHS, heights: HEIGHTS, locale: "en-US", timezoneId: "UTC",
    deviceScaleFactor: 1, reducedMotion: "reduce", serviceWorkers: "block",
    network: "same-origin loopback proxy; production CSP enabled; external browser requests blocked",
    axeTags: AXE_TAGS },
  status: "running",
  scenarios: [], scans: [], screenshots: [], browserErrors: [], blockedRequests: [],
  fixtureEvents,
  limitations: [
    "Native beforeunload text is not customisable; Chromium requires prior user interaction and some mobile browsers suppress the prompt.",
    "Back/Forward is only cancellable where the Navigation API exists (Chrome/Edge 102+, Firefox 147+, Safari 26.2+). Older engines keep click and unload protection only.",
    "Sign out and workspace switching are guarded at their own handlers (the guard registry), not by intercepting the router: any future destructive shell action must call requestGuardedAction() to be covered.",
    "With JavaScript disabled the guard cannot run; the editor cannot save either.",
    "Headless Chromium viewports are simulations, not physical devices or assistive technology.",
  ],
};

function trackPage(page) {
  page.on("pageerror", (error) => ledger.browserErrors.push({ case: currentCase, type: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") ledger.browserErrors.push({ case: currentCase, type: "console", message: message.text() });
  });
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1") && response.status() >= 400) {
      ledger.browserErrors.push({ case: currentCase, type: "http", status: response.status(), url: response.url() });
    }
  });
}
async function newContext(browser, base, stubOrigin, options = {}) {
  const { width = 1440, scheme = "light", motion = "reduce", js = true } = options;
  const context = await browser.newContext({
    viewport: { width, height: HEIGHTS[width] ?? 900 }, colorScheme: scheme,
    deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: motion,
    serviceWorkers: "block", javaScriptEnabled: js, acceptDownloads: true,
  });
  await context.addCookies([{ name: "sb-127-auth-token", value: sessionCookie(), url: base }]);
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base || url.origin === stubOrigin) return route.continue();
    ledger.blockedRequests.push({ case: currentCase, url: route.request().url() });
    return route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  trackPage(page);
  page.__dialogs = [];
  page.__onDialog = async (dialog) => { page.__dialogs.push({ type: dialog.type(), message: dialog.message() }); await dialog.accept(); };
  page.on("dialog", (dialog) => { page.__onDialog(dialog); });
  return { context, page };
}
const titleBox = (page) => page.getByLabel("Title", { exact: true });
const bodyBox = (page) => page.getByLabel("Body (markdown)");
const dialogOf = (page) => page.getByRole("alertdialog", { name: "Discard unsaved changes?" });

async function openUpdate(page, base, id = ID) {
  const response = await page.goto(`${base}/updates/${id}`, { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, `GET /updates/${id}`);
  await page.locator("main").waitFor();
  await page.waitForLoadState("networkidle");
  await titleBox(page).waitFor();
  return response;
}
async function makeDirty(page) {
  await titleBox(page).fill(TITLE_EDITED);
  await bodyBox(page).fill(BODY_EDITED);
  await page.getByText("Unsaved changes").waitFor({ timeout: 5000 });
}
async function expectNoDialog(page, ms = 700) {
  await page.waitForTimeout(ms);
  assert.equal(await dialogOf(page).count(), 0, "no unsaved-changes dialog should appear");
}
async function activeLabel(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element) return null;
    return {
      tag: element.tagName,
      text: (element.textContent ?? "").trim().slice(0, 40),
      label: element.getAttribute("aria-label"),
      className: typeof element.className === "string" ? element.className.slice(0, 60) : null,
    };
  });
}
async function axeOnPage(page) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: AXE });
  return page.evaluate(async (tags) => {
    const report = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return {
      violations: report.violations.map((rule) => ({ id: rule.id, impact: rule.impact,
        help: rule.help, nodes: rule.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })),
      incomplete: report.incomplete.map((rule) => ({ id: rule.id, impact: rule.impact,
        help: rule.help, nodes: rule.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })),
      passes: report.passes.map((rule) => rule.id),
    };
  }, AXE_TAGS);
}
async function navTo(page, width, href) {
  if (width >= 600) {
    await page.locator(`.app-sidebar nav a[href='${href}']`).click();
    return "sidebar";
  }
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.waitFor();
  await drawer.getByRole("link", { name: href === "/briefs" ? "Briefs" : "Proposals" }).click();
  return "drawer";
}

// ── Probes ───────────────────────────────────────────────────────────────
async function layoutProbe(browser, base, stubOrigin, width, output) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width });
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    await page.locator(".work-back").click();
    const dialog = dialogOf(page);
    await dialog.waitFor({ state: "visible" });
    await page.waitForTimeout(320); // let the entrance animation settle

    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    assert.ok(geometry.x >= 0 && geometry.y >= 0, `${width}: dialog starts inside the viewport`);
    assert.ok(geometry.x + geometry.width <= width + 1, `${width}: dialog fits horizontally`);
    assert.ok(geometry.y + geometry.height <= (HEIGHTS[width] ?? 900) + 1, `${width}: dialog fits vertically`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `${width}: no horizontal overflow while the dialog is open`);

    const buttons = await dialog.getByRole("button", { name: /Keep editing|Discard changes/ }).evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { text: (node.textContent ?? "").trim(), width: rect.width, height: rect.height };
      })
    );
    for (const button of buttons) {
      assert.ok(button.width >= 44 && button.height >= 44, `${width}: ${button.text} is a 44px target`);
    }
    const focus = await activeLabel(page);
    assert.equal(focus?.text, "Keep editing", `${width}: the safe action receives focus`);

    const shot = path.join(output, `dirty-dialog-${width}.png`);
    await page.screenshot({ path: shot });
    ledger.screenshots.push(path.basename(shot));
    return { width, geometry, overflow, buttons, focus, dialogVisible: true };
  } finally {
    await context.close();
  }
}

async function cleanEditorProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
  try {
    await openUpdate(page, base);
    // No listeners while clean: a link click is a plain Next navigation.
    await page.locator(".app-sidebar nav a[href='/briefs']").click();
    await page.waitForURL("**/briefs", { timeout: 10_000 });
    await expectNoDialog(page, 200);
    // Typing and reverting restores the clean state (no warning either).
    await openUpdate(page, base);
    await titleBox(page).fill(TITLE_EDITED);
    await page.getByText("Unsaved changes").waitFor();
    await titleBox(page).fill(TITLE_SAVED);
    await page.getByText("All changes saved").waitFor();
    await page.locator(".app-sidebar nav a[href='/briefs']").click();
    await page.waitForURL("**/briefs", { timeout: 10_000 });
    await expectNoDialog(page, 200);
    return { cleanNavigates: true, revertClearsDirty: true };
  } finally {
    await context.close();
  }
}

async function stayAndEscapeProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    const before = page.url();

    // 1. Click → dialog → "Keep editing": URL, edits and focus preserved.
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await dialogOf(page).waitFor({ state: "hidden" });
    assert.equal(page.url(), before);
    assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);
    assert.equal(await bodyBox(page).inputValue(), BODY_EDITED);
    const afterKeep = await activeLabel(page);

    // 2. Click → Escape: same outcome, without clicking anything.
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.keyboard.press("Escape");
    await dialogOf(page).waitFor({ state: "hidden" });
    assert.equal(page.url(), before);
    assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);

    // 3. Click → overlay click: also cancels.
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.mouse.click(8, 8);
    await dialogOf(page).waitFor({ state: "hidden" });
    assert.equal(page.url(), before);
    assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);

    // 4. Focus is restored to the invoking link, not lost to <body>.
    assert.equal(afterKeep?.tag, "A", "focus returns to the invoking link");
    assert.ok(afterKeep?.text?.includes("Updates"), "the invoking link is the Updates back link");

    // 5. "Discard changes" performs the requested navigation.
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.waitForURL("**/updates", { timeout: 10_000 });
    assert.ok(page.url().endsWith("/updates"));
    // The discarded edits were never written to the server.
    assert.equal(state.title, TITLE_SAVED);
    return { keepEditing: true, escape: true, overlay: true, focusRestored: afterKeep, discardNavigated: true };
  } finally {
    await context.close();
  }
}

async function sidebarAndDrawerProbe(browser, base, stubOrigin) {
  const results = {};
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.locator(".app-sidebar nav a[href='/briefs']").click();
      await dialogOf(page).waitFor();
      assert.ok(page.url().includes(`/updates/${ID}`), "sidebar click did not navigate");
      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      results.sidebar = { held: true, url: page.url() };
    } finally { await context.close(); }
  }
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 375 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      // Header hamburger → drawer link.
      await page.getByRole("button", { name: "Open menu" }).click();
      const drawer = page.getByRole("dialog");
      await drawer.waitFor();
      await drawer.getByRole("link", { name: "Proposals" }).click();
      await dialogOf(page).waitFor();
      assert.ok(page.url().includes(`/updates/${ID}`), "drawer click did not navigate");
      await page.getByRole("button", { name: "Discard changes" }).click();
      await page.waitForURL("**/proposals", { timeout: 10_000 });
      results.drawer = { held: true, discarded: true, url: page.url() };
    } finally { await context.close(); }
  }
  return results;
}

async function backForwardProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
  try {
    // Enter the detail page from the list so a real Back entry exists.
    await page.goto(`${base}/updates`, { waitUntil: "domcontentloaded" });
    await page.locator("main").waitFor();
    await page.waitForLoadState("networkidle");
    await page.locator(`a[href='/updates/${ID}']`).first().click();
    await page.waitForURL(`**/updates/${ID}`);
    await titleBox(page).waitFor();
    await makeDirty(page);
    await page.goBack({ timeout: 2000 }).catch(() => {});
    await dialogOf(page).waitFor({ timeout: 5000 });
    assert.ok(page.url().includes(`/updates/${ID}`), "Back was cancelled while the dialog is open");
    await page.keyboard.press("Escape");
    await dialogOf(page).waitFor({ state: "hidden" });
    assert.ok(page.url().includes(`/updates/${ID}`), "staying keeps the URL");
    assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);

    // Confirm the traversal this time.
    await page.goBack({ timeout: 2000 }).catch(() => {});
    await dialogOf(page).waitFor({ timeout: 5000 });
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.waitForURL("**/updates", { timeout: 10_000 });
    assert.ok(page.url().endsWith("/updates"));

    // Forward: leave a forward entry, edit, then traverse forward.
    await page.locator(`a[href='/updates/${ID}']`).first().click();
    await page.waitForURL(`**/updates/${ID}`);
    await titleBox(page).waitFor();
    await page.locator(".app-sidebar nav a[href='/briefs']").click();
    await page.waitForURL("**/briefs", { timeout: 10_000 });
    await page.goBack({ timeout: 2000 }).catch(() => {});
    await page.waitForURL(`**/updates/${ID}`, { timeout: 10_000 });
    await titleBox(page).waitFor();
    await makeDirty(page);
    await page.goForward({ timeout: 2000 }).catch(() => {});
    await dialogOf(page).waitFor({ timeout: 5000 });
    assert.ok(page.url().includes(`/updates/${ID}`), "Forward was cancelled while the dialog is open");
    await page.getByRole("button", { name: "Discard changes" }).click();
    await page.waitForURL("**/briefs", { timeout: 10_000 });
    return { backCancelled: true, backConfirmed: true, forwardCancelled: true, forwardConfirmed: true };
  } finally {
    await context.close();
  }
}

async function reloadProbe(browser, base, stubOrigin) {
  const results = {};
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      page.__onDialog = async (dialog) => {
        page.__dialogs.push({ type: dialog.type() });
        await dialog.dismiss(); // "Stay on this page"
      };
      await page.reload({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(900);
      assert.equal(page.__dialogs.at(-1)?.type, "beforeunload", "reload asks the browser");
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED, "dismissing keeps the edits");
      results.reloadDismissed = { prompt: true, editsKept: true };
    } finally { await context.close(); }
  }
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      await page.getByLabel("Title", { exact: true }).waitFor();
      assert.equal(page.__dialogs.at(-1)?.type, "beforeunload", "reload asks the browser");
      assert.equal(await titleBox(page).inputValue(), TITLE_SAVED, "accepting discards the edits");
      results.reloadAccepted = { prompt: true, reloaded: true };
    } finally { await context.close(); }
  }
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      page.__onDialog = async (dialog) => {
        page.__dialogs.push({ type: dialog.type() });
        await dialog.dismiss();
      };
      await page.close({ runBeforeUnload: true }).catch(() => {});
      await page.waitForTimeout(600);
      assert.equal(page.__dialogs.at(-1)?.type, "beforeunload", "tab close asks the browser");
      assert.equal(page.isClosed(), false, "dismissing keeps the tab open");
      results.tabCloseDismissed = { prompt: true, closed: page.isClosed() };
    } finally { await context.close().catch(() => {}); }
  }
  return results;
}

async function saveProbe(browser, base, stubOrigin) {
  const results = {};
  {
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.getByRole("button", { name: "Save update" }).click();
      await page.getByText("All changes saved").waitFor({ timeout: 15_000 });
      await page.locator(".work-back").click(); // must NOT prompt after a successful save
      await page.waitForURL("**/updates", { timeout: 10_000 });
      await expectNoDialog(page, 200);
      await openUpdate(page, base);
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);
      assert.equal(await bodyBox(page).inputValue(), BODY_EDITED);
      results.saveSuccess = { chipCleared: true, navigatedWithoutPrompt: true, persisted: true, writes: state.saves.length };
    } finally { await context.close(); }
  }
  {
    reset();
    state.failSave = true;
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.getByRole("button", { name: "Save update" }).click();
      const alert = page.locator(".composer-error");
      await alert.waitFor({ timeout: 15_000 });
      assert.match((await alert.textContent()) ?? "", /Synthetic save failure/i);
      assert.ok(await page.getByText("Unsaved changes").isVisible(), "a failed save stays dirty");
      // The guard is still armed after the failure.
      await page.locator(".work-back").click();
      await dialogOf(page).waitFor();
      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);
      // Retry succeeds, then the guard releases.
      state.failSave = false;
      await page.getByRole("button", { name: "Save update" }).click();
      await page.getByText("All changes saved").waitFor({ timeout: 15_000 });
      await page.locator(".work-back").click();
      await page.waitForURL("**/updates", { timeout: 10_000 });
      await expectNoDialog(page, 200);
      results.saveFailure = { errorShown: true, dirtyKept: true, guardedAfterFailure: true, retryReleased: true };
    } finally { await context.close(); }
  }
  {
    reset();
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      // An unrelated status save revalidates the page; the edits must survive.
      await page.getByLabel("Update status").click();
      await page.getByRole("option", { name: "Marked sent" }).click();
      await page.waitForTimeout(1200);
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED, "status revalidation keeps the draft");
      await page.locator(".work-back").click();
      await dialogOf(page).waitFor();
      await page.getByRole("button", { name: "Keep editing" }).click();
      results.statusSaveKeepsDraft = { editsKept: true, stillGuarded: true };
    } finally { await context.close(); }
  }
  return results;
}

async function fullPageNavigationProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    page.__onDialog = async (dialog) => {
      page.__dialogs.push({ type: dialog.type() });
      await dialog.dismiss();
    };
    await page.locator("#global-search").fill("fictional");
    await page.locator("#global-search").press("Enter");
    await page.waitForTimeout(1000);
    assert.equal(page.__dialogs.at(-1)?.type, "beforeunload", "a GET form navigation asks first");
    assert.ok(page.url().includes(`/updates/${ID}`), "dismissing keeps the editor");

    // Hash-only "Skip to content" is never intercepted.
    page.__onDialog = async () => { throw new Error("unexpected dialog"); };
    await page.evaluate(() => document.querySelector('a[href="#main"]')?.click());
    await page.waitForTimeout(300);
    assert.ok(page.url().endsWith("#main"), "the skip link still works");

    // The PDF affordance is a download, not a navigation.
    page.__onDialog = async (dialog) => {
      page.__dialogs.push({ type: dialog.type() });
      await dialog.accept();
    };
    const before = page.url();
    const download = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
    await page.getByRole("link", { name: /Download PDF/ }).click();
    const file = await download;
    await page.waitForTimeout(300);
    assert.equal(await dialogOf(page).count(), 0, "downloads are never intercepted");
    assert.equal(page.url(), before, "a download does not navigate");
    return { formPrompt: true, skipLinkUntouched: true, downloadUntouched: Boolean(file) };
  } finally {
    await context.close();
  }
}

async function noScriptProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 390, js: false });
  try {
    const response = await page.goto(`${base}/updates/${ID}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200);
    // The shell paints without JavaScript. The page body itself is streamed by
    // Next into a hidden container and revealed by script, so the editor is not
    // interactive at all with scripting off — pre-existing app behaviour that
    // predates and is independent of this guard.
    assert.ok(
      await page.getByRole("link", { name: "Briefs" }).first().isVisible(),
      "the app shell renders without JavaScript"
    );
    const diagnostics = await page.evaluate(() => {
      const input = document.querySelector('input[aria-label="Title"]');
      let hiddenAncestor = false;
      for (let node = input; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).display === "none") { hiddenAncestor = true; break; }
      }
      return {
        guardMarkup: document.querySelectorAll('[role="alertdialog"]').length,
        editorInDom: Boolean(input),
        hiddenAncestor,
      };
    });
    assert.equal(diagnostics.guardMarkup, 0, "the guard renders nothing server-side");
    // Navigation without JavaScript is a plain full page load: no interception.
    await page.getByRole("link", { name: "Briefs" }).first().click();
    await page.waitForURL("**/briefs", { timeout: 10_000 });
    return {
      guardRuns: false,
      guardMarkup: 0,
      editorInteractiveWithoutJs: false,
      hiddenByStreaming: diagnostics.hiddenAncestor,
      navigation: "full page load, no prompt",
      note: "the guard, like Save, requires JavaScript; the page body is JS-revealed in this app",
    };
  } finally {
    await context.close();
  }
}

async function dialogAxeProbe(browser, base, stubOrigin, width, scheme, output) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme });
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.waitForTimeout(320);
    const scan = await axeOnPage(page);
    assert.deepEqual(scan.violations, [], `${scheme} ${width}: axe violations`);
    assert.ok(scan.passes.length > 0);
    const shot = path.join(output, `dialog-${scheme}-${width}.png`);
    await page.screenshot({ path: shot });
    ledger.screenshots.push(path.basename(shot));
    return { width, scheme, violations: scan.violations, incomplete: scan.incomplete, passes: scan.passes.length };
  } finally {
    await context.close();
  }
}

async function normalMotionProbe(browser, base, stubOrigin) {
  const { context, page } = await newContext(browser, base, stubOrigin, { width: 390, motion: "no-preference" });
  try {
    assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), false);
    await openUpdate(page, base);
    await makeDirty(page);
    await page.locator(".work-back").click();
    await dialogOf(page).waitFor();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await dialogOf(page).waitFor({ state: "hidden" });
    return { motion: "no-preference", dialogUsable: true };
  } finally {
    await context.close();
  }
}

/**
 * Sign-out and workspace-switch protection (the follow-up to P2-02).
 *
 * Both are shell buttons whose handlers call a server action / the Supabase
 * client, so they cannot be intercepted as link clicks. They ask the guard's
 * registry first. These scenarios prove: nothing is called before the user
 * confirms, "Keep editing" changes nothing at all, "Discard …" performs the
 * ORIGINAL action exactly once, the draft never follows the user into another
 * workspace, and a clean editor still behaves exactly as it did before.
 */
async function shellActionsProbe(browser, base, stubOrigin) {
  const results = {};
  const switchTrigger = (page) => page.locator('[aria-label="Switch workspace"]:visible').first();
  const secondWorkspace = (page) => page.getByRole("option", { name: "Fictional Second Studio" });

  // A. Desktop — sign-out is held, "Keep editing" changes nothing, then the
  //    confirmed discard signs out exactly once.
  {
    reset();
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
      await dialogOf(page).waitFor();
      assert.equal(state.signOuts.length, 0, "no sign-out before the user confirms");
      assert.ok(
        await page.getByRole("button", { name: "Discard and sign out" }).isVisible(),
        "the destructive button names the action it performs"
      );
      const focusInDialog = await activeLabel(page);
      assert.equal(focusInDialog?.text, "Keep editing", "the safe action holds focus");

      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      assert.equal(state.signOuts.length, 0, "staying never signs the user out");
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED, "staying keeps the draft");
      assert.ok(page.url().includes(`/updates/${ID}`), "staying keeps the page");
      const focusAfterStay = await activeLabel(page);
      assert.equal(focusAfterStay?.label, "Account menu", "focus returns to the shell trigger");

      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
      await dialogOf(page).waitFor();
      await page.getByRole("button", { name: "Discard and sign out" }).click();
      await page.waitForURL("**/login", { timeout: 10_000 });
      assert.equal(state.signOuts.length, 1, "sign-out is invoked exactly once");
      results.signOut = {
        heldWhileDirty: true, noCallBeforeConfirm: true, stayKeepsDraft: true,
        focusReturnedToTrigger: true, discardSignsOut: true, signOutCalls: state.signOuts.length,
      };
    } finally { await context.close(); }
  }

  // B. Desktop — workspace switching is held; staying keeps workspace + draft,
  //    discarding performs the server action once and drops the draft.
  {
    reset();
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await switchTrigger(page).click();
      await secondWorkspace(page).click();
      await dialogOf(page).waitFor();
      assert.equal(state.workspaceWrites.length, 0, "no workspace write before confirmation");
      assert.ok(await page.getByRole("button", { name: "Discard and switch workspace" }).isVisible());

      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      assert.equal(state.workspaceWrites.length, 0, "staying keeps the current workspace");
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED, "staying keeps the draft");

      await switchTrigger(page).click();
      await secondWorkspace(page).click();
      await dialogOf(page).waitFor();
      await page.getByRole("button", { name: "Discard and switch workspace" }).click();
      await page.waitForTimeout(1500);
      assert.deepEqual(state.workspaceWrites, [WORKSPACE2], "the switch runs exactly once");
      assert.equal(await dialogOf(page).count(), 0, "no repeated confirmation");
      assert.equal(
        await titleBox(page).inputValue(), TITLE_SAVED,
        "the discarded draft does not cross into the new workspace"
      );
      results.workspaceSwitch = {
        heldWhileDirty: true, noWriteBeforeConfirm: true, stayKeepsWorkspace: true,
        discardSwitches: true, workspaceWrites: state.workspaceWrites.length,
        draftDropped: true,
      };
    } finally { await context.close(); }
  }

  // C. Clean editor — both actions behave exactly as before (no dialog).
  {
    reset();
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await switchTrigger(page).click();
      await secondWorkspace(page).click();
      await page.waitForTimeout(1200);
      await expectNoDialog(page, 300);
      assert.deepEqual(state.workspaceWrites, [WORKSPACE2], "a clean editor switches immediately");
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
      await page.waitForURL("**/login", { timeout: 10_000 });
      await expectNoDialog(page, 200);
      assert.equal(state.signOuts.length, 1, "a clean editor signs out immediately");
      results.cleanEditor = { switchDialog: false, signOutDialog: false, bothActionsRan: true };
    } finally { await context.close(); }
  }

  // D. Phone (390px) — the drawer's own account plane is guarded, and the
  //    drawer closes so the confirmation is the only dialog on screen.
  {
    reset();
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 390 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.getByRole("button", { name: "Open menu" }).click();
      const drawer = page.getByRole("dialog", { name: "Workspace navigation" });
      await drawer.waitFor();
      await drawer.getByRole("button", { name: /Log out/ }).click();
      await dialogOf(page).waitFor();
      assert.equal(state.signOuts.length, 0, "no sign-out from the drawer before confirmation");
      await page.waitForTimeout(400);
      assert.equal(
        await page.getByRole("dialog", { name: "Workspace navigation" }).count(), 0,
        "the drawer closes so only the confirmation is modal"
      );
      assert.equal((await activeLabel(page))?.text, "Keep editing", "focus lands on the safe action");
      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      assert.equal(await titleBox(page).inputValue(), TITLE_EDITED);
      const focusAfterStay = await activeLabel(page);
      assert.equal(focusAfterStay?.tag, "BUTTON", "focus returns to a shell control");
      results.mobileDrawerSignOut = {
        held: true, drawerClosed: true, safeActionFocused: true,
        stayKeepsDraft: true, signOutCalls: state.signOuts.length,
      };
    } finally { await context.close(); }
  }

  // E. A failed save leaves the guard armed for sign-out too.
  {
    reset();
    state.failSave = true;
    const { context, page } = await newContext(browser, base, stubOrigin, { width: 1440 });
    try {
      await openUpdate(page, base);
      await makeDirty(page);
      await page.getByRole("button", { name: "Save update" }).click();
      await page.locator(".composer-error").waitFor({ timeout: 15_000 });
      await page.getByRole("button", { name: "Account menu" }).click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
      await dialogOf(page).waitFor();
      assert.equal(state.signOuts.length, 0, "a failed save never unlocks sign-out");
      await page.getByRole("button", { name: "Keep editing" }).click();
      await dialogOf(page).waitFor({ state: "hidden" });
      assert.ok(await page.getByText("Unsaved changes").isVisible(), "still dirty");
      results.failedSaveThenSignOut = { stillGuarded: true, signOutCalls: state.signOuts.length };
    } finally { await context.close(); }
  }

  return results;
}

// ── PR #74 shell-action matrix ───────────────────────────────────────────
// Every case uses the real shell, guard and server actions against the same
// fictional fixture. No authentication or application code is replaced.
async function eventually(predicate, message, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.ok(predicate(), message);
}

async function sessionPresent(context, base) {
  return (await context.cookies(base)).some((cookie) =>
    cookie.name === "sb-127-auth-token" && cookie.value.length > 0);
}

function assertOneLocalSignOut() {
  assert.deepEqual(state.signOuts.map(({ method, scope, hasBearerToken }) =>
    ({ method, scope, hasBearerToken })),
  [{ method: "POST", scope: "local", hasBearerToken: true }],
  "exactly one authenticated local-scope logout request reaches the fixture");
}

async function assertPreserved(page, context, base) {
  assert.equal(new URL(page.url()).pathname, `/updates/${ID}`, "the editor URL did not change");
  assert.equal(await titleBox(page).inputValue(), TITLE_EDITED, "the edited title remains");
  assert.equal(await bodyBox(page).inputValue(), BODY_EDITED, "the edited body remains");
  assert.equal(await sessionPresent(context, base), true, "the fictional session remains");
  assert.equal(state.activeWorkspaceId, WORKSPACE, "the active workspace remains");
  assert.deepEqual(state.workspaceWrites, [], "no workspace write before confirmation");
  assert.deepEqual(state.signOuts, [], "no logout request before confirmation");
}

async function assertFocusReturned(page, selector) {
  await page.waitForFunction((target) => document.activeElement?.matches(target), selector, { timeout: 5000 });
  assert.equal(await page.evaluate((target) => document.activeElement?.matches(target), selector), true,
    `focus returns to ${selector}`);
}

async function selectWorkspaceByKeyboard(page, trigger, selectionKey = "Enter") {
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("option", { name: "Fictional Second Studio" }).waitFor();
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option", null, { timeout: 5000 });
  await page.keyboard.press("End");
  // Radix schedules its roving-focus move with setTimeout; wait for the
  // actual keyboard target before selecting it rather than racing the move.
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "option" &&
    document.activeElement?.textContent?.includes("Fictional Second Studio"), null, { timeout: 5000 });
  await page.keyboard.press(selectionKey);
}

async function triggerTopbarAction(page, action, keyboard = false, selectionKey = "Enter") {
  if (action === "sign-out") {
    const trigger = page.getByRole("button", { name: "Account menu", exact: true });
    if (keyboard) {
      await trigger.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("menu", { name: "Account menu" }).waitFor();
      await page.keyboard.press("End");
      assert.match((await activeLabel(page))?.text ?? "", /Log out/, "End focuses the logout menu item");
      await page.keyboard.press("Enter");
    } else {
      await trigger.click();
      await page.getByRole("menuitem", { name: /Log out/ }).click();
    }
    return "#account-menu-trigger";
  }
  const trigger = page.locator("header").getByRole("combobox", { name: "Switch workspace" }).first();
  const id = await trigger.getAttribute("id");
  assert.ok(id, "workspace trigger has a stable focus id");
  if (keyboard) {
    await selectWorkspaceByKeyboard(page, trigger, selectionKey);
  } else {
    await trigger.click();
    await page.getByRole("option", { name: "Fictional Second Studio" }).click();
  }
  return `#${id}`;
}

async function beginDialogFrameCapture(page) {
  await page.evaluate(() => {
    window.__guardMotionFrames = [];
    window.__guardMotionCapture = true;
    const capture = () => {
      if (!window.__guardMotionCapture) return;
      const element = document.querySelector('[role="alertdialog"]');
      if (element) {
        const rect = element.getBoundingClientRect();
        window.__guardMotionFrames.push({
          state: element.getAttribute("data-state"),
          x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom,
          opacity: Number(getComputedStyle(element).opacity),
        });
      }
      requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  });
}

async function endDialogFrameCapture(page, width, output, name) {
  const frames = await page.evaluate(() => {
    window.__guardMotionCapture = false;
    return window.__guardMotionFrames;
  });
  const file = `motion-frames-${name}.json`;
  writeFileSync(path.join(output, file), JSON.stringify(frames, null, 2));
  assert.ok(frames.some((frame) => frame.state === "open"), `${name}: entering dialog frames captured`);
  assert.ok(frames.some((frame) => frame.state === "closed"), `${name}: exiting dialog frames captured`);
  for (const frame of frames) {
    assert.ok(frame.x >= -1 && frame.y >= -1 && frame.right <= width + 1 &&
      frame.bottom <= (HEIGHTS[width] ?? 900) + 1, `${name}: ${frame.state} dialog fits throughout animation`);
  }
  return { file, frameCount: frames.length,
    openFrames: frames.filter((frame) => frame.state === "open").length,
    closedFrames: frames.filter((frame) => frame.state === "closed").length };
}

async function inspectDialog(page, width, action, motion) {
  const dialog = dialogOf(page);
  await dialog.waitFor({ state: "visible" });
  const expected = action === "sign-out" ? "Discard and sign out" : "Discard and switch workspace";
  assert.ok(await dialog.getByRole("button", { name: expected, exact: true }).isVisible());
  assert.equal((await activeLabel(page))?.text, "Keep editing", "safe action receives initial focus");
  if (motion !== "reduce") {
    // Target sizes and final geometry are measured after the actual animation;
    // separate frame capture asserts the dialog remains in view throughout it.
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations().filter((animation) => animation.playState === "running")
        .map((animation) => animation.finished));
    });
  }
  // Radix preserves aria-live regions and their ancestors, so #main itself
  // need not be hidden. Wait for the modal effect and inspect actual visible
  // background controls instead of mistaking a live-region ancestor for a leak.
  await page.waitForFunction(() => Boolean(document.querySelector('input[aria-label="Title"]')
    ?.closest('[aria-hidden="true"], [inert]')), null, { timeout: 5000 });
  const details = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const controls = Array.from(document.querySelectorAll('a[href], button, input, textarea, select'))
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return !element.contains(node) && box.width > 0 && box.height > 0 &&
          getComputedStyle(node).visibility !== "hidden";
      });
    const exposedControls = controls.filter((node) => !node.closest('[aria-hidden="true"], [inert]'))
      .map((node) => node.getAttribute("aria-label") || node.textContent.trim().slice(0, 50) || node.tagName);
    return {
      geometry: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      backgroundControls: controls.length,
      exposedControls,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      animationName: style.animationName,
      transitionDuration: style.transitionDuration,
      dark: document.documentElement.classList.contains("dark"),
      buttons: Array.from(element.querySelectorAll("button")).map((button) => {
        const box = button.getBoundingClientRect();
        return { label: button.textContent.trim(), width: box.width, height: box.height };
      }),
    };
  });
  assert.ok(details.geometry.x >= 0 && details.geometry.y >= 0, `${width}: dialog starts in viewport`);
  assert.ok(details.geometry.x + details.geometry.width <= width + 1, `${width}: dialog fits horizontally`);
  assert.ok(details.geometry.y + details.geometry.height <= (HEIGHTS[width] ?? 900) + 1,
    `${width}: dialog fits vertically`);
  assert.ok(details.overflow <= 1, `${width}: no horizontal overflow with shell dialog open`);
  assert.ok(details.backgroundControls > 0, "background controls were inspected");
  assert.deepEqual(details.exposedControls, [], "visible background controls are hidden from the accessibility tree");
  assert.ok(details.buttons.length >= 3, "both actions and close button exist");
  for (const button of details.buttons) {
    assert.ok(button.width >= 44 && button.height >= 44, `${width}: ${button.label} is at least 44px`);
  }
  assert.equal(details.reducedMotion, motion === "reduce", "requested motion preference is active");
  if (motion === "reduce") {
    assert.equal(details.animationName, "none", "dialog animation is disabled with reduced motion");
    assert.equal(details.transitionDuration, "0s", "dialog transition is disabled with reduced motion");
  } else {
    assert.notEqual(details.animationName, "none", "normal-motion dialog animation remains enabled");
  }
  return details;
}

async function assertFocusIsolation(page) {
  const labels = [];
  for (const key of ["Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    const focus = await page.evaluate(() => {
      const dialog = document.querySelector('[role="alertdialog"]');
      const active = document.activeElement;
      return { inside: Boolean(dialog?.contains(active)), text: active?.textContent?.trim() ?? "" };
    });
    assert.equal(focus.inside, true, `${key} stays within the dialog`);
    labels.push(focus.text);
  }
  assert.ok(new Set(labels).size >= 2, "keyboard can reach multiple dialog controls");
  await page.evaluate(() => document.querySelector("#global-search")?.focus());
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(() => document.querySelector('[role="alertdialog"]')?.contains(document.activeElement)),
    true, "programmatic background focus is redirected into the modal");
  return labels;
}

async function scanAndScreenshot(page, output, name, details) {
  const shot = path.join(output, `${name}.png`);
  await page.screenshot({ path: shot });
  ledger.screenshots.push(path.basename(shot));
  const scan = await axeOnPage(page);
  ledger.scans.push({ case: currentCase, ...details, violations: scan.violations,
    incomplete: scan.incomplete, passes: scan.passes.length });
  assert.deepEqual(scan.violations, [], `${name}: axe violations`);
  assert.ok(scan.passes.length > 0, `${name}: axe actually ran`);
  return { violations: scan.violations.length, incomplete: scan.incomplete.length, passes: scan.passes.length };
}

async function saveFailureScreenshot(page, output, name) {
  const shot = path.join(output, `FAILED-${name}.png`);
  await page.screenshot({ path: shot }).catch(() => {});
  if (existsSync(shot)) ledger.screenshots.push(path.basename(shot));
}

async function shellMatrixProbe(browser, base, stubOrigin, width, scheme, action, output, motion = "reduce") {
  reset();
  const { context, page } = await newContext(browser, base, stubOrigin, { width, scheme, motion });
  const name = `shell-${action}-${scheme}-${motion}-${width}`;
  try {
    const response = await openUpdate(page, base);
    assert.match(response.headers()["content-security-policy"] ?? "", /connect-src 'self'/,
      "the production CSP remains enabled");
    assert.equal(await sessionPresent(context, base), true, "the fictional session is loaded");
    await page.waitForFunction((dark) => document.documentElement.classList.contains("dark") === dark,
      scheme === "dark", { timeout: 5000 });
    await makeDirty(page);
    if (motion === "no-preference") await beginDialogFrameCapture(page);

    const focusSelector = await triggerTopbarAction(page, action, true);
    const dialog = dialogOf(page);
    const layout = await inspectDialog(page, width, action, motion);
    assert.equal(layout.dark, scheme === "dark", "the requested color scheme was applied");
    await assertPreserved(page, context, base);
    const axe = await scanAndScreenshot(page, output, name, { width, scheme, motion, action, surface: "topbar" });
    const tabSequence = await assertFocusIsolation(page);

    // Escape is a cancel, preserving both draft fields, session and workspace.
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);

    if (action === "switch-workspace") {
      // Space must still select the option and leave the guarded dialog open.
      await triggerTopbarAction(page, action, true, "Space");
      await dialog.getByRole("button", { name: "Discard and switch workspace", exact: true }).waitFor();
      assert.equal((await activeLabel(page))?.text, "Keep editing");
      await assertPreserved(page, context, base);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await assertFocusReturned(page, focusSelector);
      await assertPreserved(page, context, base);
    }

    // Backdrop dismissal is the same safe outcome.
    await triggerTopbarAction(page, action);
    await dialog.waitFor({ state: "visible" });
    await page.mouse.click(5, 5);
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);

    // Activate Keep editing from the keyboard, not just with a pointer.
    await triggerTopbarAction(page, action);
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("button", { name: "Keep editing" }).focus();
    await page.keyboard.press("Enter");
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);
    const animationFrames = motion === "no-preference"
      ? await endDialogFrameCapture(page, width, output, name) : null;

    // Discard invokes the original operation once, and does not re-prompt.
    await triggerTopbarAction(page, action);
    await dialog.waitFor({ state: "visible" });
    const discard = action === "sign-out" ? "Discard and sign out" : "Discard and switch workspace";
    await dialog.getByRole("button", { name: discard, exact: true }).click();
    if (action === "sign-out") {
      await page.waitForURL("**/login", { timeout: 10_000 });
      await page.waitForTimeout(300);
      assertOneLocalSignOut();
      assert.deepEqual(state.workspaceWrites, []);
      assert.equal(await sessionPresent(context, base), false, "sign-out removes the fictional session");
    } else {
      await eventually(() => state.workspaceWrites.length > 0, "workspace write completed");
      await page.waitForFunction(({ title, body }) => {
        const titleField = document.querySelector('input[aria-label="Title"]');
        const bodyField = document.querySelector('textarea[aria-label="Body (markdown)"]');
        return titleField?.value === title && bodyField?.value === body;
      }, { title: TITLE_SAVED, body: BODY_SAVED }, { timeout: 10_000 });
      await page.waitForTimeout(300);
      assert.deepEqual(state.workspaceWrites, [WORKSPACE2], "exactly one switch to the target workspace");
      assert.equal(state.activeWorkspaceId, WORKSPACE2);
      assert.deepEqual(state.signOuts, []);
      assert.equal(await sessionPresent(context, base), true);
      assert.equal(await dialogOf(page).count(), 0, "switch did not repeat the confirmation");
      assert.equal(new URL(page.url()).pathname, `/updates/${ID}`);
    }
    return { width, scheme, motion, action, layout, axe, tabSequence,
      ...(animationFrames ? { animationFrames } : {}),
      escapePreserved: true, backdropPreserved: true, keyboardKeepPreserved: true,
      ...(action === "switch-workspace" ? { enterAndSpaceSelectionPreserved: true } : {}),
      focusRestored: focusSelector, discardExactlyOnce: true };
  } catch (error) {
    await saveFailureScreenshot(page, output, name);
    throw error;
  } finally {
    await context.close();
  }
}

async function auditAccountMenuTargets(page, width, output) {
  const trigger = page.getByRole("button", { name: "Account menu", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Account menu" });
  await menu.waitFor();
  const items = menu.locator('[role="menuitem"], [role="menuitemradio"]');
  const count = await items.count();
  assert.ok(count > 1, `${width}: account menu contains its actions`);
  const targets = [];
  for (let index = 0; index < count; index += 1) {
    const item = items.nth(index);
    await item.scrollIntoViewIfNeeded();
    const target = await item.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return {
        label: (element.textContent ?? "").trim(),
        x: box.x, y: box.y, width: box.width, height: box.height,
        receivesPointer: Boolean(hit && (hit === element || element.contains(hit))),
        hit: hit?.getAttribute("aria-label") || hit?.textContent?.trim().slice(0, 40) || hit?.tagName,
      };
    });
    assert.ok(target.width >= 44 && target.height >= 44, `${width}: ${target.label} has a 44px target`);
    assert.ok(target.x >= 0 && target.y >= 0 && target.x + target.width <= width + 1 &&
      target.y + target.height <= (HEIGHTS[width] ?? 900) + 1, `${width}: ${target.label} fits in the viewport`);
    assert.equal(target.receivesPointer, true, `${width}: ${target.label} is not covered by ${target.hit}`);
    targets.push(target);
  }
  assert.ok(targets.some((target) => target.label.includes("Log out")), "Log out was hit-tested");
  const shot = path.join(output, `account-menu-targets-${width}.png`);
  await page.screenshot({ path: shot });
  ledger.screenshots.push(path.basename(shot));
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  await assertFocusReturned(page, "#account-menu-trigger");
  return targets;
}

async function cleanShellMatrixProbe(browser, base, stubOrigin, width, output) {
  reset();
  const { context, page } = await newContext(browser, base, stubOrigin, { width });
  const name = `clean-shell-${width}`;
  try {
    await openUpdate(page, base);
    assert.equal(await sessionPresent(context, base), true);
    await triggerTopbarAction(page, "switch-workspace", true);
    await eventually(() => state.workspaceWrites.length > 0, "clean workspace switch completed");
    await expectNoDialog(page, 300);
    assert.deepEqual(state.workspaceWrites, [WORKSPACE2]);
    assert.equal(state.activeWorkspaceId, WORKSPACE2);
    assert.equal(await sessionPresent(context, base), true);
    const menuTargets = await auditAccountMenuTargets(page, width, output);
    assert.deepEqual(state.signOuts, [], "inspecting the menu never signs out");
    await triggerTopbarAction(page, "sign-out", true);
    await page.waitForURL("**/login", { timeout: 10_000 });
    await expectNoDialog(page, 300);
    assertOneLocalSignOut();
    assert.equal(await sessionPresent(context, base), false);
    return { width, cleanSwitchWrites: 1, cleanSignOutRequests: 1, dialogs: 0, menuTargets };
  } catch (error) {
    await saveFailureScreenshot(page, output, name);
    throw error;
  } finally {
    await context.close();
  }
}

async function railWorkspaceKeyboardProbe(browser, base, stubOrigin, width, output) {
  reset();
  const { context, page } = await newContext(browser, base, stubOrigin, { width });
  const name = `rail-switch-workspace-${width}`;
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    const trigger = page.getByRole("complementary", { name: "Primary" })
      .getByRole("combobox", { name: "Switch workspace" });
    const id = await trigger.getAttribute("id");
    assert.ok(id, "rail workspace trigger has a focus id");
    const focusSelector = `#${id}`;
    const dialog = dialogOf(page);

    await selectWorkspaceByKeyboard(page, trigger, "Enter");
    const layout = await inspectDialog(page, width, "switch-workspace", "reduce");
    await assertPreserved(page, context, base);
    const axe = await scanAndScreenshot(page, output, name,
      { width, scheme: "light", motion: "reduce", action: "switch-workspace", surface: "rail" });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);

    await selectWorkspaceByKeyboard(page, trigger, "Space");
    await dialog.getByRole("button", { name: "Discard and switch workspace", exact: true }).waitFor();
    assert.equal((await activeLabel(page))?.text, "Keep editing");
    await assertPreserved(page, context, base);
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);

    await selectWorkspaceByKeyboard(page, trigger, "Enter");
    await dialog.getByRole("button", { name: "Discard and switch workspace", exact: true }).click();
    await eventually(() => state.workspaceWrites.length > 0, "rail switch completed");
    await page.waitForFunction(({ title, body }) =>
      document.querySelector('input[aria-label="Title"]')?.value === title &&
      document.querySelector('textarea[aria-label="Body (markdown)"]')?.value === body,
    { title: TITLE_SAVED, body: BODY_SAVED }, { timeout: 10_000 });
    await page.waitForTimeout(300);
    assert.deepEqual(state.workspaceWrites, [WORKSPACE2], "rail switch writes once after confirmation");
    assert.equal(state.activeWorkspaceId, WORKSPACE2);
    assert.deepEqual(state.signOuts, []);
    assert.equal(await sessionPresent(context, base), true);
    return { width, layout, axe, enterAndSpaceSelectionPreserved: true, focusRestored: focusSelector,
      discardExactlyOnce: true };
  } catch (error) {
    await saveFailureScreenshot(page, output, name);
    throw error;
  } finally {
    await context.close();
  }
}

async function drawerShellProbe(browser, base, stubOrigin, width, action, output) {
  reset();
  const { context, page } = await newContext(browser, base, stubOrigin, { width });
  const name = `drawer-${action}-${width}`;
  try {
    await openUpdate(page, base);
    await makeDirty(page);
    const openAction = async (keyboard = false) => {
      let drawer = page.getByRole("dialog", { name: "Workspace navigation" });
      if (!(await drawer.isVisible())) {
        await page.getByRole("button", { name: "Open menu", exact: true }).click();
        drawer = page.getByRole("dialog", { name: "Workspace navigation" });
        await drawer.waitFor();
      }
      if (action === "sign-out") {
        await drawer.getByRole("button", { name: /Log out/ }).click();
        return 'button[aria-label="Open menu"]';
      }
      const trigger = drawer.getByRole("combobox", { name: "Switch workspace" });
      const id = await trigger.getAttribute("id");
      assert.ok(id);
      if (keyboard) {
        await selectWorkspaceByKeyboard(page, trigger);
      } else {
        await trigger.click();
        await page.getByRole("option", { name: "Fictional Second Studio" }).click();
      }
      return `#${id}`;
    };
    const focusSelector = await openAction(action === "switch-workspace");
    const dialog = dialogOf(page);
    const layout = await inspectDialog(page, width, action, "reduce");
    await assertPreserved(page, context, base);
    const axe = await scanAndScreenshot(page, output, name,
      { width, scheme: "light", motion: "reduce", action, surface: "mobile-drawer" });
    await assertFocusIsolation(page);
    await dialog.getByRole("button", { name: "Keep editing" }).click();
    await dialog.waitFor({ state: "hidden" });
    await assertFocusReturned(page, focusSelector);
    await assertPreserved(page, context, base);
    await openAction();
    await dialog.waitFor({ state: "visible" });
    const discard = action === "sign-out" ? "Discard and sign out" : "Discard and switch workspace";
    await dialog.getByRole("button", { name: discard, exact: true }).click();
    if (action === "sign-out") {
      await page.waitForURL("**/login", { timeout: 10_000 });
      await page.waitForTimeout(300);
      assertOneLocalSignOut();
      assert.equal(await sessionPresent(context, base), false);
    } else {
      await eventually(() => state.workspaceWrites.length > 0, "drawer switch completed");
      await page.waitForTimeout(500);
      assert.deepEqual(state.workspaceWrites, [WORKSPACE2]);
      assert.equal(await titleBox(page).inputValue(), TITLE_SAVED);
      assert.equal(await bodyBox(page).inputValue(), BODY_SAVED);
      assert.equal(await sessionPresent(context, base), true);
    }
    return { width, action, layout, axe, focusRestored: focusSelector, discardExactlyOnce: true };
  } catch (error) {
    await saveFailureScreenshot(page, output, name);
    throw error;
  } finally {
    await context.close();
  }
}

async function runCase(name, fn) {
  currentCase = name;
  const entry = { name, status: "running", startedAt: new Date().toISOString() };
  const started = Date.now();
  ledger.scenarios.push(entry);
  try {
    Object.assign(entry, await fn());
    entry.status = "passed";
    console.log(`✓ ${name}`);
  } catch (error) {
    entry.status = "failed";
    entry.error = { name: error.name, message: error.message, stack: error.stack };
    console.error(`✗ ${name}: ${error.message}`);
    throw error;
  } finally {
    entry.durationMs = Date.now() - started;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    assert.ok(!existsSync(path.join(ROOT, name)), `Refusing to load ${name}; use a clean isolated checkout`);
  }
  const executablePath = process.env.CHROMIUM_PATH;
  assert.ok(executablePath && existsSync(executablePath), "Set CHROMIUM_PATH to an installed Chromium executable");

  const dist = path.join(ROOT, "resp-next");
  assert.ok(!existsSync(dist), "Refusing to overwrite an existing resp-next build; remove it first");
  const output = process.env.EVIDENCE_DIR || mkdtempSync(path.join(tmpdir(), "roducq-unsaved-"));
  if (process.env.EVIDENCE_DIR) mkdirSync(output);
  const runLog = path.join(output, "run.log");
  const log = console.log.bind(console);
  const errorLog = console.error.bind(console);
  console.log = (...args) => { appendFileSync(runLog, `${format(...args)}\n`); log(...args); };
  console.error = (...args) => { appendFileSync(runLog, `${format(...args)}\n`); errorLog(...args); };
  const home = mkdtempSync(path.join(tmpdir(), "roducq-unsaved-home-"));
  const stub = fixtureServer();
  let proxy;
  let ownsDist = false;
  let child;
  let browser;
  let serverLog = "";

  try {
    mkdirSync(dist);
    ownsDist = true;
    const stubPort = await listen(stub).then(() => stub.address().port);
    const port = await freePort();
    proxy = sameOriginProxy(stubPort, port);
    const proxyPort = await listen(proxy).then(() => proxy.address().port);
    const base = `http://127.0.0.1:${proxyPort}`;
    const stubOrigin = base;
    const env = {
      PATH: process.env.PATH || "/usr/bin:/bin", HOME: home, NODE_ENV: "production", TZ: "UTC",
      NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: "resp-next",
      NEXT_PUBLIC_SUPABASE_URL: base, NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-local-anon-key",
      AUTH_SECRET: "fictional-local-secret", HOST: "stub-project.supabase.co",
    };
    console.log(`Evidence: ${output}\nBuilding the isolated production app…`);
    await run(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "build"], env, path.join(output, "build.log"));
    child = spawn(process.execPath, [path.join(ROOT, "node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "127.0.0.1"],
      { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => { serverLog += d; });
    child.stderr.on("data", (d) => { serverLog += d; });
    await waitForServer(`${base}/`, child);

    browser = await chromium.launch({
      executablePath, headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      env: { ...env, LD_LIBRARY_PATH: process.env.LD_LIBRARY_PATH || "" },
    });
    ledger.browserVersion = browser.version();
    ledger.packageVersions = {
      node: process.version,
      next: require("next/package.json").version,
      playwright: require("playwright-core/package.json").version,
      axe: require("axe-core/package.json").version,
    };

    // Run every independent case even if one fails: runCase still records the
    // failure and screenshot, and the overall audit fails after all probes run.
    // Each probe owns and closes its browser context in a finally block.
    const failedCases = [];
    const recordedCase = async (name, fn) => {
      try {
        await runCase(name, fn);
      } catch {
        failedCases.push(name);
      }
    };
    // The shell matrix is deliberately first, but never suppresses other
    // scenarios or turns a failed assertion into an overall pass.
    for (const width of WIDTHS) {
      await recordedCase(`clean-shell-${width}`, () => cleanShellMatrixProbe(browser, base, stubOrigin, width, output));
      for (const scheme of ["light", "dark"]) {
        for (const action of ["sign-out", "switch-workspace"]) {
          await recordedCase(`shell-${action}-${scheme}-reduce-${width}`,
            () => shellMatrixProbe(browser, base, stubOrigin, width, scheme, action, output));
        }
      }
    }
    // Exercise both the compact tablet rail and the full desktop panel.
    for (const width of [768, 1440]) {
      await recordedCase(`rail-switch-workspace-${width}`,
        () => railWorkspaceKeyboardProbe(browser, base, stubOrigin, width, output));
    }
    for (const width of [320, 375, 390]) {
      for (const action of ["sign-out", "switch-workspace"]) {
        await recordedCase(`drawer-${action}-${width}`,
          () => drawerShellProbe(browser, base, stubOrigin, width, action, output));
      }
    }
    for (const action of ["sign-out", "switch-workspace"]) {
      await recordedCase(`shell-${action}-light-normal-motion-390`,
        () => shellMatrixProbe(browser, base, stubOrigin, 390, "light", action, output, "no-preference"));
    }

    // Keep the existing navigation and save coverage; it is not replaced by
    // the shell matrix. Each old probe remains an individually recorded case.
    await recordedCase("cleanEditor", () => { reset(); return cleanEditorProbe(browser, base, stubOrigin); });
    for (const width of WIDTHS) {
      await recordedCase(`layout-${width}`, () => { reset(); return layoutProbe(browser, base, stubOrigin, width, output); });
    }
    await recordedCase("navigation", () => { reset(); return sidebarAndDrawerProbe(browser, base, stubOrigin); });
    await recordedCase("stayAndEscape", () => { reset(); return stayAndEscapeProbe(browser, base, stubOrigin); });
    await recordedCase("backForward", () => { reset(); return backForwardProbe(browser, base, stubOrigin); });
    await recordedCase("reloadAndClose", () => { reset(); return reloadProbe(browser, base, stubOrigin); });
    await recordedCase("saves", () => { reset(); return saveProbe(browser, base, stubOrigin); });
    await recordedCase("shellActions", () => { reset(); return shellActionsProbe(browser, base, stubOrigin); });
    await recordedCase("fullPageNavigation", () => { reset(); return fullPageNavigationProbe(browser, base, stubOrigin); });
    await recordedCase("noScript", () => { reset(); return noScriptProbe(browser, base, stubOrigin); });
    await recordedCase("normalMotion", () => { reset(); return normalMotionProbe(browser, base, stubOrigin); });
    for (const [width, scheme] of [[1440, "light"], [375, "dark"], [390, "light"]]) {
      await recordedCase(`generic-axe-${scheme}-${width}`, async () => {
        reset();
        const scan = await dialogAxeProbe(browser, base, stubOrigin, width, scheme, output);
        ledger.scans.push({ case: currentCase, ...scan });
        return scan;
      });
    }
    await recordedCase("browser-errors-and-network", async () => {
      assert.deepEqual(ledger.browserErrors, [], "no browser console, page or HTTP errors");
      assert.deepEqual(ledger.blockedRequests, [], "no unexpected external requests");
      return { browserErrors: 0, blockedRequests: 0 };
    });
    if (failedCases.length) throw new Error(`${failedCases.length} scenario(s) failed: ${failedCases.join(", ")}`);
    ledger.status = "passed";
    console.log("unsaved-edits verification passed ✔");
  } catch (error) {
    ledger.status = "failed";
    ledger.error = { name: error.name, message: error.message, stack: error.stack };
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child) {
      child.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    if (proxy) await new Promise((resolve) => proxy.close(resolve));
    await new Promise((resolve) => stub.close(resolve));
    if (ownsDist) rmSync(dist, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
    if (serverLog) writeFileSync(path.join(output, "server.log"), serverLog);
    ledger.summary = {
      passed: ledger.scenarios.filter((entry) => entry.status === "passed").length,
      failed: ledger.scenarios.filter((entry) => entry.status === "failed").length,
      axeScans: ledger.scans.length,
      axeViolations: ledger.scans.reduce((sum, scan) => sum + scan.violations.length, 0),
      axeIncompleteRules: ledger.scans.reduce((sum, scan) => sum + scan.incomplete.length, 0),
      browserErrors: ledger.browserErrors.length,
      blockedRequests: ledger.blockedRequests.length,
    };
    writeFileSync(path.join(output, "ledger.json"), JSON.stringify(ledger, null, 2));
    console.log(`Ledger: ${path.join(output, "ledger.json")}`);
  }
}

main().catch((error) => {
  console.error("FAILED", error);
  process.exit(1);
});
