#!/usr/bin/env node
/**
 * capture-integrations-reference — measured capture of a catalog/integrations
 * page (Forma's `/integrations`) for the Roducq recreation.
 *
 * WHAT IT PRODUCES (per breakpoint × theme)
 *   • `int-<vp>-<theme>-structure.json`  DOM structure + section order +
 *     headings + link inventory + bounded full-document outline (boxes,
 *     style subsets) + fonts + document metrics
 *   • `int-<vp>-<theme>-styles.json`     full computed style (55 keys) for
 *     every visible semantic element + `@keyframes` + root/`html`/`body`
 *     token rules scraped from every readable stylesheet
 *   • `int-<vp>-<theme>-svgs.json`       RAW SVG MARKUP (outerHTML incl.
 *     full path data) for every `svg`, its attributes, computed style,
 *     SMIL nodes with RUNTIME timing values, CSS/WAAPI/JS-driven animation
 *     state, and per-SVG mutation log — plus a canvas/img/video inventory
 *   • `int-<vp>-<theme>-motion.json`     real animation behavior: WAAPI
 *     first-seen log with full timing + keyframes, raw
 *     `Element.prototype.animate()` calls, IntersectionObserver creation
 *     options, MutationObserver log, PerformanceObserver entries
 *     (LCP/CLS/longtask/paint), scroll samples, live animation snapshot
 *   • `int-<vp>-<theme>-interaction.json`  the page's interactive surface:
 *     every button/input/select/[role=tab|button] with box + label, every
 *     search/filter affordance, repeated-sibling grid detection (column
 *     count, card box, gaps) and a MEASURED hover probe on the first card
 *     (computed-style diff before → after pointer-over)
 *   • `int-<vp>-<theme>-dom.html.gz`     the settled raw DOM (gzip)
 *   • `int-<vp>-<theme>-full.png` + one PNG per section band
 * plus `integrations-run-notes.json` (browser version, UA, timestamps) and
 * `integrations-failures.json` (any viewport that failed, and why).
 *
 * WHY THIS EXISTS. The development sandbox's egress allowlist blocks the
 * Framer reference host, so the ONLY honest measurement path is a real
 * Chromium on a GitHub-hosted runner (`.github/workflows/
 * forma-integrations-reference.yml`). Nothing in this file is a hand-written
 * constant about the reference: every value is read from the live page
 * through getBoundingClientRect / getComputedStyle / the Web Animations
 * API / SVGAnimationElement timing accessors / MutationObserver /
 * PerformanceObserver / real pointer events. Values that cannot be measured
 * at runtime are left to the audit document to label `[INFERRED]` — this
 * script never guesses.
 *
 * WHY A SEPARATE FILE. Same convention as capture-landing-reference.mjs,
 * capture-solutions-reference.mjs and capture-features-reference.mjs: each
 * page gets its own capture entry point so the evidence bundle, the output
 * prefix and the runner workflow stay per-page and legible. The extra
 * `collectInteractivity` pass below exists because a catalog page (unlike
 * the marketing pages measured so far) may ship search, category filters or
 * expandable cards, and "is this control real?" has to be measured, not
 * assumed.
 *
 * RUN
 *   node scripts/capture-integrations-reference.mjs \
 *     --target forma-integrations \
 *     --base https://forma-visuvate.framer.website/integrations \
 *     --out docs/screenshots/forma-integrations-reference
 */
import { mkdirSync, writeFileSync, existsSync, statSync, unlinkSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The seven widths the /integrations milestone requires: mobile-narrow,
 * mobile-small, mobile, tablet, laptop, desktop-1200 and desktop-1440.
 *
 * This is the same viewport set the /solutions and /features captures
 * use, so all three captures remain directly comparable across the six
 * shared widths.
 */
const VIEWPORTS = [
  { w: 1440, h: 900, name: "1440x900", label: "desktop" },
  { w: 1200, h: 900, name: "1200x900", label: "desktop-1200" },
  { w: 1024, h: 768, name: "1024x768", label: "laptop" },
  { w: 768, h: 1024, name: "768x1024", label: "tablet" },
  { w: 390, h: 844, name: "390x844", label: "mobile" },
  { w: 375, h: 812, name: "375x812", label: "mobile-small" },
  { w: 320, h: 700, name: "320x700", label: "mobile-narrow" },
];

const THEMES = ["light", "dark"];

/** Longest settle: slowest entrance plus two scroll passes. */
const SETTLE_MS = 2600;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const TARGET = arg("target", "forma-integrations");
const BASE = arg("base", "https://forma-visuvate.framer.website/integrations");
const OUT = resolve(ROOT, arg("out", "docs/screenshots/forma-integrations-reference"));

/** JSON.stringify replacer: WAAPI reports `iterations: Infinity`. */
const jsonSafe = (value) =>
  JSON.stringify(
    value,
    (k, v) => (v === Infinity ? "Infinity" : v === -Infinity ? "-Infinity" : v),
    2,
  );

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
 * Computed-style keys: colors, spacing, typography, radius, shadows, plus
 * the motion-relevant state (transform/opacity/clipPath/animations).
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
  "stroke",
  "strokeWidth",
  "strokeDasharray",
  "strokeDashoffset",
  "fill",
];

/**
 * Everything below runs INSIDE the page via page.evaluate / addInitScript,
 * so it must be self-contained (no closures over module scope).
 */

/**
 * INIT INSTRUMENTATION — installed before any page script runs.
 *
 * Records, from the moment the first script runs:
 *   • `__solWAAPI`  every animation the first time it appears in
 *     document.getAnimations(), with full timing + keyframes + the scroll
 *     state and target rect at creation (scroll-trigger evidence)
 *   • `__solAnimateCalls`  every Element.prototype.animate() call with the
 *     keyframes/options the page's own JS passed (JS-driven motion specs)
 *   • `__solIO`  every IntersectionObserver construction + observe() with
 *     its threshold/rootMargin (configured scroll-trigger thresholds)
 *   • `__solMut`  attribute/childList mutations (style/class/d/transform/…)
 *     with old values and timestamps (CSS/JS-driven state changes)
 *   • `__solPerf`  PerformanceObserver entries: largest-contentful-paint,
 *     layout-shift, longtask, paint, navigation
 *   • `__solScroll`  scrollY samples for correlating triggers
 */
