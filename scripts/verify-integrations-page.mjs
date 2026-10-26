/**
 * /integrations verification — the PR #53 four-scenario LCP suite, the
 * horizontal-overflow sweep, an axe-core pass, the no-JS promise, and (new
 * for this page) a functional suite for the catalog's controls.
 *
 *   BASE_URL    the server to probe (default http://localhost:3000)
 *   OUTPUT      where to write the JSON report (default stdout)
 *
 * SCENARIOS (three fresh runs each, per the PR #53 method), on
 * /integrations AND on / as the regression control:
 *   A  mobile 412x823 @1.75 DPR, animations on, unthrottled
 *   B  mobile, animations on, 4x CPU throttle (CDP
 *      Emulation.setCPUThrottlingRate; network throttling disabled)
 *   C  desktop 1440x900, animations on
 *   D  mobile, prefers-reduced-motion: reduce emulated before navigation
 *
 * MEASURED, NOT CLAIMED. Every number comes out of the PerformanceObserver
 * entries the page emits. If an instrument is unavailable the report says so
 * instead of inventing a value — Lighthouse is not a dependency of this
 * workspace and its CDN is blocked in the sandbox, so no Lighthouse median is
 * reported anywhere; the PerformanceObserver medians are the primary
 * instrument.
 *
 * THE CATALOG SUITE EXISTS BECAUSE THIS PAGE HAS CONTROLS. /solutions and
 * /features are scroll stories; /integrations ships a search field and seven
 * category filters, and a page that promises "these seven things exist and you
 * can find them" has to prove the finding works. So the suite drives the real
 * controls with real input and asserts:
 *
 *   - every chip filters (aria-pressed flips, the grid narrows to that
 *     category, and the count line agrees with the grid);
 *   - "All" restores the full catalog;
 *   - search narrows to a named entry, a no-match term shows the empty state,
 *     and its clear action restores the catalog;
 *   - no card is a link or a button (the reference's cards are inert, and the
 *     recreation must not fake a destination);
 *   - no control anywhere on the page says "Connect" (nothing on this page
 *     connects anything — the real connect buttons live in Settings);
 *   - the one outbound action is a mailto: URL;
 *   - with JavaScript disabled the full catalog, its copy and the section
 *     headings are all still in the DOM and visible.
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
    path: "/integrations",
    // Strings the raw server HTML must contain (the no-JS promise). The hero
    // headline is split into per-word mask spans, so only contiguous copy is
    // asserted — plus every card's name and description, which is the whole
    // point of the page.
    serverHtml: [
      "Send the work out.",
      "Slack, Notion and a connected mailbox feed the Inbox",
      "Import the newest messages from up to eight channels",
      "Pull recent pages in as plain text",
      "Connect Gmail or Outlook and stage incoming client mail",
      "Send ten workspace events to any endpoint you control",
      "Export invoices, contracts, proposals, updates, plans, time and reports",
      "Drop a DOCX, PDF, TXT or MD file into intake",
      "Share an update or an invoice behind a token link",
      "How connecting works",
      "Missing an app you need?",
      "External connections import into roducq and never write back.",
      "The whole pipeline is free, with no trial clock to watch.",
      "Illustrative example · fictional workspace",
    ],
    // No sticky mock stage on this page.
    swapSteps: 0,
    // The hero uses the per-word mask plus the gradient unit.
    heroSelector: "h1 .lm-hero-word, h1 .lm-text-gradient",
    catalog: true,
  },
  {
    path: "/",
    // Stable home-page markers the server render must include.
    serverHtml: [
      "The workspace that does",
      "the client writing for you",
      "roducq",
    ],
    swapSteps: 0,
    heroSelector: ".lm-hero-in",
    catalog: false,
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
          // Only elements whose painted box actually crosses the viewport
          // count: truncated text and sr-only clips have a large inner
          // scrollWidth by design but never cause page overflow. The
          // measured audit criterion is document overflowX === 0; this
          // list names the element that would break it, if any. Filter
          // the live elements BEFORE mapping them to plain objects.
          .filter((el) => {
            if (el.closest(".sr-only")) return false;
            const rect = el.getBoundingClientRect();
            return rect.right > document.documentElement.clientWidth + 1;
          })
          .map((el) => ({
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className : "",
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
          }))
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
      // Name the exact failing elements (with the contrast data axe
      // computed) so a failure is actionable without a local browser.
      details: violation.nodes.slice(0, 12).map((node) => ({
        target: node.target.join(" "),
        html: node.html.slice(0, 160),
        contrast: (
          node.all
            .concat(node.any, node.none)
            .find((check) => check.data && check.data.contrastRatio) || {}
        ).data || null,
      })),
    })),
    passes: report.passes.length,
    incomplete: report.incomplete.map((rule) => ({
      id: rule.id,
      nodes: rule.nodes.map((node) => node.target.join(" ")).slice(0, 6),
    })),
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

/**
 * THE CATALOG SUITE — the page's working controls, driven for real.
 *
 * Everything here is an assertion about behaviour, not about markup: the
 * chips are clicked, the input is typed into, and the grid is re-read after
 * every action. A chip that only changes colour fails. A count line that
 * disagrees with the number of rendered cards fails. A card that turns out to
 * be a link fails.
 *
 * It also enforces the content gate's two hard rules: no "Connect" control
 * (nothing on this page connects anything) and the only outbound action is a
 * mailto:.
 */
