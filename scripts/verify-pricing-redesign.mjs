#!/usr/bin/env node
/**
 * Browser verification for the pricing-only redesign. Run against a local
 * production server, for example:
 *
 *   npm run build && npm run start
 *   CHROMIUM_EXECUTABLE_PATH=/path/to/chromium \
 *     node scripts/verify-pricing-redesign.mjs
 *
 * The reference is a static user-supplied raster, not a live site. The
 * side-by-side artifact is rendered in Chromium at an inferred 1440 CSS px
 * reference width; it cannot establish mobile, interaction or motion fidelity.
 * No credentials or protected services are needed. See the redesign report.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
const evidencePath = process.env.OUTPUT || "docs/evidence/forma-pricing-audit/redesign-browser.json";
const screenshots = process.env.SCREENSHOTS || "docs/screenshots/forma-pricing-audit";
const referencePath = process.env.REFERENCE_PNG || "docs/screenshots/forma-pricing-audit/reference-user-provided.png";
const widths = [320, 375, 390, 768, 1024, 1200, 1440];
const studioHref = "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry";
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const issues = [];
const report = {
  base,
  capturedAt: new Date().toISOString(),
  browser: null,
  reference: null,
  responsive: [],
  interaction: {},
  noJavaScript: {},
  motion: {},
  manualContrast: {},
  runtimeErrors: [],
  issues,
};

mkdirSync(screenshots, { recursive: true });
mkdirSync(dirname(evidencePath), { recursive: true });
const check = (condition, message) => {
  if (!condition) issues.push(message);
};

async function makeContext(browser, { width = 1440, scheme = "light", reducedMotion = "reduce", javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion,
    javaScriptEnabled,
  });
  if (javaScriptEnabled) {
    await context.addInitScript((theme) => {
      try { localStorage.setItem("theme", theme); } catch { /* localStorage can be unavailable */ }
    }, scheme);
  }
  return context;
}

function watchErrors(page, label) {
  page.on("pageerror", (error) => report.runtimeErrors.push({ label, message: error.message }));
}

async function ready(page, path = "/pricing") {
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
  assert.ok(response && response.ok(), `${path} returned ${response?.status()}`);
  await page.evaluate(() => document.fonts.ready);
}

const probe = () => {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
  };
  const hero = document.querySelector("#pricing-page-heading");
  const ancestorStyles = [];
  for (let el = hero; el; el = el.parentElement) {
    const style = getComputedStyle(el);
    ancestorStyles.push({ tag: el.tagName, class: String(el.className), opacity: style.opacity, visibility: style.visibility, animationName: style.animationName });
  }
  const table = document.querySelector('[data-testid="pricing-comparison-table"]');
  const scroller = document.querySelector('[data-testid="pricing-comparison-scroll"]');
  const rows = [...table.querySelectorAll('tbody tr:not(.rp-table-group)')].map((row) => ({
    feature: row.querySelector('th')?.textContent.trim(),
    values: [...row.querySelectorAll('td')].map((cell) => cell.textContent.trim()),
  }));
  const headerAssociations = [...table.querySelectorAll('td')].every((cell) => {
    const ids = (cell.getAttribute('headers') || '').split(/\s+/).filter(Boolean);
    return ids.length === 3 && ids.every((id) => document.getElementById(id)?.tagName === 'TH');
  });
  const tapTargets = [...document.querySelectorAll('.rp-page a[href], .rp-page summary')].map((el) => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60), width: r.width, height: r.height };
  });
  const active = document.querySelector('nav[aria-label="Main navigation"] [aria-current="page"]');
  return {
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    dark: document.documentElement.classList.contains("dark"),
    activeNav: active?.textContent.trim() || null,
    heroText: hero?.textContent.trim(),
    heroAncestors: ancestorStyles,
    cards: [...document.querySelectorAll('[data-tier]')].map((el) => ({ tier: el.getAttribute('data-tier'), text: el.textContent.trim().replace(/\s+/g, ' '), box: box(`[data-tier="${el.getAttribute('data-tier')}"]`) })),
    boxes: { hero: box('#pricing-page-heading'), cards: box('.rp-cards'), comparison: box('.rp-comparison-section'), table: box('.rp-comparison-table'), studio: box('.rp-studio-banner'), faq: box('.rp-faq-section'), closing: box('.rp-closing-banner'), footer: box('footer') },
    comparison: { rows, headerAssociations, width: scroller.clientWidth, scrollWidth: scroller.scrollWidth },
    faqCount: document.querySelectorAll('[data-testid="billing-faq"] details').length,
    disclosures: [...document.querySelectorAll('[data-testid^="pricing-disclosure-"]')].map((el) => el.textContent.trim().replace(/\s+/g, ' ')),
    illustrationLabel: document.querySelector('.rp-client-illustration figcaption')?.textContent.trim(),
    tapTargets,
  };
};