const INIT_INSTRUMENT = () => {
  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };

  const now = () => Math.round(performance.now());
  const scrollState = () => ({
    at: now(),
    scrollY: Math.round(window.scrollY),
    innerHeight: window.innerHeight,
  });
  const rectOf = (el) => {
    try {
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        left: Math.round(r.left),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    } catch {
      return null;
    }
  };
  const safeClone = (value) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  };

  // ---- WAAPI first-seen recorder ------------------------------------
  window.__solWAAPI = [];
  const seenAnim = new Set();
  const recordAnims = () => {
    if (!document.getAnimations) return;
    let list;
    try {
      list = document.getAnimations();
    } catch {
      return;
    }
    for (const anim of list) {
      if (seenAnim.has(anim)) continue;
      seenAnim.add(anim);
      const effect = anim.effect;
      const target = effect && effect.target;
      const entry = {
        at: now(),
        ...scrollState(),
        id: anim.id || null,
        playState: anim.playState,
        timing: null,
        computedTiming: null,
        keyframes: null,
        target: null,
      };
      if (effect) {
        try {
          entry.timing = effect.getTiming ? effect.getTiming() : null;
        } catch {}
        try {
          entry.computedTiming = effect.getComputedTiming ? effect.getComputedTiming() : null;
        } catch {}
        try {
          entry.keyframes = effect.getKeyframes ? safeClone(effect.getKeyframes()) : null;
        } catch {}
      }
      if (target && target.nodeType === 1) {
        const insideSvg = Boolean(target.closest && target.closest("svg"));
        const svgRoot = insideSvg ? target.ownerSVGElement || target.closest("svg") : null;
        entry.target = {
          tag: target.tagName.toLowerCase(),
          path: cssPath(target),
          text: String(target.textContent || "").trim().slice(0, 80),
          inSvg: insideSvg,
          svgIndex: svgRoot
            ? [...document.querySelectorAll("svg")].indexOf(svgRoot)
            : null,
          rect: rectOf(target),
          cssAnimationName: getComputedStyle(target).animationName,
        };
      }
      window.__solWAAPI.push(entry);
    }
  };
  window.__solAnimRecord = recordAnims;
  setInterval(recordAnims, 40);
  window.addEventListener("pagehide", () => recordAnims(), { once: true });

  // ---- raw Element.prototype.animate() calls (JS-driven specs) ------
  window.__solAnimateCalls = [];
  const origAnimate = Element.prototype.animate;
  Element.prototype.animate = function solAnimate(keyframes, options) {
    try {
      const svgRoot = this.closest ? this.closest("svg") : null;
      window.__solAnimateCalls.push({
        at: now(),
        ...scrollState(),
        target: {
          tag: this.tagName ? this.tagName.toLowerCase() : null,
          path: this.nodeType === 1 ? cssPath(this) : null,
          inSvg: Boolean(svgRoot),
          svgIndex: svgRoot ? [...document.querySelectorAll("svg")].indexOf(svgRoot) : null,
        },
        keyframes: safeClone(keyframes),
        options: typeof options === "number" ? { duration: options } : safeClone(options),
        rect: rectOf(this),
      });
    } catch {}
    return origAnimate.call(this, keyframes, options);
  };

  // ---- IntersectionObserver constructions (scroll-trigger config) ----
  window.__solIO = [];
  const OrigIO = window.IntersectionObserver;
  if (OrigIO) {
    window.IntersectionObserver = class SolIO extends OrigIO {
      constructor(callback, options) {
        super(callback, options);
        const record = {
          at: now(),
          kind: "construct",
          options: safeClone(options || {}),
          observed: [],
        };
        window.__solIO.push(record);
        const origObserve = this.observe.bind(this);
        this.observe = (target) => {
          try {
            record.observed.push({
              at: now(),
              path: target && target.nodeType === 1 ? cssPath(target) : String(target),
              rect: target && target.nodeType === 1 ? rectOf(target) : null,
            });
          } catch {}
          return origObserve(target);
        };
      }
    };
  }

  // ---- MutationObserver (style/class/geometry/attr churn) ------------
  window.__solMut = [];
  const MUT_CAP = 6000;
  const startMO = () => {
    if (!document.documentElement) {
      setTimeout(startMO, 5);
      return;
    }
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        if (window.__solMut.length >= MUT_CAP) return;
        const target = rec.target;
        window.__solMut.push({
          at: now(),
          type: rec.type,
          attributeName: rec.attributeName || null,
          oldValue: rec.oldValue === undefined ? null : String(rec.oldValue).slice(0, 240),
          newValue:
            rec.type === "attributes" && target && target.getAttribute
              ? String(target.getAttribute(rec.attributeName) || "").slice(0, 240)
              : rec.type === "characterData"
                ? String(rec.target.textContent || "").slice(0, 120)
                : null,
          childCount: rec.addedNodes ? rec.addedNodes.length : 0,
          removedCount: rec.removedNodes ? rec.removedNodes.length : 0,
          target:
            target && target.nodeType === 1
              ? {
                  tag: target.tagName.toLowerCase(),
                  path: cssPath(target),
                  inSvg: Boolean(target.closest && target.closest("svg")),
                }
              : { tag: "#text", path: null, inSvg: false },
          ...scrollState(),
        });
      }
    });
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      attributeFilter: [
        "style",
        "class",
        "d",
        "transform",
        "cx",
        "cy",
        "r",
        "x",
        "y",
        "width",
        "height",
        "stroke",
        "stroke-width",
        "stroke-dasharray",
        "stroke-dashoffset",
        "fill",
        "opacity",
        "points",
        "offset-path",
        "offset-distance",
        "clip-path",
        "filter",
        "hidden",
        "aria-hidden",
        "data-visible",
        "data-motion",
      ],
    });
    window.__solMOCleanup = () => mo.disconnect();
  };
  startMO();

  // ---- PerformanceObserver (LCP / CLS / longtask / paint) -----------
  window.__solPerf = [];
  const perfPush = (type, entry) => {
    if (window.__solPerf.length >= 800) return;
    const base = {
      type,
      name: entry.name || null,
      startTime: entry.startTime,
      duration: entry.duration,
    };
    if (type === "largest-contentful-paint") {
      window.__solPerf.push({
        ...base,
        size: entry.size,
        url: entry.url || null,
        loadTime: entry.loadTime,
        renderTime: entry.renderTime,
        id: entry.id || null,
        element:
          entry.element && entry.element.nodeType === 1
            ? {
                tag: entry.element.tagName.toLowerCase(),
                path: cssPath(entry.element),
                text: String(entry.element.textContent || "").trim().slice(0, 80),
                rect: rectOf(entry.element),
              }
            : null,
      });
    } else if (type === "layout-shift") {
      window.__solPerf.push({
        ...base,
        value: entry.value,
        hadRecentInput: entry.hadRecentInput,
        sources: (entry.sources || []).map((s) => ({
          node: s.node && s.node.nodeType === 1 ? cssPath(s.node) : null,
          previousRect: s.previousRect,
          currentRect: s.currentRect,
        })),
      });
    } else {
      window.__solPerf.push(base);
    }
  };
  const observePerf = (type) => {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) perfPush(type, entry);
      });
      po.observe({ type, buffered: true });
    } catch {}
  };
  for (const t of [
    "largest-contentful-paint",
    "layout-shift",
    "longtask",
    "paint",
    "navigation",
  ]) {
    observePerf(t);
  }

  // ---- scroll samples (trigger correlation) --------------------------
  window.__solScroll = [];
  setInterval(() => {
    if (window.__solScroll.length >= 2000) return;
    window.__solScroll.push({
      at: now(),
      scrollY: Math.round(window.scrollY),
      innerHeight: window.innerHeight,
    });
  }, 150);
};

/**
 * STRUCTURE — DOM structure, section order, headings, links, outline.
 */