async function runCatalogSuite(browser) {
  const url = `${BASE_URL.replace(/\/$/, "")}/integrations`;
  const context = await browser.newContext({ viewport: DESKTOP });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1200);

  /** Read the grid's current state: cards, their names and categories. */
  const readGrid = () =>
    page.evaluate(() => {
      const list = document.querySelector("section#catalog ul");
      const cards = list ? Array.from(list.querySelectorAll(":scope > li")) : [];
      const countNode = document.querySelector("[data-catalog-count]");
      const countText = countNode
        ? (countNode.textContent || "").replace(/\s+/g, " ").trim()
        : null;
      const emptyVisible = Boolean(
        document.querySelector("section#catalog")
          ? Array.from(
              document.querySelectorAll("section#catalog p, section#catalog button"),
            ).some((el) =>
              /No integrations match|Clear filters/.test(el.textContent || ""),
            )
          : false,
      );
      return {
        cards: cards.map((card) => {
          const heading = card.querySelector("h3");
          const meta = card.querySelector("span:last-child");
          return {
            name: heading ? heading.textContent.trim() : null,
            category: (() => {
              const spans = Array.from(card.querySelectorAll("span"));
              const label = spans.find((span) =>
                /^(All|Chat|Docs & notes|Email|Automation|Files & exports|Sharing)$/.test(
                  (span.textContent || "").trim(),
                ),
              );
              return label ? label.textContent.trim() : null;
            })(),
            status: meta ? meta.textContent.trim() : null,
            // A card must never be interactive: no link, no button inside it.
            interactive:
              card.querySelector("a, button, [role='button']") !== null,
            cursor: getComputedStyle(card).cursor,
          };
        }),
        countText,
        emptyVisible,
      };
    });

  const pressChip = (label) =>
    page.evaluate((text) => {
      const chip = Array.from(
        document.querySelectorAll("section#catalog button[aria-pressed]"),
      ).find((el) => (el.textContent || "").trim() === text);
      if (!chip) return false;
      chip.click();
      return true;
    }, label);

  const pressedChips = () =>
    page.evaluate(() =>
      Array.from(
        document.querySelectorAll("section#catalog button[aria-pressed='true']"),
      ).map((el) => (el.textContent || "").trim()),
    );

  const report = { initial: null, chips: [], search: [], global: null };

  report.initial = { ...(await readGrid()), pressed: await pressedChips() };

  const chipLabels = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll("section#catalog button[aria-pressed]"),
    ).map((el) => (el.textContent || "").trim()),
  );

  for (const label of chipLabels) {
    const clicked = await pressChip(label);
    await page.waitForTimeout(220);
    const state = await readGrid();
    const pressed = await pressedChips();
    const expected =
      label === "All"
        ? report.initial.cards.length
        : report.initial.cards.filter((card) => card.category === label).length;
    report.chips.push({
      label,
      clicked,
      pressed,
      cardCount: state.cards.length,
      expectedCount: expected,
      names: state.cards.map((card) => card.name),
      categoriesMatch: state.cards.every(
        (card) => label === "All" || card.category === label,
      ),
      countText: state.countText,
      // The visible count must agree with the grid, always.
      countAgrees: (() => {
        if (!state.countText) return false;
        const shown = /(\d+)\s+of\s+(\d+)\s+shown/.exec(state.countText);
        if (shown) return Number(shown[1]) === state.cards.length;
        const total = /^(\d+)\s+integrations?/.exec(state.countText);
        return total ? Number(total[1]) === state.cards.length : false;
      })(),
      pass:
        clicked &&
        pressed.length === 1 &&
        pressed[0] === label &&
        state.cards.length === expected &&
        state.cards.every((card) => label === "All" || card.category === label),
    });
  }

  // Back to All, then drive the search box.
  await pressChip("All");
  await page.waitForTimeout(200);

  const searchHandle = await page.$("#integration-search");
  const searchTerms = [
    { term: "slack", expect: ["Slack"] },
    { term: "webhook", expect: ["Signed webhooks"] },
    { term: "zzzz", expect: [] },
  ];
  for (const { term, expect } of searchTerms) {
    await searchHandle.click({ clickCount: 3 }).catch(() => {});
    await searchHandle.fill(term).catch(() => {});
    await page.waitForTimeout(320);
    const state = await readGrid();
    const names = state.cards.map((card) => card.name);
    report.search.push({
      term,
      names,
      cardCount: state.cards.length,
      emptyVisible: state.emptyVisible,
      countText: state.countText,
      pass:
        expect.length === 0
          ? state.cards.length === 0 && state.emptyVisible
          : JSON.stringify(names) === JSON.stringify(expect),
    });
  }

  // The empty state's clear action restores the catalog.
  const cleared = await page.evaluate(() => {
    const button = Array.from(
      document.querySelectorAll("section#catalog button"),
    ).find((el) => (el.textContent || "").trim() === "Clear filters");
    if (!button) return false;
    button.click();
    return true;
  });
  await page.waitForTimeout(320);
  const afterClear = await readGrid();
  report.clearAction = {
    clicked: cleared,
    cardCount: afterClear.cards.length,
    inputValue: await page.evaluate(
      () => document.querySelector("#integration-search")?.value ?? null,
    ),
    pass: cleared && afterClear.cards.length === report.initial.cards.length,
  };

  // Content-gate rules.
  report.global = await page.evaluate(() => {
    const text = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const connectControls = Array.from(
      document.querySelectorAll("main button, main a[href]"),
    )
      .filter((el) => /^connect\b/i.test(text(el)))
      .map((el) => text(el));
    const mailto = Array.from(document.querySelectorAll("main a[href^='mailto:']")).map(
      (el) => ({ text: text(el), href: el.getAttribute("href") }),
    );
    const forms = Array.from(document.querySelectorAll("main form")).map((form) => ({
      action: form.getAttribute("action"),
      inputs: form.querySelectorAll("input, textarea, select").length,
    }));
    const headings = Array.from(document.querySelectorAll("h1, h2, h3")).map(
      (el) => el.tagName,
    );
    return {
      connectControls,
      mailto,
      forms,
      h1Count: headings.filter((tag) => tag === "H1").length,
      // The reference's task-manager vocabulary must not appear.
      forbidden: [
        "Forma",
        "Framer",
        "Two-way sync",
        "syncs both ways",
        "Connect",
        "Calendar",
        "Task Tracker",
        "Boards",
        "Available",
        "Beta",
        "Coming soon",
      ].filter((word) => document.body.innerText.includes(word)),
    };
  });

  // Every card is inert, and says so by cursor alone (no pointer, no link).
  report.global.cardsInert = report.initial.cards.every(
    (card) => card.interactive === false && card.cursor !== "pointer",
  );
  report.global.chipCount = report.chips.length;
  report.global.cardCount = report.initial.cards.length;
  report.global.consoleErrors = consoleErrors;

  await context.close();

  report.verdict = {
    sevenCards: report.initial.cards.length === 7,
    chipsFilter: report.chips.length >= 6 && report.chips.every((chip) => chip.pass),
    countsAgree: report.chips.every((chip) => chip.countAgrees),
    searchWorks: report.search.every((entry) => entry.pass),
    clearRestores: report.clearAction.pass,
    cardsInert: report.global.cardsInert,
    noConnectControls: report.global.connectControls.length === 0,
    // Two actions leave the page and both are mailto: — the request card in
    // band 3 and the closing band's "Talk to us" — because roducq has no
    // request endpoint and will not fake one.
    mailtoOnlyOutbound:
      report.global.mailto.length === 2 &&
      report.global.mailto.every((link) =>
        (link.href || "").startsWith("mailto:hello@roducq.dev"),
      ),
    noForms: report.global.forms.length === 0,
    oneH1: report.global.h1Count === 1,
    noForbiddenCopy: report.global.forbidden.length === 0,
    noConsoleErrors: report.global.consoleErrors.length === 0,
  };
  return report;
}

