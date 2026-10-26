/**
 * /changelog real-browser verification suite (Phase 7).
 *
 * Runs against a production build (`next start`) in real headless Chromium:
 *   1. Five LCP scenarios (3 fresh runs each, PerformanceObserver medians)
 *      on BOTH `/changelog` AND `/` (homepage regression control):
 *        A  mobile 412x823 @1.75 DPR, unthrottled
 *        B  mobile 412x823 @1.75 DPR, 4G network + 4x CPU throttle (CDP)
 *        C  desktop 1440x900, unthrottled
 *        D  desktop 1440x900, 4G network + 4x CPU throttle (CDP)
 *        E  mobile 412x823 @1.75 DPR, prefers-reduced-motion: reduce
 *   2. Responsive geometry, overflow, sticky-meta & tap-target sweep across
 *      all 7 required widths (320, 375, 390, 768, 1024, 1200, 1440px) in
 *      both light and dark themes.
 *   3. axe-core WCAG 2.1/2.2 AA accessibility passes in BOTH light and dark
 *      themes on `/changelog` and `/`.
 *   4. Raw server HTML & JavaScript-disabled (`javaScriptEnabled: false`)
 *      rendering checks confirming all 8 verified entries and hero words
 *      paint at opacity 1 without client scripts.
 *   5. Interactive functional filter & keyboard accessibility suite driving
 *      `All updates`, `New`, `Improved`, and `Fixed` with both pointer clicks
 *      and `Tab` / `Enter` / `Space` keys, verifying `aria-pressed`, live
 *      `<article>` subsets, `aria-live="polite"` announcements, visible focus
 *      indicators, and external GitHub PR verification links.
 */

import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT = process.env.OUTPUT;
const SHOTS_DIR = process.env.SHOTS_DIR;
const RUNS = 3;
const LCP_BUDGET_MS = 2500;

const MOBILE = { width: 412, height: 823, deviceScaleFactor: 1.75 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

// Simulated Fast/Slow 4G profile for CDP Network.emulateNetworkConditions
// (1.6 Mbps download, 750 Kbps upload, 150ms RTT).
const THROTTLE_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
  uploadThroughput: Math.floor((750 * 1024) / 8),
};

const TARGETS = [
  {
    path: "/changelog",
    heroSelector:
      "h1 .lm-hero-word, h1 .lm-hero-accent-inline, section[aria-label='Changelog hero'] .lm-hero-in",
    serverHtml: [
      "Changelog",
      "in roducq",
      "Verified product updates, interface improvements, and fixes shipped to roducq, most recent first.",
      "Integrations directory and connection guide",
      "Features overview across all six workflow pillars",
      "Solutions pages by practice type",
      "Dedicated pricing page and faster mobile hero paint",
      "Redesigned marketing home and social preview cards",
      "Workspace visual refresh and security hardening",
      "File intake uploads, global workspace search, and /vs comparisons",
      "Core client-ops pipeline, PDF exports, and roducq launch",
      "Free to start. No credit card required",
      "Illustrative sample data",
    ],
    changelog: true,
  },
  {
    path: "/",
    heroSelector: ".lm-hero-in",
    serverHtml: [
      "The workspace that does",
      "the client writing for you",
      "roducq",
    ],
    changelog: false,
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
                className:
                  typeof entry.element.className === "string"
                    ? entry.element.className
                    : "",
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
      viewport: {
        width: scenario.viewport.width,
        height: scenario.viewport.height,
      },
      deviceScaleFactor: scenario.viewport.deviceScaleFactor,
      reducedMotion: scenario.reducedMotion || "no-preference",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(String(error)));

    if (scenario.cpuThrottle || scenario.networkThrottle) {
      const cdp = await context.newCDPSession(page);
      if (scenario.networkThrottle) {
        await cdp.send("Network.enable");
        await cdp.send(
          "Network.emulateNetworkConditions",
          scenario.networkThrottle,
        );
      }
      if (scenario.cpuThrottle) {
        await cdp.send("Emulation.setCPUThrottlingRate", {
          rate: scenario.cpuThrottle,
        });
      }
    }

    await page.addInitScript(installObservers);
    await page.goto(pageUrl, { waitUntil: "load" });
    await page.waitForTimeout(2500);

    const metrics = await page.evaluate(() => window.__rdqMetrics);
    const lcpEntries = metrics.lcp;
    const final = lcpEntries[lcpEntries.length - 1];
    const cls = metrics.shifts.reduce((sum, value) => sum + value, 0);

    const heroOpacities = await page.evaluate((selector) => {
      return Array.from(document.querySelectorAll(selector)).map((node) =>
        getComputedStyle(node).opacity,
      );
    }, target.heroSelector);

    const reducedMotionStyle = scenario.reducedMotion
      ? await page.evaluate((selector) => {
          const nodes = Array.from(document.querySelectorAll(selector));
          if (nodes.length === 0) return null;
          return nodes.map((node) => {
            const style = getComputedStyle(node);
            return {
              animationName: style.animationName,
              animationDuration: style.animationDuration,
              opacity: style.opacity,
            };
          });
        }, target.heroSelector)
      : null;

    runs.push({
      run: run + 1,
      lcp: final ? Math.round(final.startTime) : null,
      lcpElement: final?.element || null,
      lcpCandidates: lcpEntries.length,
      cls: Number(cls.toFixed(4)),
      fcp: Math.round(
        metrics.paints.find((p) => p.name === "first-contentful-paint")
          ?.startTime ?? 0,
      ),
      heroOpacities,
      consoleErrors,
      reducedMotionActive: scenario.reducedMotion
        ? await page.evaluate(
            () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          )
        : null,
      reducedMotionStyle,
    });
    await context.close();
  }
  return runs;
}