async function runResponsive(browser) {
  for (const width of widths) {
    for (const scheme of ["light", "dark"]) {
      const context = await makeContext(browser, { width, scheme });
      const page = await context.newPage();
      watchErrors(page, `${width}-${scheme}`);
      await ready(page);
      const data = await page.evaluate(probe);
      check(data.scrollWidth === width, `${width} ${scheme}: page overflow ${data.scrollWidth - width}px`);
      check(data.dark === (scheme === "dark"), `${width} ${scheme}: requested theme was not applied`);
      check(data.cards.map((card) => card.tier).join(",") === "starter,team,studio", `${width} ${scheme}: wrong cards`);
      check(data.faqCount === 5, `${width} ${scheme}: expected five FAQ items`);
      check(data.comparison.rows.length === 16, `${width} ${scheme}: missing comparison rows`);
      check(data.comparison.headerAssociations, `${width} ${scheme}: comparison headers are not associated`);
      check(data.disclosures.length === 2 && data.disclosures.every((text) => text.includes("does not purchase or activate a paid plan")), `${width} ${scheme}: missing billing disclosure`);
      check(data.illustrationLabel === "Illustrative example · fictional client", `${width} ${scheme}: illustration not labeled`);
      check(data.heroAncestors.every((style) => Number(style.opacity) > 0 && style.visibility === "visible"), `${width} ${scheme}: hero or an ancestor is hidden`);
      check(data.tapTargets.every((target) => target.width >= 44 && target.height >= 44), `${width} ${scheme}: small pricing controls`);
      for (const feature of ["Per-task owners", "Per-task due dates", "Read-only brief sharing"]) {
        const row = data.comparison.rows.find((item) => item.feature === feature);
        check(JSON.stringify(row?.values) === JSON.stringify(["— (Not included)", "Not currently available", "Not currently available"]), `${width} ${scheme}: incorrect ${feature} availability`);
      }
      await page.addScriptTag({ content: axeSource });
      const axe = await page.evaluate(async () => {
        const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
        return {
          violations: result.violations.map(({ id, impact, description, nodes }) => ({ id, impact, description, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })),
          incomplete: result.incomplete.length,
          incompleteDetails: result.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, any, all, none }) => ({ target, reasons: [...any, ...all, ...none].map(({ message }) => message) })) })),
          passes: result.passes.length,
        };
      });
      check(axe.violations.length === 0, `${width} ${scheme}: ${axe.violations.length} axe violation(s)`);
      if (scheme === "light" || width === 390 || width === 1440) {
        await page.screenshot({ path: `${screenshots}/redesign-${width}-${scheme}.png`, fullPage: true });
      }
      report.responsive.push({ width, scheme, ...data, axe });
      process.stderr.write(`responsive ${width} ${scheme}: overflow=${data.scrollWidth - width}, axe=${axe.violations.length}\n`);
      await context.close();
    }
  }
}