/**
 * The no-JS render of /integrations: with scripts disabled, every card, its
 * copy, the section headings and the filters must still be present and
 * visible, and no hero word may have been pre-hidden.
 */
async function checkIntegrationsNoJs(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL.replace(/\/$/, "")}/integrations`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.9
      );
    };
    const cards = Array.from(
      document.querySelectorAll("section#catalog ul > li"),
    );
    return {
      cardCount: cards.length,
      cardsVisible: cards.filter(visible).length,
      descriptionsVisible: cards.filter((card) => {
        const p = card.querySelector("p");
        return p ? visible(p) : false;
      }).length,
      chips: document.querySelectorAll(
        "section#catalog button[aria-pressed]",
      ).length,
      searchVisible: (() => {
        const input = document.querySelector("#integration-search");
        return input ? visible(input) : false;
      })(),
      h2Count: document.querySelectorAll("h2").length,
      // Section headings and the closing note are plain text, not animated.
      closingNoteVisible: Array.from(document.querySelectorAll("p")).some(
        (p) =>
          (p.textContent || "").includes("no trial clock to watch") && visible(p),
      ),
      heroOpacities: Array.from(
        document.querySelectorAll("h1 .lm-hero-word, h1 .lm-text-gradient"),
      ).map((node) => getComputedStyle(node).opacity),
      // Without JS the shell must NOT have set the pre-hide marker.
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
      catalog: null,
    };

    for (const scenario of scenarios) {
      await phase(route, `lcp.${scenario.key}`, () =>
        runLcpScenario(browser, target, scenario),
      );
    }
    await phase(route, "overflow", () => runOverflowSweep(browser, target));
    await phase(route, "axe", () => runAxe(browser, target));
    await phase(route, "serverHtml", () => checkServerHtml(target));
    if (target.catalog) {
      await phase(route, "catalog", () => runCatalogSuite(browser));
      await phase(route, "noJs", () => checkIntegrationsNoJs(browser));
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
    if (target.catalog) {
      // Every catalog assertion, plus the no-JS render of the same page.
      verdict.catalogSuite =
        Boolean(route.catalog && route.catalog.verdict) &&
        Object.values(route.catalog.verdict).every(Boolean);
      verdict.noJsCatalog = route.noJs
        ? route.noJs.cardCount === 7 &&
          route.noJs.cardsVisible === 7 &&
          route.noJs.descriptionsVisible === 7 &&
          route.noJs.chips === 7 &&
          route.noJs.searchVisible === true &&
          route.noJs.closingNoteVisible === true &&
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
