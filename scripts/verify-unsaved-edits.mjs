#!/usr/bin/env node
/**
 * Unsaved-edits guard — browser verification (UX audit P2-02).
 *
 * npm ci
 * CHROMIUM_PATH=/path/to/chromium node scripts/verify-unsaved-edits.mjs
 *
 * Fictional loopback fixture only: this is NOT a production, RLS or live-data
 * test. The script refuses to run when Next could load a real `.env` file or
 * when a `resp-next` build already exists, never kills listeners, never
 * removes a directory it did not create, and blocks every browser request
 * that is not the local app or the local fixture. Screenshots, an axe report
 * and a JSON ledger are written to a new OS temp directory (or EVIDENCE_DIR).
 *
 * What it proves, at 320/375/390/768/1024/1200/1440:
 *   - a clean editor navigates exactly as before (no dialog, no listeners);
 *   - a dirty editor is held for sidebar, drawer, page-link, Back, Forward,
 *     reload, tab close and full-page form navigation;
 *   - "Keep editing" / Escape / overlay leave the URL and the edits intact
 *     and restore focus; "Discard changes" performs the requested navigation;
 *   - a successful save clears the guard, a failed save keeps it armed;
 *   - the dialog is accessible (axe), contained, and usable with reduced
 *     motion; the no-JavaScript behaviour is recorded.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const USER = "33333333-3333-4333-8333-333333333333";
const CREATED = "2026-01-10T10:00:00.000Z";
const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1440];
const HEIGHTS = { 320: 568, 375: 667, 390: 844, 768: 900, 1024: 900, 1200: 900, 1440: 900 };
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];
const TITLE_SAVED = "Fictional weekly update";
const TITLE_EDITED = "Fictional weekly update — edited";
const BODY_SAVED = "The fictional milestone is on track.";
const BODY_EDITED = "Unsaved fictional body edit.";

// ── Fictional fixture ────────────────────────────────────────────────────
let state;
function reset(overrides = {}) {
  state = {
    title: TITLE_SAVED,
    body: BODY_SAVED,
    status: "draft",
    failSave: false,
    saves: [],
    ...overrides,
  };
}
reset();

const updateRow = (id, title, body) => ({
  id, workspace_id: WORKSPACE, status: state.status, title, body, client_name: null,
  created_at: CREATED, updated_at: CREATED, plan: null, plan_id: null, template_id: null,
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
      if (pathname === "/rest/v1/rpc/get_user_memberships") return send(req, res, [{
        workspace_id: WORKSPACE, workspace_name: "Fictional Studio", role: "owner",
      }]);
      if (pathname === "/rest/v1/rpc/get_shared_document") return send(req, res, []);
      if (pathname === "/rest/v1/profiles") return send(req, res, single(req, {
        id: USER, email: "fictional@example.test", full_name: "Fictional User",
        onboarding_completed: true, active_workspace_id: WORKSPACE,
      }));
      if (pathname === "/rest/v1/workspaces") return send(req, res, single(req, {
        id: WORKSPACE, name: "Fictional Studio", created_at: CREATED,
        plan_tier: "starter", razorpay_subscription_status: null,
      }));
      if (pathname === "/rest/v1/workspace_members") return send(req, res, single(req, {
        user_id: USER, workspace_id: WORKSPACE, role: "owner", created_at: CREATED,
        workspace: { id: WORKSPACE, name: "Fictional Studio", created_at: CREATED,
          plan_tier: "starter", razorpay_subscription_status: null },
      }));
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
    network: "browser limited to the local app and the fictional loopback fixture" },
  scenarios: [], scans: [], screenshots: [], browserErrors: [],
  limitations: [
    "Native beforeunload text is not customisable; Chromium requires prior user interaction and some mobile browsers suppress the prompt.",
    "Back/Forward is only cancellable where the Navigation API exists (Chrome/Edge 102+, Firefox 147+, Safari 26.2+). Older engines keep click and unload protection only.",
    "Programmatic router navigation (sign out, workspace switch, server-action redirects) cannot be intercepted without a global blocker and is out of scope.",
    "With JavaScript disabled the guard cannot run; the editor cannot save either.",
    "Headless Chromium viewports are simulations, not physical devices or assistive technology.",
  ],
};

function trackPage(page) {
  page.on("pageerror", (error) => ledger.browserErrors.push({ type: "pageerror", message: error.message }));
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1") && response.status() >= 400) {
      ledger.browserErrors.push({ type: "http", status: response.status(), url: response.url() });
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
        nodes: rule.nodes.map((node) => node.target) })),
      incomplete: report.incomplete.map((rule) => rule.id),
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
    ledger.screenshots.push(shot);
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
    ledger.screenshots.push(shot);
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
  const home = mkdtempSync(path.join(tmpdir(), "roducq-unsaved-home-"));
  const stub = fixtureServer();
  let ownsDist = false;
  let child;
  let browser;
  let serverLog = "";

  try {
    mkdirSync(dist);
    ownsDist = true;
    const stubPort = await listen(stub).then(() => stub.address().port);
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const stubOrigin = `http://127.0.0.1:${stubPort}`;
    const env = {
      PATH: process.env.PATH || "/usr/bin:/bin", HOME: home, NODE_ENV: "production", TZ: "UTC",
      NEXT_TELEMETRY_DISABLED: "1", NEXT_DIST_DIR: "resp-next",
      NEXT_PUBLIC_SUPABASE_URL: stubOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: "fictional-local-anon-key",
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

    reset();
    ledger.scenarios.push({ name: "cleanEditor", ...(await cleanEditorProbe(browser, base, stubOrigin)) });
    console.log("✓ clean editor navigates with no dialog");

    for (const width of WIDTHS) {
      reset();
      ledger.scenarios.push({ name: `layout-${width}`, ...(await layoutProbe(browser, base, stubOrigin, width, output)) });
      console.log(`✓ ${width}px: dialog contained, 44px actions, safe action focused`);
    }

    reset();
    ledger.scenarios.push({ name: "navigation", ...(await sidebarAndDrawerProbe(browser, base, stubOrigin)) });
    console.log("✓ sidebar and drawer navigation are held");

    reset();
    ledger.scenarios.push({ name: "stayAndEscape", ...(await stayAndEscapeProbe(browser, base, stubOrigin)) });
    console.log("✓ Keep editing, Escape and overlay keep the edits");

    reset();
    ledger.scenarios.push({ name: "backForward", ...(await backForwardProbe(browser, base, stubOrigin)) });
    console.log("✓ Back/Forward are cancelled and re-issued on confirm");

    reset();
    ledger.scenarios.push({ name: "reloadAndClose", ...(await reloadProbe(browser, base, stubOrigin)) });
    console.log("✓ reload/tab close use the native confirmation");

    reset();
    ledger.scenarios.push({ name: "saves", ...(await saveProbe(browser, base, stubOrigin)) });
    console.log("✓ save success clears the guard; failure keeps it armed");

    reset();
    ledger.scenarios.push({ name: "fullPageNavigation", ...(await fullPageNavigationProbe(browser, base, stubOrigin)) });
    console.log("✓ full-page form navigation asks; downloads and hash links do not");

    reset();
    ledger.scenarios.push({ name: "noScript", ...(await noScriptProbe(browser, base, stubOrigin)) });
    console.log("✓ no-JavaScript behaviour recorded");

    reset();
    ledger.scenarios.push({ name: "normalMotion", ...(await normalMotionProbe(browser, base, stubOrigin)) });
    console.log("✓ dialog is usable with normal motion");

    for (const [width, scheme] of [[1440, "light"], [375, "dark"], [390, "light"]]) {
      reset();
      ledger.scans.push(await dialogAxeProbe(browser, base, stubOrigin, width, scheme, output));
      console.log(`✓ axe: ${scheme} ${width}px dialog has zero violations`);
    }

    assert.deepEqual(ledger.browserErrors, [], "no browser page or HTTP errors");
    writeFileSync(path.join(output, "ledger.json"), JSON.stringify(ledger, null, 2));
    console.log(`\nLedger: ${path.join(output, "ledger.json")}`);
    console.log("unsaved-edits verification passed ✔");
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (child) {
      child.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    await new Promise((resolve) => stub.close(resolve));
    if (ownsDist) rmSync(dist, { recursive: true, force: true });
    if (serverLog) writeFileSync(path.join(output, "server.log"), serverLog);
  }
}

main().catch((error) => {
  console.error("FAILED", error);
  process.exit(1);
});
