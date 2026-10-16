/** Full-product quality probes, additive to verify-responsive's unchanged
 * overflow/cut-off/44px measurements. No production service is contacted.
 * PHASE_F=1 enables these; PHASE_F_SHOTS_DIR writes real Chromium evidence.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"];

export function discoverRoutes(root) {
  const routes = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (["page.tsx", "route.ts"].includes(entry.name)) {
        const source = relative(root, path).replaceAll("\\", "/");
        const segments = source.split("/").slice(1, -1).filter((part) => !part.startsWith("("));
        routes.push({
          source,
          pattern: `/${segments.join("/")}`,
          kind: entry.name === "route.ts" ? "handler" : "page",
          group: source.includes("(marketing)") ? "marketing" : source.includes("(auth)") ? "authentication" : source.includes("(app)") ? "application" : source.includes("/api/") || source.includes("/auth/callback/") ? "operational" : "public product",
        });
      }
    }
  };
  walk(join(root, "app"));
  return routes.sort((a, b) => a.source.localeCompare(b.source));
}

export function assertRouteCoverage(root, pages) {
  const missing = discoverRoutes(root).filter((route) => {
    if (route.kind !== "page") return false;
    const pattern = new RegExp(`^${route.pattern.split("/").map((part) => part.startsWith("[") ? "[^/]+" : part).join("/")}$`);
    return !pages.some((page) => pattern.test(page.url.split("?")[0]) && (route.group === "application" ? page.auth : route.group === "marketing" ? !page.auth : true));
  });
  assert.deepEqual(missing, [], "Every App Router page needs a responsive fixture (no exclusions).");
}

/** The production CSP correctly permits hosted Supabase, not a loopback
 * test double. Add ONLY the in-process stub's connect-src on local document
 * responses; never bypass CSP or change the shipped security policy. This
 * lets onboarding perform a real getUser request instead of freezing it.
 */
export async function installFixtureNetwork(page, base, stubOrigin) {
  assert.equal(new URL(base).hostname, "127.0.0.1");
  assert.equal(new URL(stubOrigin).hostname, "127.0.0.1");
  // Chromium 153 also prompts for Local Network Access across loopback
  // ports. Grant that normal permission only to this local fixture origin.
  await page.context().grantPermissions(["local-network-access"], { origin: base });
  await page.route(`${base}/**`, async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch({ maxRedirects: 0 });
    const headers = response.headers();
    if (headers["content-security-policy"]) {
      headers["content-security-policy"] = headers["content-security-policy"].replace(/connect-src[^;]*/, (directive) => `${directive} ${stubOrigin}`);
    }
    await route.fulfill({ response, headers });
  });
}

export async function installPerformanceObserver(page) {
  page.__formaBrowserErrors = [];
  page.on("pageerror", (error) => page.__formaBrowserErrors.push({ type: "pageerror", text: String(error) }));
  page.on("console", (message) => {
    if (message.type() === "error") page.__formaBrowserErrors.push({ type: "console", text: message.text(), url: message.location().url });
  });
  await page.addInitScript(() => {
    window.__formaLayoutShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__formaLayoutShifts.push(entry.value);
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function axeScan(page) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async (tags) => {
    const result = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return {
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
      })),
      // Incomplete is NOT a pass: retain these for the human review ledger.
      incomplete: result.incomplete.map((rule) => ({ id: rule.id, nodes: rule.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })),
    };
  }, TAGS);
}