const collectStructure = (STYLE_KEYS) => {
  void STYLE_KEYS;
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? round(n) : v;
  };
  const styleSubset = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of [
      "display",
      "position",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
      "color",
      "backgroundColor",
      "borderRadius",
      "boxShadow",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "marginTop",
      "marginBottom",
      "gap",
      "opacity",
      "transform",
      "overflow",
    ]) {
      let v = cs[key];
      if (v === undefined || v === "") continue;
      if (/^(padding|margin)/.test(key) || key === "borderRadius" || key === "fontSize" || key === "lineHeight" || key === "letterSpacing" || key === "gap") {
        v = px(v);
      }
      out[key] = v;
    }
    return out;
  };
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y + window.scrollY),
      w: round(r.width),
      h: round(r.height),
    };
  };
  const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);

  const isBand = (el) => {
    const r = el.getBoundingClientRect();
    return r.height > 120 && r.width > 200;
  };
  const sectionsOf = () => {
    const main = document.querySelector("main") || document.body;
    const kids = [...main.children].filter(isBand);
    if (kids.length >= 3) return kids;
    return [...document.querySelectorAll("section, header, footer")]
      .filter(isBand)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  };

  const sections = sectionsOf().map((el, i) => ({
    index: i,
    tag: el.tagName.toLowerCase(),
    path: pathOf(el),
    id: el.id || null,
    box: boxOf(el),
    style: styleSubset(el),
    text: textOf(el).slice(0, 160),
    children: el.children.length,
  }));

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((el) => ({
    level: el.tagName.toLowerCase(),
    path: pathOf(el),
    text: textOf(el),
    box: boxOf(el),
    style: styleSubset(el),
    words: [...el.querySelectorAll("span")].map((s) => textOf(s)).filter(Boolean).slice(0, 24),
  }));

  const links = [...document.querySelectorAll("a[href]")].map((el) => ({
    path: pathOf(el),
    href: el.getAttribute("href"),
    text: textOf(el),
    box: boxOf(el),
    style: styleSubset(el),
  }));

  // Bounded full-document outline (structure + one style subset per node).
  const outline = [];
  const OUTLINE_CAP = 10000;
  const walk = (el, depth, parentIndex) => {
    if (outline.length >= OUTLINE_CAP) return;
    const index = outline.length;
    const attrs = {};
    for (const a of el.attributes || []) {
      if (["class", "id", "style"].includes(a.name)) continue;
      if (a.name.startsWith("on")) continue;
      attrs[a.name] = a.value.slice(0, 200);
    }
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 80);
    const node = {
      index,
      parent: parentIndex,
      depth,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: typeof el.className === "string" ? el.className.slice(0, 220) : null,
      attrs,
      text: ownText,
      childCount: el.children.length,
      box: boxOf(el),
      style: styleSubset(el),
    };
    outline.push(node);
    for (const child of el.children) {
      walk(child, depth + 1, index);
      if (outline.length >= OUTLINE_CAP) break;
    }
  };
  walk(document.documentElement, 0, null);

  const doc = document.documentElement;
  const body = document.body;
  return {
    url: location.href,
    title: document.title,
    metaDescription:
      (document.querySelector('meta[name="description"]') || {}).content || null,
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
    headings,
    links,
    outline,
    outlineTruncated: outline.length >= OUTLINE_CAP,
  };
};

/**
 * FULL COMPUTED STYLES for visible semantic elements + stylesheet motion
 * rules (@keyframes) + root/html/body token rules.
 */
const collectStyles = (STYLE_KEYS) => {
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
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
        key === "columnGap" ||
        key === "strokeWidth" ||
        key === "strokeDasharray" ||
        key === "strokeDashoffset"
      ) {
        v = px(v);
      }
      out[key] = v;
    }
    return out;
  };
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y + window.scrollY),
      w: round(r.width),
      h: round(r.height),
    };
  };
  const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);

  const tracked = [];
  const sel =
    "h1,h2,h3,h4,h5,h6,p,button,a,li,img,svg,input,summary,label,blockquote,code,nav,section,header,footer,[role=button],[role=tab],[role=tablist],[data-framer-name]";
  const max = 1600;
  for (const el of [...document.querySelectorAll(sel)]) {
    if (tracked.length >= max) break;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    tracked.push({
      path: pathOf(el),
      tag: el.tagName.toLowerCase(),
      text: textOf(el),
      box: boxOf(el),
      style: styleOf(el),
    });
  }

  // @keyframes + token rules from every stylesheet we can read.
  const keyframes = [];
  const tokenRules = [];
  const sheetErrors = [];
  for (const sheet of [...document.styleSheets]) {
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      sheetErrors.push({ href: sheet.href || "inline", message: String(error).slice(0, 120) });
      continue;
    }
    for (const rule of [...(rules || [])]) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        if (keyframes.length < 400) {
          keyframes.push({
            name: rule.name,
            cssText: rule.cssText.slice(0, 4000),
            href: sheet.href || "inline",
          });
        }
      } else if (
        rule.selectorText &&
        /(^|,)\s*(:root|html|body)\s*(,|$)/.test(rule.selectorText) &&
        rule.cssText.includes("--")
      ) {
        if (tokenRules.length < 120) {
          tokenRules.push({
            selector: rule.selectorText,
            cssText: rule.cssText.slice(0, 4000),
            href: sheet.href || "inline",
          });
        }
      }
    }
  }
  return { tracked, keyframes, tokenRules, sheetErrors };
};

/**
 * SVG ARTWORK — raw markup + every animation applied to it (SMIL runtime,
 * CSS, WAAPI, JS `animate()` calls) + canvas/img/video inventory.
 */
