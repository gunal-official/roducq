// Phase 3 — responsive overflow, structure and screenshots for /solutions.
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, newPage, BASE, sleep } from "./common.mjs";

const WIDTHS = [320, 375, 390, 768, 1024, 1199, 1200, 1280, 1440];
const SCHEMES = ["light", "dark"];
const SHOTS = new Set(["320-light", "390-light", "390-dark", "768-dark", "1024-light", "1200-light", "1440-light", "1440-dark"]);
const OUT = process.env.OUT_DIR || "verify-out/layout";
mkdirSync(OUT, { recursive: true });

const browser = await launch();
const results = [];
try {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const { context, page } = await newPage(browser, { width, height: 900, scheme });
      const errors = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console: ${m.text()}`);
      });
      const resp = await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
      await sleep(1800); // let the hero entrance and reveals settle (max 1.2s + delay)
      // Force reveals on below-fold bands so the layout is measured in its settled state.
      await page.evaluate(async () => {
        const total = document.documentElement.scrollHeight;
        for (let y = 0; y <= total; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await sleep(1500);

      const m = await page.evaluate((w) => {
        const de = document.documentElement;
        const overflow = de.scrollWidth - de.clientWidth;
        const offenders = [];
        if (overflow > 0) {
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.right > de.clientWidth + 0.5 || r.left < -0.5)) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 80),
                left: Math.round(r.left),
                right: Math.round(r.right),
              });
              if (offenders.length >= 6) break;
            }
          }
        }
        const h1 = document.querySelector("h1");
        const h1r = h1 ? h1.getBoundingClientRect() : null;
        const h1cs = h1 ? getComputedStyle(h1) : null;
        const h1Lines = h1 && h1cs ? Math.round(h1r.height / parseFloat(h1cs.lineHeight)) : null;
        const articles = [...document.querySelectorAll("section[aria-label='Practices'] article")];
        const h2s = [...document.querySelectorAll("section[aria-label='Practices'] [data-practice-heading]")].map((h) => h.textContent.replace(/\s+/g, " ").trim());
        const workflowCounts = articles.map((a) => a.querySelectorAll("ol > li").length);
        const disclosures = [...document.querySelectorAll("*")].filter((el) => el.childElementCount === 0 && /Illustrative example · fictional client/.test(el.textContent || "")).length;
        const ariaDisclosures = [...document.querySelectorAll("[aria-label]")].filter((el) => /Illustrative example/.test(el.getAttribute("aria-label"))).length;
        const bodyText = document.body.innerText;
        const forbidden = ["Forma", "framer", "Framer", "Talk to sales", "Changelog", "$19", "$49", "$99", "Pro plan", "Enterprise", "testimonial", "★"].filter((s) => bodyText.includes(s));
        const navLinks = [...document.querySelectorAll("header nav a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") }));
        const dark = getComputedStyle(document.body).backgroundColor;
        const headerRect = document.querySelector("header")?.getBoundingClientRect();
        const sectionNav = document.querySelector("nav[aria-label='Practices on this page']");
        const snr = sectionNav ? sectionNav.getBoundingClientRect() : null;
        return {
          innerWidth: window.innerWidth,
          clientWidth: de.clientWidth,
          scrollWidth: de.scrollWidth,
          overflowPx: overflow,
          offenders,
          h1: h1 ? h1.textContent.replace(/\s+/g, " ").trim() : null,
          h1FontSize: h1cs ? h1cs.fontSize : null,
          h1LineHeight: h1cs ? h1cs.lineHeight : null,
          h1Lines,
          h1Height: h1r ? Math.round(h1r.height) : null,
          h2Count: h2s.length,
          h2s,
          articleCount: articles.length,
          workflowCounts,
          disclosureTextNodes: disclosures,
          disclosureAriaLabels: ariaDisclosures,
          forbiddenHits: forbidden,
          headerNav: navLinks,
          sectionNavPresent: !!sectionNav,
          sectionNavBox: snr ? [Math.round(snr.width), Math.round(snr.height)] : null,
          headerHeight: headerRect ? Math.round(headerRect.height) : null,
          planBand: !!document.querySelector("section[aria-label]") ,
          bodyBackground: dark,
          hasPlanText: /Starter|Team|Studio/.test(bodyText),
          prices: [...bodyText.matchAll(/\$\s?\d+(?:\.\d+)?(?:\s*\/\s*(?:month|mo))?/g)].map((x) => x[0]),
          footerPresent: !!document.querySelector("footer"),
          backToTop: !!document.querySelector("a[href='#top']"),
          mainText: document.querySelector("main") ? "main" : null,
        };
      }, width);

      // Visible-ness of the hero words at the settled state.
      const heroVisible = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        const words = [...h1.querySelectorAll(".lm-hero-word")];
        return words.every((w) => getComputedStyle(w).opacity === "1");
      });

      const key = `${width}-${scheme}`;
      if (SHOTS.has(key)) {
        const file = `${OUT}/solutions-${key}-viewport.png`;
        await page.evaluate(() => window.scrollTo(0, 0));
        await sleep(300);
        await page.screenshot({ path: file, fullPage: false });
        await page.screenshot({ path: `${OUT}/solutions-${key}-full.png`, fullPage: true });
        m.screenshots = [file, `${OUT}/solutions-${key}-full.png`];
      }
      results.push({ width, scheme, status: resp.status(), heroWordsOpacity1: heroVisible, errors: errors.slice(0, 5), ...m });
      await context.close();
      console.log(`${key} overflow=${m.overflowPx} h1Lines=${m.h1Lines} articles=${m.articleCount} wf=${m.workflowCounts} disc=${m.disclosureTextNodes}/${m.disclosureAriaLabels} errs=${errors.length} forbidden=${m.forbiddenHits.length}`);
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${OUT}/layout-results.json`, JSON.stringify(results, null, 2));
console.log("WROTE", `${OUT}/layout-results.json`);
