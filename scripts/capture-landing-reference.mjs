#!/usr/bin/env node
/**
 * capture-landing-reference — measured side-by-side capture of two landing pages.
 *
 * WHAT IT PRODUCES (per target, per viewport, per theme)
 *   • `<label>-<w>x<h>-<theme>-full.png`      full-page screenshot
 *   • `<label>-<w>x<h>-<theme>-sec-<i>.png`   one screenshot per landing section
 *   • `<label>-metrics.json`                  measured geometry + computed styles
 *   • `<label>-animations.json`               real Web-Animations timing dump
 *
 * WHY THIS EXISTS. The sandbox that develops this repository cannot reach
 * `forma-visuvate.framer.website` (its egress allowlist blocks the Framer
 * host), and the reference cannot be measured by reading its source: Framer
 * ships its animation specs in runtime bundles, not in the SSR HTML. The
 * only way to obtain *measured* reference values is to run a real browser on
 * a machine that can reach the host. This script is that browser harness; it
 * is run from CI (`.github/workflows/forma-reference.yml`) and its output is
 * the evidence behind `docs/FORMA_FINAL_FIDELITY_AUDIT.md`.
 *
 * IT MEASURES, IT DOES NOT GUESS. Every number in the output JSON comes from
 * `getBoundingClientRect()` or `getComputedStyle()` on a live page, and
 * every duration comes from `document.getAnimations()` / the Web Animations
 * timing model. Nothing here is a hand-written constant.
 *
 * RUN
 *   node scripts/capture-landing-reference.mjs \
 *     --target forma  --base https://forma-visuvate.framer.website/ \
 *     --out docs/screenshots/forma-reference
 *   node scripts/capture-landing-reference.mjs \
 *     --target roducq --base http://127.0.0.1:3000 \
 *     --out docs/screenshots/forma-reference
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The viewport set this milestone is verified against. */
const VIEWPORTS = [
  { w: 1440, h: 900, name: "1440x900" },
  { w: 1024, h: 768, name: "1024x768" },
  { w: 768, h: 1024, name: "768x1024" },
  { w: 390, h: 844, name: "390x844" },
  { w: 375, h: 812, name: "375x812" },
  { w: 320, h: 700, name: "320x700" },
];

const THEMES = ["light", "dark"];

/** Longest settle: the reference's slowest entrance plus a scroll pass. */
const SETTLE_MS = 2600;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const TARGET = arg("target", "page");
const BASE = arg("base", "http://127.0.0.1:3000");
const OUT = resolve(ROOT, arg("out", "docs/screenshots/forma-reference"));

async function launch() {
  const { chromium } = require("playwright-core");
  const options = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
      "--hide-scrollbars",
    ],
  };
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    options.executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  }
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

/**
 * A compact computed-style record for one element.
 */
const STYLE_KEYS = [
  "display",
  "position",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "color",
  "backgroundColor",
  "backgroundImage",
  "borderTopWidth",
  "borderTopColor",
  "borderTopStyle",
  "borderRadius",
  "boxShadow",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginBottom",
  "gap",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "width",
  "height",
  "maxWidth",
  "opacity",
  "transform",
  "transitionDuration",
  "transitionTimingFunction",
  "transitionProperty",
  "animationName",
  "animationDuration",
  "animationDelay",
  "animationTimingFunction",
  "animationIterationCount",
  "overflow",
  "zIndex",
  "mixBlendMode",
  "filter",
  "backdropFilter",
  "maskImage",
  "clipPath",
  "textAlign",
  "textWrap",
  "webkitLineClamp",
  "aspectRatio",
  "objectFit",
];

/**
 * The landing "sections": direct children of the main content root that are
 * tall enough to be a band. This works for a Framer site and for a Next.js
 * page without hard-coding either one's class names, which is the whole
 * point — the reference's class names are generated and change between
 * builds.
 *
 * NOTE: everything that runs inside `page.evaluate` must be self-contained:
 * the function is serialised and evaluated in the page, so it cannot close
 * over module scope.
 */