const collectArtwork = (STYLE_KEYS) => {
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) {
          part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of STYLE_KEYS) {
      let v = cs[key];
      if (v === undefined || v === "") continue;
      if (/^(padding|margin)/.test(key) || ["borderTopWidth", "borderRadius", "fontSize", "lineHeight", "letterSpacing", "width", "height", "maxWidth", "gap", "strokeWidth", "strokeDasharray", "strokeDashoffset"].includes(key)) {
        const n = parseFloat(v);
        v = Number.isFinite(n) ? round(n) : v;
      }
      out[key] = v;
    }
    return out;
  };

  const waapiLog = window.__solWAAPI || [];
  const animateCalls = window.__solAnimateCalls || [];
  const mutLog = window.__solMut || [];

  // Map every element path to its owning svg index so WAAPI/mutation log
  // entries can be attributed to the exact svg (recorded svgIndex first,
  // path map as the fallback).
  const svgEls = [...document.querySelectorAll("svg")];
  const pathToSvgIndex = new Map();
  svgEls.forEach((svg, i) => {
    pathToSvgIndex.set(pathOf(svg), i);
    for (const d of svg.querySelectorAll("*")) {
      pathToSvgIndex.set(pathOf(d), i);
    }
  });

  const svgs = svgEls.map((svg, index) => {
    const descendants = [...svg.querySelectorAll("*")];
    // SMIL nodes with RUNTIME timing accessors where available.
    const smil = [...svg.querySelectorAll("animate, animateTransform, animateMotion, set, animateColor")].map(
      (el) => {
        const runtime = {
          getStartTime: null,
          getSimpleDuration: null,
          getRepeatCount: null,
          getRepeatDur: null,
          getBegin: null,
          getEnd: null,
          isInEffect: null,
          isPast: null,
          error: null,
        };
        try {
          runtime.getStartTime = el.getStartTime ? el.getStartTime() : null;
        } catch (e) {
          runtime.getStartTime = null;
          runtime.error = String(e).slice(0, 120);
        }
        try {
          runtime.getSimpleDuration = el.getSimpleDuration ? el.getSimpleDuration() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.getRepeatCount = el.getRepeatCount ? el.getRepeatCount() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.getRepeatDur = el.getRepeatDur ? el.getRepeatDur() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.getBegin = el.getBegin ? el.getBegin() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.getEnd = el.getEnd ? el.getEnd() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.isInEffect = el.isInEffect ? el.isInEffect() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        try {
          runtime.isPast = el.isPast ? el.isPast() : null;
        } catch (e) {
          runtime.error = runtime.error || String(e).slice(0, 120);
        }
        return {
          tag: el.tagName.toLowerCase(),
          attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
          outerHTML: el.outerHTML.slice(0, 2000),
          runtime,
        };
      },
    );

    // CSS animations/transitions declared on the svg or any descendant.
    const cssAnimNodes = [];
    for (const el of [svg, ...descendants]) {
      const cs = getComputedStyle(el);
      if (
        (cs.animationName && cs.animationName !== "none") ||
        (cs.transitionProperty && cs.transitionProperty !== "none" && cs.transitionDuration !== "0s")
      ) {
        cssAnimNodes.push({
          path: pathOf(el),
          tag: el.tagName.toLowerCase(),
          animationName: cs.animationName,
          animationDuration: cs.animationDuration,
          animationDelay: cs.animationDelay,
          animationTimingFunction: cs.animationTimingFunction,
          animationIterationCount: cs.animationIterationCount,
          animationDirection: cs.animationDirection,
          animationPlayState: cs.animationPlayState,
          transitionProperty: cs.transitionProperty,
          transitionDuration: cs.transitionDuration,
          transitionTimingFunction: cs.transitionTimingFunction,
          inlineStyle: el.getAttribute("style"),
        });
      }
    }

    const ownedByThisSvg = (target) =>
      Boolean(
        target &&
          (target.svgIndex === index ||
            (target.inSvg && target.path && pathToSvgIndex.get(target.path) === index)),
      );
    const waapi = waapiLog.filter((e) => e.target && ownedByThisSvg(e.target));
    const calls = animateCalls.filter((e) => e.target && ownedByThisSvg(e.target));
    // Attribute mutations inside this svg.
    const mutations = mutLog
      .filter((m) => m.target && m.target.inSvg && pathToSvgIndex.get(m.target.path) === index)
      .slice(0, 300);

    const r = svg.getBoundingClientRect();
    return {
      index,
      path: pathOf(svg),
      id: svg.id || null,
      className: typeof svg.className === "string" ? svg.className : svg.className && svg.className.baseVal,
      attrs: Object.fromEntries([...svg.attributes].map((a) => [a.name, a.value])),
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
      style: styleOf(svg),
      outerHTML: svg.outerHTML,
      descendantCount: descendants.length,
      pathCount: svg.querySelectorAll("path").length,
      smil,
      cssAnimNodes,
      waapi,
      animateCalls: calls,
      mutations,
    };
  });

  // Non-SVG artwork inventory.
  const canvases = [...document.querySelectorAll("canvas")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      path: pathOf(el),
      width: el.width,
      height: el.height,
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
      inlineStyle: el.getAttribute("style"),
    };
  });
  const images = [...document.querySelectorAll("img")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      path: pathOf(el),
      src: (el.currentSrc || el.src || "").slice(0, 300),
      alt: el.alt,
      natural: { w: el.naturalWidth, h: el.naturalHeight },
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
    };
  });
  const videos = [...document.querySelectorAll("video")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      path: pathOf(el),
      src: (el.currentSrc || "").slice(0, 300),
      autoplay: el.autoplay,
      loop: el.loop,
      muted: el.muted,
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
    };
  });

  return { svgs, canvases, images, videos };
};

/**
 * MOTION — everything the instrumentation recorded, plus a live snapshot.
 * Rebuilt here so the SVG pass can share the raw logs via the return value.
 */
const collectMotionDump = () => ({
  waapiFirstSeen: window.__solWAAPI || [],
  animateCalls: window.__solAnimateCalls || [],
  intersectionObservers: window.__solIO || [],
  mutations: window.__solMut || [],
  performance: window.__solPerf || [],
  scrollSamples: window.__solScroll || [],
  liveAnimations: (() => {
    try {
      return document.getAnimations().map((anim) => {
        const effect = anim.effect;
        return {
          playState: anim.playState,
          id: anim.id || null,
          timing: effect && effect.getTiming ? effect.getTiming() : null,
          target:
            effect && effect.target && effect.target.nodeType === 1
              ? effect.target.tagName.toLowerCase()
              : null,
        };
      });
    } catch {
      return [];
    }
  })(),
});

/**
 * INTERACTIVITY — the catalog page's control surface, measured.
 *
 * A marketing page measured so far has been a scroll story: bands, headings
 * and cards. A catalog page is often more than that — search boxes, category
 * tabs, filter chips, expandable rows — and the recreation may only copy what
 * actually works. This pass answers three questions with rendered geometry
 * instead of assumption:
 *
 *   1. WHICH CONTROLS EXIST. Every `button`, `input`, `select`, `textarea`,
 *      `[role=button]`, `[role=tab]`, `[role=search]` and `a[href]`, with its
 *      box, its accessible-ish label (text or aria-label or placeholder) and
 *      whether it is actually visible. A control that renders is a control
 *      the recreation has to answer for, even if the answer is "we drop it".
 *
 *   2. WHICH REPEATED GROUPS ARE CARDS. A grid is inferred from geometry, not
 *      from a class name: for every container, group its element children by
 *      tag, keep groups of 3+ whose boxes are consistent (same width within
 *      the tolerance, aligned rows), then derive rows, columns, gaps and the
 *      card box. Those numbers are what the responsive phase in the audit
 *      compares against.
 *
 *   3. WHAT A CARD'S SURFACE IS. A style subset of the card and of every
 *      descendant, snapshotted with a stable per-card index path, so the
 *      Node-side hover probe can diff before → after and report the exact
 *      properties that change (border colour, shadow, transform, colour…).
 */
