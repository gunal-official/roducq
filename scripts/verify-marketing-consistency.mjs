/**
 * Site-wide marketing consistency audit harness.
 *
 * Read-only evidence collector for the six marketing pages the
 * docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md pass audits, plus /about and /vs
 * (which share the same marketing shell but were never part of the Forma
 * recreation). It exists so every claim in that document can be re-run:
 * nothing here is imported by the app, and no measurement is invented.
 *
 *   BASE_URL                  server to probe            (http://localhost:3000)
 *   ROUTES                    comma-separated paths      (the eight below)
 *   PHASES                    comma-separated            (shell,axe,lcp,motion)
 *   CHROMIUM_EXECUTABLE_PATH  existing Chromium binary   (Playwright default)
 *   OUTPUT                    write the JSON report here (stdout)
 *   RUNS                      LCP runs per scenario      (3)
 *
 * PHASES
 *   shell   header/footer geometry and tokens, horizontal overflow, tap
 *           targets, theme switch, keyboard focus, per width × theme.
 *           Widths: 320 / 375 / 390 / 768 / 1024 / 1200 / 1440.
 *   axe     axe-core (the repository's own devDependency) at 320 / 768 /
 *           1440, light + dark, WCAG 2.1/2.2 A + AA + best-practice.
 *   lcp     the four PR #53 scenarios — mobile unthrottled, mobile 4× CPU,
 *           desktop, reduced motion — three fresh runs each, read from the
 *           page's own PerformanceObserver entries.
 *   motion  reduced-motion and no-JavaScript promises: no essential band is
 *           hidden, no LCP candidate starts at opacity 0.
 *
 * MEASURED, NOT CLAIMED. When a phase cannot run (no browser, no axe), the
 * report records the error instead of a number.
 */

import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const RUNS = Number(process.env.RUNS || 3);
const WIDTHS = [320, 375, 390, 768, 1024, 1200, 1440];
const ROUTES = (
  process.env.ROUTES ||
  "/,/features,/solutions,/integrations,/pricing,/changelog,/about,/vs"
)
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const PHASES = (process.env.PHASES || "shell,axe,lcp,motion")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const OUTPUT = process.env.OUTPUT;
const LCP_BUDGET_MS = 2500;