async function runInteraction(browser) {
  const context = await makeContext(browser, { width: 390, reducedMotion: "no-preference" });
  const page = await context.newPage();
  watchErrors(page, "interaction");
  await ready(page);

  const menu = page.getByRole("button", { name: "Open menu" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 3000 });
  const menuOpened = await dialog.isVisible();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 3000 });
  const menuClosed = await dialog.count() === 0 || !(await dialog.isVisible());
  const menuFocusReturned = await menu.evaluate((el) => el === document.activeElement);
  check(menuOpened && menuClosed && menuFocusReturned, "mobile menu keyboard behavior failed");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));
  const themeDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.waitForFunction(() => !document.documentElement.classList.contains("dark"));
  const themeRestored = !(await page.evaluate(() => document.documentElement.classList.contains("dark")));
  check(themeDark && themeRestored, "theme toggle failed");

  const scroll = page.getByTestId("pricing-comparison-scroll");
  await scroll.focus();
  const scrollBefore = await scroll.evaluate((el) => el.scrollLeft);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  const scrollAfter = await scroll.evaluate((el) => el.scrollLeft);
  check(scrollAfter > scrollBefore, "comparison cannot be scrolled with the keyboard");
  const scrolledRight = await scroll.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
    const container = el.getBoundingClientRect();
    const lastColumn = el.querySelector('thead th:last-child').getBoundingClientRect();
    return { scrollLeft: el.scrollLeft, maxScroll: el.scrollWidth - el.clientWidth, lastColumnVisible: lastColumn.right <= container.right + 1 && lastColumn.left >= container.left - 1 };
  });
  check(scrolledRight.maxScroll > 0 && scrolledRight.lastColumnVisible, "last comparison column cannot be reached on mobile");

  const faqItems = page.getByTestId("billing-faq").locator("details");
  const faqKeyboard = [];
  for (let index = 0; index < 5; index += 1) {
    const details = faqItems.nth(index);
    await details.locator("summary").focus();
    if (await details.evaluate((el) => el.open)) await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    const opened = await details.evaluate((el) => el.open);
    await page.keyboard.press("Space");
    const closed = !(await details.evaluate((el) => el.open));
    faqKeyboard.push({ question: await details.locator("summary").innerText(), opened, closed });
    check(opened && closed, `FAQ ${index + 1} Enter/Space behavior failed`);
  }
  const faqTransition = await faqItems.nth(1).evaluate((el) => getComputedStyle(el, "::details-content").transitionDuration);
  check(faqTransition.split(",").every((value) => Math.abs(parseFloat(value) - 0.26) < 0.01), `unexpected FAQ transition ${faqTransition}`);

  const hrefs = {};
  for (const id of ["plan-cta-starter", "plan-cta-team", "plan-cta-studio", "studio-banner-cta", "pricing-bottom-cta"]) {
    hrefs[id] = await page.getByTestId(id).getAttribute("href");
  }
  check(hrefs["plan-cta-starter"] === "/signup" && hrefs["plan-cta-team"] === "/signup" && hrefs["pricing-bottom-cta"] === "/signup", "signup CTA destination mismatch");
  check(hrefs["plan-cta-studio"] === studioHref && hrefs["studio-banner-cta"] === studioHref, "Studio mailto mismatch");
  const signup = await page.goto(`${base}/signup`, { waitUntil: "domcontentloaded" });
  const signupStatus = signup?.status() ?? null;
  check(signupStatus === 200, `signup route returned ${signupStatus}`);
  const signupClicks = {};
  for (const id of ["plan-cta-starter", "plan-cta-team", "pricing-bottom-cta"]) {
    await ready(page);
    await page.getByTestId(id).click();
    await page.waitForURL((url) => url.pathname === "/signup", { timeout: 10_000 });
    signupClicks[id] = new URL(page.url()).pathname;
    check(signupClicks[id] === "/signup", `${id} did not navigate to signup`);
  }
  const tabPage = await context.newPage();
  await ready(tabPage);
  const tabOrder = [];
  for (let index = 0; index < 32; index += 1) {
    await tabPage.keyboard.press("Tab");
    tabOrder.push(await tabPage.evaluate(() => {
      const el = document.activeElement;
      return { tag: el.tagName.toLowerCase(), testId: el.getAttribute('data-testid'), label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80) };
    }));
  }
  check(tabOrder.some((item) => item.testId === "plan-cta-starter"), "Starter CTA is absent from tab order");
  check(tabOrder.some((item) => item.testId === "pricing-comparison-scroll"), "comparison is absent from tab order");
  check(tabOrder.filter((item) => item.tag === "summary").length >= 5, "FAQ summaries are absent from tab order");
  check(tabOrder.some((item) => item.testId === "pricing-bottom-cta"), "bottom CTA is absent from tab order");
  await tabPage.close();
  report.interaction = { menuOpened, menuClosed, menuFocusReturned, themeDark, themeRestored, comparisonKeyboardScroll: { before: scrollBefore, after: scrollAfter, ...scrolledRight }, faqKeyboard, faqTransition, hrefs, signupStatus, signupClicks, tabOrder };
  await context.close();
}

