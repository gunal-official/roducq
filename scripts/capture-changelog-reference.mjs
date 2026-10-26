#!/usr/bin/env node
/**
 * capture-changelog-reference — measured capture of Forma's `/changelog`
 * (`https://forma-visuvate.framer.website/changelog`) for the Roducq
 * `/changelog` recreation.
 *
 * WHAT IT PRODUCES (per breakpoint × theme)
 *   • `chg-<vp>-<theme>-structure.json`   DOM structure + header/section/footer
 *     order + headings + links + bounded document outline + fonts + metrics
 *   • `chg-<vp>-<theme>-styles.json`      full computed style (all 4 borders,
 *     spacing, typography, backgrounds, gradients, shadows, motion) +
 *     stylesheet `@keyframes` + root token rules
 *   • `chg-<vp>-<theme>-svgs.json`        raw SVG markup (`outerHTML`), viewBox,
 *     SMIL/CSS/WAAPI/JS animation state, plus `canvas`/`img`/`video` inventory
 *   • `chg-<vp>-<theme>-motion.json`      WAAPI first-seen log, raw
 *     `Element.prototype.animate()` calls, `IntersectionObserver` options,
 *     `MutationObserver` log, `PerformanceObserver` entries (LCP/CLS/paint),
 *     scroll samples, live animation snapshot
 *   • `chg-<vp>-<theme>-changelog.json`   page-specific deep pass across all 7
 *     widths (header nav active state, hero parts, filter chip bar, timeline
 *     container + decorative lines/dots/dividers/pseudo-elements, all release
 *     entries with ancestor chains + badges + date/version + card + bullet
 *     list anatomy, pagination/load-more check, Closing CTA & Footer trees;
 *     plus real pointer hover diffs and filter/card click probes at 1440/390)
 *   • `chg-<vp>-<theme>-dom.html.gz`      settled raw DOM (gzip)
 *   • `forma-changelog-<vp>-<theme>-full.png` + per-section PNGs
 * plus `chg-reduced-motion.json`, `changelog-summary.json`,
 * `changelog-run-notes.json`, and `changelog-failures.json`.
 */
import {
  mkdirSync,
  writeFileSync,
  statSync,
  unlinkSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
const SETTLE_MS = 2600;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const TARGET = arg("target", "forma-changelog");
const BASE = arg("base", "https://forma-visuvate.framer.website/changelog");
const OUT = resolve(
  ROOT,
  arg("out", "docs/screenshots/forma-changelog-reference"),
);

const jsonSafe = (value) =>
  JSON.stringify(
    value,
    (_k, v) =>
      v === Infinity ? "Infinity" : v === -Infinity ? "-Infinity" : v,
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

const STYLE_KEYS = [
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "color",
  "backgroundColor",
  "backgroundImage",
  "webkitBackgroundClip",
  "borderTopWidth",
  "borderTopStyle",
  "borderTopColor",
  "borderRightWidth",
  "borderRightStyle",
  "borderRightColor",
  "borderBottomWidth",
  "borderBottomStyle",
  "borderBottomColor",
  "borderLeftWidth",
  "borderLeftStyle",
  "borderLeftColor",
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
  "flexWrap",
  "justifyContent",
  "alignItems",
  "width",
  "height",
  "maxWidth",
  "minHeight",
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
  "overflowX",
  "zIndex",
  "filter",
  "backdropFilter",
  "clipPath",
  "textAlign",
  "listStyleType",
  "stroke",
  "strokeWidth",
  "strokeDasharray",
  "strokeDashoffset",
  "fill",
];

const INIT_INSTRUMENT = () => {
  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
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
        yDoc: Math.round(r.top + window.scrollY),
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

  window.__chgWAAPI = [];
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
          entry.computedTiming = effect.getComputedTiming
            ? effect.getComputedTiming()
            : null;
        } catch {}
        try {
          entry.keyframes = effect.getKeyframes
            ? safeClone(effect.getKeyframes())
            : null;
        } catch {}
      }
      if (target && target.nodeType === 1) {
        const insideSvg = Boolean(target.closest && target.closest("svg"));
        const svgRoot = insideSvg
          ? target.ownerSVGElement || target.closest("svg")
          : null;
        entry.target = {
          tag: target.tagName.toLowerCase(),
          path: cssPath(target),
          text: String(target.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 90),
          inSvg: insideSvg,
          svgIndex: svgRoot
            ? [...document.querySelectorAll("svg")].indexOf(svgRoot)
            : null,
          rect: rectOf(target),
          cssAnimationName: getComputedStyle(target).animationName,
        };
      }
      window.__chgWAAPI.push(entry);
    }
  };
  setInterval(recordAnims, 40);
  window.addEventListener("pagehide", () => recordAnims(), { once: true });

  window.__chgAnimateCalls = [];
  const origAnimate = Element.prototype.animate;
  Element.prototype.animate = function chgAnimate(keyframes, options) {
    try {
      const svgRoot = this.closest ? this.closest("svg") : null;
      window.__chgAnimateCalls.push({
        at: now(),
        ...scrollState(),
        target: {
          tag: this.tagName ? this.tagName.toLowerCase() : null,
          path: this.nodeType === 1 ? cssPath(this) : null,
          text: String(this.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 90),
          inSvg: Boolean(svgRoot),
          svgIndex: svgRoot
            ? [...document.querySelectorAll("svg")].indexOf(svgRoot)
            : null,
        },
        keyframes: safeClone(keyframes),
        options:
          typeof options === "number"
            ? { duration: options }
            : safeClone(options),
        rect: rectOf(this),
      });
    } catch {}
    return origAnimate.call(this, keyframes, options);
  };

  window.__chgIO = [];
  const OrigIO = window.IntersectionObserver;
  if (OrigIO) {
    window.IntersectionObserver = class ChgIO extends OrigIO {
      constructor(callback, options) {
        super(callback, options);
        const record = {
          at: now(),
          kind: "construct",
          options: safeClone(options || {}),
          observed: [],
        };
        window.__chgIO.push(record);
        const origObserve = this.observe.bind(this);
        this.observe = (target) => {
          try {
            record.observed.push({
              at: now(),
              path:
                target && target.nodeType === 1
                  ? cssPath(target)
                  : String(target),
              text:
                target && target.nodeType === 1
                  ? String(target.textContent || "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 70)
                  : null,
              rect: target && target.nodeType === 1 ? rectOf(target) : null,
            });
          } catch {}
          return origObserve(target);
        };
      }
    };
  }

  window.__chgMut = [];
  const MUT_CAP = 5000;
  const startMO = () => {
    if (!document.documentElement) {
      setTimeout(startMO, 5);
      return;
    }
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        if (window.__chgMut.length >= MUT_CAP) return;
        const target = rec.target;
        window.__chgMut.push({
          at: now(),
          type: rec.type,
          attributeName: rec.attributeName || null,
          oldValue:
            rec.oldValue === undefined
              ? null
              : String(rec.oldValue).slice(0, 200),
          newValue:
            rec.type === "attributes" && target && target.getAttribute
              ? String(target.getAttribute(rec.attributeName) || "").slice(
                  0,
                  200,
                )
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
      attributeFilter: [
        "style",
        "class",
        "d",
        "transform",
        "opacity",
        "filter",
        "clip-path",
        "hidden",
        "aria-hidden",
        "aria-selected",
        "aria-pressed",
      ],
    });
  };
  startMO();

  window.__chgPerf = [];
  const perfPush = (type, entry) => {
    if (window.__chgPerf.length >= 600) return;
    const base = {
      type,
      name: entry.name || null,
      startTime: entry.startTime,
      duration: entry.duration,
    };
    if (type === "largest-contentful-paint") {
      window.__chgPerf.push({
        ...base,
        size: entry.size,
        url: entry.url || null,
        loadTime: entry.loadTime,
        renderTime: entry.renderTime,
        element:
          entry.element && entry.element.nodeType === 1
            ? {
                tag: entry.element.tagName.toLowerCase(),
                path: cssPath(entry.element),
                text: String(entry.element.textContent || "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 90),
                rect: rectOf(entry.element),
              }
            : null,
      });
    } else if (type === "layout-shift") {
      window.__chgPerf.push({
        ...base,
        value: entry.value,
        hadRecentInput: entry.hadRecentInput,
      });
    } else {
      window.__chgPerf.push(base);
    }
  };
  for (const t of [
    "largest-contentful-paint",
    "layout-shift",
    "longtask",
    "paint",
    "navigation",
  ]) {
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) perfPush(t, entry);
      });
      po.observe({ type: t, buffered: true });
    } catch {}
  }

  window.__chgScroll = [];
  setInterval(() => {
    if (window.__chgScroll.length >= 2000) return;
    window.__chgScroll.push({
      at: now(),
      scrollY: Math.round(window.scrollY),
      innerHeight: window.innerHeight,
    });
  }, 150);
};

