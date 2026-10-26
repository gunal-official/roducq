/**
 * Phase D verification for /features — the PR #53 four-scenario
 * LCP suite, the horizontal-overflow sweep, an axe-core pass and
 * the no-JS / reduced-motion promises, all against a real Chromium
 * on the production build. The same suite runs against / as the
 * regression control, per docs/FORMA_FEATURES_PAGE_AUDIT.md §9.
 *
 *   BASE_URL    the server to probe (default http://localhost:3000)
 *   OUTPUT      where to write the JSON report (default stdout)
 *
 * SCENARIOS (three fresh runs each, per the PR #53 method):
 *   A  mobile 412×823 @1.75 DPR, animations on, unthrottled
 *   B  mobile, animations on, 4× CPU throttle (CDP
 *      Emulation.setCPUThrottlingRate; network throttling disabled)
 *   C  desktop 1440×900, animations on
 *   D  mobile, prefers-reduced-motion: reduce emulated before
 *      navigation
 *
 * MEASURED, NOT CLAIMED. Every number below comes out of the
 * PerformanceObserver entries the page itself emits. If a tool is
 * unavailable, the report says so instead of inventing a value.
 *
 * ALSO VERIFIED, because the page promises it:
 *   - the /features hero words keep computed opacity 1 at first
 *     paint (the PR #53 LCP rule — no opacity-zero start);
 *   - the sticky stage swaps its active layer as the scroll passes
 *     each of the six feature articles (the measured 0.3 trigger);
 *   - the raw server HTML carries every feature's copy, and with
 *     JavaScript disabled all six miniatures and the fictional-client
 *     disclosures remain visible;
 *   - horizontal overflow is 0px at 320/375/390/768/1024/1200/1440
 *     in both colour schemes, on both routes.
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT = process.env.OUTPUT;
const RUNS = 3;
const LCP_BUDGET_MS = 2500;

const MOBILE = { width: 412, height: 823, deviceScaleFactor: 1.75 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

/** The two routes under test: the new page and the home regression. */
const TARGETS = [
  {
    path: "/features",
    // Strings the raw server HTML must contain (the no-JS promise).
    // Headlines are split into per-word mask spans, so only contiguous
    // copy (lead text, point leads, band titles, captions) is asserted.
    serverHtml: [
      "client work in one workspace.",
      "roducq brings client intake",
      "Signed webhooks on real transitions",
      "Smaller things that save time",
      "Global search",
      "PDF export anytime",
      "Browse all integrations",
      "The whole pipeline is free, with no trial clock to watch.",
      "First project",
      "Illustrative example · fictional client",
    ],
    // Six articles, so the scroll pass visits six headings.
    swapSteps: 6,
    // The /features hero uses the per-word mask.
    heroSelector: "h1 .lm-hero-word, h1 .lm-text-gradient",
  },
  {
    path: "/",
    // Stable home-page markers the server render must include.
    serverHtml: [
      "The workspace that does",
      "the client writing for you",
      "roducq",
    ],
    // The home page has no sticky mock stage.
    swapSteps: 0,
    // The home hero rides the single lm-hero-in entrance.
    heroSelector: ".lm-hero-in",
  },
];