export async function inspectPage(page, fixture, width, scheme) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const h1s = [...document.querySelectorAll("h1")].filter(visible);
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((el) => ({ level: Number(el.tagName[1]), text: el.textContent.trim() }));
    const smallText = [];
    const nonManrope = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el) || el.closest('[aria-hidden="true"],.sr-only,svg,script,style,code,kbd')) continue;
      if (![...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
      const style = getComputedStyle(el);
      if (Number.parseFloat(style.fontSize) < 12) smallText.push({ text: el.textContent.trim().slice(0, 80), size: style.fontSize });
      if (!/manrope|fira|monospace/i.test(style.fontFamily)) nonManrope.push({ text: el.textContent.trim().slice(0, 80), font: style.fontFamily });
    }
    const scripts = performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/_next/") && /\.js(?:\?|$)/.test(entry.name));
    return {
      title: document.title,
      httpStatus: performance.getEntriesByType("navigation")[0]?.responseStatus,
      h1s: h1s.map((el) => el.textContent.trim()),
      mains: document.querySelectorAll("main").length,
      headings,
      smallText,
      nonManrope,
      nestedInteractive: [...document.querySelectorAll('button button,button a[href],a[href] button,a[href] a[href]')].map((el) => el.outerHTML.slice(0, 300)),
      resolvedTheme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      persistedTheme: localStorage.getItem("theme") || "system (default)",
      fontReady: document.fonts.status,
      content: document.querySelector("main")?.textContent || "",
      performance: { cls: (window.__formaLayoutShifts || []).reduce((sum, value) => sum + value, 0), scriptResources: scripts.length, encodedScriptBytes: scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0) },
    };
  });
  const failures = [];
  const renderedUrl = page.url();
  const expectedHttpErrors = (page.__formaBrowserErrors || []).filter((error) => fixture.status === 404 && error.url === renderedUrl && /server responded with a status of 404/.test(error.text));
  const browserErrors = (page.__formaBrowserErrors || []).filter((error) => !expectedHttpErrors.includes(error));
  if (browserErrors.length) failures.push(`browser errors: ${browserErrors.map((error) => error.text).join("; ")}`);
  if (result.httpStatus !== (fixture.status || 200)) failures.push(`unexpected HTTP status ${result.httpStatus}`);
  if (new URL(renderedUrl).pathname !== new URL(fixture.url, renderedUrl).pathname) failures.push(`redirected away from fixture: ${renderedUrl}`);
  if (result.h1s.length !== 1) failures.push(`expected one visible H1, got ${result.h1s.length}`);
  if (result.mains !== 1) failures.push(`expected one main landmark, got ${result.mains}`);
  if (result.smallText.length) failures.push(`${result.smallText.length} text nodes below 12px`);
  if (result.nonManrope.length) failures.push(`${result.nonManrope.length} non-Manrope text nodes`);
  if (result.nestedInteractive.length) failures.push("nested interactive controls");
  if (result.resolvedTheme !== scheme) failures.push(`theme mismatch: ${result.resolvedTheme}`);
  if (fixture.expected && !result.content.includes(fixture.expected)) failures.push(`fixture did not render: ${fixture.expected}`);
  delete result.content;
  const accessibility = [375, 1440].includes(width) ? await axeScan(page) : null;
  if (accessibility?.violations.length) failures.push(`axe: ${accessibility.violations.map((rule) => rule.id).join(", ")}`);
  return { page: fixture.slug, url: fixture.url, renderedUrl, width, scheme, ...result, accessibility, browserErrors, expectedHttpErrors, failures };
}

/** Reuse the unchanged viewport metrics throughout every real vertical
 * scroll container. The app scrolls <main>, so body/fullPage alone misses
 * settings/document actions below the fold. No layout style is changed. */