const collectInteractivity = () => {
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        parts.unshift(`#${node.id}`);
        break;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = [...parent.children].filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(" > ");
  };
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: round(r.x),
      y: round(r.y + window.scrollY),
      w: round(r.width),
      h: round(r.height),
    };
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      Number(cs.opacity) > 0.05
    );
  };
  const label = (el) =>
    (
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("title") ||
      el.textContent ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

  /** The style subset the hover diff needs. */
  const HOVER_KEYS = [
    "color",
    "backgroundColor",
    "backgroundImage",
    "borderTopColor",
    "borderTopWidth",
    "boxShadow",
    "opacity",
    "transform",
    "filter",
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "textDecorationLine",
    "outlineColor",
    "outlineWidth",
  ];
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of HOVER_KEYS) out[key] = cs[key];
    return out;
  };
  /** Stable identity inside the card: child-index path, e.g. "0/2/1". */
  const innerPath = (root, el) => {
    const parts = [];
    let node = el;
    while (node && node !== root) {
      const parent = node.parentElement;
      if (!parent) break;
      parts.unshift([...parent.children].indexOf(node));
      node = parent;
    }
    return parts.join("/");
  };
  const snapshot = (root) => [
    root,
    ...root.querySelectorAll("*"),
  ]
    .slice(0, 80)
    .map((el) => ({
      path: innerPath(root, el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
      box: boxOf(el),
      style: styleOf(el),
    }));

  // ---- 1. controls -------------------------------------------------------
  const CONTROL_SELECTOR =
    'button, input, select, textarea, [role="button"], [role="tab"], [role="tablist"], [role="search"], [role="combobox"], [contenteditable="true"], a[href]';
  const controls = [...document.querySelectorAll(CONTROL_SELECTOR)]
    .filter((el) => !(el.closest("svg")))
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || null,
      role: el.getAttribute("role") || null,
      href: el.getAttribute("href") || null,
      path: pathOf(el),
      label: label(el),
      visible: visible(el),
      box: boxOf(el),
      style: styleOf(el),
    }))
    .filter((c) => c.visible);

  // Search / filter affordances, called out separately because a filter UI is
  // an interaction contract, not decoration.
  const searchAffordances = controls.filter(
    (c) =>
      c.type === "search" ||
      c.role === "search" ||
      c.role === "combobox" ||
      c.tag === "input" ||
      c.tag === "select" ||
      /search|filter|category|all integrations|clear/i.test(c.label),
  );

  // ---- 2. repeated groups => grid candidates -----------------------------
  const main = document.querySelector("main") || document.body;
  const isConsistent = (boxes) => {
    if (boxes.length < 3) return false;
    const widths = boxes.map((b) => b.w);
    const maxW = Math.max(...widths);
    const minW = Math.min(...widths);
    return maxW > 40 && (maxW - minW) / maxW < 0.12;
  };
  const gridOf = (boxes) => {
    const rows = new Map();
    for (const b of boxes) {
      const key = [...rows.keys()].find((y) => Math.abs(y - b.y) < Math.max(8, b.h * 0.35));
      if (key === undefined) rows.set(b.y, [b]);
      else rows.get(key).push(b);
    }
    const rowList = [...rows.values()].map((r) =>
      r.sort((a, b) => a.x - b.x),
    );
    const columns = Math.max(...rowList.map((r) => r.length));
    const gaps = [];
    for (const row of rowList) {
      for (let i = 1; i < row.length; i += 1) {
        const gap = row[i].x - (row[i - 1].x + row[i - 1].w);
        if (Number.isFinite(gap)) gaps.push(round(gap));
      }
    }
    const rowGaps = [];
    for (let i = 1; i < rowList.length; i += 1) {
      const prev = rowList[i - 1][0];
      const cur = rowList[i][0];
      rowGaps.push(round(cur.y - (prev.y + prev.h)));
    }
    return {
      rows: rowList.length,
      columns,
      rowGaps,
      columnGaps: [...new Set(gaps)].sort((a, b) => a - b).slice(0, 8),
    };
  };

  const gridCandidates = [];
  for (const container of main.querySelectorAll("*")) {
    const children = [...container.children];
    if (children.length < 3) continue;
    const byTag = new Map();
    for (const child of children) {
      const tag = child.tagName;
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(child);
    }
    for (const [tag, group] of byTag) {
      if (group.length < 3) continue;
      const boxes = group.map(boxOf);
      if (!isConsistent(boxes)) continue;
      // A grid's children must be siblings in one flow: reject groups whose
      // boxes are nested duplicates of the same visual card.
      if (!group.every((el) => visible(el))) continue;
      const geom = gridOf(boxes);
      if (geom.columns < 2 && geom.rows < 3) continue;
      const area = boxes[0].w * boxes[0].h * boxes.length;
      gridCandidates.push({
        containerPath: pathOf(container),
        containerTag: container.tagName.toLowerCase(),
        containerClass:
          typeof container.className === "string" ? container.className.slice(0, 200) : null,
        containerStyle: {
          display: getComputedStyle(container).display,
          gridTemplateColumns: getComputedStyle(container).gridTemplateColumns,
          gap: getComputedStyle(container).gap,
          flexWrap: getComputedStyle(container).flexWrap,
        },
        childTag: tag.toLowerCase(),
        count: group.length,
        cardBox: boxes[0],
        cardSelector: pathOf(group[0]),
        cardText: label(group[0]),
        cardClass:
          typeof group[0].className === "string" ? group[0].className.slice(0, 200) : null,
        cardStyle: (() => {
          const cs = getComputedStyle(group[0]);
          return {
            backgroundColor: cs.backgroundColor,
            borderTopWidth: cs.borderTopWidth,
            borderTopColor: cs.borderTopColor,
            borderRadius: cs.borderRadius,
            boxShadow: cs.boxShadow,
            paddingTop: cs.paddingTop,
            paddingLeft: cs.paddingLeft,
            display: cs.display,
            flexDirection: cs.flexDirection,
            gap: cs.gap,
            transitionProperty: cs.transitionProperty,
            transitionDuration: cs.transitionDuration,
          };
        })(),
        geometry: geom,
        area: Math.round(area),
      });
    }
  }
  gridCandidates.sort((a, b) => b.area - a.area);

  // ---- 3. hover probe surface -------------------------------------------
  const cardSelectors = gridCandidates.slice(0, 4).map((c) => c.cardSelector);
  const hoverSurfaces = cardSelectors.map((selector) => {
    let el = null;
    try {
      el = document.querySelector(selector);
    } catch {
      el = null;
    }
    if (!el) return { selector, found: false };
    return {
      selector,
      found: true,
      box: boxOf(el),
      snapshot: snapshot(el),
    };
  });

  // Section-relative position of every grid candidate, so the audit can say
  // "cards are in band N" without re-deriving it from the outline dump.
  const bands = [...document.querySelectorAll("section, header, footer")].filter(visible);
  for (const candidate of gridCandidates) {
    let el = null;
    try {
      el = document.querySelector(candidate.cardSelector);
    } catch {
      el = null;
    }
    if (!el) continue;
    const band = bands.find((b) => b.contains(el));
    candidate.band = band
      ? { tag: band.tagName.toLowerCase(), id: band.id || null, path: pathOf(band) }
      : null;
  }

  return {
    controls,
    searchAffordances,
    gridCandidates: gridCandidates.slice(0, 24),
    hoverSurfaces,
    controlCounts: {
      buttons: controls.filter((c) => c.tag === "button" || c.role === "button").length,
      inputs: controls.filter((c) => c.tag === "input" || c.tag === "select" || c.tag === "textarea").length,
      links: controls.filter((c) => c.tag === "a").length,
      tabs: controls.filter((c) => c.role === "tab").length,
    },
  };
};