async function runNoJavaScript(browser) {
  const context = await makeContext(browser, { width: 390, javaScriptEnabled: false });
  const page = await context.newPage();
  await ready(page);
  const state = await page.evaluate(probe);
  const details = page.getByTestId("billing-faq").locator("details").nth(1);
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  const faqOpened = await details.evaluate((el) => el.open);
  const answerVisible = await details.locator("p").isVisible();
  await page.screenshot({ path: `${screenshots}/redesign-390-no-js.png`, fullPage: true });
  check(state.cards.length === 3 && state.faqCount === 5 && state.comparison.rows.length === 16, "essential content missing without JavaScript");
  check(state.heroAncestors.every((style) => Number(style.opacity) > 0 && style.visibility === "visible"), "hero hidden without JavaScript");
  check(faqOpened && answerVisible, "native FAQ failed without JavaScript");
  report.noJavaScript = { hero: state.heroText, cards: state.cards.length, rows: state.comparison.rows.length, faqCount: state.faqCount, faqOpened, answerVisible, heroAncestors: state.heroAncestors };
  await context.close();
}

async function runReducedMotion(browser) {
  const context = await makeContext(browser, { width: 1440, reducedMotion: "reduce" });
  const page = await context.newPage();
  await ready(page);
  const card = page.locator('[data-tier="team"]');
  const before = await card.evaluate((el) => getComputedStyle(el).transform);
  await card.hover();
  await page.waitForTimeout(350);
  const after = await card.evaluate((el) => getComputedStyle(el).transform);
  const faqTransition = await page.locator('.rp-faq').first().evaluate((el) => getComputedStyle(el, '::details-content').transitionDuration);
  const hero = await page.locator('#pricing-page-heading').evaluate((el) => ({ opacity: getComputedStyle(el).opacity, animationName: getComputedStyle(el).animationName }));
  check(before === after, `reduced-motion card moved on hover: ${before} → ${after}`);
  check(faqTransition.split(',').every((value) => parseFloat(value) === 0), `reduced-motion FAQ still transitions: ${faqTransition}`);
  check(hero.opacity === '1' && hero.animationName === 'none', "reduced-motion hero not visible");
  report.motion = { reducedMotion: true, cardTransformBefore: before, cardTransformAfter: after, faqTransition, hero };
  await context.close();
}