async function runResponsiveSweep(browser, target) {
  const widths = [320, 375, 390, 768, 1024, 1200, 1440];
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const results = [];
  if (SHOTS_DIR && target.changelog) {
    mkdirSync(SHOTS_DIR, { recursive: true });
  }

  for (const scheme of ["light", "dark"]) {
    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await page.addInitScript((theme) => {
        try {
          window.localStorage.setItem("theme", theme);
        } catch {}
      }, scheme);
      await page.goto(pageUrl, { waitUntil: "load" });
      await page.waitForTimeout(900);

      if (
        SHOTS_DIR &&
        target.changelog &&
        ((scheme === "light" && [375, 768, 1200, 1440].includes(width)) ||
          (scheme === "dark" && [375, 1440].includes(width)))
      ) {
        await page.screenshot({
          path: join(SHOTS_DIR, `roducq-changelog-${width}-${scheme}-top.png`),
          fullPage: false,
        });
        if (width === 1440 || width === 375) {
          await page.screenshot({
            path: join(
              SHOTS_DIR,
              `roducq-changelog-${width}-${scheme}-full.png`,
            ),
            fullPage: true,
          });
        }
      }

      const geometry = await page.evaluate((isChangelog) => {
        const de = document.documentElement;
        const overflowX = de.scrollWidth - de.clientWidth;
        const offenders = Array.from(document.querySelectorAll("body *"))
          .filter((el) => el.scrollWidth > el.clientWidth + 2)
          .filter((el) => {
            if (el.closest(".sr-only")) return false;
            const rect = el.getBoundingClientRect();
            return rect.right > de.clientWidth + 1;
          })
          .map((el) => ({
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className : "",
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          }))
          .slice(0, 10);

        const smallTargets = isChangelog
          ? Array.from(
              document.querySelectorAll(
                "section#updates button, section#updates a, section[aria-label='Get started'] a",
              ),
            )
              .map((el) => {
                const r = el.getBoundingClientRect();
                return {
                  text: (el.textContent || "").trim().slice(0, 32),
                  width: Math.round(r.width * 10) / 10,
                  height: Math.round(r.height * 10) / 10,
                };
              })
              .filter((r) => r.width < 43.5 || r.height < 43.5)
          : [];

        const firstMeta = isChangelog
          ? (() => {
              const meta = document.querySelector(
                "section#updates article > div:first-child",
              );
              if (!meta) return null;
              const cs = getComputedStyle(meta);
              const rect = meta.getBoundingClientRect();
              return {
                position: cs.position,
                top: cs.top,
                width: Math.round(rect.width * 10) / 10,
              };
            })()
          : null;

        const h1Info = isChangelog
          ? (() => {
              const h1 = document.querySelector("h1");
              if (!h1) return null;
              const cs = getComputedStyle(h1);
              return {
                fontSize: cs.fontSize,
                height: Math.round(h1.getBoundingClientRect().height * 10) / 10,
              };
            })()
          : null;

        return {
          overflowX,
          offenders,
          smallTargets,
          firstMeta,
          h1Info,
          darkActive: de.classList.contains("dark"),
        };
      }, target.changelog);

      results.push({
        scheme,
        width,
        ...geometry,
      });
      await context.close();
    }
  }
  return results;
}