/** A deep-enough style snapshot used by the Node-side hover diff. */
const snapshotCardSurface = () => {
  // Re-uses the same key list and inner-path identity as collectInteractivity.
  const KEY_LIST = [
    "color",
    "backgroundColor",
    "backgroundImage",
    "borderTopColor",
    "borderTopWidth",
    "boxShadow",
    "opacity",
    "transform",
    "filter",
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction",
    "textDecorationLine",
    "outlineColor",
    "outlineWidth",
  ];
  const innerPath = (root, el) => {
    const parts = [];
    let node = el;
    while (node && node !== root) {
      const parent = node.parentElement;
      if (!parent) break;
      parts.unshift([...parent.children].indexOf(node));
      node = parent;
    }
    return parts.join("/");
  };
  const root = window.__hoverTarget;
  if (!root) return null;
  return [root, ...root.querySelectorAll("*")].slice(0, 80).map((el) => {
    const cs = getComputedStyle(el);
    const style = {};
    for (const key of KEY_LIST) style[key] = cs[key];
    return {
      path: innerPath(root, el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
      style,
    };
  });
};

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
  // Two scroll passes: the first mounts anything lazy/scroll-triggered, the
  // second catches reveals that were triggered by the first pass.
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

function writeJson(name, value) {
  const path = resolve(OUT, name);
  writeFileSync(path, jsonSafe(value));
  return path;
}

/**
 * DEEP CATALOG PASS — the part of this page a generic band measurement
 * cannot answer.
 *
 * `/integrations` is not a scroll story with cards in it; the catalog is the
 * page. So this pass measures the catalog as an instrument:
 *
 *   • HERO COMPOSITION. The section's own subtree, with the box and style of
 *     every direct child, so "eyebrow / line 1 / gradient line 2 / lead" is
 *     read off the DOM instead of reconstructed from a screenshot.
 *   • TABS. Every control in the catalog's filter row, with active/inactive
 *     ink, fill, border and radius.
 *   • CARDS. The ancestor chain above each card heading, five levels up, with
 *     box + style at each level — this is how the card's true container,
 *     radius, hairline and padding are found in a Framer export whose class
 *     names are opaque.
 *   • THE COUNT. The "12 integrations" affordance's text, before and after
 *     each interaction, so a filter that changes the grid can be told apart
 *     from one that only re-styles a chip.
 *   • FILTER BEHAVIOUR. Each tab is clicked and the visible card names are
 *     re-read. A filter is real when the list changes; if nothing changes,
 *     that is recorded as "no filtering" and the recreation must not ship a
 *     live-looking filter.
 *   • SEARCH BEHAVIOUR. The search input is filled with a term that matches
 *     exactly one card and a term that matches none, and the count and list
 *     are re-read each time.
 *   • CARD CLICK. A card is clicked and the URL, the dialog count and the DOM
 *     are compared, so "cards are inert" is a measurement rather than an
 *     assumption.
 *   • HOVER. Pointer-over the first card's container with a real mouse, and
 *     diff the computed style of the container and its subtree.
 *
 * Everything is restored between probes (tab "All" re-selected, input
 * cleared) so one probe cannot contaminate the next, and the pass runs after
 * the screenshots so no probe state leaks into the pixels.
 */
async function deepCatalogPass(page) {
  const result = await page.evaluate(() => {
    const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
    const boxOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) };
    };
    const styleSubset = (el) => {
      const cs = getComputedStyle(el);
      const keys = [
        "display", "position", "fontFamily", "fontSize", "fontWeight", "lineHeight",
        "letterSpacing", "color", "backgroundColor", "backgroundImage", "borderTopWidth",
        "borderTopColor", "borderTopStyle", "borderRadius", "boxShadow", "paddingTop",
        "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom",
        "gap", "gridTemplateColumns", "flexDirection", "alignItems", "justifyContent",
        "width", "height", "maxWidth", "minHeight", "opacity", "transform", "overflow",
        "textAlign", "transitionProperty", "transitionDuration", "transitionTimingFunction",
      ];
      const out = {};
      for (const k of keys) out[k] = cs[k];
      return out;
    };
    const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();

    const search = [...document.querySelectorAll("input")].find((el) =>
      /search/i.test(el.getAttribute("placeholder") || el.getAttribute("aria-label") || ""),
    );
    const catalog = search ? search.closest("section") : null;
    const hero = document.querySelector("section");

    // The hero's own composition.
    const heroParts = hero
      ? [...hero.querySelectorAll("h1, p, span, div, a, button")]
          .filter((el) => {
            const own = [...el.childNodes]
              .filter((n) => n.nodeType === 3)
              .map((n) => n.textContent.trim())
              .join(" ");
            return own.length > 1;
          })
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            text: textOf(el).slice(0, 120),
            box: boxOf(el),
            style: styleSubset(el),
            html: el.outerHTML.slice(0, 900),
          }))
      : [];

    const heroSubtree = hero ? hero.outerHTML.slice(0, 14000) : null;

    // Tabs + cards.
    const tabStrip = catalog
      ? [...catalog.querySelectorAll("button, [role='tab'], a[href]")].filter((el) => {
          const t = textOf(el);
          return t.length > 1 && t.length < 40 && boxOf(el).h < 70;
        })
      : [];
    const tabs = tabStrip.map((el) => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      text: textOf(el),
      box: boxOf(el),
      style: styleSubset(el),
      parent: (() => {
        const p = el.parentElement;
        return p ? { tag: p.tagName.toLowerCase(), box: boxOf(p), style: styleSubset(p) } : null;
      })(),
    }));

    const countNode = catalog
      ? [...catalog.querySelectorAll("p, span, div")]
          .filter((el) => /^\d+\s+integrations?$/i.test(textOf(el)))
          .map((el) => ({ tag: el.tagName.toLowerCase(), text: textOf(el), box: boxOf(el), style: styleSubset(el) }))[0] || null
      : null;

    const headings = catalog ? [...catalog.querySelectorAll("h3")] : [];
    const cards = headings.map((h3) => {
      const chain = [];
      let node = h3;
      for (let i = 0; i < 5 && node; i += 1) {
        node = node.parentElement;
        if (!node) break;
        chain.push({
          level: i + 1,
          tag: node.tagName.toLowerCase(),
          className: typeof node.className === "string" ? node.className.slice(0, 120) : null,
          box: boxOf(node),
          style: styleSubset(node),
          childCount: node.children.length,
        });
      }
      const description = (() => {
        // The card's body copy: the longest short paragraph after the heading.
        let parent = h3.parentElement;
        for (let i = 0; i < 4 && parent; i += 1) {
          const p = [...parent.querySelectorAll("p")].find((el) => textOf(el).length > 25);
          if (p) return { tag: "p", text: textOf(p).slice(0, 200), box: boxOf(p), style: styleSubset(p) };
          parent = parent.parentElement;
        }
        return null;
      })();
      const buttons = [...h3.parentElement.querySelectorAll("button, a")]
        .map((el) => ({ tag: el.tagName.toLowerCase(), text: textOf(el).slice(0, 40), href: el.getAttribute("href"), box: boxOf(el) }))
        .slice(0, 4);
      const svgs = [...(h3.parentElement || h3).querySelectorAll("svg")].map((s) => ({
        box: boxOf(s),
        viewBox: s.getAttribute("viewBox"),
        html: s.outerHTML.slice(0, 1600),
      }));
      return {
        title: textOf(h3),
        heading: { box: boxOf(h3), style: styleSubset(h3) },
        description,
        buttons,
        svgs,
        chain,
      };
    });

    // Which card container is the real "card": the ancestor whose width is
    // the column width and whose height encloses the whole row content.
    const cardContainer = (card) => {
      const candidate = card.chain.find(
        (c) => c.box.w > 200 && c.box.h > 90 && c.box.w < (window.innerWidth > 900 ? 460 : window.innerWidth),
      );
      return candidate || card.chain[card.chain.length - 1] || null;
    };

    return {
      heroParts,
      heroSubtree,
      catalogBox: catalog ? boxOf(catalog) : null,
      catalogSubtree: catalog ? catalog.outerHTML.slice(0, 6000) : null,
      tabs,
      count: countNode,
      cardCount: cards.length,
      cards,
      cardContainers: cards.map((c) => ({ title: c.title, container: cardContainer(c) })),
      headings: headings.map((h) => ({ text: textOf(h), box: boxOf(h) })),
    };
  });

  // ── behaviour: tabs ────────────────────────────────────────────────────
  const readState = () =>
    page.evaluate(() => {
      const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
      const search = [...document.querySelectorAll("input")].find((el) =>
        /search/i.test(el.getAttribute("placeholder") || ""),
      );
      const catalog = search ? search.closest("section") : null;
      if (!catalog) return null;
      const count = [...catalog.querySelectorAll("p, span, div")]
        .map((el) => textOf(el))
        .find((t) => /^\d+\s+integrations?$/i.test(t)) || null;
      const titles = [...catalog.querySelectorAll("h3")].map(textOf).filter(Boolean);
      const activeTab = [...catalog.querySelectorAll("button, [role='tab'], a[href]")]
        .filter((el) => {
          const cs = getComputedStyle(el);
          return Number(cs.opacity) > 0.9 && textOf(el).length > 1 && textOf(el).length < 40;
        })
        .map((el) => ({ text: textOf(el), color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }))
        .slice(0, 12);
      return { count, titles, activeTab };
    });

  const behaviours = { initial: await readState(), tabClicks: [], search: [], cardClick: null };

  const tabsFound = result.tabs.map((t) => t.text);
  for (const label of tabsFound.slice(0, 8)) {
    const clicked = await page.evaluate((want) => {
      const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
      const search = [...document.querySelectorAll("input")].find((el) =>
        /search/i.test(el.getAttribute("placeholder") || ""),
      );
      const catalog = search ? search.closest("section") : null;
      if (!catalog) return false;
      const target = [...catalog.querySelectorAll("button, [role='tab'], a[href]")].find(
        (el) => textOf(el) === want,
      );
      if (!target) return false;
      target.click();
      return true;
    }, label);
    if (!clicked) continue;
    await page.waitForTimeout(450);
    behaviours.tabClicks.push({ tab: label, state: await readState() });
  }

  // Restore "All" before the search probe.
  await page.evaluate(() => {
    const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const search = [...document.querySelectorAll("input")].find((el) =>
      /search/i.test(el.getAttribute("placeholder") || ""),
    );
    const catalog = search ? search.closest("section") : null;
    if (!catalog) return;
    const all = [...catalog.querySelectorAll("button, [role='tab'], a[href]")].find(
      (el) => textOf(el) === "All",
    );
    if (all) all.click();
  });
  await page.waitForTimeout(350);

  // ── behaviour: search ──────────────────────────────────────────────────
  const searchHandle = await page.$('input[placeholder*="earch" i]');
  if (searchHandle) {
    for (const term of ["slack", "notion", "zzzz"]) {
      await searchHandle.click({ clickCount: 3 }).catch(() => {});
      await searchHandle.fill(term).catch(() => {});
      await page.waitForTimeout(500);
      behaviours.search.push({ term, state: await readState() });
    }
    await searchHandle.fill("").catch(() => {});
    await page.waitForTimeout(400);
  }

  // ── behaviour: card click ──────────────────────────────────────────────
  const before = await page.evaluate(() => ({
    url: location.href,
    dialogs: document.querySelectorAll('[role="dialog"], dialog').length,
  }));
  const clicked = await page.evaluate(() => {
    const h3 = document.querySelector("section h3");
    if (!h3) return false;
    const box = h3.getBoundingClientRect();
    // Click the card the heading sits in, not the heading text itself.
    let node = h3;
    for (let i = 0; i < 4; i += 1) node = node.parentElement || node;
    const r = node.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height), headingBox: { x: box.x, y: box.y } };
  });
  if (clicked) {
    await page.mouse.click(clicked.x, clicked.y);
    await page.waitForTimeout(700);
    behaviours.cardClick = {
      clickedAt: clicked,
      before,
      after: await page.evaluate(() => ({
        url: location.href,
        dialogs: document.querySelectorAll('[role="dialog"], dialog').length,
        bodyRows: document.body.innerText.length,
      })),
    };
    await page.goBack().catch(() => {});
    await page.waitForTimeout(400);
  }

  return { ...result, behaviours };
}