export async function inspectScrollGeometry(page, metrics) {
  const handle = await page.evaluateHandle(() => [...new Set([document.scrollingElement, ...document.querySelectorAll("body *")])].filter((el) => {
    if (!el || el.scrollHeight <= el.clientHeight + 1) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && (el === document.scrollingElement || /auto|scroll/.test(getComputedStyle(el).overflowY));
  }));
  const samples = [];
  const findings = [];
  try {
    for (const [index, property] of await handle.getProperties()) {
      const root = property.asElement();
      if (!root) continue;
      const info = await root.evaluate((el) => ({ original: el.scrollTop, max: el.scrollHeight - el.clientHeight, step: Math.max(1, Math.floor(el.clientHeight * .7)), label: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""}` }));
      try {
        const positions = [];
        for (let top = info.step; top < info.max; top += info.step) positions.push(top);
        positions.push(info.max);
        for (const top of positions) {
          await root.evaluate((el, y) => el.scrollTo({ top: y, left: el.scrollLeft, behavior: "instant" }), top);
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const m = await page.evaluate(metrics);
          const sample = { root: info.label, rootIndex: index, top, overflowX: m.overflowX, offenders: m.offenders, cutoffs: m.cutoffs, smallTaps: m.small, fixedEscapes: m.fixed.filter((item) => item.escapes) };
          samples.push(sample);
          if (sample.overflowX > 0 || sample.offenders.length || sample.cutoffs.length || sample.smallTaps.length || sample.fixedEscapes.length) findings.push(sample);
        }
      } finally {
        await root.evaluate((el, y) => el.scrollTo({ top: y, left: el.scrollLeft, behavior: "instant" }), info.original);
      }
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  } finally { await handle.dispose(); }
  return { samples, findings };
}

export async function capturePage(page, fixture, width, scheme, dir) {
  mkdirSync(dir, { recursive: true });
  const stem = `${fixture.slug}-${width}-${scheme}`;
  // Authoritative viewport capture: no DOM or layout alterations.
  await page.screenshot({ path: join(dir, `${stem}.png`) });
  if (![375, 1440].includes(width)) return;
  // Supplemental full-document proof. The real app scrolls <main>, not the
  // body. Flatten only for this explicitly named full capture, after all
  // metrics and the unaltered viewport screenshot have been recorded.
  if (fixture.auth && fixture.slug !== "onboarding") {
    await page.addStyleTag({ content: "html,body{height:auto!important;overflow:visible!important}.app-shell{display:block!important;height:auto!important;overflow:visible!important}.app-main{height:auto!important;overflow:visible!important;padding-bottom:1.5rem!important}.app-topbar,.app-sidebar,.app-tabbar,.timer-pill{display:none!important}" });
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("body *")) if (getComputedStyle(element).position === "fixed") element.style.display = "none";
    });
  }
  await page.screenshot({ path: join(dir, `${stem}-full.jpg`), type: "jpeg", quality: 85, fullPage: true });
}

/** Onboarding has no account menu yet: exercise persisted preferences from
 * the same root provider, with a real fresh-user session and enabled form. */
export async function verifyOnboardingThemeStates(page) {
  const proof = [];
  for (const choice of ["dark", "light", "system"]) {
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate((value) => localStorage.setItem("theme", value), choice);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => {
      const submit = document.querySelector('button[type="submit"]');
      return submit && !submit.disabled;
    }, undefined, { timeout: 5000 });
    const state = await page.evaluate(() => ({ stored: localStorage.getItem("theme"), dark: document.documentElement.classList.contains("dark") }));
    assert.equal(new URL(page.url()).pathname, "/onboarding");
    assert.equal(state.stored, choice);
    assert.equal(state.dark, choice === "dark");
    proof.push({ choice, ...state, authenticatedFormEnabled: true });
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  await page.reload({ waitUntil: "load" });
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains("dark")));
  return { proof, systemFollowsOS: true, systemSurvivesReload: true };
}

export async function verifyPhaseFInteractions({ browser, base, authCookie, authCookieNew, pages, metrics, shots, stubOrigin }) {
  const checks = [];
  const dir = join(shots, "interactions");
  mkdirSync(dir, { recursive: true });
  const run = async (name, options, task) => {
    const ctx = await browser.newContext({ viewport: { width: options.width || 375, height: options.height || 812 }, colorScheme: options.scheme || "light", reducedMotion: options.reduce ? "reduce" : "no-preference" });
    if (options.auth) await ctx.addCookies([options.newUser ? authCookieNew : authCookie]);
    const page = await ctx.newPage();
    await installFixtureNetwork(page, base, stubOrigin);
    const errors = [];
    const expectedHttpErrors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const expected404 = pages.find((fixture) => fixture.status === 404 && message.location().url === `${base}${fixture.url}`);
      if (expected404 && /server responded with a status of 404/.test(message.text())) expectedHttpErrors.push({ page: expected404.slug, message: message.text() });
      else errors.push(message.text());
    });
    try {
      const details = await task(page, ctx);
      assert.deepEqual(errors, [], "browser errors during interaction");
      checks.push({ name, ok: true, details, browserErrors: errors, expectedHttpErrors });
    } catch (error) {
      checks.push({ name, ok: false, error: String(error.stack || error), browserErrors: errors, expectedHttpErrors });
    } finally { await ctx.close(); }
  };
  const goto = async (page, url) => {
    await page.goto(`${base}${url}`, { waitUntil: "load", timeout: 25000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
  };
  const assertClean = (measurement) => {
    assert.equal(measurement.overflowX, 0);
    assert.deepEqual(measurement.offenders, []);
    assert.deepEqual(measurement.cutoffs, []);
    assert.deepEqual(measurement.small, []);
    assert.ok(!measurement.fixed.some((item) => item.escapes));
  };
  const expectFocus = async (page, locator) => {
    await page.waitForFunction((el) => el === document.activeElement, await locator.elementHandle(), { timeout: 2000 });
    assert.ok(await locator.evaluate((el) => el === document.activeElement));
  };
  const trapProof = async (page, dialog, count = 36) => {
    const sequence = [];
    for (let i = 0; i < count; i++) {
      await page.keyboard.press(i % 3 === 0 ? "Shift+Tab" : "Tab");
      assert.ok(await dialog.evaluate((el) => el.contains(document.activeElement)), "focus escaped modal");
      sequence.push(await page.evaluate(() => document.activeElement.getAttribute("aria-label") || document.activeElement.textContent.trim().slice(0, 40)));
    }
    return sequence;
  };

  for (const scheme of ["light", "dark"]) {
    for (const width of [320, 375, 768]) {
      await run(`marketing-menu-${width}-${scheme}`, { width, scheme }, async (page) => {
        await goto(page, "/");
        const trigger = page.getByRole("button", { name: "Open menu", exact: true });
        await trigger.focus(); await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "Explore RoduCQ" });
        await dialog.waitFor(); await page.waitForTimeout(300);
        const focus = await trapProof(page, dialog);
        assertClean(await page.evaluate(metrics));
        const axe = await axeScan(page); assert.deepEqual(axe.violations, []);
        await page.screenshot({ path: join(dir, `marketing-menu-${width}-${scheme}.png`) });
        await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
        await expectFocus(page, trigger);
        await page.keyboard.press("Space"); await dialog.waitFor();
        await dialog.getByRole("link", { name: "Compare", exact: true }).click();
        await page.waitForURL("**/vs");
        assert.equal(await page.getByRole("dialog").count(), 0);
        return { focusSequence: focus, escapeRestoresFocus: true, destination: page.url(), axe };
      });
    }
    for (const width of [320, 375]) {
      await run(`workspace-drawer-${width}-${scheme}`, { width, scheme, auth: true }, async (page) => {
        await goto(page, "/intake");
        const trigger = page.getByRole("button", { name: "More navigation", exact: true });
        await trigger.focus(); await page.keyboard.press("Space");
        const dialog = page.getByRole("dialog", { name: "Workspace navigation" });
        await dialog.waitFor(); await page.waitForTimeout(300);
        const focus = await trapProof(page, dialog, 48);
        assertClean(await page.evaluate(metrics));
        const axe = await axeScan(page); assert.deepEqual(axe.violations, []);
        await page.screenshot({ path: join(dir, `workspace-drawer-${width}-${scheme}.png`) });
        await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
        await expectFocus(page, trigger);
        const topbar = page.getByRole("button", { name: "Open menu", exact: true });
        await topbar.focus(); await page.keyboard.press("Enter"); await dialog.waitFor();
        await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
        await expectFocus(page, topbar);
        await trigger.click(); await dialog.waitFor();
        await page.setViewportSize({ width: 768, height: 1024 });
        await dialog.waitFor({ state: "detached" });
        await page.waitForFunction(() => document.activeElement?.id === "main");
        return { focusSequence: focus, bothTriggersRestoreFocus: true, closesAtTabletBreakpoint: true, axe };
      });
    }
    for (const width of [320, 768]) {
      await run(`template-dialog-${width}-${scheme}`, { width, scheme, auth: true }, async (page) => {
        await goto(page, "/settings");
        const trigger = page.locator('button:has-text("template")').first();
        await trigger.scrollIntoViewIfNeeded(); await trigger.focus(); await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: "New template" });
        await dialog.waitFor(); await page.waitForTimeout(350);
        const focus = await trapProof(page, dialog, 18);
        await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("Reusable client handoff");
        await dialog.getByRole("textbox", { name: "Body", exact: true }).fill("Safe browser fixture only. No template is saved by this probe.");
        const measurement = await page.evaluate(metrics); assertClean(measurement);
        const axe = await axeScan(page); assert.deepEqual(axe.violations, []);
        await page.screenshot({ path: join(dir, `template-dialog-${width}-${scheme}.png`) });
        await page.keyboard.press("Escape"); await dialog.waitFor({ state: "detached" });
        await expectFocus(page, trigger);
        return { focusSequence: focus, closeTarget: "44×44", escapeRestoresFocus: true, axe };
      });
    }
    await run(`account-keyboard-${scheme}`, { width: 1440, scheme, auth: true }, async (page) => {
      await goto(page, "/intake");
      const trigger = page.getByRole("button", { name: "Account menu", exact: true });
      await trigger.focus(); await page.keyboard.press("ArrowDown");
      const menu = page.getByRole("menu", { name: "Account menu" }); await menu.waitFor();
      await page.keyboard.press("End");
      assert.match(await page.evaluate(() => document.activeElement.textContent), /Log out/);
      await page.keyboard.press("Home");
      const first = await page.evaluate(() => document.activeElement.textContent);
      await page.keyboard.press("ArrowDown");
      assert.notEqual(await page.evaluate(() => document.activeElement.textContent), first);
      const axe = await axeScan(page); assert.deepEqual(axe.violations, []);
      await page.keyboard.press("Escape");
      await expectFocus(page, trigger);
      await page.keyboard.press("ArrowUp"); await menu.waitFor();
      await page.keyboard.press("Tab");
      assert.equal(await menu.count(), 0);
      assert.ok(!(await trigger.evaluate((el) => el === document.activeElement)), "Tab must leave the menu button");
      return { arrowsHomeEnd: true, escapeRestoresFocus: true, tabExits: true, axe };
    });
  }

  await run("onboarding-real-fixture-auth", { width: 375, auth: true, newUser: true }, async (page) => {
    await goto(page, "/onboarding");
    await page.waitForFunction(() => {
      const button = document.querySelector('button[type="submit"]');
      return button && !button.disabled;
    }, undefined, { timeout: 5000 });
    await page.getByRole("textbox", { name: "Workspace name", exact: true }).fill("Safe QA workspace");
    assert.equal(new URL(page.url()).pathname, "/onboarding");
    return { browserGetUserSucceeded: true, createWorkspaceEnabled: true, noWorkspaceCreated: true, themes: await verifyOnboardingThemeStates(page) };
  });

  await run("theme-persistence-all-application-routes", { width: 1440, auth: true }, async (page) => {
    const proof = [];
    const appPages = pages.filter((fixture) => fixture.auth && fixture.slug !== "onboarding");
    for (const theme of ["dark", "light", "system"]) {
      await goto(page, "/intake");
      await page.getByRole("button", { name: `${theme[0].toUpperCase()}${theme.slice(1)} theme`, exact: true }).click();
      for (const fixture of appPages) {
        await goto(page, fixture.url);
        const state = await page.evaluate(() => ({ stored: localStorage.getItem("theme"), dark: document.documentElement.classList.contains("dark") }));
        assert.equal(state.stored, theme);
        assert.equal(state.dark, theme === "dark");
        proof.push({ page: fixture.slug, theme, ...state });
      }
    }
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
    await page.reload({ waitUntil: "load" });
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("dark")));
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
    return { routeSelections: proof, systemRespondsToOS: true, persistsAfterReload: true };
  });

  for (const scheme of ["light", "dark"]) {
    await run(`report-money-rails-${scheme}`, { width: 375, scheme, auth: true }, async (page) => {
      await goto(page, "/reports");
      const widths = await page.locator(".art-report .art-split-success,.art-report .art-split-accent,.art-report .art-split-muted").evaluateAll((nodes) => nodes.map((node) => Number(node.getAttribute("width"))));
      assert.deepEqual(widths, [0, 276, 0], "zero collected/draft buckets must never get a minimum fill");
      const legend = await page.locator("figure:has(.art-report) figcaption").textContent();
      assert.match(legend, /Collected.*0\.00/);
      assert.match(legend, /Outstanding/);
      assert.match(legend, /Draft.*0\.00/);
      await page.screenshot({ path: join(dir, `report-exact-money-${scheme}.png`) });
      return { widths, visibleLegend: legend, zeroBucketsAreEmpty: true };
    });
    await run(`reduced-motion-all-routes-${scheme}`, { width: 1440, scheme, reduce: true }, async (page, ctx) => {
      const proof = [];
      for (const fixture of pages) {
        await ctx.clearCookies();
        if (fixture.auth) await ctx.addCookies([fixture.slug === "onboarding" ? authCookieNew : authCookie]);
        await goto(page, fixture.url);
        const state = await page.evaluate(() => ({
          animations: document.getAnimations().filter((animation) => animation.playState === "running").length,
          h1Visible: [...document.querySelectorAll("h1")].some((el) => getComputedStyle(el).opacity === "1" && el.getBoundingClientRect().height > 0),
          svgCount: [...document.querySelectorAll("svg")].filter((el) => el.getBoundingClientRect().width > 0).length,
        }));
        assert.equal(state.animations, 0, fixture.slug);
        assert.ok(state.h1Visible, `${fixture.slug}: base content hidden`);
        assert.equal(new URL(page.url()).pathname, new URL(fixture.url, base).pathname, `${fixture.slug}: redirected away`);
        proof.push({ page: fixture.slug, ...state });
        if (["pipeline", "marketing-about", "login", "reports"].includes(fixture.slug)) await page.screenshot({ path: join(dir, `reduced-motion-${fixture.slug}-${scheme}.png`) });
      }
      return { routes: proof };
    });
    await run(`public-document-print-${scheme}`, { width: 768, scheme }, async (page) => {
      const proof = [];
      for (const fixture of pages.filter((item) => ["public-invoice", "public-update"].includes(item.slug))) {
        await goto(page, fixture.url);
        await page.emulateMedia({ media: "print" });
        const state = await page.evaluate(() => ({
          background: getComputedStyle(document.documentElement).getPropertyValue("--forma-background").trim(),
          ink: getComputedStyle(document.documentElement).getPropertyValue("--forma-text").trim(),
          title: document.querySelector("h1")?.textContent,
          bodyFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        }));
        const canonicalBackground = state.background.toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`);
        assert.equal(canonicalBackground, "#ffffff");
        assert.equal(state.ink.toLowerCase(), "#261d2d");
        assert.ok(state.bodyFits);
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        assert.ok(pdf.length > 1000);
        proof.push({ page: fixture.slug, ...state, browserPdfBytes: pdf.length });
        await page.emulateMedia({ media: "screen" });
      }
      return proof;
    });
  }
  return checks;
}