const MOBILE = { width: 412, height: 823, deviceScaleFactor: 1.75 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

const AXE_SOURCE = (() => {
  const path = "node_modules/axe-core/axe.min.js";
  return existsSync(path) ? readFileSync(path, "utf8") : null;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const override = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (override && !existsSync(override)) {
    throw new Error(
      `CHROMIUM_EXECUTABLE_PATH is set but does not exist: ${override}`,
    );
  }
  return chromium.launch({
    headless: true,
    ...(override ? { executablePath: override } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  });
}

async function context(browser, options = {}) {
  const {
    width = 1440,
    height = 900,
    deviceScaleFactor = 1,
    scheme = "light",
    reducedMotion = "no-preference",
    javaScriptEnabled = true,
  } = options;
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor,
    colorScheme: scheme,
    reducedMotion,
    javaScriptEnabled,
  });
  // next-themes writes its choice to localStorage and applies the class before
  // first paint, so seed it before any page script runs.
  await ctx.addInitScript(
    ([wanted]) => {
      try {
        localStorage.setItem("theme", wanted);
      } catch {}
    },
    [scheme],
  );
  return ctx;
}

/** The shell signature: everything Phase A classifies per route. */
const SHELL_PROBE = () => {
  const cs = (el, ...props) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    return Object.fromEntries(props.map((p) => [p, s[p]]));
  };
  const header = document.querySelector("header");
  const nav = header && header.querySelector('nav[aria-label="Main navigation"]');
  const navLinks = nav ? [...nav.querySelectorAll("a")] : [];
  const logoLink = header && header.querySelector('a[aria-label="roducq home"]');
  const wordmark = logoLink && logoLink.querySelector("span");
  const footer = document.querySelector("footer");
  const h1 = document.querySelector("main h1, h1");
  const announce = document.querySelector('[aria-label="Announcement"]');

  // Tap targets: every interactive element, in CSS pixels, ignoring the
  // skip link (visually hidden until focused) and anything not rendered.
  const smallTaps = [];
  for (const el of document.querySelectorAll(
    'a[href], button, [role="button"], input, select, textarea, summary',
  )) {
    if (el.closest(".sr-only")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width < 44 || r.height < 44) {
      smallTaps.push({
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") || el.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40),
        w: Math.round(r.width * 100) / 100,
        h: Math.round(r.height * 100) / 100,
      });
    }
  }

  const ctas = header
    ? [...header.querySelectorAll("a, button")]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({
          label: (el.textContent || el.getAttribute("aria-label") || "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 28),
          href: el.getAttribute("href"),
        }))
    : [];

  return {
    overflowX:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    announceHeight: announce ? Math.round(announce.getBoundingClientRect().height) : 0,
    header: header
      ? {
          height: Math.round(header.getBoundingClientRect().height),
          bg: getComputedStyle(header).backgroundColor,
          borderBottom: getComputedStyle(header).borderBottomWidth,
          position: getComputedStyle(header).position,
        }
      : null,
    nav: nav
      ? {
          display: getComputedStyle(nav).display,
          x: Math.round(nav.getBoundingClientRect().x),
          right: Math.round(nav.getBoundingClientRect().right),
          labels: navLinks.map((a) => a.textContent.trim()),
          hrefs: navLinks.map((a) => a.getAttribute("href")),
          active: navLinks
            .filter((a) => a.getAttribute("aria-current") === "page")
            .map((a) => a.textContent.trim()),
          firstLink: navLinks[0]
            ? cs(
                navLinks[0],
                "fontSize",
                "fontWeight",
                "color",
                "paddingLeft",
                "minHeight",
                "borderRadius",
              )
            : null,
        }
      : null,
    wordmark: wordmark
      ? {
          size: getComputedStyle(wordmark).fontSize,
          weight: getComputedStyle(wordmark).fontWeight,
          tracking: getComputedStyle(wordmark).letterSpacing,
        }
      : null,
    headerActions: ctas,
    h1: h1
      ? {
          text: (h1.textContent || "").trim().replace(/\s+/g, " ").slice(0, 70),
          ...cs(h1, "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color"),
        }
      : null,
    footer: footer
      ? {
          bg: getComputedStyle(footer).backgroundColor,
          borderTop: getComputedStyle(footer).borderTopWidth,
          columns: footer.querySelectorAll("nav").length,
          backToTop: !!footer.querySelector('a[href="#top"]'),
          wordmark: !!footer.querySelector("svg text"),
        }
      : null,
    smallTaps,
    canvasBg: (() => {
      const el = document.querySelector(".rdq-marketing");
      return el ? getComputedStyle(el).backgroundColor : null;
    })(),
    bodyFont: getComputedStyle(document.body).fontFamily,
    htmlClass: document.documentElement.className,
  };
};

async function runShell(browser) {
  const rows = [];
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      for (const scheme of ["light", "dark"]) {
        const ctx = await context(browser, { width, height: 900, scheme });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
        await sleep(700);
        const measured = await page.evaluate(SHELL_PROBE);

        // Keyboard first: the walk must start from a fresh document, not from
        // wherever a click left focus. The first Tab must land on the skip
        // link and every stop must carry a visible outline.
        const keyboard = await (async () => {
          const stops = [];
          for (let i = 0; i < 8; i += 1) {
            await page.keyboard.press("Tab");
            stops.push(
              await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                const s = getComputedStyle(el);
                return {
                  tag: el.tagName.toLowerCase(),
                  label: (el.getAttribute("aria-label") || el.textContent || "")
                    .trim()
                    .replace(/\s+/g, " ")
                    .slice(0, 30),
                  href: el.getAttribute("href"),
                  outline: `${s.outlineStyle} ${s.outlineWidth}`,
                  boxShadow: s.boxShadow.slice(0, 40),
                };
              }),
            );
          }
          return stops;
        })();

        // The theme switch has to actually switch, on every route. The icon
        // toggle flips the resolved theme; the menu dialog keeps its own
        // three-way control, so this only checks the header control.
        await page.evaluate(() => {
          document.activeElement?.blur();
          window.scrollTo(0, 0);
        });
        await sleep(150);
        let themeSwitch = null;
        if (width >= 1024) {
          const toggle = page.locator('header button[aria-label*="theme" i]');
          const count = await toggle.count();
          if (count > 0) {
            const before = await page.evaluate(
              () => document.documentElement.className,
            );
            await toggle.first().click();
            await sleep(350);
            const after = await page.evaluate(
              () => document.documentElement.className,
            );
            themeSwitch = { before, after, changed: before !== after };
          }
        }

        rows.push({ route, width, scheme, ...measured, themeSwitch, keyboard, pageErrors: errors.length });
        await ctx.close();
      }
    }
    process.stderr.write(`shell ${route}\n`);
  }
  return rows;
}