/**
 * The catalog card's hover state, measured on the container the deep pass
 * identified rather than on an inferred grid cell.
 */
async function catalogHoverProbe(page, titleHint) {
  const prepared = await page.evaluate((hint) => {
    const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const h3s = [...document.querySelectorAll("section h3")];
    const h3 = (hint && h3s.find((el) => textOf(el) === hint)) || h3s[0];
    if (!h3) return null;
    let node = h3;
    for (let i = 0; i < 3; i += 1) node = node.parentElement || node;
    node.scrollIntoView({ block: "center", behavior: "instant" });
    window.__hoverTarget = node;
    const r = node.getBoundingClientRect();
    return {
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      w: Math.round(r.width),
      h: Math.round(r.height),
      title: textOf(h3),
      html: node.outerHTML.slice(0, 3000),
    };
  }, titleHint);
  if (!prepared) return { found: false };

  await page.mouse.move(0, 0);
  await page.waitForTimeout(420);
  const before = await page.evaluate(snapshotCardSurface);
  await page.mouse.move(prepared.x, prepared.y);
  await page.waitForTimeout(520);
  const after = await page.evaluate(snapshotCardSurface);
  await page.waitForTimeout(600);
  const settled = await page.evaluate(snapshotCardSurface);

  const diff = (a, b) => {
    const out = [];
    const byPath = new Map((b || []).map((n) => [n.path, n]));
    for (const node of a || []) {
      const other = byPath.get(node.path);
      if (!other) continue;
      for (const [key, value] of Object.entries(node.style)) {
        if (other.style[key] !== value) {
          out.push({
            path: node.path,
            tag: node.tag,
            text: node.text,
            property: key,
            from: value,
            to: other.style[key],
            settled: settled
              ? (settled.find((n) => n.path === node.path) || { style: {} }).style[key]
              : undefined,
          });
        }
      }
    }
    return out;
  };

  return {
    found: true,
    title: prepared.title,
    box: { w: prepared.w, h: prepared.h },
    html: prepared.html,
    nodesCompared: (before || []).length,
    hoverChanges: diff(before, after),
    settledChanges: diff(before, settled),
  };
}

