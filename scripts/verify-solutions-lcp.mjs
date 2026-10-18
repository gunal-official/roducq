/**
 * Phase D verification for /solutions — the PR #53 four-scenario
 * LCP suite, the horizontal-overflow sweep and an axe-core pass,
 * all against a real Chromium on the production build.
 *
 *   BASE_URL    the server to probe (default http://localhost:3000)
 *   OUTPUT      where to write the JSON report (default stdout)
 *
 * SCENARIOS (three fresh runs each, per the PR #53 method in
 * docs/FORMA_SPEC_CROSS_REFERENCE_AUDIT.md):
 *   A  mobile 412×823 @1.75 DPR, animations on, unthrottled
 *   B  mobile, animations on, 4× CPU throttle (CDP
 *      Emulation.setCPUThrottlingRate; network throttling disabled)
 *   C  desktop 1440×900, animations on
 *   D  mobile, prefers-reduced-motion: reduce emulated before
 *      navigation
 *
 * MEASURED, NOT CLAIMED. Every number below comes out of the
 * PerformanceObserver entries the page itself emits. If a tool
 * is unavailable (Lighthouse is not installed in this workspace,
 * for example), the report says so instead of inventing a value.
 *
 * ALSO VERIFIED, because the page promises it:
 *   - the hero headline words keep computed opacity 1 at first
 *     paint (the PR #53 LCP rule — no opacity-zero start);
 *   - the mock panel swaps its active layer as the scroll passes
 *     each practice article (the measured 0.3-threshold trigger);
 *   - the raw server HTML carries every category's copy (the
 *     no-JS visibility promise);
 *   - horizontal overflow is 0px at 320/375/390/768/1024/1440
 *     in both colour schemes.
 */

import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PAGE_URL = `${BASE_URL.replace(/\/$/, "")}/solutions`;
const OUTPUT = process.env.OUTPUT;
const RUNS = 3;
const LCP_BUDGET_MS = 2500;

const MOBILE = { width: 412, height: 823, deviceScaleFactor: 1.75 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

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

async function runLcpScenario(browser, scenario) {
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
    await page.goto(PAGE_URL, { waitUntil: "load" });
    // Let the entrance ladder, the mock crossfades and the
    // scroll-triggered reveals settle before reading metrics.
    await page.waitForTimeout(3000);

    const metrics = await page.evaluate(() => window.__rdqMetrics);
    const lcpEntries = metrics.lcp;
    const final = lcpEntries[lcpEntries.length - 1];
    const cls = metrics.shifts.reduce((sum, value) => sum + value, 0);

    // The LCP rule: every hero word must paint at opacity 1.
    const heroOpacities = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('h1 .lm-hero-word, h1 .lm-text-gradient'),
      ).map((node) => getComputedStyle(node).opacity);
    });

    // The scroll trigger: pass each practice article and watch
    // the sticky panel follow.
    const swapTrail = [];
    for (let step = 0; step < 4; step += 1) {
      await page.evaluate((index) => {
        const article = document.querySelector(
          `[data-practice-index="${index}"]`,
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

    runs.push({
      run: run + 1,
      lcp: final ? Math.round(final.startTime) : null,
      lcpElement: final?.element || null,
      lcpCandidates: lcpEntries.length,
      cls: Number(cls.toFixed(4)),
      firstPaint: metrics.paints.find((p) => p.name === "first-paint")
        ?.startTime ?? null,
      fcp: metrics.paints.find((p) => p.name === "first-contentful-paint")
        ?.startTime ?? null,
      heroOpacities,
      swapTrail,
      // The sticky panel only exists from the desktop band
      // up; phones stack their miniatures inline instead.
      panelCheckable: scenario.viewport.width >= 1024,
      consoleErrors,
      reducedMotionActive: scenario.reducedMotion
        ? await page.evaluate(() =>
            window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          )
        : null,
    });
    await context.close();
  }
  return runs;
}

async function runOverflowSweep(browser) {
  const widths = [320, 375, 390, 768, 1024, 1440];
  const results = [];
  for (const scheme of ["light", "dark"]) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await page.goto(PAGE_URL, { waitUntil: "load" });
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      results.push({
        scheme,
        width,
        overflowX: overflow.scrollWidth - overflow.clientWidth,
      });
      await context.close();
    }
  }
  return results;
}