async function runAxe(browser) {
  if (!AXE_SOURCE) return { __error: "axe-core not installed" };
  const rows = [];
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
  for (const route of ROUTES) {
    for (const width of [320, 768, 1440]) {
      for (const scheme of ["light", "dark"]) {
        const ctx = await context(browser, { width, height: 900, scheme });
        const page = await ctx.newPage();
        await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
        await sleep(900);
        // Scroll once so scroll-triggered bands are in their settled state
        // before the scan, then return to the top.
        await page.evaluate(async () => {
          const total = document.documentElement.scrollHeight;
          for (let y = 0; y <= total; y += 600) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 30));
          }
          window.scrollTo(0, 0);
        });
        await sleep(700);
        // The /solutions and /features status pill swaps every few seconds with
        // a fade; a scan that samples the half-faded label is a timing
        // artefact, so freeze the transition (the content is unchanged).
        await page.addStyleTag({ content: ".lm-pill-swap{transition:none!important}" });
        await page.addScriptTag({ content: AXE_SOURCE });
        const result = await page.evaluate(async (tags) => {
          const res = await window.axe.run(document, {
            runOnly: { type: "tag", values: tags },
          });
          const pick = (arr) =>
            arr.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.length,
              targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
            }));
          return {
            violations: pick(res.violations),
            incomplete: pick(res.incomplete),
            passes: res.passes.length,
          };
        }, TAGS);
        rows.push({ route, width, scheme, ...result });
        await ctx.close();
      }
    }
    process.stderr.write(`axe ${route}\n`);
  }
  return rows;
}

const LCP_INIT = () => {
  window.__rdqMetrics = { lcp: [], shifts: [], paints: [], errors: [] };
  window.addEventListener("error", (e) =>
    window.__rdqMetrics.errors.push(String(e.message)),
  );
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__rdqMetrics.lcp.push({
          startTime: entry.startTime,
          size: entry.size,
          element: entry.element
            ? `${entry.element.tagName.toLowerCase()}${
                entry.element.className
                  ? "." + String(entry.element.className).split(/\s+/).slice(0, 2).join(".")
                  : ""
              }`
            : null,
          text: entry.element
            ? (entry.element.textContent || "").trim().slice(0, 40)
            : null,
          url: entry.url || null,
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__rdqMetrics.shifts.push(entry.value);
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__rdqMetrics.paints.push({
          name: entry.name,
          startTime: entry.startTime,
        });
      }
    }).observe({ type: "paint", buffered: true });
  } catch {}
};

async function runLcpScenario(browser, route, scenario) {
  const ctx = await context(browser, {
    ...scenario.viewport,
    height: scenario.viewport.height,
    scheme: "light",
    reducedMotion: scenario.reducedMotion || "no-preference",
  });
  await ctx.addInitScript(LCP_INIT);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (scenario.cpuThrottle) {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: scenario.cpuThrottle });
  }
  // The hero's opacity contract (PR #53): the LCP candidate must be opaque at
  // first paint, not revealed from zero.
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  const earlyOpacity = await page.evaluate(() => {
    const h1 = document.querySelector("main h1, h1");
    if (!h1) return null;
    const s = getComputedStyle(h1);
    return { opacity: s.opacity, visibility: s.visibility, filter: s.filter };
  });
  await sleep(1200);
  const metrics = await page.evaluate(() => window.__rdqMetrics);
  await ctx.close();
  const lcp = metrics.lcp;
  const final = lcp.length ? lcp[lcp.length - 1] : null;
  return {
    lcp: final ? Math.round(final.startTime) : null,
    lcpSize: final ? final.size : null,
    lcpElement: final ? final.element : null,
    lcpText: final ? final.text : null,
    lcpCandidates: lcp.length,
    cls:
      Math.round(metrics.shifts.reduce((a, b) => a + b, 0) * 10000) / 10000,
    fcp: (() => {
      const fcp = metrics.paints.find((p) => p.name === "first-contentful-paint");
      return fcp ? Math.round(fcp.startTime) : null;
    })(),
    heroEarly: earlyOpacity,
    pageErrors: metrics.errors.length,
  };
}