async function runAxeScheme(browser, target, scheme) {
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1,
    colorScheme: scheme,
  });
  const page = await context.newPage();
  await page.addInitScript((theme) => {
    try {
      window.localStorage.setItem("theme", theme);
    } catch {}
  }, scheme);
  await page.goto(pageUrl, { waitUntil: "load" });
  await page.waitForTimeout(1500);
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
    scheme,
    violations: report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      details: v.nodes.slice(0, 10).map((n) => ({
        target: n.target.join(" "),
        html: n.html.slice(0, 160),
      })),
    })),
    passes: report.passes.length,
  };
}

async function checkServerHtml(target) {
  const pageUrl = `${BASE_URL.replace(/\/$/, "")}${target.path}`;
  const response = await fetch(pageUrl);
  const html = await response.text();
  const missing = target.serverHtml.filter((text) => !html.includes(text));
  return { status: response.status, missing, bytes: html.length };
}

async function checkChangelogNoJs(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL.replace(/\/$/, "")}/changelog`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll("section#updates article"));
    const chips = Array.from(
      document.querySelectorAll("section#updates button[aria-pressed]"),
    );
    const heroNodes = Array.from(
      document.querySelectorAll(
        "h1 .lm-hero-word, h1 .lm-hero-accent-inline, section[aria-label='Changelog hero'] .lm-hero-in",
      ),
    );
    return {
      articleCount: articles.length,
      articlesVisible: articles.filter(
        (el) =>
          getComputedStyle(el).opacity === "1" &&
          el.getBoundingClientRect().height > 0,
      ).length,
      chipCount: chips.length,
      heroOpacities: heroNodes.map((n) => getComputedStyle(n).opacity),
      jsFlag: document.documentElement.classList.contains("lm-js"),
      closingVisible: Boolean(
        document.querySelector("section[aria-label='Get started']"),
      ),
    };
  });
  await context.close();
  return state;
}

async function runFilterAndKeyboardSuite(browser) {
  const url = `${BASE_URL.replace(/\/$/, "")}/changelog`;
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1000);

  const readFeedState = () =>
    page.evaluate(() => {
      const pressed = Array.from(
        document.querySelectorAll(
          "section#updates button[aria-pressed='true']",
        ),
      ).map((b) => (b.textContent || "").trim());
      const articles = Array.from(
        document.querySelectorAll("section#updates article"),
      ).map((article) => ({
        id: article.id,
        title: article.querySelector("h2")?.textContent?.trim() || "",
        badges: Array.from(
          article.querySelectorAll("div.min-w-0 > div:first-child span"),
        ).map((s) => (s.textContent || "").trim()),
        prHref: article.querySelector("a")?.getAttribute("href") || "",
        rel: article.querySelector("a")?.getAttribute("rel") || "",
      }));
      const liveText =
        document
          .querySelector("section#updates [aria-live='polite']")
          ?.textContent?.trim() || "";
      return { pressed, count: articles.length, articles, liveText };
    });

  const expectedCounts = {
    "All updates": 8,
    New: 7,
    Improved: 3,
    Fixed: 2,
  };

  const pointerChecks = [];
  for (const label of ["New", "Improved", "Fixed", "All updates"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(100);
    const state = await readFeedState();
    const expected = expectedCounts[label];
    const badgesMatch =
      label === "All updates"
        ? true
        : state.articles.every((a) => a.badges.includes(label));
    pointerChecks.push({
      label,
      pressed: state.pressed,
      count: state.count,
      expected,
      badgesMatch,
      liveText: state.liveText,
      pass:
        state.pressed.length === 1 &&
        state.pressed[0] === label &&
        state.count === expected &&
        badgesMatch &&
        state.liveText.includes(String(expected)),
    });
  }

  // Keyboard navigation check: focus "All updates", Tab to "New", press Enter,
  // Tab to "Improved", press Space, verify visible focus-visible ring.
  const firstChip = page.getByRole("button", {
    name: "All updates",
    exact: true,
  });
  await firstChip.focus();
  await page.keyboard.press("Tab");
  const focusedAfterTab = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      text: (el.textContent || "").trim(),
      boxShadow: cs.boxShadow,
      outlineStyle: cs.outlineStyle,
    };
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  const afterEnter = await readFeedState();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const afterSpace = await readFeedState();

  // Reset to All updates and verify every PR link & header active state
  await firstChip.click();
  const fullState = await readFeedState();
  const headerActive = await page.evaluate(() => {
    const link = document.querySelector("header a[href='/changelog']");
    return link ? link.getAttribute("aria-current") : null;
  });

  await context.close();

  const verdict = {
    allPointerFiltersPass: pointerChecks.every((c) => c.pass),
    keyboardTabReachesNew: focusedAfterTab?.text === "New",
    keyboardVisibleFocusRing: Boolean(
      focusedAfterTab &&
        (focusedAfterTab.boxShadow !== "none" ||
          focusedAfterTab.outlineStyle !== "none"),
    ),
    keyboardEnterActivatesNew:
      afterEnter.pressed[0] === "New" && afterEnter.count === 7,
    keyboardSpaceActivatesImproved:
      afterSpace.pressed[0] === "Improved" && afterSpace.count === 3,
    allPrLinksValidAndSafe: fullState.articles.every(
      (a) =>
        /^https:\/\/github\.com\/gunal-official\/roducq\/pull\/\d+$/.test(
          a.prHref,
        ) && a.rel.includes("noopener"),
    ),
    headerMarksChangelogCurrent: headerActive === "page",
    zeroConsoleErrors: consoleErrors.length === 0,
  };

  return {
    pointerChecks,
    focusedAfterTab,
    afterEnterCount: afterEnter.count,
    afterSpaceCount: afterSpace.count,
    headerActive,
    consoleErrors,
    verdict,
  };
}

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
    tools: {
      playwrightChromium: browser.version(),
    },
  };

  const scenarios = [
    { key: "A-mobile-unthrottled", viewport: MOBILE },
    {
      key: "B-mobile-throttled-4g-4xcpu",
      viewport: MOBILE,
      cpuThrottle: 4,
      networkThrottle: THROTTLE_4G,
    },
    { key: "C-desktop-unthrottled", viewport: DESKTOP },
    {
      key: "D-desktop-throttled-4g-4xcpu",
      viewport: DESKTOP,
      cpuThrottle: 4,
      networkThrottle: THROTTLE_4G,
    },
    {
      key: "E-mobile-reduced-motion",
      viewport: MOBILE,
      reducedMotion: "reduce",
    },
  ];

  for (const target of TARGETS) {
    const route = {
      page: `${BASE_URL.replace(/\/$/, "")}${target.path}`,
      lcp: {},
      responsive: [],
      axeLight: null,
      axeDark: null,
      serverHtml: null,
      noJs: null,
      interactive: null,
    };

    for (const scenario of scenarios) {
      await phase(route, `lcp.${scenario.key}`, () =>
        runLcpScenario(browser, target, scenario),
      );
    }
    await phase(route, "responsive", () => runResponsiveSweep(browser, target));
    await phase(route, "axeLight", () =>
      runAxeScheme(browser, target, "light"),
    );
    await phase(route, "axeDark", () => runAxeScheme(browser, target, "dark"));
    await phase(route, "serverHtml", () => checkServerHtml(target));
    if (target.changelog) {
      await phase(route, "noJs", () => checkChangelogNoJs(browser));
      await phase(route, "interactive", () =>
        runFilterAndKeyboardSuite(browser),
      );
    }
    report.routes[target.path] = route;
  }

  await browser.close();

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
        Object.values(route.lcp).every(
          (runs) =>
            Array.isArray(runs) &&
            median(runs.map((r) => r.lcp)) < LCP_BUDGET_MS,
        ),
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
      reducedMotionDisablesEntrance:
        lcpUsable &&
        (route.lcp["E-mobile-reduced-motion"] || []).every(
          (run) =>
            Array.isArray(run.reducedMotionStyle) &&
            run.reducedMotionStyle.every(
              (s) =>
                s.animationName === "none" || s.animationDuration === "0s",
            ),
        ),
      noHorizontalOverflow7WidthsLightAndDark:
        Array.isArray(route.responsive) &&
        route.responsive.length === 14 &&
        route.responsive.every(
          (r) => r.overflowX === 0 && r.offenders.length === 0,
        ),
      clsBelow01: lcpUsable && allRuns.every((run) => run.cls < 0.1),
      axeLightZeroViolations:
        Boolean(route.axeLight) &&
        Array.isArray(route.axeLight.violations) &&
        route.axeLight.violations.length === 0,
      axeDarkZeroViolations:
        Boolean(route.axeDark) &&
        Array.isArray(route.axeDark.violations) &&
        route.axeDark.violations.length === 0,
      serverHtmlComplete:
        Boolean(route.serverHtml) &&
        route.serverHtml.status === 200 &&
        route.serverHtml.missing.length === 0,
    };

    if (target.changelog) {
      verdict.tapTargetsAtAllWidths = route.responsive.every(
        (r) => r.smallTargets.length === 0,
      );
      verdict.stickyMetaAt1200PlusOnly = route.responsive.every((r) =>
        r.width >= 1200
          ? r.firstMeta?.position === "sticky" && r.firstMeta?.top === "110px"
          : r.firstMeta?.position === "static",
      );
      verdict.noJsAllEntriesVisible = Boolean(
        route.noJs &&
          route.noJs.articleCount === 8 &&
          route.noJs.articlesVisible === 8 &&
          route.noJs.chipCount === 4 &&
          route.noJs.closingVisible === true &&
          route.noJs.jsFlag === false &&
          route.noJs.heroOpacities.every((o) => parseFloat(o) === 1),
      );
      verdict.interactiveFilterAndKeyboardSuite = Boolean(
        route.interactive?.verdict &&
          Object.values(route.interactive.verdict).every(Boolean),
      );
    }

    route.verdict = verdict;
    route.summary = {
      lcpMedians: Object.fromEntries(
        Object.entries(route.lcp).map(([key, runs]) => [
          key,
          Array.isArray(runs)
            ? {
                lcpMedianMs: median(runs.map((r) => r.lcp)),
                lcpRunsMs: runs.map((r) => r.lcp),
                fcpMedianMs: median(runs.map((r) => r.fcp)),
                clsRuns: runs.map((r) => r.cls),
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
  if (OUTPUT) writeFileSync(OUTPUT, json);
  console.log(json);

  const failed = Object.entries(report.verdict).filter(([, passed]) => !passed);
  if (failed.length > 0) {
    console.error(
      `VERDICT FAILED: ${failed.map(([route]) => route).join(", ")}`,
    );
    process.exitCode = 1;
  } else {
    console.error("VERDICT: every check passed on /changelog and /");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