const collectMetrics = (STYLE_KEYS) => {
  /** Short, stable-ish path to an element, for cross-run matching. */
  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter(
          (c) => c.tagName === node.tagName,
        );
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const isBand = (el) => {
    const r = el.getBoundingClientRect();
    return r.height > 160 && r.width > 200;
  };
  const sectionsOf = () => {
    const main = document.querySelector("main") || document.body;
    const kids = [...main.children].filter(isBand);
    if (kids.length >= 4) return kids;
    return [...document.querySelectorAll("section, header, footer")]
      .filter(isBand)
      .sort(
        (a, b) =>
          a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      );
  };

  const round = (n) =>
    typeof n === "number" ? Math.round(n * 100) / 100 : n;
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? round(n) : v;
  };

  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of STYLE_KEYS) {
      let v = cs[key];
      if (v === undefined || v === "") continue;
      if (
        key.startsWith("padding") ||
        key.startsWith("margin") ||
        key === "borderTopWidth" ||
        key === "borderRadius" ||
        key === "fontSize" ||
        key === "lineHeight" ||
        key === "letterSpacing" ||
        key === "width" ||
        key === "height" ||
        key === "maxWidth" ||
        key === "gap" ||
        key === "rowGap" ||
        key === "columnGap"
      ) {
        v = px(v);
      }
      out[key] = v;
    }
    return out;
  };

  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y + window.scrollY),
      w: round(r.width),
      h: round(r.height),
    };
  };

  const textOf = (el) =>
    (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);

  const sections = sectionsOf().map((el, i) => ({
    index: i,
    tag: el.tagName.toLowerCase(),
    path: cssPath(el),
    box: box(el),
    style: styleOf(el),
    text: textOf(el).slice(0, 120),
    children: el.children.length,
  }));

  // Headings, paragraphs, buttons, links, lists, images, inputs.
  const tracked = [];
  const sel =
    "h1,h2,h3,h4,h5,h6,p,button,a,li,img,svg,input,summary,label,blockquote,code";
  const max = 900;
  for (const el of [...document.querySelectorAll(sel)]) {
    if (tracked.length >= max) break;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    tracked.push({
      path: cssPath(el),
      tag: el.tagName.toLowerCase(),
      text: textOf(el),
      box: box(el),
      style: styleOf(el),
    });
  }

  const doc = document.documentElement;
  const body = document.body;
  return {
    url: location.href,
    title: document.title,
    theme: doc.classList.contains("dark") ? "dark" : "light",
    viewport: { w: window.innerWidth, h: window.innerHeight },
    document: {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      scrollHeight: doc.scrollHeight,
      overflowX: doc.scrollWidth - doc.clientWidth,
      bodyBg: getComputedStyle(body).backgroundColor,
      bodyFont: getComputedStyle(body).fontFamily,
    },
    fonts: (() => {
      const seen = new Map();
      for (const el of document.querySelectorAll("h1,h2,h3,p,span,a,button")) {
        const f = getComputedStyle(el).fontFamily;
        if (f) seen.set(f, (seen.get(f) || 0) + 1);
      }
      return [...seen.entries()].map(([family, count]) => ({ family, count }));
    })(),
    sections,
    elements: tracked,
  };
};

/**
 * Real animation timing, read from the Web Animations API. This is the only
 * honest way to read a Framer site's motion: Framer drives its reveals
 * through WAAPI, so `document.getAnimations()` reports the real duration,
 * delay, easing and iteration count of whatever is actually running.
 */