async function runLcp(browser) {
  const scenarios = [
    { key: "A-mobile-unthrottled", viewport: MOBILE },
    { key: "B-mobile-cpu-4x", viewport: MOBILE, cpuThrottle: 4 },
    { key: "C-desktop", viewport: DESKTOP },
    { key: "D-mobile-reduced-motion", viewport: MOBILE, reducedMotion: "reduce" },
  ];
  const report = {};
  for (const route of ROUTES) {
    report[route] = {};
    for (const scenario of scenarios) {
      const runs = [];
      for (let i = 0; i < RUNS; i += 1) {
        try {
          runs.push(await runLcpScenario(browser, route, scenario));
        } catch (error) {
          runs.push({ __error: String(error) });
        }
      }
      const values = runs.map((r) => r.lcp).filter((v) => typeof v === "number");
      values.sort((a, b) => a - b);
      const median = values.length
        ? values[Math.floor(values.length / 2)]
        : null;
      report[route][scenario.key] = {
        runs,
        median,
        under2500: median !== null && median < LCP_BUDGET_MS,
      };
      process.stderr.write(`lcp ${route} ${scenario.key} median=${median}\n`);
    }
  }
  return report;
}

async function runMotion(browser) {
  const report = { reducedMotion: {}, noJavaScript: {} };
  for (const route of ROUTES) {
    // Reduced motion: nothing may still be animating, and every band has to
    // be at its end state.
    const ctx = await context(browser, { width: 390, height: 844, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
    await sleep(900);
    report.reducedMotion[route] = await page.evaluate(() => {
      const running = document
        .getAnimations()
        .filter((a) => a.playState === "running")
        .map((a) => a.animationName || a.constructor.name);
      const hidden = [...document.querySelectorAll("main section, main article")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return s.opacity === "0" || s.visibility === "hidden";
        })
        .length;
      return { running: running.length, runningNames: running.slice(0, 6), hiddenBands: hidden };
    });
    await ctx.close();

    // No JavaScript: the server HTML must carry the hero and every section
    // heading, and none of the reveal machinery may hide anything.
    const noJsCtx = await context(browser, { width: 1440, height: 900, javaScriptEnabled: false });
    const noJsPage = await noJsCtx.newPage();
    await noJsPage.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
    await sleep(500);
    report.noJavaScript[route] = await noJsPage.evaluate(() => {
      const hidden = [...document.querySelectorAll("main *")]
        .filter((el) => {
          const s = getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden") return false; // intentionally not rendered
          return s.opacity === "0";
        })
        .slice(0, 5)
        .map((el) => el.tagName.toLowerCase() + "." + String(el.className).split(/\s+/)[0]);
      return {
        h1: (document.querySelector("main h1, h1")?.textContent || "")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 60),
        h2Count: document.querySelectorAll("main h2").length,
        sections: document.querySelectorAll("main section").length,
        zeroOpacity: hidden,
        textLength: (document.querySelector("main")?.innerText || "").length,
      };
    });
    await noJsCtx.close();
    process.stderr.write(`motion ${route}\n`);
  }
  return report;
}

async function main() {
  const browser = await launch();
  const report = {
    capturedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    routes: ROUTES,
    widths: WIDTHS,
    runs: RUNS,
    phases: PHASES,
    tools: { chromium: browser.version(), axeCore: Boolean(AXE_SOURCE) },
  };
  try {
    if (PHASES.includes("shell")) report.shell = await runShell(browser);
    if (PHASES.includes("axe")) report.axe = await runAxe(browser);
    if (PHASES.includes("lcp")) report.lcp = await runLcp(browser);
    if (PHASES.includes("motion")) report.motion = await runMotion(browser);
  } finally {
    await browser.close();
  }
  const json = JSON.stringify(report, null, 2);
  if (OUTPUT) {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, json);
    console.log(`wrote ${OUTPUT}`);
  } else {
    console.log(json);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