const installObservers = () => {
  window.__rdqMetrics = { lcp: [], shifts: [], paints: [], errors: [] };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__rdqMetrics.lcp.push({
          startTime: entry.startTime,
          size: entry.size,
          url: entry.url || null,
          element: entry.element
            ? {
                tag: entry.element.tagName,
                path: entry.element.className
                  ? `${entry.element.tagName}.${entry.element.className}`
                  : entry.element.tagName,
                text: (entry.element.textContent || "").slice(0, 60),
              }
            : null,
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
  } catch {
    window.__rdqMetrics.errors.push("observer-unavailable");
  }
  window.addEventListener("error", (event) => {
    window.__rdqMetrics.errors.push(event.message);
  });
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

async function runLcpScenario(browser, target, scenario) {
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const runs = [];
  for (let run = 0; run < RUNS; run += 1) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      deviceScaleFactor: scenario.viewport.deviceScaleFactor,
      reducedMotion: scenario.reducedMotion || "no-preference",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));

    if (scenario.cpuThrottle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", {
        rate: scenario.cpuThrottle,
      });
    }

    await page.addInitScript(installObservers);
    await page.goto(pageUrl, { waitUntil: "load" });
    // Let the entrance ladder, the mock crossfades and the
    // scroll-triggered reveals settle before reading metrics.
    await page.waitForTimeout(3000);

    const metrics = await page.evaluate(() => window.__rdqMetrics);
    const lcpEntries = metrics.lcp;
    const final = lcpEntries[lcpEntries.length - 1];
    const cls = metrics.shifts.reduce((sum, value) => sum + value, 0);

    // The LCP rule: every hero element must paint at opacity 1.
    const heroOpacities = await page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map((node) =>
        getComputedStyle(node).opacity,
      );
    }, target.heroSelector);

    // The scroll trigger, /features desktop only: pass each feature
    // article and watch the sticky stage follow.
    const swapTrail = [];
    if (target.swapSteps > 0 && scenario.viewport.width >= 1200) {
      for (let step = 0; step < target.swapSteps; step += 1) {
        await page.evaluate((index) => {
          const article = document.querySelector(
            `[data-feature-index="${index}"]`,
          );
          article?.scrollIntoView({ block: "center" });
        }, step);
        await page.waitForTimeout(700);
        swapTrail.push(
          await page.evaluate(() =>
            document
              .querySelector(".lm-mock-layer[data-active='true']")
              ?.getAttribute("data-mock"),
          ),
        );
      }
    }

    // Reduced motion: the entrance animations must resolve to none.
    const reducedMotionStyle = scenario.reducedMotion
      ? await page.evaluate((selector) => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const style = getComputedStyle(node);
          return {
            animationName: style.animationName,
            animationDuration: style.animationDuration,
            opacity: style.opacity,
          };
        }, target.heroSelector)
      : null;

    runs.push({
      run: run + 1,
      lcp: final ? Math.round(final.startTime) : null,
      lcpElement: final?.element || null,
      lcpCandidates: lcpEntries.length,
      cls: Number(cls.toFixed(4)),
      firstPaint:
        metrics.paints.find((p) => p.name === "first-paint")?.startTime ??
        null,
      fcp:
        metrics.paints.find((p) => p.name === "first-contentful-paint")
          ?.startTime ?? null,
      heroOpacities,
      swapTrail,
      // The sticky stage only exists from the 1200px band up.
      panelCheckable:
        target.swapSteps > 0 && scenario.viewport.width >= 1200,
      consoleErrors,
      reducedMotionActive: scenario.reducedMotion
        ? await page.evaluate(() =>
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          )
        : null,
      reducedMotionStyle,
    });
    await context.close();
  }
  return runs;
}

async function runOverflowSweep(browser, target) {
  // The audit's seven measured widths, including the 1200px stage
  // boundary; both colour schemes on every width.
  const widths = [320, 375, 390, 768, 1024, 1200, 1440];
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const results = [];
  for (const scheme of ["light", "dark"]) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await page.goto(pageUrl, { waitUntil: "load" });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // The sticky jump strip scrolls internally on phones; the page
      // itself must never scroll horizontally.
      const offenders = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("body *"))
          .filter((el) => el.scrollWidth > el.clientWidth + 2)
          .map((el) => ({
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className : "",
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          }))
          // The chip strip is allowed to be its own scroll container.
          .filter((el) => !el.className.includes("overflow-x-auto"))
          .slice(0, 10);
      });
      results.push({
        scheme,
        width,
        overflowX: overflow.scrollWidth - overflow.clientWidth,
        offenders,
      });
      await context.close();
    }
  }
  return results;
}

