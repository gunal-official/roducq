#!/usr/bin/env node
/**
 * capture-solutions-reference — measured capture of a role/use-case page
 * (Forma's `/solutions`) for the Roducq recreation.
 *
 * WHAT IT PRODUCES (per breakpoint × theme)
 *   • `sol-<vp>-<theme>-structure.json`  DOM structure + section order +
 *     headings + link inventory + bounded full-document outline (boxes,
 *     style subsets) + fonts + document metrics
 *   • `sol-<vp>-<theme>-styles.json`    full computed style (55 keys) for
 *     every visible semantic element + `@keyframes` + root/`html`/`body`
 *     token rules scraped from every readable stylesheet
 *   • `sol-<vp>-<theme>-svgs.json`      RAW SVG MARKUP (outerHTML incl.
 *     full path data) for every `svg`, its attributes, computed style,
 *     SMIL nodes with RUNTIME timing values (`getStartTime()` /
 *     `getSimpleDuration()` / `getRepeatCount()` …), CSS/WAAPI/JS-driven
 *     animation state, and per-SVG mutation log — plus a canvas/img/video
 *     inventory for non-SVG artwork
 *   • `sol-<vp>-<theme>-motion.json`    real animation behavior: WAAPI
 *     first-seen log with full timing + keyframes, raw
 *     `Element.prototype.animate()` calls (JS-driven specs as written),
 *     IntersectionObserver creation options (scroll-trigger thresholds as
 *     configured), MutationObserver log, PerformanceObserver entries
 *     (LCP/CLS/longtask/paint), scroll samples, live animation snapshot
 *   • `sol-<vp>-<theme>-dom.html.gz`    the settled raw DOM (gzip)
 *   • `sol-<vp>-<theme>-full.png` + one PNG per section band
 * plus `solutions-run-notes.json` (browser version, UA, timestamps) and
 * `solutions-failures.json` (any viewport that failed, and why).
 *
 * WHY THIS EXISTS. The development sandbox's egress allowlist blocks the
 * Framer reference host, so the ONLY honest measurement path is a real
 * Chromium on a GitHub-hosted runner (`.github/workflows/
 * forma-solutions-reference.yml`). Nothing in this file is a hand-written
 * constant about the reference: every value is read from the live page
 * through getBoundingClientRect / getComputedStyle / the Web Animations
 * API / SVGAnimationElement timing accessors / MutationObserver /
 * PerformanceObserver. Values that cannot be measured at runtime are left
 * to the audit document to label `[INFERRED]` — this script never guesses.
 *
 * RUN
 *   node scripts/capture-solutions-reference.mjs \
 *     --target forma-solutions \
 *     --base https://forma-visuvate.framer.website/solutions \
 *     --out docs/screenshots/forma-solutions-reference
 */
import { mkdirSync, writeFileSync, existsSync, statSync, unlinkSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The six breakpoints the milestone requires: mobile-narrow, mobile-small,
 * mobile, tablet, laptop, desktop.
 *
 * This is the same viewport set `scripts/capture-landing-reference.mjs`
 * uses, so a /solutions capture and a landing-page capture are directly
 * comparable. The original pass measured only 1440x900, 768x1024 and
 * 390x844, which left 320px, 375px and 1024px unmeasured — the widths
 * where the numbered category navigation and the four miniature mockups
 * are most likely to change column count or clip.
 */
const VIEWPORTS = [
  { w: 1440, h: 900, name: "1440x900", label: "desktop" },
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

const TARGET = arg("target", "forma-solutions");
const BASE = arg("base", "https://forma-visuvate.framer.website/solutions");
const OUT = resolve(ROOT, arg("out", "docs/screenshots/forma-solutions-reference"));

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

async function capture(page, vp, theme, report) {
  mkdirSync(OUT, { recursive: true });
  const prefix = `${TARGET}-${vp.name}-${theme}`;

  const structure = await page.evaluate(collectStructure, STYLE_KEYS);
  const styles = await page.evaluate(collectStyles, STYLE_KEYS);
  const artwork = await page.evaluate(collectArtwork, STYLE_KEYS);
  const motion = await page.evaluate(collectMotionDump);

  writeJson(`sol-${vp.name}-${theme}-structure.json`, structure);
  writeJson(`sol-${vp.name}-${theme}-styles.json`, styles);
  writeJson(`sol-${vp.name}-${theme}-svgs.json`, artwork);
  writeJson(`sol-${vp.name}-${theme}-motion.json`, motion);

  // The settled raw DOM — the full structure evidence, gzipped.
  const html = await page.content();
  writeFileSync(resolve(OUT, `sol-${vp.name}-${theme}-dom.html.gz`), gzipSync(Buffer.from(html, "utf8")));

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
    writeJson("solutions-run-notes.json", runNotes);
  }

  writeJson("solutions-summary.json", report);
  writeJson("solutions-failures.json", failures);
  gzipLargeOutputs();
  if (failures.length) {
    console.error(`\n${failures.length} capture(s) failed:\n${jsonSafe(failures)}`);
    process.exitCode = 1;
  }
  console.log(`\nwrote ${OUT}/solutions-summary.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
