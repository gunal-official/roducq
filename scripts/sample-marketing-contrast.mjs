// Manual contrast inspection for the nodes axe-core leaves "incomplete":
// text whose background is a gradient, an image or a decorative overlay.
// axe cannot resolve those, so this samples the *actual rendered pixel* and
// composites the computed text colour (including alpha) over it, then prints
// the WCAG 2.x ratio.
//
// Two sampling modes:
//   interior - the element box is captured twice, once as rendered and once
//              with the text made transparent. Pixels that change are glyph
//              pixels; the transparent pass gives the exact backdrop under
//              each one, and the lightest of those is the worst case. This
//              is the only mode that survives a gradient crossing the box:
//              sampling *beside* the box misses the bright corner entirely
//              (it read 5.02:1 where the glyphs actually sit on 3.58:1).
//   beside   - a background-only pixel 6px left of the box, used for the
//              gradient-stop sweep where each stop needs a known x.
//
// CASE entries are [route, selector, label, width?]; width defaults to 1440.
// Widths below the desktop breakpoint matter: the stage reflows, the copy
// crosses the gradient's bright corner, and that is the worst case.
import { chromium } from "/home/user/roducq/node_modules/playwright-core/index.mjs";
import { inflateSync } from "node:zlib";

/** Minimal PNG reader: 8-bit RGB/RGBA, non-interlaced (what Chromium emits). */
function decodePng(buffer) {
  let offset = 8;
  let width = 0, height = 0, colorType = 0, bitDepth = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  if (!channels) throw new Error(`unsupported colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? out[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[x] = value & 0xff;
    }
  }
  return { width, height, channels, pixels };
}

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
const parseColor = (value) => {
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
};
const composite = (fg, alpha, bg) =>
  fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

/** Lightest backdrop pixel under the glyphs of `handle`, or null when the
 *  box holds no text. Works by diffing a normal screenshot against one with
 *  the text made transparent; the second pass supplies the backdrop. */
async function lightestGlyphBackdrop(page, handle) {
  const clip = await handle.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.floor(r.left),
      y: Math.floor(r.top),
      width: Math.ceil(r.width),
      height: Math.ceil(r.height),
    };
  });
  if (clip.width < 2 || clip.height < 2) return null;
  const { pixels, channels } = decodePng(await page.screenshot({ clip }));
  await handle.evaluate((el) => {
    for (const node of [el, ...el.querySelectorAll("*")]) {
      node.style.setProperty("color", "transparent", "important");
    }
  });
  await page.waitForTimeout(120);
  const bare = decodePng(await page.screenshot({ clip }));
  await handle.evaluate((el) => {
    for (const node of [el, ...el.querySelectorAll("*")]) {
      node.style.removeProperty("color");
    }
  });
  const diffs = [];
  let maxDiff = 0;
  for (let p = 0; p < pixels.length; p += channels) {
    const d = Math.abs(pixels[p] - bare.pixels[p])
      + Math.abs(pixels[p + 1] - bare.pixels[p + 1])
      + Math.abs(pixels[p + 2] - bare.pixels[p + 2]);
    diffs.push(d);
    if (d > maxDiff) maxDiff = d;
  }
  if (maxDiff < 30) return null; // no glyphs inside the box
  // Only the core of each stroke: antialiased edges would understate the
  // ratio, and they are not what a reader sees.
  const core = maxDiff * 0.55;
  let lightest = null;
  for (let i = 0; i < diffs.length; i += 1) {
    if (diffs[i] < core) continue;
    const p = i * channels;
    const bg = [bare.pixels[p], bare.pixels[p + 1], bare.pixels[p + 2]];
    if (!lightest || luminance(bg) > luminance(lightest)) lightest = bg;
  }
  return lightest;
}

const browser = await chromium.launch({
  executablePath: "/tmp/chromium/chromium",
  args: ["--no-sandbox"],
  env: { ...process.env, LD_LIBRARY_PATH: "/tmp/chromium/lib" },
});

const CASES = [
  ["/", "p.lm-hero-in.mt-3\\.5", "hero note (muted ink on card)"],
  ["/", ".lm-cta-card h2", "closing CTA headline (white on gradient)"],
  ["/", ".lm-cta-card p", "closing CTA body (#efebff on gradient)"],
  ["/", ".lm-pricing-dark h3", "dark pricing card title"],
  ["/", ".lm-pricing-dark p", "dark pricing card body"],
  ["/", ".lm-purple-frame .rounded-lm-chip", "works-with chip inside the purple frame"],
  ["/solutions", ".lm-solutions-stage h2", "stage headline (white on gradient)"],
  ["/solutions", ".lm-solutions-stage p.text-lm-cta-muted", "stage body (94% white on gradient)"],
  ["/solutions", ".lm-solutions-stage p.text-lm-cta-faint", "stage note (76% white on gradient)"],
  ["/solutions", ".lm-solutions-stage p.text-lm-cta-muted", "stage body at 768px (94% white on gradient)", 768],
  ["/features", ".lm-solutions-stage h2", "stage headline (white on gradient)"],
  ["/features", ".lm-solutions-stage p.text-lm-cta-muted", "stage body (94% white on gradient)"],
  ["/integrations", ".lm-solutions-stage h2", "stage headline (white on gradient)"],
  ["/changelog", ".lm-solutions-stage h2", "stage headline (white on gradient)"],
  ["/changelog", ".lm-solutions-stage p.text-lm-cta-muted", "stage body (94% white on gradient)"],
  ["/changelog", ".lm-solutions-stage p.text-lm-cta-muted", "stage body at 768px (94% white on gradient)", 768],
  ["/changelog", ".lm-solutions-stage p.lm-stage-disclosure", "mock disclosure at 320px (94% white on gradient)", 320],
  ["/integrations", ".lm-solutions-stage p.lm-stage-disclosure", "mock disclosure at 320px (94% white on gradient)", 320],
];

/** Gradient-clipped headlines: the visible colour is the gradient stop at
 *  that x position, so each documented stop is measured against the pixel
 *  the text actually sits on. */
const GRADIENT_CASES = [
  ["/", ".lm-text-gradient, .lm-hero-accent", [[98, 70, 234], [139, 92, 246], [168, 85, 251]]],
  ["/features", ".lm-hero-accent", [[98, 70, 234], [139, 92, 246], [168, 85, 251]]],
  ["/solutions", ".lm-hero-accent", [[98, 70, 234], [139, 92, 246], [168, 85, 251]]],
  ["/solutions", ".lm-text-gradient-soft", [[216, 199, 255], [234, 210, 255], [246, 200, 255]]],
];

for (const [route, selector, label, width = 1440] of CASES) {
  for (const scheme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    await ctx.addInitScript((s) => { try { localStorage.setItem("theme", s); } catch {} }, scheme);
    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:3000" + route, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y <= total; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); }
      scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
    // First *visible* match (several of these selectors also match the
    // hidden compact variants of the same band).
    const handle = await page.evaluateHandle((sel) => {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && el.textContent.trim()) return el;
      }
      return null;
    }, selector);
    const found = await handle.evaluate((el) => Boolean(el));
    if (!found) { await ctx.close(); continue; }
    await handle.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(350);
    const target = { evaluate: (fn) => handle.evaluate(fn) };
    const style = await target.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, size: parseFloat(s.fontSize), weight: Number(s.fontWeight) };
    });
    const bg = await lightestGlyphBackdrop(page, handle);
    if (!bg) { await ctx.close(); continue; }
    const fg = parseColor(style.color);
    const textPx = composite(fg.rgb, fg.alpha, bg);
    const r = ratio(textPx, bg);
    const large = style.size >= 24 || (style.size >= 18.66 && style.weight >= 700);
    const need = large ? 3 : 4.5;
    console.log(
      `${scheme.padEnd(5)} ${route.padEnd(12)} ${String(width).padEnd(5)} ${r.toFixed(2).padStart(6)}:1 ${r >= need ? "PASS" : "FAIL"} (needs ${need}) ${label} — ${style.size}px/${style.weight} fg ${style.color} on rgb(${bg.join(",")})`,
    );
    await ctx.close();
  }
}

for (const [route, selector, stops] of GRADIENT_CASES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:3000" + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  // Park the headline in the middle of the viewport so the sampled pixel is
  // inside the captured frame.
  await page.evaluate((sel) => {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && el.textContent.trim()) {
        el.scrollIntoView({ block: "center" });
        return;
      }
    }
  }, selector);
  await page.waitForTimeout(400);
  const info = await page.evaluate((sel) => {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && el.textContent.trim()) {
        return {
          box: r.toJSON(),
          size: parseFloat(getComputedStyle(el).fontSize),
          weight: Number(getComputedStyle(el).fontWeight),
        };
      }
    }
    return null;
  }, selector);
  if (!info) { await ctx.close(); continue; }
  const large = info.size >= 24 || (info.size >= 18.66 && info.weight >= 700);
  const need = large ? 3 : 4.5;
  // The text sits on the page card plane; sample just outside its own box at
  // three x positions, one per gradient stop.
  for (const [idx, stop] of stops.entries()) {
    const x = info.box.x + (info.box.width * (0.15 + idx * 0.4));
    const y = Math.min(info.box.y + info.box.height / 2, info.box.y + 24);
    const shot = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } });
    const { pixels } = decodePng(shot);
    const bg = [pixels[0], pixels[1], pixels[2]];
    const r = ratio(stop, bg);
    console.log(
      `${route.padEnd(12)} ${r.toFixed(2).padStart(6)}:1 ${r >= need ? "PASS" : "FAIL"} (needs ${need}) gradient stop rgb(${stop.join(",")}) at x=${Math.round(x)} on rgb(${bg.join(",")}) — ${info.size}px/${info.weight}`,
    );
  }
  await ctx.close();
}

await browser.close();