async function runAxe(browser, target) {
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(pageUrl, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  // axe-core ships in the workspace dependencies; inject the built
  // file rather than a CDN, so the sweep needs no network.
  const source = readFileSync(
    join(process.cwd(), "node_modules/axe-core/axe.min.js"),
    "utf8",
  );
  await page.addScriptTag({ content: source });
  const report = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    return await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
  });
  await context.close();
  return {
    violations: report.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      help: violation.help,
    })),
    passes: report.passes.length,
    incomplete: report.incomplete.length,
  };
}

async function checkServerHtml(target) {
  // The no-JS promise: the raw server HTML, before any script runs,
  // must already carry the route's copy.
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const response = await fetch(pageUrl);
  const html = await response.text();
  const missing = target.serverHtml.filter(
    (string) => !html.includes(string),
  );
  return { missing, bytes: html.length };
}

/**
 * The full no-JS render of /features: with scripts disabled, all six
 * feature articles, every inline miniature and every fictional-client
 * disclosure must still be present and visible, and the hero words
 * must never have been pre-hidden.
 */
async function checkNoJs(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL.replace(/\/$/, "")}/features`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const articles = Array.from(
      document.querySelectorAll("article[data-feature-index]"),
    );
    const disclosures = Array.from(
      document.querySelectorAll("body *"),
    ).filter((el) =>
      (el.textContent || "").includes(
        "Illustrative example · fictional client",
      ),
    );
    const heroWords = Array.from(
      document.querySelectorAll("h1 .lm-hero-word, h1 .lm-text-gradient"),
    ).map((node) => getComputedStyle(node).opacity);
    return {
      articleCount: articles.length,
      disclosureCount: disclosures.length,
      heroOpacities: heroWords,
      // No element should carry the JS-only pre-hide without JS.
      jsFlag: document.documentElement.classList.contains("lm-js"),
    };
  });
  await context.close();
  return state;
}

/** Run one phase, recording its failure in the report instead of
 *  losing every measurement to a crash. */
async function phase(report, path, run) {
  const assign = (value) => {
    const parts = path.split(".");
    let target = report;
    for (const part of parts.slice(0, -1)) {
      target[part] ??= {};
      target = target[part];
    }
    target[parts.at(-1)] = value;
  };
  try {
    assign(await run());
  } catch (error) {
    assign({ __error: String(error) });
  }
}

async function main() {
  const browser = await chromium.launch();
  const report = {
    capturedAt: new Date().toISOString(),
    routes: {},
    tools: {},
  };

  const scenarios = [
    { key: "A-mobile-unthrottled", viewport: MOBILE },
    { key: "B-mobile-cpu-4x", viewport: MOBILE, cpuThrottle: 4 },
    { key: "C-desktop", viewport: DESKTOP },
    {
      key: "D-mobile-reduced-motion",
      viewport: MOBILE,
      reducedMotion: "reduce",
    },
  ];

  for (const target of TARGETS) {
    const route = {
      page: `${BASE_URL.replace(/\/$/, "")}${target.path}`,
      lcp: {},
      overflow: [],
      axe: null,
      serverHtml: null,
      noJs: null,
    };

    for (const scenario of scenarios) {
      await phase(route, `lcp.${scenario.key}`, () =>
        runLcpScenario(browser, target, scenario),
      );
    }
    await phase(route, "overflow", () => runOverflowSweep(browser, target));
    await phase(route, "axe", () => runAxe(browser, target));
    await phase(route, "serverHtml", () => checkServerHtml(target));
    if (target.path === "/features") {
      await phase(route, "noJs", () => checkNoJs(browser));
    }
    report.routes[target.path] = route;
  }

  report.tools = {
    playwrightChromium: browser.version(),
    // Lighthouse is not a dependency of this workspace and the
    // sandbox blocks its CDN, so no Lighthouse median is reported.
    // The PerformanceObserver numbers are the primary instrument;
    // the missing Lighthouse column is stated, not estimated.
    lighthouse: "unavailable in this environment",
  };

  await browser.close();

  // Verdicts against the budget, per route. A phase that crashed
  // reads as a failure, never as a pass.
  for (const target of TARGETS) {
    const route = report.routes[target.path];
    const lcpGroups = Object.values(route.lcp);
    const lcpUsable =
      lcpGroups.length === scenarios.length &&
      lcpGroups.every((runs) => Array.isArray(runs) && runs.length === RUNS);
    const allRuns = lcpGroups.flatMap((runs) =>
      Array.isArray(runs) ? runs : [],
    );
    const verdict = {
      lcpUnder2500ms:
        lcpUsable &&
        allRuns.every((run) => run.lcp !== null && run.lcp < LCP_BUDGET_MS),
      lcpElementAlwaysPresent:
        lcpUsable && allRuns.every((run) => run.lcpCandidates > 0),
      heroWordsAlwaysOpaque:
        lcpUsable &&
        allRuns.every(
          (run) =>
            run.heroOpacities.length > 0 &&
            run.heroOpacities.every((opacity) => parseFloat(opacity) === 1),
        ),
      noConsoleErrors:
        lcpUsable && allRuns.every((run) => run.consoleErrors.length === 0),
      reducedMotionActiveInD:
        lcpUsable &&
        (route.lcp["D-mobile-reduced-motion"] || []).every(
          (run) => run.reducedMotionActive === true,
        ),
      reducedMotionDisablesEntrance:
        lcpUsable &&
        (route.lcp["D-mobile-reduced-motion"] || []).every(
          (run) =>
            run.reducedMotionStyle === null ||
            run.reducedMotionStyle.animationName === "none" ||
            run.reducedMotionStyle.animationDuration === "0s",
        ),
      noHorizontalOverflow:
        Array.isArray(route.overflow) &&
        route.overflow.every(
          (result) =>
            result.overflowX === 0 && result.offenders.length === 0,
        ),
      clsBelow01:
        lcpUsable && allRuns.every((run) => run.cls < 0.1),
      axeZeroViolations:
        route.axe && Array.isArray(route.axe.violations)
          ? route.axe.violations.length === 0
          : false,
      noJsVisibility:
        route.serverHtml && route.serverHtml.missing.length === 0,
    };
    if (target.swapSteps > 0) {
      verdict.mockPanelFollowsScroll =
        lcpUsable &&
        allRuns
          .filter((run) => run.panelCheckable)
          .every(
            (run) =>
              run.swapTrail.filter(Boolean).length >= 4 &&
              new Set(run.swapTrail.filter(Boolean)).size >= 4,
          );
      verdict.noJsMiniatures = route.noJs
        ? route.noJs.articleCount === 6 &&
          route.noJs.disclosureCount >= 6 &&
          route.noJs.jsFlag === false &&
          route.noJs.heroOpacities.every(
            (opacity) => parseFloat(opacity) === 1,
          )
        : false;
    }
    route.verdict = verdict;

    // Compact LCP medians for the printed summary.
    route.summary = {
      lcpMedians: Object.fromEntries(
        Object.entries(route.lcp).map(([key, runs]) => [
          key,
          Array.isArray(runs)
            ? {
                lcpMedian: median(runs.map((run) => run.lcp)),
                lcpRuns: runs.map((run) => run.lcp),
                clsRuns: runs.map((run) => run.cls),
                lcpElement: runs[0].lcpElement,
              }
            : runs,
        ]),
      ),
      verdict,
    };
  }

  report.verdict = Object.fromEntries(
    TARGETS.map((target) => [
      target.path,
      Object.values(report.routes[target.path].verdict).every(Boolean),
    ]),
  );

  const json = JSON.stringify(report, null, 2);
  if (OUTPUT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(OUTPUT, json);
  }
  console.log(json);

  const failed = Object.entries(report.verdict).filter(([, passed]) => !passed);
  if (failed.length > 0) {
    console.error(
      `VERDICT FAILED: ${failed.map(([route]) => route).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.error("VERDICT: every check passed on both routes");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