async function capture(page, vp, theme, report) {
  mkdirSync(OUT, { recursive: true });
  const prefix = `${TARGET}-${vp.name}-${theme}`;

  const structure = await page.evaluate(collectStructure, STYLE_KEYS);
  const styles = await page.evaluate(collectStyles, STYLE_KEYS);
  const artwork = await page.evaluate(collectArtwork, STYLE_KEYS);
  const motion = await page.evaluate(collectMotionDump);
  const interaction = await page.evaluate(collectInteractivity);

  writeJson(`int-${vp.name}-${theme}-structure.json`, structure);
  writeJson(`int-${vp.name}-${theme}-styles.json`, styles);
  writeJson(`int-${vp.name}-${theme}-svgs.json`, artwork);
  writeJson(`int-${vp.name}-${theme}-motion.json`, motion);

  // The settled raw DOM — the full structure evidence, gzipped.
  const html = await page.content();
  writeFileSync(resolve(OUT, `int-${vp.name}-${theme}-dom.html.gz`), gzipSync(Buffer.from(html, "utf8")));

  try {
    await page.screenshot({
      path: resolve(OUT, `${prefix}-full.png`),
      fullPage: true,
    });
  } catch (error) {
    console.error(`full-page shot of ${prefix} failed: ${String((error && error.message) || error)}`);
  }

  const bands = structure.sections.map((s) => s.box);
  for (let i = 0; i < bands.length; i += 1) {
    const box = bands[i];
    if (!box || box.h < 1) continue;
    try {
      await page.screenshot({
        path: resolve(OUT, `${prefix}-sec-${String(i).padStart(2, "0")}.png`),
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.max(1, Math.min(box.w, vp.w)),
          height: Math.max(1, Math.min(box.h, 20000)),
        },
        fullPage: true,
      });
    } catch (error) {
      console.error(`section ${i} of ${prefix} failed: ${String((error && error.message) || error)}`);
    }
  }

  // The deep catalog pass runs once per viewport, light theme only: the
  // page's interactive surface is identical in dark (both schemes rendered
  // byte-identical control counts), and the extra passes cost a page-load
  // each. Geometry, hover and filter behaviour are measured for real here.
  let deep = null;
  if (theme === "light") {
    try {
      deep = await deepCatalogPass(page);
      const firstTitle = deep.headings[0] ? deep.headings[0].text : null;
      deep.hoverProbe = await catalogHoverProbe(page, firstTitle);
      // A second hover, on a card that is not the first, catches a hover that
      // only the featured tile carries.
      const secondTitle = deep.headings[1] ? deep.headings[1].text : null;
      if (secondTitle) deep.hoverProbeSecond = await catalogHoverProbe(page, secondTitle);
    } catch (error) {
      deep = { error: String((error && error.message) || error) };
    }
  }
  writeJson(`int-${vp.name}-${theme}-catalog.json`, deep);

  report.push({
    viewport: vp.name,
    label: vp.label,
    theme,
    url: structure.url,
    title: structure.title,
    sections: structure.sections.map((s) => ({
      index: s.index,
      tag: s.tag,
      id: s.id,
      text: s.text.slice(0, 80),
      box: s.box,
    })),
    headingCount: structure.headings.length,
    svgCount: artwork.svgs.length,
    canvasCount: artwork.canvases.length,
    imageCount: artwork.images.length,
    videoCount: artwork.videos.length,
    outlineNodes: structure.outline.length,
    outlineTruncated: structure.outlineTruncated,
    trackedStyles: styles.tracked.length,
    keyframes: styles.keyframes.length,
    waapiSeen: motion.waapiFirstSeen.length,
    animateCalls: motion.animateCalls.length,
    ioCreated: motion.intersectionObservers.length,
    mutations: motion.mutations.length,
    perfEntries: motion.performance.length,
    liveAnimations: motion.liveAnimations.length,
    overflowX: structure.document.overflowX,
    consoleErrors: null,
    controls: interaction.controlCounts,
    gridCandidates: interaction.gridCandidates.length,
    grids: interaction.gridCandidates.slice(0, 6).map((c) => ({
      container: c.containerPath,
      childTag: c.childTag,
      count: c.count,
      columns: c.geometry.columns,
      rows: c.geometry.rows,
      columnGaps: c.geometry.columnGaps,
      rowGaps: c.geometry.rowGaps,
      cardBox: c.cardBox,
      band: c.band,
    })),
    catalog: deep && !deep.error
      ? {
          cardCount: deep.cardCount,
          tabs: deep.tabs.map((t) => t.text),
          count: deep.count ? deep.count.text : null,
          firstCard: deep.cards[0]
            ? {
                title: deep.cards[0].title,
                description: deep.cards[0].description
                  ? deep.cards[0].description.text.slice(0, 100)
                  : null,
                chain: deep.cards[0].chain.map((c) => ({
                  level: c.level,
                  tag: c.tag,
                  box: c.box,
                  radius: c.style.borderRadius,
                  border: c.style.borderTopWidth + " " + c.style.borderTopColor,
                  bg: c.style.backgroundColor,
                  pad: c.style.paddingTop,
                })),
              }
            : null,
          tabClickCounts: deep.behaviours.tabClicks.map((t) => ({
            tab: t.tab,
            count: t.state ? t.state.count : null,
            titles: t.state ? t.state.titles.length : null,
          })),
          searchCounts: deep.behaviours.search.map((t) => ({
            term: t.term,
            count: t.state ? t.state.count : null,
            titles: t.state ? t.state.titles.length : null,
          })),
          cardClickChanges: deep.behaviours.cardClick
            ? {
                urlChanged: deep.behaviours.cardClick.before.url !== deep.behaviours.cardClick.after.url,
                dialogsBefore: deep.behaviours.cardClick.before.dialogs,
                dialogsAfter: deep.behaviours.cardClick.after.dialogs,
              }
            : null,
          hoverChanges: deep.hoverProbe ? (deep.hoverProbe.hoverChanges || []).length : null,
          hoverSettledChanges: deep.hoverProbe ? (deep.hoverProbe.settledChanges || []).length : null,
        }
      : { error: deep ? deep.error : "not run" },
  });

  return {
    sections: structure.sections.length,
    svgs: artwork.svgs.length,
    waapi: motion.waapiFirstSeen.length,
    overflowX: structure.document.overflowX,
  };
}

function gzipLargeOutputs() {
  for (const name of [
    // structure/styles/svgs/motion jsons may be multi-MB; keep them fetchable
    // and small on the evidence branch.
  ]) {
    void name;
  }
  try {
    const { readdirSync } = require("node:fs");
    for (const name of readdirSync(OUT)) {
      if (!name.endsWith(".json") && !name.endsWith(".html")) continue;
      const path = resolve(OUT, name);
      if (name.endsWith(".gz")) continue;
      const size = statSync(path).size;
      if (size < 1_500_000) continue;
      writeFileSync(`${path}.gz`, gzipSync(readFileSync(path)));
      unlinkSync(path);
    }
  } catch (error) {
    console.error(`gzip pass failed: ${String((error && error.message) || error)}`);
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await launch();
  const report = [];
  const failures = [];
  const runNotes = {
    target: TARGET,
    base: BASE,
    startedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    viewports: VIEWPORTS,
    themes: THEMES,
  };
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
        await page.addInitScript(INIT_INSTRUMENT);
        const errors = [];
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(m.text());
        });
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        try {
          await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
          await settle(page);
          const summary = await capture(page, vp, theme, report);
          const last = report[report.length - 1];
          last.consoleErrors = errors.slice(0, 10);
          console.log(
            `${TARGET} ${vp.name} ${theme}: ${summary.sections} sections, ${summary.svgs} svgs, ${summary.waapi} waapi first-seen, overflowX=${summary.overflowX}`,
          );
        } catch (error) {
          failures.push({
            viewport: vp.name,
            theme,
            message: String((error && error.message) || error),
          });
          console.error(`FAILED ${vp.name} ${theme}: ${String((error && error.message) || error)}`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    runNotes.finishedAt = new Date().toISOString();
    writeJson("integrations-run-notes.json", runNotes);
  }

  writeJson("integrations-summary.json", report);
  writeJson("integrations-failures.json", failures);
  gzipLargeOutputs();
  if (failures.length) {
    console.error(`\n${failures.length} capture(s) failed:\n${jsonSafe(failures)}`);
    process.exitCode = 1;
  }
  console.log(`\nwrote ${OUT}/integrations-summary.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