const collectStructure = () => {
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
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
      "top",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
      "color",
      "backgroundColor",
      "backgroundImage",
      "borderTopWidth",
      "borderTopColor",
      "borderBottomWidth",
      "borderBottomColor",
      "borderLeftWidth",
      "borderLeftColor",
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
      "zIndex",
    ]) {
      let v = cs[key];
      if (v === undefined || v === "") continue;
      if (
        /^(padding|margin|border.*Width)/.test(key) ||
        ["borderRadius", "fontSize", "lineHeight", "letterSpacing", "gap"].includes(
          key,
        )
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
  const textOf = (el) =>
    (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);

  const allTopBands = [...document.querySelectorAll("header, section, footer")]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height > 20 && r.width > 120;
    })
    .sort(
      (a, b) =>
        a.getBoundingClientRect().top +
        window.scrollY -
        (b.getBoundingClientRect().top + window.scrollY),
    );

  const sections = allTopBands.map((el, i) => ({
    index: i,
    tag: el.tagName.toLowerCase(),
    path: pathOf(el),
    id: el.id || null,
    box: boxOf(el),
    style: styleSubset(el),
    text: textOf(el).slice(0, 180),
    children: el.children.length,
  }));

  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
    (el) => ({
      level: el.tagName.toLowerCase(),
      path: pathOf(el),
      text: textOf(el),
      box: boxOf(el),
      style: styleSubset(el),
      words: [...el.querySelectorAll("span")]
        .map((s) => ({
          text: (s.textContent || "").replace(/\s+/g, " ").trim(),
          box: boxOf(s),
          style: styleSubset(s),
        }))
        .filter((s) => s.text),
    }),
  );

  const links = [...document.querySelectorAll("a[href]")].map((el) => ({
    path: pathOf(el),
    href: el.getAttribute("href"),
    text: textOf(el),
    box: boxOf(el),
    style: styleSubset(el),
  }));

  const outline = [];
  const OUTLINE_CAP = 8000;
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
      .slice(0, 100);
    outline.push({
      index,
      parent: parentIndex,
      depth,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className:
        typeof el.className === "string" ? el.className.slice(0, 180) : null,
      attrs,
      text: ownText,
      childCount: el.children.length,
      box: boxOf(el),
      style: styleSubset(el),
    });
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
      (document.querySelector('meta[name="description"]') || {}).content ||
      null,
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
      for (const el of document.querySelectorAll(
        "h1,h2,h3,p,span,a,button,li,time",
      )) {
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

const collectStyles = (KEYS) => {
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
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
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? round(n) : v;
  };
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of KEYS) {
      let v = cs[key];
      if (v === undefined || v === "") continue;
      if (
        key.startsWith("padding") ||
        key.startsWith("margin") ||
        /^border(Top|Right|Bottom|Left)Width$/.test(key) ||
        [
          "borderRadius",
          "fontSize",
          "lineHeight",
          "letterSpacing",
          "width",
          "height",
          "maxWidth",
          "minHeight",
          "gap",
          "rowGap",
          "columnGap",
          "strokeWidth",
          "strokeDasharray",
          "strokeDashoffset",
        ].includes(key)
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
  const textOf = (el) =>
    (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100);

  const tracked = [];
  const sel =
    "h1,h2,h3,h4,h5,h6,p,button,a,ul,ol,li,time,img,svg,input,nav,section,article,header,footer,[role=button],[role=tab],[role=tablist],[data-framer-name]";
  for (const el of [...document.querySelectorAll(sel)]) {
    if (tracked.length >= 1800) break;
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

  const keyframes = [];
  const tokenRules = [];
  const mediaQueries = [];
  const sheetErrors = [];
  for (const sheet of [...document.styleSheets]) {
    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      sheetErrors.push({
        href: sheet.href || "inline",
        message: String(error).slice(0, 120),
      });
      continue;
    }
    for (const rule of [...(rules || [])]) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        if (keyframes.length < 300) {
          keyframes.push({
            name: rule.name,
            cssText: rule.cssText.slice(0, 3000),
          });
        }
      } else if (rule.type === CSSRule.MEDIA_RULE) {
        if (mediaQueries.length < 120 && rule.conditionText) {
          mediaQueries.push(rule.conditionText);
        }
      } else if (
        rule.selectorText &&
        /(^|,)\s*(:root|html|body)\s*(,|$)/.test(rule.selectorText) &&
        rule.cssText.includes("--")
      ) {
        if (tokenRules.length < 100) {
          tokenRules.push({
            selector: rule.selectorText,
            cssText: rule.cssText.slice(0, 4000),
          });
        }
      }
    }
  }
  return {
    tracked,
    keyframes,
    tokenRules,
    mediaQueries: [...new Set(mediaQueries)],
    sheetErrors,
  };
};

