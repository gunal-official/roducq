#!/usr/bin/env node
/**
 * sample-landing-pixels — read exact colours out of a capture.
 *
 * The capture harness records computed styles, but a gradient, a glow or a
 * translucent overlay has no single computed colour: it is only knowable
 * from the rendered pixels. This samples a PNG at given coordinates and
 * prints the RGB, so a gradient stop can be compared against a token
 * instead of guessed from a screenshot.
 *
 * RUN
 *   node scripts/sample-landing-pixels.mjs image.png 100,200 640,300 ...
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = resolve(new URL("..", import.meta.url).pathname);

const [file, ...points] = process.argv.slice(2);
if (!file || points.length === 0) {
  console.error("usage: <png> <x,y> [<x,y> ...]");
  process.exit(2);
}

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

const src = `data:image/png;base64,${readFileSync(resolve(file)).toString("base64")}`;

const browser = await chromium.launch(options);
try {
  const page = await browser.newPage();
  const samples = await page.evaluate(
    async ([src, points]) => {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("decode failed"));
        i.src = src;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      return {
        size: [img.width, img.height],
        points: points.map((p) => {
          const [x, y] = p.split(",").map(Number);
          const d = ctx.getImageData(x, y, 1, 1).data;
          return {
            x,
            y,
            rgb: `rgb(${d[0]}, ${d[1]}, ${d[2]})`,
            hex: `#${[d[0], d[1], d[2]]
              .map((v) => v.toString(16).padStart(2, "0"))
              .join("")}`,
            alpha: d[3],
          };
        }),
      };
    },
    [src, points],
  );
  console.log(`${file}  ${samples.size[0]}×${samples.size[1]}`);
  for (const s of samples.points) {
    console.log(`  (${s.x},${s.y})  ${s.rgb}  ${s.hex}  alpha=${s.alpha}`);
  }
} finally {
  await browser.close();
}
