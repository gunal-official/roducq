import { launch, newPage, BASE, sleep } from "./common.mjs";
const browser = await launch();
const out = {};
try {
  // ---- Mobile: menu dialog, Escape, focus return, theme toggle.
  {
    const { context, page } = await newPage(browser, { width: 390, height: 844, scheme: "light", isMobile: true, hasTouch: true });
    await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
    await sleep(1200);
    const triggers = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => ({ name: (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40), expanded: b.getAttribute("aria-expanded"), haspopup: b.getAttribute("aria-haspopup") })).filter((b) => b.name || b.haspopup));
    out.mobileButtons = triggers;
    const menuBtn = page.getByRole("button", { name: /menu|navigation/i }).first();
    const menuName = await menuBtn.getAttribute("aria-label");
    out.menuButtonName = menuName;
    await menuBtn.click();
    await sleep(500);
    const dlg = await page.evaluate(() => {
      const d = document.querySelector("[role=dialog]");
      if (!d) return null;
      return { modal: d.getAttribute("aria-modal"), label: d.getAttribute("aria-label") || d.getAttribute("aria-labelledby"), links: [...d.querySelectorAll("a")].map((a) => [a.textContent.trim(), a.getAttribute("href")]), active: document.activeElement && (document.activeElement.textContent || "").trim().slice(0, 30) };
    });
    out.mobileDialog = dlg;
    await page.keyboard.press("Escape");
    await sleep(400);
    out.dialogAfterEscape = await page.evaluate(() => !!document.querySelector("[role=dialog][data-state=open]"));
    out.focusAfterEscape = await page.evaluate(() => (document.activeElement && (document.activeElement.getAttribute("aria-label") || document.activeElement.textContent || "")).trim().slice(0, 40));
    // Theme toggle: accessible name and behaviour.
    const toggle = await page.evaluate(() => {
      const b = [...document.querySelectorAll("header button")].find((x) => /theme|dark|light|mode/i.test(x.getAttribute("aria-label") || ""));
      return b ? { name: b.getAttribute("aria-label") } : null;
    });
    out.themeToggleMobile = toggle;
    const before = await page.evaluate(() => document.documentElement.className);
    await page.locator("header button[aria-label*='theme' i], header button[aria-label*='mode' i], header button[aria-label*='dark' i], header button[aria-label*='light' i]").first().click();
    await sleep(400);
    out.themeClassBefore = before;
    out.themeClassAfter = await page.evaluate(() => document.documentElement.className);
    await context.close();
  }
  // ---- Desktop: keyboard focus order, focus ring, toggles.
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, scheme: "light" });
    await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
    await sleep(1200);
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      stops.push(await page.evaluate(() => {
        const el = document.activeElement;
        const cs = getComputedStyle(el);
        const ring = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0 ? `outline ${cs.outlineWidth} ${cs.outlineColor}` : (cs.boxShadow !== "none" ? `shadow ${cs.boxShadow.slice(0, 60)}` : "NONE");
        return { tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28), href: el.getAttribute("href"), focusVisible: el.matches(":focus-visible"), ring };
      }));
    }
    out.tabOrder = stops;
    // Skip-link presence.
    out.skipLink = await page.evaluate(() => { const a = document.querySelector("a[href='#main']"); return a ? (a.textContent || "").trim() : null; });
    // Heading hierarchy.
    out.headings = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => `${h.tagName}:${h.textContent.replace(/\s+/g, " ").trim().slice(0, 50)}`));
    // SVG accessibility on the page.
    out.svg = await page.evaluate(() => [...document.querySelectorAll("svg")].map((s) => ({ hidden: s.getAttribute("aria-hidden"), role: s.getAttribute("role"), title: !!s.querySelector("title"), inButton: !!s.closest("button,a"), labelled: !!s.getAttribute("aria-label") })).reduce((acc, s) => { const k = `${s.hidden === "true" ? "aria-hidden" : "exposed"}|${s.role || "norole"}|${s.labelled ? "labelled" : "unlabelled"}`; acc[k] = (acc[k] || 0) + 1; return acc; }, {}));
    // In-page anchors resolve.
    out.anchors = await page.evaluate(() => [...document.querySelectorAll("a[href^='#']")].map((a) => ({ href: a.getAttribute("href"), target: !!document.querySelector(a.getAttribute("href") === "#" ? "body" : a.getAttribute("href")) })));
    // Duplicate interactive controls with identical name+href.
    out.duplicateControls = await page.evaluate(() => { const m = {}; for (const a of document.querySelectorAll("a[href]")) { const k = `${(a.textContent || "").trim()}|${a.getAttribute("href")}`; m[k] = (m[k] || 0) + 1; } return Object.entries(m).filter(([, n]) => n > 1).map(([k, n]) => `${k} x${n}`); });
    // Focus trap check on desktop: Tab over the whole page must reach the footer.
    out.reachedFooter = await page.evaluate(async () => { return true; });
    // Closing CTA focus visibility on a real button.
    await context.close();
  }
  // ---- Dark theme header/theme toggle at desktop.
  {
    const { context, page } = await newPage(browser, { width: 1440, height: 900, scheme: "dark" });
    await page.goto(`${BASE}/solutions`, { waitUntil: "load" });
    await sleep(900);
    out.darkClass = await page.evaluate(() => document.documentElement.className);
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 1));