const collectArtwork = (KEYS) => {
  const pathOf = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
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
  const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const key of KEYS) {
      const v = cs[key];
      if (v !== undefined && v !== "") out[key] = v;
    }
    return out;
  };

  const waapiLog = window.__chgWAAPI || [];
  const animateCalls = window.__chgAnimateCalls || [];
  const svgEls = [...document.querySelectorAll("svg")];

  const svgs = svgEls.map((svg, index) => {
    const r = svg.getBoundingClientRect();
    const smil = [
      ...svg.querySelectorAll(
        "animate, animateTransform, animateMotion, set, animateColor",
      ),
    ].map((el) => ({
      tag: el.tagName.toLowerCase(),
      outerHTML: el.outerHTML.slice(0, 1500),
    }));
    return {
      index,
      path: pathOf(svg),
      attrs: Object.fromEntries([...svg.attributes].map((a) => [a.name, a.value])),
      box: {
        x: round(r.x),
        y: round(r.y + window.scrollY),
        w: round(r.width),
        h: round(r.height),
      },
      style: styleOf(svg),
      outerHTML: svg.outerHTML,
      pathCount: svg.querySelectorAll("path").length,
      smil,
      waapi: waapiLog.filter((e) => e.target && e.target.svgIndex === index),
      animateCalls: animateCalls.filter(
        (e) => e.target && e.target.svgIndex === index,
      ),
    };
  });

  const canvases = [...document.querySelectorAll("canvas")].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      path: pathOf(el),
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
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
      box: { x: round(r.x), y: round(r.y + window.scrollY), w: round(r.width), h: round(r.height) },
    };
  });

  return { svgs, canvases, images, videos };
};