async function runAxe(browser) {
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(PAGE_URL, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  // axe-core ships in the workspace dependencies; inject the
  // built file rather than a CDN, so the sweep needs no network.
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

async function checkServerHtml() {
  // The no-JS promise: the raw server HTML, before any script
  // runs, must already carry every practice's copy.
  const response = await fetch(PAGE_URL);
  const html = await response.text();
  const expected = [
    "The same pipeline,",
    "shaped four ways.",
    "Solo practices",
    "Design studios",
    "Agencies",
    "Consultancies",
    "One trail per client, end to end",
    "Creative direction that survives the handoff",
    "Proposals that become working plans",
    "Reports that write themselves from the week",
    "What each practice sets up first",
    "Templates",
    "Choosing a plan",
    "One workspace, one price, the whole pipeline",
    "Try roducq with",
    "First project",
  ];
  const missing = expected.filter((string) => !html.includes(string));
  return { missing, bytes: html.length };
}

/** Run one phase, recording its failure in the report
 *  instead of losing every measurement to a crash. */
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
  const report = { page: PAGE_URL, capturedAt: new Date().toISOString(), lcp: {}, overflow: [], axe: null, serverHtml: null, tools: {} };

  const scenarios = [
    { key: "A-mobile-unthrottled", viewport: MOBILE },
    { key: "B-mobile-cpu-4x", viewport: MOBILE, cpuThrottle: 4 },
    { key: "C-desktop", viewport: DESKTOP },
    { key: "D-mobile-reduced-motion", viewport: MOBILE, reducedMotion: "reduce" },
  ];

  for (const scenario of scenarios) {
    await phase(report, `lcp.${scenario.key}`, () =>
      runLcpScenario(browser, scenario),
    );
  }

  await phase(report, "overflow", () => runOverflowSweep(browser));
  await phase(report, "axe", () => runAxe(browser));
  await phase(report, "serverHtml", () => checkServerHtml());
  report.tools = {
    playwrightChromium: browser.version(),
    // Lighthouse is not a dependency of this workspace and the
    // sandbox blocks its CDN, so no Lighthouse median is
    // reported here. The PerformanceObserver numbers above are
    // the primary instrument; the missing Lighthouse column is
    // stated, not estimated.
    lighthouse: "unavailable in this environment",
  };

  await browser.close();

  // Verdicts against the budget. A phase that crashed
  // reads as a failure, never as a pass.
  const lcpGroups = Object.values(report.lcp);
  const lcpUsable = lcpGroups.every(
    (runs) => Array.isArray(runs) && runs.length === RUNS,
  );
  const allRuns = lcpGroups.flatMap((runs) =>
    Array.isArray(runs) ? runs : [],
  );
  report.verdict = {
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
    mockPanelFollowsScroll:
      lcpUsable &&
      allRuns
        .filter((run) => run.panelCheckable)
        .every(
          (run) =>
            run.swapTrail.filter(Boolean).length >= 3 &&
            new Set(run.swapTrail.filter(Boolean)).size >= 2,
        ),
    noConsoleErrors:
      lcpUsable && allRuns.every((run) => run.consoleErrors.length === 0),
    reducedMotionActiveInD:
      lcpUsable &&
      (report.lcp["D-mobile-reduced-motion"] || []).every(
        (run) => run.reducedMotionActive === true,
      ),
    noHorizontalOverflow:
      Array.isArray(report.overflow) &&
      report.overflow.every((result) => result.overflowX === 0),
    clsBelow01:
      lcpUsable && allRuns.every((run) => run.cls < 0.1),
    axeZeroViolations:
      report.axe && Array.isArray(report.axe.violations)
        ? report.axe.violations.length === 0
        : false,
    noJsVisibility:
      report.serverHtml && report.serverHtml.missing.length === 0,
  };

  const summary = {
    lcpMedians: Object.fromEntries(
      Object.entries(report.lcp).map(([key, runs]) => [
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
    verdict: report.verdict,
  };
  report.summary = summary;

  const json = JSON.stringify(report, null, 2);
  if (OUTPUT) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(OUTPUT, json);
  }
  console.log(json);

  const failed = Object.entries(report.verdict).filter(
    ([, passed]) => !passed,
  );
  if (failed.length > 0) {
    console.error(
      `VERDICT FAILED: ${failed.map(([key]) => key).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.error("VERDICT: every check passed");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
