import { launch, newPage, BASE, sleep } from "./common.mjs";
const browser = await launch();
const out = {};
const probe = `(() => {
  const h1 = document.querySelector("h1");
  const words = [...h1.querySelectorAll(".lm-hero-word, .lm-hero-accent")];
  const ops = words.map(w => getComputedStyle(w).opacity);
  const clips = words.map(w => getComputedStyle(w).clipPath);
  const anims = words.map(w => getComputedStyle(w).animationName);
  const lead = document.querySelector(".lm-hero-in:not(h1 *)") ;
  const leadEl = [...document.querySelectorAll("p")].find(p => /From a solo engagement/.test(p.textContent));
  const layers = [...document.querySelectorAll(".lm-stage-persistent .lm-mock-layer")];
  const cats = [...document.querySelectorAll("section[aria-label='Practices'] article")].length;
  const wfs = [...document.querySelectorAll("section[aria-label='Practices'] article ol > li")].length;
  const visibleInline = [...document.querySelectorAll(".lm-stage-inline")].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; }).length;
  const mockLayersOpacity = layers.map(l => getComputedStyle(l).opacity);
  const mockLayerVis = layers.map(l => getComputedStyle(l).visibility);
  const mockLayerTransition = layers.map(l => getComputedStyle(l).transitionDuration);
  const reveals = [...document.querySelectorAll(".lm-reveal")].map(r => getComputedStyle(r).opacity);
  const wordBlur = [...document.querySelectorAll(".lm-word-blur > span")].map(s => getComputedStyle(s).opacity);
  const clipped = [...document.querySelectorAll("*")].filter(e => { const cs = getComputedStyle(e); return (cs.overflow === 'hidden' || cs.overflowY === 'hidden') && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0 && e.children.length > 0; }).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,60), sh: e.scrollHeight, ch: e.clientHeight }));
  const footer = !!document.querySelector("footer");
  const footerText = document.querySelector("footer")?.innerText.replace(/\\s+/g,' ').slice(0,80);
  const ctaHeading = [...document.querySelectorAll("h2")].map(h => h.innerText.replace(/\\s+/g,' ').trim());
  const bodyText = document.body.innerText;
  return {
    heroHeadingText: h1.innerText.replace(/\\s+/g,' '),
    heroWordOpacity: ops, heroWordClip: clips.slice(0,2), heroAnim: anims.slice(0,2),
    leadOpacity: leadEl ? getComputedStyle(leadEl).opacity : null,
    leadAnim: leadEl ? getComputedStyle(leadEl).animationName : null,
    categories: cats, workflows: wfs, visibleInlineMockups: visibleInline,
    stageLayerOpacity: mockLayersOpacity, stageLayerVisibility: mockLayerVis, stageLayerTransition: mockLayerTransition,
    revealOpacities: [...new Set(reveals)], wordBlurOpacities: [...new Set(wordBlur)],
    clippedContainers: clipped.slice(0,5), clippedCount: clipped.length,
    footerPresent: footer, footerSnippet: footerText,
    h2s: ctaHeading,
    disclosureVisibleText: (bodyText.match(/Illustrative example · fictional client/g) || []).length,
    planCtaText: /Talk to us|Start free|See pricing|Compare plans/.test(bodyText),
    templatesCount: (bodyText.match(/Templates/g) || []).length,
    heroVisibleRect: (() => { const r = h1.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; })(),
  };
})()`;

// Reduced motion: real browser, OS-level preference emulated.
{
  const { context, page } = await newPage(browser, { width: 1440, height: 900, reducedMotion: "reduce" });
  await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
  // Read at t=0 (no wait): the entrance must already be at its end state.
  const t0 = await page.evaluate(probe);
  const mq = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await sleep(1200);
  const settled = await page.evaluate(probe);
  // Category switching still works and the fill still reaches 100%.
  const positions = await page.evaluate(() => [...document.querySelectorAll("[data-practice-heading]")].map(h => h.getBoundingClientRect().top + scrollY));
  const seq = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate((y) => window.scrollTo(0, y - 360), positions[i]);
    await sleep(250);
    seq.push(await page.evaluate(() => { const fill = document.querySelector(".lm-stage-persistent .lm-mock-stage-foot span.h-0\\.5 > span"); return { counter: document.querySelector(".lm-stage-persistent .lm-mock-stage-foot p").innerText.replace(/\s+/g,' ').trim(), fill: +(fill.getBoundingClientRect().width / fill.parentElement.getBoundingClientRect().width * 100).toFixed(1), transition: getComputedStyle(fill).transitionDuration }; }));
  }
  out.reducedMotion = { mediaActive: mq, atT0: t0, settled, switching: seq };
  await context.close();
}
// No-JS: javaScriptEnabled=false, same page, same widths.
for (const width of [390, 1440]) {
  const { context, page } = await newPage(browser, { width, height: 900, javaScriptEnabled: false });
  const resp = await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
  await sleep(800);
  const r = await page.evaluate(probe).catch((e) => ({ error: e.message }));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const serverHtml = await resp.text();
  out[`noJs-${width}`] = { status: resp.status(), overflow, ...r, serverHasCategories: ["One trail per client", "Creative direction that survives", "Proposals that become working plans", "Reports that write themselves"].map(s => serverHtml.includes(s)), serverDisclosureCount: (serverHtml.match(/Illustrative example · fictional client/g) || []).length, serverHasH1: /<h1[^>]*>Different/.test(serverHtml) || serverHtml.includes("Different client") };
  await context.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