const collectMotionDump = () => ({
  waapiFirstSeen: window.__chgWAAPI || [],
  animateCalls: window.__chgAnimateCalls || [],
  intersectionObservers: window.__chgIO || [],
  mutations: window.__chgMut || [],
  performance: window.__chgPerf || [],
  scrollSamples: window.__chgScroll || [],
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
 * DEEP CHANGELOG PASS — measures every structural, decorative, typographic,
 * and interactive detail of Forma's `/changelog` page:
 *   1. Header chrome + nav links + whether "Changelog" is present/active
 *   2. Hero anatomy (eyebrow, H1 ink words + gradient highlight, lead, decor)
 *   3. Filter chip strip (`All updates`, `New`, `Improved`, `Fixed`)
 *   4. Timeline container + decorative geometry (vertical lines, dots/nodes,
 *      horizontal dividers, sticky date columns, pseudo-elements)
 *   5. All release entries: ancestor chains, date & version nodes, badges
 *      (`New`, `Improved`, `Fixed`, `Beta`), card surface, H2, body paragraphs,
 *      bullet list markers & items
 *   6. Pagination / load-more check
 *   7. Closing CTA + Footer bounded trees
 *   8. Interactive probes (at 1440 & 390 light): real hover diffs on card and
 *      filter chips, real clicks on every filter chip, and card click probe.
 */
async function deepChangelogPass(page, runProbes) {
  const anatomy = await page.evaluate(() => {
    const round = (n) => (typeof n === "number" ? Math.round(n * 100) / 100 : n);
    const boxOf = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: round(r.x),
        y: round(r.y + window.scrollY),
        w: round(r.width),
        h: round(r.height),
      };
    };
    const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const ownTextOf = (el) =>
      [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
    const fullStyle = (el) => {
      const cs = getComputedStyle(el);
      return {
        display: cs.display,
        position: cs.position,
        top: cs.top,
        left: cs.left,
        zIndex: cs.zIndex,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        textTransform: cs.textTransform,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        webkitBackgroundClip: cs.webkitBackgroundClip,
        borderTop: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
        borderRight: `${cs.borderRightWidth} ${cs.borderRightStyle} ${cs.borderRightColor}`,
        borderBottom: `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`,
        borderLeft: `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
        gap: cs.gap,
        rowGap: cs.rowGap,
        columnGap: cs.columnGap,
        gridTemplateColumns: cs.gridTemplateColumns,
        flexDirection: cs.flexDirection,
        flexWrap: cs.flexWrap,
        justifyContent: cs.justifyContent,
        alignItems: cs.alignItems,
        width: cs.width,
        height: cs.height,
        maxWidth: cs.maxWidth,
        opacity: cs.opacity,
        transform: cs.transform,
        overflow: cs.overflow,
        overflowX: cs.overflowX,
        backdropFilter: cs.backdropFilter,
        listStyleType: cs.listStyleType,
        transition: `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`,
      };
    };

    // 1. Header
    const header = document.querySelector("header");
    const headerInfo = header
      ? {
          box: boxOf(header),
          style: fullStyle(header),
          links: [...header.querySelectorAll("a[href]")].map((a) => ({
            text: textOf(a),
            href: a.getAttribute("href"),
            ariaCurrent: a.getAttribute("aria-current"),
            box: boxOf(a),
            style: fullStyle(a),
            children: [...a.querySelectorAll("*")].map((c) => ({
              tag: c.tagName.toLowerCase(),
              text: ownTextOf(c),
              box: boxOf(c),
              style: fullStyle(c),
            })),
          })),
          buttons: [...header.querySelectorAll("button")].map((b) => ({
            text: textOf(b),
            ariaLabel: b.getAttribute("aria-label"),
            box: boxOf(b),
            style: fullStyle(b),
          })),
        }
      : null;

    // 2. Sections
    const sections = [...document.querySelectorAll("section")];
    const hero = sections[0] || null;
    const heroInfo = hero
      ? {
          box: boxOf(hero),
          style: fullStyle(hero),
          outerHTML: hero.outerHTML.slice(0, 14000),
          nodes: [...hero.querySelectorAll("*")].slice(0, 80).map((el) => ({
            tag: el.tagName.toLowerCase(),
            ownText: ownTextOf(el),
            fullText: textOf(el).slice(0, 120),
            box: boxOf(el),
            style: fullStyle(el),
          })),
        }
      : null;

    // 3. Filter chips — locate by "All updates" or buttons near top of timeline
    const allControls = [
      ...document.querySelectorAll("button, [role='tab'], a[href]"),
    ];
    const allUpdatesBtn = allControls.find((el) =>
      /^all updates$/i.test(textOf(el)),
    );
    const chipContainer = allUpdatesBtn ? allUpdatesBtn.parentElement : null;
    const filterInfo = chipContainer
      ? {
          containerTag: chipContainer.tagName.toLowerCase(),
          containerRole: chipContainer.getAttribute("role"),
          containerBox: boxOf(chipContainer),
          containerStyle: fullStyle(chipContainer),
          parentChain: (() => {
            const out = [];
            let p = chipContainer.parentElement;
            for (let i = 0; i < 4 && p; i += 1) {
              out.push({
                level: i + 1,
                tag: p.tagName.toLowerCase(),
                box: boxOf(p),
                style: fullStyle(p),
              });
              p = p.parentElement;
            }
            return out;
          })(),
          chips: [...chipContainer.children].map((chip) => ({
            tag: chip.tagName.toLowerCase(),
            role: chip.getAttribute("role"),
            text: textOf(chip),
            box: boxOf(chip),
            style: fullStyle(chip),
            innerNodes: [...chip.querySelectorAll("*")].map((n) => ({
              tag: n.tagName.toLowerCase(),
              text: ownTextOf(n),
              box: boxOf(n),
              style: fullStyle(n),
            })),
          })),
        }
      : null;

    // 4. Identify Timeline section — the section containing the release H2s
    const allH2s = [...document.querySelectorAll("section h2")];
    const timelineH2s = allH2s.filter((h2) => {
      const sec = h2.closest("section");
      // Exclude Closing CTA ("Try Forma with your own projects")
      return sec && !/try\s+forma/i.test(textOf(h2));
    });
    const timelineSection = timelineH2s[0]
      ? timelineH2s[0].closest("section")
      : sections[1] || null;

    // Decorative elements inside timeline section: rails, lines, dots, borders,
    // sticky nodes, and pseudo-elements.
    const timelineDecor = [];
    const stickyNodes = [];
    if (timelineSection) {
      for (const el of timelineSection.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.position === "sticky") {
          stickyNodes.push({
            tag: el.tagName.toLowerCase(),
            text: textOf(el).slice(0, 80),
            box: boxOf(el),
            style: fullStyle(el),
          });
        }
        const isThinLine =
          (r.width > 0 && r.width <= 6 && r.height >= 24) ||
          (r.height > 0 && r.height <= 4 && r.width >= 24);
        const isDot =
          r.width >= 4 &&
          r.width <= 26 &&
          r.height >= 4 &&
          r.height <= 26 &&
          ownTextOf(el) === "" &&
          el.children.length <= 2 &&
          el.tagName.toLowerCase() !== "svg" &&
          !el.closest("svg");
        const hasSideBorder =
          parseFloat(cs.borderLeftWidth) > 0 ||
          parseFloat(cs.borderRightWidth) > 0;
        if ((isThinLine || isDot || hasSideBorder) && timelineDecor.length < 120) {
          timelineDecor.push({
            kind: isThinLine ? "line" : isDot ? "dot-or-box" : "side-border",
            tag: el.tagName.toLowerCase(),
            ownText: ownTextOf(el),
            childCount: el.children.length,
            box: boxOf(el),
            style: fullStyle(el),
          });
        }
        for (const pseudo of ["::before", "::after"]) {
          const pcs = getComputedStyle(el, pseudo);
          if (
            pcs.content &&
            pcs.content !== "none" &&
            pcs.content !== "normal" &&
            pcs.content !== '""'
          ) {
            if (timelineDecor.length < 140) {
              timelineDecor.push({
                kind: `pseudo${pseudo}`,
                tag: el.tagName.toLowerCase(),
                content: pcs.content,
                box: boxOf(el),
                color: pcs.color,
                backgroundColor: pcs.backgroundColor,
                width: pcs.width,
                height: pcs.height,
                borderRadius: pcs.borderRadius,
              });
            }
          }
        }
      }
    }

    // 5. Release entries anatomy
    const entries = timelineH2s.map((h2, idx) => {
      const chain = [];
      let node = h2;
      for (let level = 1; level <= 7 && node.parentElement; level += 1) {
        node = node.parentElement;
        chain.push({
          level,
          tag: node.tagName.toLowerCase(),
          childCount: node.children.length,
          box: boxOf(node),
          style: fullStyle(node),
        });
        if (node === timelineSection) break;
      }

      // Entry row root = the ancestor inside timelineSection whose height wraps
      // this entry (typically child of the entries stack).
      const entryRoot = (() => {
        let cur = h2;
        while (
          cur.parentElement &&
          cur.parentElement !== timelineSection &&
          cur.parentElement.querySelectorAll("h2").length === 1
        ) {
          cur = cur.parentElement;
        }
        return cur;
      })();

      const subtree = [entryRoot, ...entryRoot.querySelectorAll("*")]
        .slice(0, 90)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          ownText: ownTextOf(el),
          fullText: textOf(el).slice(0, 140),
          childCount: el.children.length,
          box: boxOf(el),
          style: fullStyle(el),
        }));

      return {
        index: idx,
        title: textOf(h2),
        h2Box: boxOf(h2),
        h2Style: fullStyle(h2),
        h2Words: [...h2.querySelectorAll("span")].map((s) => ({
          text: textOf(s),
          box: boxOf(s),
          style: fullStyle(s),
        })),
        entryRootTag: entryRoot.tagName.toLowerCase(),
        entryRootBox: boxOf(entryRoot),
        entryRootStyle: fullStyle(entryRoot),
        entryOuterHTML: idx < 2 || idx === 3 || idx === 5 || idx === 7
          ? entryRoot.outerHTML.slice(0, 12000)
          : entryRoot.outerHTML.slice(0, 2500),
        chain,
        // Full node breakdown for representative entries (0: 1 badge + list,
        // 1: New+Improved, 3: New+Beta, 5: Fixed, 7: no list), compact for rest
        subtree:
          idx === 0 || idx === 1 || idx === 3 || idx === 5 || idx === 7
            ? subtree
            : subtree.filter((n) => n.ownText.length > 0 || n.tag === "ul" || n.tag === "li"),
      };
    });

    // 6. Badge specimen table across the whole timeline
    const badgeTexts = new Set(["New", "Improved", "Fixed", "Beta"]);
    const badges = [];
    if (timelineSection) {
      for (const el of timelineSection.querySelectorAll("*")) {
        // Skip the filter chips themselves
        if (chipContainer && chipContainer.contains(el)) continue;
        const t = ownTextOf(el);
        if (badgeTexts.has(t)) {
          const p = el.parentElement;
          badges.push({
            label: t,
            textNodeTag: el.tagName.toLowerCase(),
            textBox: boxOf(el),
            textStyle: fullStyle(el),
            pillTag: p ? p.tagName.toLowerCase() : null,
            pillBox: p ? boxOf(p) : null,
            pillStyle: p ? fullStyle(p) : null,
          });
        }
      }
    }

    // 7. Pagination / load-more check
    const paginationCandidates = [
      ...document.querySelectorAll("button, a, p, span, nav"),
    ]
      .filter((el) =>
        /load more|show more|older|newer|previous|next page|page \d|rss|subscribe/i.test(
          ownTextOf(el),
        ),
      )
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: textOf(el),
        href: el.getAttribute("href"),
        box: boxOf(el),
        style: fullStyle(el),
      }));

    // 8. Timeline container chain (from timelineSection down 4 levels)
    const timelineTree = [];
    if (timelineSection) {
      const walkTl = (el, depth, parent) => {
        if (timelineTree.length >= 120 || depth > 4) return;
        const idx = timelineTree.length;
        timelineTree.push({
          index: idx,
          parent,
          depth,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          ownText: ownTextOf(el),
          childCount: el.children.length,
          box: boxOf(el),
          style: fullStyle(el),
        });
        for (const c of el.children) walkTl(c, depth + 1, idx);
      };
      walkTl(timelineSection, 0, null);
    }

    // 9. Closing CTA & Footer bounded trees
    const closingSection = sections.find((s) => /try\s+forma/i.test(textOf(s))) || null;
    const footerEl = document.querySelector("footer");
    const boundedTree = (root) => {
      if (!root) return null;
      const nodes = [];
      const walk = (el, depth, parent) => {
        if (nodes.length >= 140 || depth > 5) return;
        const idx = nodes.length;
        nodes.push({
          index: idx,
          parent,
          depth,
          tag: el.tagName.toLowerCase(),
          ownText: ownTextOf(el),
          box: boxOf(el),
          style: fullStyle(el),
        });
        for (const c of el.children) walk(c, depth + 1, idx);
      };
      walk(root, 0, null);
      return { box: boxOf(root), style: fullStyle(root), nodes };
    };

    return {
      header: headerInfo,
      hero: heroInfo,
      filter: filterInfo,
      timelineSectionBox: timelineSection ? boxOf(timelineSection) : null,
      timelineSectionStyle: timelineSection ? fullStyle(timelineSection) : null,
      timelineTree,
      timelineDecor,
      stickyNodes,
      entryCount: entries.length,
      entries,
      badges,
      paginationCandidates,
      closingCta: boundedTree(closingSection),
      footer: boundedTree(footerEl),
    };
  });

  if (!runProbes) {
    return { ...anatomy, probes: null };
  }

  // Interactive probes (hover + filter chip clicks + card click)
  const hoverElement = async (selectorFn, argVal) => {
    const prep = await page.evaluate(selectorFn, argVal);
    if (!prep || !prep.found) return { found: false };
    const snap = () =>
      page.evaluate(() => {
        const root = window.__chgHoverRoot;
        if (!root) return null;
        const keys = [
          "color",
          "backgroundColor",
          "backgroundImage",
          "borderTopColor",
          "borderTopWidth",
          "borderRightColor",
          "borderBottomColor",
          "borderLeftColor",
          "boxShadow",
          "opacity",
          "transform",
          "transitionProperty",
          "transitionDuration",
        ];
        const nodes = [];
        let up = root;
        for (let i = 0; i < 4 && up; i += 1) {
          const cs = getComputedStyle(up);
          const s = {};
          for (const k of keys) s[k] = cs[k];
          nodes.push({ path: `up-${i}`, tag: up.tagName.toLowerCase(), style: s });
          up = up.parentElement;
        }
        [...root.querySelectorAll("*")].slice(0, 60).forEach((el, idx) => {
          const cs = getComputedStyle(el);
          const s = {};
          for (const k of keys) s[k] = cs[k];
          nodes.push({
            path: `down-${idx}`,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50),
            style: s,
          });
        });
        return nodes;
      });

    await page.mouse.move(2, 2);
    await page.waitForTimeout(350);
    const before = await snap();
    await page.mouse.move(prep.x, prep.y);
    await page.waitForTimeout(450);
    const during = await snap();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(350);

    const changes = [];
    const byPath = new Map((during || []).map((n) => [n.path, n]));
    for (const b of before || []) {
      const d = byPath.get(b.path);
      if (!d) continue;
      for (const [k, v] of Object.entries(b.style)) {
        if (d.style[k] !== v) {
          changes.push({
            path: b.path,
            tag: b.tag,
            text: b.text || null,
            property: k,
            from: v,
            to: d.style[k],
          });
        }
      }
    }
    return { found: true, label: prep.label, box: prep.box, changes };
  };

  const cardHover = await hoverElement(() => {
    const h2 = [...document.querySelectorAll("section h2")].find(
      (el) => !/try\s+forma/i.test(el.textContent || ""),
    );
    if (!h2) return { found: false };
    let cur = h2;
    while (
      cur.parentElement &&
      cur.parentElement.tagName.toLowerCase() !== "section" &&
      cur.parentElement.querySelectorAll("h2").length === 1
    ) {
      cur = cur.parentElement;
    }
    cur.scrollIntoView({ block: "center", behavior: "instant" });
    window.__chgHoverRoot = cur;
    const r = h2.getBoundingClientRect();
    return {
      found: true,
      label: (h2.textContent || "").trim(),
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      box: { w: Math.round(r.width), h: Math.round(r.height) },
    };
  }, null);

  const chipHover = await hoverElement(() => {
    const chip = [
      ...document.querySelectorAll("button, [role='tab'], a[href]"),
    ].find((el) => /^new$/i.test((el.textContent || "").trim()));
    if (!chip) return { found: false };
    chip.scrollIntoView({ block: "center", behavior: "instant" });
    window.__chgHoverRoot = chip;
    const r = chip.getBoundingClientRect();
    return {
      found: true,
      label: "New chip",
      x: Math.round(r.x + r.width / 2),
      y: Math.round(r.y + r.height / 2),
      box: { w: Math.round(r.width), h: Math.round(r.height) },
    };
  }, null);

  // Filter chip click probes
  const readVisibleEntries = () =>
    page.evaluate(() => {
      const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
      const visibleH2s = [...document.querySelectorAll("section h2")]
        .filter((h2) => {
          if (/try\s+forma/i.test(textOf(h2))) return false;
          const r = h2.getBoundingClientRect();
          const cs = getComputedStyle(h2);
          return (
            r.width > 0 &&
            r.height > 0 &&
            cs.display !== "none" &&
            cs.visibility !== "hidden" &&
            Number(cs.opacity) > 0.05
          );
        })
        .map((h2) => textOf(h2));
      const allBtn = [
        ...document.querySelectorAll("button, [role='tab'], a[href]"),
      ].find((el) => /^all updates$/i.test(textOf(el)));
      const chips = allBtn && allBtn.parentElement
        ? [...allBtn.parentElement.children].map((c) => ({
            text: textOf(c),
            bg: getComputedStyle(c).backgroundColor,
            color: getComputedStyle(c).color,
            border: getComputedStyle(c).borderTopColor,
          }))
        : [];
      return {
        url: location.href,
        visibleCount: visibleH2s.length,
        visibleTitles: visibleH2s,
        chips,
      };
    });

  const filterClicks = [];
  const initialFilterState = await readVisibleEntries();
  const chipLabels = anatomy.filter
    ? anatomy.filter.chips.map((c) => c.text)
    : [];
  for (const label of [...chipLabels.slice(1), chipLabels[0]].filter(Boolean)) {
    const animBefore = await page.evaluate(
      () => (window.__chgAnimateCalls || []).length,
    );
    const clicked = await page.evaluate((want) => {
      const textOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
      const allBtn = [
        ...document.querySelectorAll("button, [role='tab'], a[href]"),
      ].find((el) => /^all updates$/i.test(textOf(el)));
      if (!allBtn || !allBtn.parentElement) return false;
      const target = [...allBtn.parentElement.children].find(
        (c) => textOf(c) === want,
      );
      if (!target) return false;
      target.scrollIntoView({ block: "center", behavior: "instant" });
      target.click();
      return true;
    }, label);
    if (!clicked) continue;
    await page.waitForTimeout(550);
    const afterState = await readVisibleEntries();
    const newAnims = await page.evaluate(
      (startIdx) => (window.__chgAnimateCalls || []).slice(startIdx),
      animBefore,
    );
    filterClicks.push({
      clickedChip: label,
      state: afterState,
      triggeredAnimateCalls: newAnims,
    });
  }

  // Card click probe
  const beforeClick = await page.evaluate(() => ({
    url: location.href,
    dialogs: document.querySelectorAll('[role="dialog"], dialog').length,
  }));
  const cardCoords = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("section h2")].find(
      (el) => !/try\s+forma/i.test(el.textContent || ""),
    );
    if (!h2) return null;
    h2.scrollIntoView({ block: "center", behavior: "instant" });
    const r = h2.getBoundingClientRect();
    return { x: Math.round(r.x + 24), y: Math.round(r.y + 12) };
  });
  let cardClick = null;
  if (cardCoords) {
    await page.mouse.click(cardCoords.x, cardCoords.y);
    await page.waitForTimeout(500);
    const afterClick = await page.evaluate(() => ({
      url: location.href,
      dialogs: document.querySelectorAll('[role="dialog"], dialog').length,
    }));
    cardClick = { coords: cardCoords, before: beforeClick, after: afterClick };
    if (afterClick.url !== beforeClick.url) {
      await page.goBack().catch(() => {});
      await page.waitForTimeout(400);
    }
  }

  return {
    ...anatomy,
    probes: {
      cardHover,
      chipHover,
      initialFilterState,
      filterClicks,
      cardClick,
    },
  };
}

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(SETTLE_MS);
  const scrollPass = () =>
    page.evaluate(async () => {
      const step = Math.max(220, Math.round(window.innerHeight * 0.55));
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 200));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 150));
    });
  await scrollPass();
  await page.waitForTimeout(900);
  await scrollPass();
  await page.waitForTimeout(1200);
}

function writeJson(name, value) {
  const path = resolve(OUT, name);
  writeFileSync(path, jsonSafe(value));
  return path;
}

async function capture(page, vp, theme, report) {
  mkdirSync(OUT, { recursive: true });
  const prefix = `${TARGET}-${vp.name}-${theme}`;

  const structure = await page.evaluate(collectStructure);
  const styles = await page.evaluate(collectStyles, STYLE_KEYS);
  const artwork = await page.evaluate(collectArtwork, STYLE_KEYS);
  const motion = await page.evaluate(collectMotionDump);

  writeJson(`chg-${vp.name}-${theme}-structure.json`, structure);
  writeJson(`chg-${vp.name}-${theme}-styles.json`, styles);
  writeJson(`chg-${vp.name}-${theme}-svgs.json`, artwork);
  writeJson(`chg-${vp.name}-${theme}-motion.json`, motion);

  const html = await page.content();
  writeFileSync(
    resolve(OUT, `chg-${vp.name}-${theme}-dom.html.gz`),
    gzipSync(Buffer.from(html, "utf8")),
  );

  // Save full-page screenshots for light at all 7 widths + dark at 1440/390
  if (theme === "light" || vp.w === 1440 || vp.w === 390) {
    try {
      await page.screenshot({
        path: resolve(OUT, `${prefix}-full.png`),
        fullPage: true,
      });
    } catch (error) {
      console.error(
        `full-page shot ${prefix} failed: ${String((error && error.message) || error)}`,
      );
    }
  }

  // Save per-section screenshots at 1440 light and 390 light
  if (theme === "light" && (vp.w === 1440 || vp.w === 390)) {
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
            height: Math.max(1, Math.min(box.h, 16000)),
          },
          fullPage: true,
        });
      } catch (error) {
        console.error(
          `section ${i} ${prefix} failed: ${String((error && error.message) || error)}`,
        );
      }
    }
  }

  // Deep changelog pass on light theme at all 7 widths (with interactive probes
  // at 1440 and 390, after screenshots so no probe state leaks into PNGs).
  let deep = null;
  if (theme === "light") {
    try {
      deep = await deepChangelogPass(page, vp.w === 1440 || vp.w === 390);
      writeJson(`chg-${vp.name}-${theme}-changelog.json`, deep);
    } catch (error) {
      deep = { error: String((error && error.message) || error) };
      writeJson(`chg-${vp.name}-${theme}-changelog.json`, deep);
    }
  }

  report.push({
    viewport: vp.name,
    label: vp.label,
    theme,
    url: structure.url,
    title: structure.title,
    document: structure.document,
    sections: structure.sections.map((s) => ({
      index: s.index,
      tag: s.tag,
      id: s.id,
      text: s.text.slice(0, 80),
      box: s.box,
      paddingTop: s.style.paddingTop,
      paddingBottom: s.style.paddingBottom,
      bg: s.style.backgroundColor,
    })),
    headingCount: structure.headings.length,
    svgCount: artwork.svgs.length,
    canvasCount: artwork.canvases.length,
    imageCount: artwork.images.length,
    videoCount: artwork.videos.length,
    waapiSeen: motion.waapiFirstSeen.length,
    animateCalls: motion.animateCalls.length,
    ioCreated: motion.intersectionObservers.length,
    overflowX: structure.document.overflowX,
    consoleErrors: null,
    changelog:
      deep && !deep.error
        ? {
            entryCount: deep.entryCount,
            filterChips: deep.filter
              ? deep.filter.chips.map((c) => c.text)
              : [],
            badgeLabels: [...new Set(deep.badges.map((b) => b.label))],
            decorCount: deep.timelineDecor.length,
            stickyCount: deep.stickyNodes.length,
            paginationCount: deep.paginationCandidates.length,
            filterClicks: deep.probes
              ? deep.probes.filterClicks.map((f) => ({
                  chip: f.clickedChip,
                  visibleCount: f.state.visibleCount,
                }))
              : null,
            cardHoverChanges:
              deep.probes && deep.probes.cardHover
                ? (deep.probes.cardHover.changes || []).length
                : null,
            chipHoverChanges:
              deep.probes && deep.probes.chipHover
                ? (deep.probes.chipHover.changes || []).length
                : null,
          }
        : null,
  });

  return {
    sections: structure.sections.length,
    svgs: artwork.svgs.length,
    waapi: motion.waapiFirstSeen.length,
    overflowX: structure.document.overflowX,
  };
}

async function captureReducedMotion(browser) {
  const results = [];
  for (const vp of [VIEWPORTS[0], VIEWPORTS[4]]) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      colorScheme: "light",
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.addInitScript(INIT_INSTRUMENT);
    try {
      await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
      await settle(page);
      const motion = await page.evaluate(collectMotionDump);
      const state = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const h2s = [...document.querySelectorAll("section h2")];
        return {
          matchesReduced: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
          h1Opacity: h1 ? getComputedStyle(h1).opacity : null,
          h1Spans: h1
            ? [...h1.querySelectorAll("span")].map((s) => ({
                text: (s.textContent || "").trim(),
                opacity: getComputedStyle(s).opacity,
                filter: getComputedStyle(s).filter,
                transform: getComputedStyle(s).transform,
              }))
            : [],
          h2Visible: h2s.filter((el) => Number(getComputedStyle(el).opacity) > 0.9)
            .length,
          h2Total: h2s.length,
        };
      });
      results.push({
        viewport: vp.name,
        state,
        waapiCount: motion.waapiFirstSeen.length,
        animateCallCount: motion.animateCalls.length,
        sampleAnimateCalls: motion.animateCalls.slice(0, 12),
      });
    } catch (error) {
      results.push({
        viewport: vp.name,
        error: String((error && error.message) || error),
      });
    }
    await context.close();
  }
  return results;
}

function gzipLargeOutputs() {
  try {
    for (const name of readdirSync(OUT)) {
      if (!name.endsWith(".json") && !name.endsWith(".html")) continue;
      if (name.endsWith(".gz")) continue;
      const path = resolve(OUT, name);
      const size = statSync(path).size;
      if (size < 1_200_000) continue;
      writeFileSync(`${path}.gz`, gzipSync(readFileSync(path)));
      unlinkSync(path);
    }
  } catch (error) {
    console.error(
      `gzip pass failed: ${String((error && error.message) || error)}`,
    );
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
  let reducedMotion = [];
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
          await page.goto(BASE, {
            waitUntil: "domcontentloaded",
            timeout: 120000,
          });
          await settle(page);
          const summary = await capture(page, vp, theme, report);
          report[report.length - 1].consoleErrors = errors.slice(0, 10);
          console.log(
            `${TARGET} ${vp.name} ${theme}: ${summary.sections} sections, ${summary.svgs} svgs, ${summary.waapi} waapi, overflowX=${summary.overflowX}`,
          );
        } catch (error) {
          failures.push({
            viewport: vp.name,
            theme,
            message: String((error && error.message) || error),
          });
          console.error(
            `FAILED ${vp.name} ${theme}: ${String((error && error.message) || error)}`,
          );
        }
        await context.close();
      }
    }
    reducedMotion = await captureReducedMotion(browser);
  } finally {
    await browser.close();
    runNotes.finishedAt = new Date().toISOString();
    writeJson("changelog-run-notes.json", runNotes);
  }

  writeJson("chg-reduced-motion.json", reducedMotion);
  writeJson("changelog-summary.json", report);
  writeJson("changelog-failures.json", failures);
  gzipLargeOutputs();

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main();
