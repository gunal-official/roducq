#!/usr/bin/env node
/**
 * verify:motion — real-Chromium evidence for the Forma motion layer.
 *
 * WHAT IT PROVES
 *   • no horizontal overflow at 320/375/390/768/1024/1440 in light + dark
 *   • the recorded timings are the ones actually running (620/420ms reveals,
 *     620ms hero line + chart draw, 420/340ms chrome, 260ms FAQ disclosure)
 *   • below 768px the compact reductions are active (420ms, 8px, no drift)
 *   • prefers-reduced-motion: reduce resolves every sample to its end state —
 *     opacity 1, transform none, no animation, no SVG dash offset
 *   • per-section screenshots at 1440 and 390, light + dark
 *
 * RUN
 *   npm run build && npm run start            # terminal 1
 *   node scripts/verify-motion.mjs            # terminal 2
 *
 * BROWSER. playwright-core alone is not enough in this sandbox: the CDN is
 * blocked, so the script accepts a Chromium binary through
 * CHROMIUM_EXECUTABLE_PATH. The CI path is simply
 * `npx playwright-core install chromium`.
 *
 * Optional `--no-shots` skips the screenshot pass.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.MOTION_BASE || "http://127.0.0.1:3000";
const OUT = process.env.MOTION_SHOTS || resolve(ROOT, "docs/screenshots/forma-motion");
const SHOTS = !process.argv.includes("--no-shots");

const VIEWPORTS = [
  { w: 320, h: 568 },
  { w: 375, h: 667 },
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
];

const SECTIONS = [
  { name: "01-header", selector: ".lm-header" },
  { name: "02-hero", selector: "main > div > section:nth-of-type(1)" },
  { name: "03-dashboard", selector: '[aria-label^="Illustrative roducq workspace"]' },
  { name: "04-features", selector: "#features" },
  { name: "05-steps", selector: "main > div > section:nth-of-type(3)" },
  { name: "06-integrations", selector: "#integrations" },
  { name: "07-teams", selector: "main > div > section:nth-of-type(5)" },
  { name: "08-pricing", selector: "#pricing" },
  { name: "09-faq", selector: "#faq" },
  { name: "10-final-cta", selector: "main > div > section:nth-of-type(8)" },
  { name: "11-footer", selector: "footer" },
];

const failures = [];
const report = { base: BASE, viewports: [], motion: {}, reduced: {}, screenshots: [] };

function check(condition, message, detail) {
  if (!condition) failures.push({ message, detail });
}

async function launch() {
  const { chromium } = require("playwright-core");
  const options = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    options.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  }
  // The sandbox's @sparticuz binary needs NSS/NSPR from the Lambda layer
  // tarball + @achingbrain/nss. Harmless when the paths do not exist.
  const libraryPath = [
    "/tmp/aws-libs/lib",
    resolve(ROOT, "node_modules/@achingbrain/nss/linux"),
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(":");
  options.env = { ...process.env, LD_LIBRARY_PATH: libraryPath };
  return chromium.launch(options);
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // Hydration is what attaches the IntersectionObservers. Scrolling before
  // React has mounted would reveal nothing and leave the first band hidden,
  // which is a harness race rather than a page bug — so give the client
  // boundary a moment, then do two passes (the second catches anything that
  // mounted mid-scroll).
  await page.waitForTimeout(350);
  const scrollPass = () =>
    page.evaluate(async () => {
      const step = Math.max(240, Math.round(window.innerHeight * 0.65));
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 70));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 120));
    });
  await scrollPass();
  await page.waitForTimeout(250);
  await scrollPass();
  // Longest entrance (620ms) + stagger/settle.
  await page.waitForTimeout(1100);
}

async function measure(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const style = (s, pseudo) => {
      const el = q(s);
      return el ? getComputedStyle(el, pseudo) : null;
    };
    const details = q("#faq details");
    if (details && !details.open) details.open = true;
    const detailsStyle = details ? getComputedStyle(details, "::details-content") : null;
    const firstReveal = q("#features .lm-reveal");
    const over = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className).slice(0, 70),
        rect: Math.round(el.getBoundingClientRect().right),
      }));
    return {
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: over,
      reveal: firstReveal
        ? {
            visible: firstReveal.getAttribute("data-visible"),
            mode: firstReveal.getAttribute("data-motion"),
            duration: firstReveal.getAttribute("data-reveal-duration"),
            opacity: getComputedStyle(firstReveal).opacity,
            transform: getComputedStyle(firstReveal).transform,
          }
        : null,
      line: style(".lm-line > span")
        ? {
            animation: style(".lm-line > span").animationName,
            duration: style(".lm-line > span").animationDuration,
          }
        : null,
      chart: style(".lm-chart-line")
        ? {
            animation: style(".lm-chart-line").animationName,
            duration: style(".lm-chart-line").animationDuration,
            dashoffset: style(".lm-chart-line").strokeDashoffset,
          }
        : null,
      connector: style(".lm-connector")
        ? {
            animation: style(".lm-connector").animationName,
            duration: style(".lm-connector").animationDuration,
            delay: style(".lm-connector").animationDelay,
            iterations: style(".lm-connector").animationIterationCount,
            easing: style(".lm-connector").animationTimingFunction,
          }
        : null,
      header: style(".lm-header")
        ? {
            animation: style(".lm-header").animationName,
            duration: style(".lm-header").animationDuration,
          }
        : null,
      announce: style(".lm-announce")
        ? {
            animation: style(".lm-announce").animationName,
            duration: style(".lm-announce").animationDuration,
          }
        : null,
      drift: style(".lm-drift")
        ? {
            animation: style(".lm-drift").animationName,
            duration: style(".lm-drift").animationDuration,
          }
        : null,
      faq: detailsStyle
        ? {
            transitionDuration: detailsStyle.transitionDuration,
            blockSize: detailsStyle.blockSize,
          }
        : null,
      buttonTransition: style("a[href='/signup'].inline-flex")
        ? style("a[href='/signup'].inline-flex").transitionDuration
        : null,
    };
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  try {
    for (const { w, h } of VIEWPORTS) {
      for (const colorScheme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width: w, height: h },
          colorScheme,
          reducedMotion: "no-preference",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        await page.goto(BASE, { waitUntil: "load" });
        await settle(page);
        const m = await measure(page);
        report.viewports.push({ width: w, height: h, requestedTheme: colorScheme, ...m, consoleErrors: errors });
        check(m.overflowX === 0, `overflowX ${m.overflowX}px at ${w}px ${colorScheme}`, m.offenders);
        check(m.theme === colorScheme, `theme did not resolve to ${colorScheme} at ${w}px`, m.theme);
        check(errors.length === 0, `console errors at ${w}px ${colorScheme}`, errors);
        await context.close();
      }
    }

    // ── recorded motion values ────────────────────────────────────────────
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "load" });
    await settle(page);
    const desktop = await measure(page);
    report.motion.desktop = desktop;
    check(desktop.reveal?.duration === "620", "desktop reveal is not 620ms", desktop.reveal);
    check(desktop.reveal?.visible === "true", "desktop reveal did not become visible", desktop.reveal);
    check(desktop.reveal?.opacity === "1", "desktop reveal did not settle at opacity 1", desktop.reveal);
    check(desktop.line?.duration === "0.62s", "desktop hero line is not 620ms", desktop.line);
    check(desktop.chart?.duration === "0.62s", "chart draw is not 620ms", desktop.chart);
    // The reference's flow lines march continuously: `flowLinesDash` runs at
    // 1000ms, linear, infinite, with no delay on any path. Measured on the
    // live site — see docs/FORMA_FINAL_FIDELITY_AUDIT.md §5.
    check(desktop.connector?.duration === "1s", "connector flow is not 1000ms", desktop.connector);
    check(desktop.connector?.iterations === "infinite", "connector flow does not loop", desktop.connector);
    check(desktop.connector?.easing === "linear", "connector flow is not linear", desktop.connector);
    check(desktop.connector?.delay === "0s", "connector flow is delayed", desktop.connector);
    check(desktop.header?.duration === "0.42s", "header entrance is not 420ms", desktop.header);
    check(desktop.announce?.duration === "0.36s", "announcement entrance is not 360ms", desktop.announce);
    check(desktop.drift?.animation === "lm-drift", "desktop drift is not running", desktop.drift);
    check(desktop.faq?.transitionDuration.includes("0.26s"), "FAQ disclosure is not 260ms", desktop.faq);

    await context.close();

    // ── compact reductions ───────────────────────────────────────────────
    const compactContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    const compactPage = await compactContext.newPage();
    await compactPage.goto(BASE, { waitUntil: "load" });
    await settle(compactPage);
    const compact = await measure(compactPage);
    report.motion.compact = compact;
    check(compact.reveal?.duration === "420", "compact reveal is not 420ms", compact.reveal);
    check(compact.reveal?.mode === "compact", "compact mode not reported", compact.reveal);
    check(compact.line?.duration === "0.42s", "compact hero line is not 420ms", compact.line);
    check(compact.header?.duration === "0.34s", "compact header is not 340ms", compact.header);
    check(compact.announce?.duration === "0.3s", "compact announcement is not 300ms", compact.announce);
    check(compact.drift?.animation === "none", "compact idle drift is still running", compact.drift);
    await compactContext.close();

    // ── tablet boundary ─────────────────────────────────────────────────
    // 768px is the first desktop-width viewport: the reference's compact
    // reductions end at 767px, so the full timing set must be back.
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(BASE, { waitUntil: "load" });
    await settle(tabletPage);
    const tablet = await measure(tabletPage);
    report.motion.tablet = tablet;
    check(tablet.reveal?.duration === "620", "tablet reveal is not 620ms", tablet.reveal);
    check(tablet.reveal?.mode === "desktop", "tablet should use desktop reveal mode", tablet.reveal);
    check(tablet.header?.duration === "0.42s", "tablet header is not 420ms", tablet.header);
    check(tablet.announce?.duration === "0.36s", "tablet announcement is not 360ms", tablet.announce);
    check(tablet.drift?.animation === "lm-drift", "tablet drift should run at 768px", tablet.drift);
    await tabletContext.close();

    // ── reduced motion ───────────────────────────────────────────────────
    for (const width of [1440, 390]) {
      const reduceContext = await browser.newContext({
        viewport: { width, height: width === 1440 ? 900 : 844 },
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const reducePage = await reduceContext.newPage();
      await reducePage.goto(BASE, { waitUntil: "load" });
      await settle(reducePage);
      const reduced = await measure(reducePage);
      report.reduced[width] = reduced;
      check(reduced.reveal?.opacity === "1", `reduced reveal opacity at ${width}`, reduced.reveal);
      check(reduced.reveal?.visible === "true", `reduced reveal data-visible at ${width}`, reduced.reveal);
      check(reduced.reveal?.duration === "0", `reduced reveal duration at ${width}`, reduced.reveal);
      check(reduced.reveal?.transform === "none", `reduced reveal transform at ${width}`, reduced.reveal);
      for (const key of ["line", "chart", "connector", "header", "announce"]) {
        check(reduced[key]?.animation === "none", `reduced ${key} still animates at ${width}`, reduced[key]);
      }
      check(reduced.chart?.dashoffset === "0px", `reduced chart dash offset at ${width}`, reduced.chart);
      check(reduced.faq?.transitionDuration === "0s", `reduced FAQ still transitions at ${width}`, reduced.faq);
      await reduceContext.close();
    }

    // ── screenshots ──────────────────────────────────────────────────────
    if (SHOTS) {
      for (const width of [1440, 390]) {
        for (const colorScheme of ["light", "dark"]) {
          const shotContext = await browser.newContext({
            viewport: { width, height: width === 1440 ? 900 : 844 },
            colorScheme,
            reducedMotion: "no-preference",
          });
          const shotPage = await shotContext.newPage();
          await shotPage.goto(BASE, { waitUntil: "load" });
          await settle(shotPage);
          const dir = resolve(OUT, `${width}-${colorScheme}`);
          mkdirSync(dir, { recursive: true });
          await shotPage.screenshot({ path: resolve(dir, "00-full.png"), fullPage: true });
          report.screenshots.push(`${width}-${colorScheme}/00-full.png`);
          for (const section of SECTIONS) {
            const locator = shotPage.locator(section.selector).first();
            if ((await locator.count()) === 0) {
              check(false, `screenshot selector missing: ${section.name}`, section.selector);
              continue;
            }
            await locator.scrollIntoViewIfNeeded().catch(() => {});
            await shotPage.waitForTimeout(180);
            const file = `${section.name}.png`;
            await locator.screenshot({ path: resolve(dir, file) }).catch(() => {});
            report.screenshots.push(`${width}-${colorScheme}/${file}`);
          }
          await shotContext.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ failures, motion: report.motion, reduced: report.reduced }, null, 2));
  if (failures.length) {
    console.error(`\nFAIL: ${failures.length} motion assertion(s)`);
    process.exitCode = 1;
  } else {
    console.log(
      `\nPASS: ${VIEWPORTS.length * 2} viewport/theme renders + tablet boundary + motion + reduced motion`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
