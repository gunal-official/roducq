// Phase 7 — axe-core (repo devDependency, 4.14.0) against /solutions and /, light + dark.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { launch, newPage, BASE, sleep } from "./common.mjs";
const AXE = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const OUT = "verify-out/axe";
mkdirSync(OUT, { recursive: true });
const WIDTHS = [320, 390, 768, 1024, 1280, 1440];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const routes = (process.env.ROUTES || "/solutions,/").split(",");
const browser = await launch();
const out = [];
const MODE = process.env.MODE || "freeze";
try {
  for (const route of routes) for (const scheme of ["light", "dark"]) for (const width of WIDTHS) {
    const { context, page } = await newPage(browser, { width, height: 900, scheme, reducedMotion: MODE === "reduced" ? "reduce" : "no-preference" });
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await sleep(1500);
    await page.evaluate(async () => { const t = document.documentElement.scrollHeight; for (let y = 0; y <= t; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    await sleep(800);
    // The status pill swaps every 3s with a 500ms fade (PracticeMocks.tsx). axe samples
    // the half-faded incoming label, which is a timing artifact, so the scan freezes the
    // pill's transition (content unchanged). A second pass runs under reduced motion.
    if (process.env.FREEZE_PILL !== "0") await page.addStyleTag({ content: ".lm-pill-swap{transition:none!important}" });
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(async (tags) => {
      const res = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
      const pick = (arr) => arr.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
      return { violations: pick(res.violations), incomplete: res.incomplete.length, passes: res.passes.length, inapplicable: res.inapplicable.length };
    }, TAGS);
    const crit = r.violations.filter((v) => v.impact === "critical").length;
    const serious = r.violations.filter((v) => v.impact === "serious").length;
    out.push({ route, scheme, width, mode: MODE, critical: crit, serious, total: r.violations.length, ...r });
    console.log(`${route} ${scheme} ${width}: violations=${r.violations.length} critical=${crit} serious=${serious} incomplete=${r.incomplete} passes=${r.passes}`);
    await context.close();
  }
} finally { await browser.close(); }
writeFileSync(`${OUT}/axe-results-${MODE}.json`, JSON.stringify(out, null, 2));
console.log("WROTE");