// axe cannot calculate contrast over gradients or for checkmark glyphs. Check
// the rendered CSS colors separately at each gradient stop and on both table
// column backgrounds. All channels in each authored gradient progress
// monotonically between stops, so these include the worst-case endpoints.
function rgb(color) {
  const srgb = color.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (srgb) return srgb.slice(1).map((value) => Number(value) * 255);
  const match = color.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!match) throw new Error(`Unsupported computed color: ${color}`);
  return match.slice(1, 4).map(Number);
}
function contrast(foreground, background) {
  const luminance = (channels) => channels.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function gradientStops(value) {
  const colors = [...value.matchAll(/rgb\(\s*\d+,\s*\d+,\s*\d+\)/g)].map((match) => rgb(match[0]));
  if (colors.length < 2) throw new Error(`Cannot read gradient stops: ${value}`);
  return colors;
}
async function runManualContrast(browser) {
  for (const scheme of ["light", "dark"]) {
    const context = await makeContext(browser, { scheme });
    const page = await context.newPage();
    await ready(page);
    const colors = await page.evaluate(() => {
      const style = (selector, property) => getComputedStyle(document.querySelector(selector))[property];
      const teamCell = document.querySelector('.rp-comparison-table tbody tr:not(.rp-table-group) td:nth-child(3)');
      return {
        page: style('.rp-page', 'backgroundColor'),
        bannerGradient: style('.rp-studio-banner', 'backgroundImage'),
        bannerText: style('.rp-banner-eyebrow', 'color'),
        heroGradient: style('.rp-hero-title span', 'backgroundImage'),
        check: style('.rp-table-check', 'color'),
        teamCell: getComputedStyle(teamCell).backgroundColor,
      };
    });
    const pageColor = rgb(colors.page);
    const bannerRatios = gradientStops(colors.bannerGradient).map((stop) => contrast(rgb(colors.bannerText), stop));
    const heroRatios = gradientStops(colors.heroGradient).map((stop) => contrast(stop, pageColor));
    const checkRatios = [pageColor, rgb(colors.teamCell)].map((background) => contrast(rgb(colors.check), background));
    const minBanner = Math.min(...bannerRatios);
    const minHero = Math.min(...heroRatios);
    const minCheck = Math.min(...checkRatios);
    check(minBanner >= 4.5, `${scheme}: banner copy contrast ${minBanner.toFixed(2)} < 4.5`);
    check(minHero >= 3, `${scheme}: large hero text contrast ${minHero.toFixed(2)} < 3`);
    check(minCheck >= 3, `${scheme}: checkmark contrast ${minCheck.toFixed(2)} < 3`);
    report.manualContrast[scheme] = { colors, minimumBannerCopy: minBanner, minimumHeroLargeText: minHero, minimumCheckmark: minCheck };
    await context.close();
  }
}

async function compareReferenceInBrowser(browser) {
  if (!existsSync(referencePath)) {
    issues.push(`reference screenshot not found: ${referencePath}`);
    return;
  }
  const localPath = resolve(`${screenshots}/redesign-1440-light.png`);
  const reference = readFileSync(referencePath).toString("base64");
  const local = readFileSync(localPath).toString("base64");
  const context = await browser.newContext({ viewport: { width: 2880, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;padding:0}main{display:flex;align-items:flex-start}img{display:block;width:1440px;height:auto}</style></head><body><main><img alt="User-provided Forma reference" src="data:image/png;base64,${reference}"><img alt="Roducq pricing redesign" src="data:image/png;base64,${local}"></main></body></html>`);
  await page.locator('img').first().evaluate((img) => img.decode());
  await page.locator('img').last().evaluate((img) => img.decode());
  const imageSizes = await page.locator('img').evaluateAll((images) => images.map((img) => ({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, renderedWidth: img.getBoundingClientRect().width, renderedHeight: img.getBoundingClientRect().height })));
  await page.screenshot({ path: `${screenshots}/redesign-reference-browser-comparison.png`, fullPage: true });
  await page.setViewportSize({ width: 2880, height: 1450 });
  await page.screenshot({ path: `${screenshots}/redesign-reference-browser-comparison-top.png`, clip: { x: 0, y: 0, width: 2880, height: 1450 } });
  report.reference = { source: referencePath, kind: "static user-provided screenshot; not a live Forma page", inferredCssWidth: 1440, imageSizes, comparisonScreenshot: `${screenshots}/redesign-reference-browser-comparison.png`, topScreenshot: `${screenshots}/redesign-reference-browser-comparison-top.png` };
  check(imageSizes[0].renderedWidth === 1440 && imageSizes[1].renderedWidth === 1440, "reference comparison not rendered at equal browser widths");
  await context.close();
}

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"] });
report.browser = browser.version();
try {
  await runResponsive(browser);
  await runInteraction(browser);
  await runNoJavaScript(browser);
  await runReducedMotion(browser);
  await runManualContrast(browser);
  await compareReferenceInBrowser(browser);
  check(report.runtimeErrors.length === 0, `${report.runtimeErrors.length} browser runtime error(s)`);
} catch (error) {
  issues.push(`verification exception: ${error.stack || error.message}`);
} finally {
  await browser.close();
  writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${evidencePath}; ${issues.length} issue(s).`);
}
if (issues.length) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
}
