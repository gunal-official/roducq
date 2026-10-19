import { mkdirSync } from "node:fs";
import { launch, newPage, BASE, sleep } from "./common.mjs";
const OUT = "verify-out/crosspage";
mkdirSync(OUT, { recursive: true });
const ROUTES = ["/", "/solutions", "/pricing", "/about", "/vs", "/vs/notion"];
const WIDTHS = [390, 1024, 1440];
const browser = await launch();
const rows = [];
try {
  for (const route of ROUTES) for (const scheme of ["light", "dark"]) for (const width of WIDTHS) {
    const { context, page } = await newPage(browser, { width, height: 900, scheme });
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await sleep(1200);
    await page.evaluate(async () => { const t = document.documentElement.scrollHeight; for (let y = 0; y <= t; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
    await sleep(600);
    const m = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      h1: document.querySelectorAll("h1").length,
      header: !!document.querySelector("header"),
      footer: !!document.querySelector("footer"),
      themeToggle: !!document.querySelector("header button[aria-label*='theme' i]"),
      navLinks: [...document.querySelectorAll("header nav a, header a[aria-current]")].length,
      backToTop: !!document.querySelector("a[href='#top']"),
      htmlTheme: document.documentElement.className.includes(document.documentElement.className.includes("dark") ? "dark" : "light"),
    }));
    if (width === 1440 && scheme === "light" || width === 390 && scheme === "dark") {
      await page.screenshot({ path: `${OUT}/${(route === "/" ? "home" : route.replace(/\//g, "-").replace(/^-/, ""))}-${width}-${scheme}.png`, fullPage: false });
    }
    rows.push({ route, scheme, width, status: resp.status(), ...m, pageErrors: errs.length });
    await context.close();
  }
} finally { await browser.close(); }
for (const r of rows) console.log(`${r.route.padEnd(12)} ${r.scheme.padEnd(5)} ${String(r.width).padEnd(5)} status=${r.status} overflow=${r.overflow} h1=${r.h1} header=${r.header} footer=${r.footer} toggle=${r.themeToggle} backTop=${r.backToTop} errs=${r.pageErrors}`);
