import { launch, newPage, BASE, sleep } from "./common.mjs";
const browser = await launch();
const out = {};
try {
for (const width of [1440, 1200]) {
  const { context, page } = await newPage(browser, { width, height: 900 });
  await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
  await sleep(1200);
  const yOf = await page.evaluate(() => {
    const hs = [...document.querySelectorAll("[data-practice-heading]")];
    return hs.map((h) => h.getBoundingClientRect().top + scrollY);
  });
  const settled = [];
  for (let i = 0; i < 4; i++) {
    // Put the category headline at ~40% of the viewport: past the 0.3 threshold, before the next one.
    await page.evaluate((y) => window.scrollTo(0, y - 360), yOf[i]);
    await sleep(1600);
    settled.push(await page.evaluate(() => {
      const fill = document.querySelector(".lm-stage-persistent .lm-mock-stage-foot span.h-0\\.5 > span");
      const pct = fill.getBoundingClientRect().width / fill.parentElement.getBoundingClientRect().width * 100;
      const counter = document.querySelector(".lm-stage-persistent .lm-mock-stage-foot p").innerText.replace(/\s+/g, " ").trim();
      const layers = [...document.querySelectorAll(".lm-stage-persistent .lm-mock-layer")];
      const active = layers.findIndex((l) => l.dataset.active === "true");
      const opac = layers.map((l) => +getComputedStyle(l).opacity);
      return { counter, fillPct: +pct.toFixed(2), active, opacities: opac, transitionFill: getComputedStyle(fill).transition };
    }));
  }
  out[width] = { settled };
  // Crossfade 02 -> 03 per frame, from the moment the switch fires.
  const fire = yOf[2];
  await page.evaluate((y) => window.scrollTo(0, y - 1300), fire);
  await sleep(1500);
  const frames = await page.evaluate(async (y) => {
    const layers = [...document.querySelectorAll(".lm-stage-persistent .lm-mock-layer")];
    const before = layers.map((l) => +getComputedStyle(l).opacity);
    const t0 = performance.now();
    const frames = [];
    // Scroll across the 0.3 threshold of the next heading in one step.
    window.scrollTo(0, y + 60);
    await new Promise((res) => { const tick = () => { const t = performance.now() - t0; frames.push({ t, op: layers.map((l) => +getComputedStyle(l).opacity) }); if (t < 1200) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    return { before, frames: frames.map((f) => ({ t: Math.round(f.t), op: f.op.map((v) => +v.toFixed(3)) })) };
  }, fire);
  const idxRise = frames.frames.findIndex((f) => f.op.some((v, i) => v > 0.001 && frames.before[i] <= 0.001));
  const incomingLayer = frames.frames.length ? frames.frames[frames.frames.length - 1].op.map((v, i) => (v > 0.99 ? i : -1)).filter((i) => i >= 0) : [];
  out[width].crossfade = { before: frames.before, firstRiseMs: idxRise >= 0 ? frames.frames[idxRise].t : null, settledLayers: incomingLayer, sample: frames.frames.filter((_, i) => i % 6 === 0).slice(0, 14) };
  await context.close();
}
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 1));