const collectAnimations = () => {
  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 5) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter(
          (c) => c.tagName === node.tagName,
        );
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const out = [];
  for (const anim of document.getAnimations()) {
    const t = anim.effect && anim.effect.getTiming ? anim.effect.getTiming() : {};
    const target = anim.effect && anim.effect.target;
    let name = null;
    let computed = null;
    if (target && target.nodeType === 1) {
      const cs = getComputedStyle(target);
      name = cs.animationName && cs.animationName !== "none" ? cs.animationName : null;
      computed = {
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        animationDelay: cs.animationDelay,
        animationTimingFunction: cs.animationTimingFunction,
        animationIterationCount: cs.animationIterationCount,
        transitionDuration: cs.transitionDuration,
        transitionTimingFunction: cs.transitionTimingFunction,
        transitionProperty: cs.transitionProperty,
      };
    }
    out.push({
      path: target && target.nodeType === 1 ? cssPath(target) : null,
      tag: target && target.nodeType === 1 ? target.tagName.toLowerCase() : null,
      cssName: name,
      duration: t.duration ?? null,
      delay: t.delay ?? null,
      easing: t.easing ?? null,
      iterations: t.iterations ?? null,
      fill: t.fill ?? null,
      direction: t.direction ?? null,
      playState: anim.playState,
      currentTime: anim.currentTime,
      computed,
    });
  }
  return out;
};

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
  // Two scroll passes: the first mounts anything lazy, the second catches
  // reveals that were triggered by the first pass.
  const scrollPass = () =>
    page.evaluate(async () => {
      const step = Math.max(240, Math.round(window.innerHeight * 0.6));
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 120));
    });
  await scrollPass();
  await page.waitForTimeout(900);
  await scrollPass();
  await page.waitForTimeout(1400);
}

async function capture(page, { w, h, name }, theme, report) {
  const dir = OUT;
  mkdirSync(dir, { recursive: true });

  const metrics = await page.evaluate(collectMetrics, STYLE_KEYS);
  const animations = await page.evaluate(collectAnimations);

  const prefix = `${TARGET}-${name}-${theme}`;
  await page.screenshot({
    path: resolve(dir, `${prefix}-full.png`),
    fullPage: true,
  });

  // Section boxes are read in PAGE coordinates, because a full-page
  // screenshot's clip box is page-relative, not viewport-relative.
  const sections = await page.evaluate(() => {
    const isBand = (el) => {
      const r = el.getBoundingClientRect();
      return r.height > 160 && r.width > 200;
    };
    const main = document.querySelector("main") || document.body;
    const kids = [...main.children].filter(isBand);
    const bands =
      kids.length >= 4
        ? kids
        : [...document.querySelectorAll("section, header, footer")].filter(isBand);
    return bands.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x + window.scrollX,
        y: r.y + window.scrollY,
        width: r.width,
        height: r.height,
      };
    });
  });

  for (let i = 0; i < sections.length; i += 1) {
    const box = sections[i];
    if (!box || box.height < 1) continue;
    await page.screenshot({
      path: resolve(dir, `${prefix}-sec-${String(i).padStart(2, "0")}.png`),
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.max(1, Math.min(box.width, page.viewportSize().width)),
        height: Math.max(1, Math.min(box.height, 20000)),
      },
      fullPage: true,
    });
  }

  report.push({ target: TARGET, viewport: name, theme, ...metrics });
  report.animations.push({
    target: TARGET,
    viewport: name,
    theme,
    animations,
  });
  return { sections: sections.length, animations: animations.length };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const report = [];
  report.animations = [];
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of THEMES) {
        const context = await browser.newContext({
          viewport: { width: vp.w, height: vp.h },
          colorScheme: theme,
          reducedMotion: "no-preference",
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        const errors = [];
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        await page.goto(BASE, { waitUntil: "load", timeout: 90000 });
        await settle(page);
        const summary = await capture(page, vp, theme, report);
        const last = report[report.length - 1];
        last.consoleErrors = errors.slice(0, 10);
        console.log(
          `${TARGET} ${vp.name} ${theme}: ${summary.sections} sections, ${summary.animations} animations, overflow=${last.document.overflowX}`,
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(
    resolve(OUT, `${TARGET}-metrics.json`),
    JSON.stringify(report, null, 2),
  );
  writeFileSync(
    resolve(OUT, `${TARGET}-animations.json`),
    JSON.stringify(report.animations, null, 2),
  );
  console.log(`\nwrote ${OUT}/${TARGET}-metrics.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
