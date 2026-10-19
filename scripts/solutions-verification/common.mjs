// Shared helpers for the /solutions verification harness.
// Lives OUTSIDE the repository on purpose: nothing here is a dependency of Roducq.
import chromium from "@sparticuz/chromium";
import { chromium as pw } from "playwright-core";

export const BASE = process.env.BASE_URL || "http://localhost:3000";
export const CHROME_VERSION_TAG = "153.0.0 (@sparticuz/chromium)";

let _exe = null;
export async function exe() {
  if (!_exe) _exe = await chromium.executablePath();
  return _exe;
}

export async function launch(extraArgs = []) {
  const executablePath = await exe();
  return pw.launch({
    executablePath,
    headless: true,
    args: [...chromium.args.filter((a) => a !== "--single-process"), ...extraArgs],
  });
}

export async function newPage(browser, opts = {}) {
  const {
    width = 1440,
    height = 900,
    dpr = 1,
    scheme = "light",
    reducedMotion = "no-preference",
    javaScriptEnabled = true,
    isMobile = false,
    hasTouch = false,
  } = opts;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    colorScheme: scheme,
    reducedMotion,
    javaScriptEnabled,
    isMobile,
    hasTouch,
  });
  // next-themes stores the choice under "theme" and applies it as a class on
  // <html> before first paint, so set it before any page script runs.
  await context.addInitScript((s) => {
    try {
      localStorage.setItem("theme", s);
    } catch {}
  }, scheme);
  const page = await context.newPage();
  return { context, page };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
