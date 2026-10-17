#!/usr/bin/env node
/**
 * compare-landing-images — dependency-free visual difference between two PNGs.
 *
 * WHY NO PIXELMATCH. The repository has one browser dependency
 * (`playwright-core`) and this comparison does not need a second one: the
 * browser that renders the pages can diff them, because a canvas gives
 * exact per-pixel access to both images. That keeps the dependency surface
 * unchanged and the comparison runs in the same Chromium build that took
 * the screenshots, so there is no colour-management or decoder mismatch
 * between "the capture" and "the diff".
 *
 * WHAT IT PRINTS
 *   • the two image sizes (a size mismatch is reported first, because a
 *     pixel diff across different sizes is meaningless)
 *   • the share of pixels that differ by more than the threshold
 *   • the mean and maximum per-channel delta
 *   • the bounding box of the differing region
 *
 * WHAT IT WRITES
 *   • the difference image, amplified so a small delta is visible
 *
 * RUN
 *   node scripts/compare-landing-images.mjs \
 *     --a forma-1440x900-light-full.png \
 *     --b roducq-1440x900-light-full.png \
 *     --out diff-forma-vs-roducq-1440-light.png
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(new URL("..", import.meta.url).pathname);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const A = arg("a");
const B = arg("b");
const OUT = arg("out", "diff.png");
const THRESHOLD = Number(arg("threshold", "16"));

if (!A || !B) {
  console.error("usage: --a <png> --b <png> [--out <png>] [--threshold 0-255]");
  process.exit(2);
}

async function launch() {
  const { chromium } = require("playwright-core");
  const options = {
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
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

const dataUrl = (file) =>
  `data:image/png;base64,${readFileSync(resolve(file)).toString("base64")}`;

const browser = await launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ([aSrc, bSrc, threshold]) => {
      const load = (src) =>
        new Promise((resolveLoad, reject) => {
          const img = new Image();
          img.onload = () => resolveLoad(img);
          img.onerror = () => reject(new Error("could not decode image"));
          img.src = src;
        });

      const [a, b] = await Promise.all([load(aSrc), load(bSrc)]);
      const width = Math.max(a.width, b.width);
      const height = Math.max(a.height, b.height);

      const read = (img) => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height);
      };

      const da = read(a);
      const db = read(b);
      const out = new ImageData(width, height);
      const od = out.data;

      let differing = 0;
      let sumDelta = 0;
      let maxDelta = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const inA = x < a.width && y < a.height;
          const inB = x < b.width && y < b.height;
          const ai = (y * a.width + x) * 4;
          const bi = (y * b.width + x) * 4;
          const oi = (y * width + x) * 4;

          const ar = inA ? da.data[ai] : 255;
          const ag = inA ? da.data[ai + 1] : 255;
          const ab = inA ? da.data[ai + 2] : 255;
          const br = inB ? db.data[bi] : 255;
          const bg = inB ? db.data[bi + 1] : 255;
          const bb = inB ? db.data[bi + 2] : 255;

          const delta =
            (Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb)) / 3;

          sumDelta += delta;
          if (delta > maxDelta) maxDelta = delta;

          if (delta > threshold) {
            differing += 1;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            // Differing pixels are painted magenta over a dimmed base, so the
            // shape of the difference is readable at a glance.
            od[oi] = 255;
            od[oi + 1] = 0;
            od[oi + 2] = 255;
            od[oi + 3] = 255;
          } else {
            const grey = 255 - (255 - (ar + ag + ab) / 3) * 0.18;
            od[oi] = grey;
            od[oi + 1] = grey;
            od[oi + 2] = grey;
            od[oi + 3] = 255;
          }
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").putImageData(out, 0, 0);

      return {
        aSize: [a.width, a.height],
        bSize: [b.width, b.height],
        width,
        height,
        differing,
        total: width * height,
        meanDelta: sumDelta / (width * height),
        maxDelta,
        bbox:
          maxX === -1
            ? null
            : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
        diffPng: canvas.toDataURL("image/png"),
      };
    },
    [dataUrl(A), dataUrl(B), THRESHOLD],
  );

  const pct = (result.differing / result.total) * 100;
  console.log(`A ${A}  ${result.aSize[0]}×${result.aSize[1]}`);
  console.log(`B ${B}  ${result.bSize[0]}×${result.bSize[1]}`);
  console.log(
    `differing pixels (Δ>${THRESHOLD}): ${result.differing} / ${result.total} = ${pct.toFixed(2)}%`,
  );
  console.log(
    `mean channel delta ${result.meanDelta.toFixed(2)}  max ${result.maxDelta}`,
  );
  console.log(
    `difference bounding box ${result.bbox ? `${result.bbox.x},${result.bbox.y} ${result.bbox.w}×${result.bbox.h}` : "none"}`,
  );

  writeFileSync(
    resolve(OUT),
    Buffer.from(result.diffPng.split(",")[1], "base64"),
  );
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
}
