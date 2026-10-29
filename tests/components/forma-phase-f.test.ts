/** Phase F's source contracts complement (not replace) the real Chromium
 * geometry, axe, keyboard, theme, reduced-motion and print probes. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { discoverRoutes, assertRouteCoverage, installFixtureNetwork } from "../../scripts/responsive/phase-f.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const CSS = read("app/globals.css");
const HARNESS = read("scripts/verify-responsive.mjs");
const QA = read("scripts/responsive/phase-f.mjs");
const block = (selector: string) => {
  const start = CSS.indexOf(`${selector} {`);
  assert.ok(start >= 0, `missing ${selector}`);
  return CSS.slice(start, CSS.indexOf("}", start));
};

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? sourceFiles(`${dir}/${entry.name}`) : entry.name.endsWith(".tsx") ? [`${dir}/${entry.name}`] : []);
}

describe("Forma F — inventory and honest browser evidence", () => {
  it("inventories every actual App Router page and handler, without imagined features", () => {
    const inventory = discoverRoutes(ROOT);
    // 41 pages: the marketing surface grew with /changelog, /privacy, /terms
    // (Forma-referenced release history page, 2026-10-26), after
    // /integrations, /features and /solutions, /security, and /contact. The handler count is
    // unchanged: /changelog, /privacy, /terms, /security and /contact add no API routes.
    assert.equal(inventory.filter((route) => route.kind === "page").length, 41);
    assert.equal(inventory.filter((route) => route.kind === "handler").length, 18);
    for (const present of ["/privacy", "/terms", "/forgot-password", "/reset-password", "/dashboard", "/proposals/[id]/versions/[versionId]", "/share/[token]", "/invoice/[token]", "/invite/[token]"]) assert.ok(inventory.some((route) => route.pattern === present));
  });
  it("fails the coverage gate if any App Router page has no fixture", () => {
    assert.throws(() => assertRouteCoverage(ROOT, []), /Every App Router page/);
    assert.ok(HARNESS.includes("assertRouteCoverage(ROOT, PAGES)"));
  });
  it("adds direct dashboard and valid public fixtures without removing unavailable-link probes", () => {
    for (const slug of ["dashboard-direct", "public-invoice", "public-update", "public-invite", "invoice-token", "share-token", "invite-token"]) assert.ok(HARNESS.includes(`slug: "${slug}"`));
    assert.match(HARNESS, /expected: "Join Atelier North"/);
    assert.match(QA, /fixture\.expected && !result\.content\.includes/);
  });
  it("does not weaken the original geometry or tap-target thresholds", () => {
    for (const original of ["de.scrollWidth - de.clientWidth", "r.width < 43.5 || r.height < 43.5", "el.scrollWidth > el.clientWidth + 2", "m.overflowX > 0", "m.offenders.length > 0", "m.cutoffs.length > 0", "m.small.length > 0"]) assert.ok(HARNESS.includes(original));
    assert.match(HARNESS, /320, h: 568/);
    assert.match(HARNESS, /1440, h: 900/);
  });
  it("measures real scrolling containers below the fold without changing layout styles", () => {
    assert.match(HARNESS, /inspectScrollGeometry\(page, METRICS_FN\)/);
    const scroll = QA.slice(QA.indexOf("export async function inspectScrollGeometry"), QA.indexOf("export async function capturePage"));
    assert.match(scroll, /document\.scrollingElement/);
    assert.match(scroll, /el\.scrollHeight - el\.clientHeight/);
    assert.match(scroll, /page\.evaluate\(metrics\)/);
    assert.match(scroll, /info\.original/);
    assert.doesNotMatch(scroll, /addStyleTag|\.style\.|overflow:\s*hidden/);
    const team = read("components/settings/TeamCard.tsx");
    assert.match(team, /flex-\[1_1_8rem\]/);
    assert.match(team, /flex w-full flex-wrap items-center gap-2 sm:w-auto/);
  });
  it("uses real axe and preserves incomplete checks for human review", () => {
    assert.match(QA, /axe-core\/axe\.min\.js/);
    for (const tag of ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]) assert.ok(QA.includes(`"${tag}"`));
    assert.match(QA, /incomplete: result\.incomplete/);
    assert.doesNotMatch(QA, /bypassCSP:\s*true|disableRules|rules:\s*\{/);
  });
  it("fixes the local onboarding fixture's network without freezing auth or swallowing redirects", async () => {
    assert.match(QA, /installFixtureNetwork/);
    assert.match(QA, /new URL\(base\)\.hostname, "127\.0\.0\.1"/);
    assert.match(QA, /new URL\(stubOrigin\)\.hostname, "127\.0\.0\.1"/);
    assert.match(HARNESS, /Access-Control-Allow-Origin/);
    assert.match(QA, /grantPermissions\(\["local-network-access"\], \{ origin: base \}\)/);
    assert.doesNotMatch(HARNESS, /new Promise\(\(\) => \{\}\)/);
    assert.doesNotMatch(read("next.config.mjs"), /127\.0\.0\.1|bypassCSP/);
    // Exercise the fixture adapter too: 307/Location must reach the browser,
    // not be followed server-side and fulfilled as a false-positive 200.
    let handler: ((route: object) => Promise<void>) | undefined;
    const page = {
      context: () => ({ grantPermissions: async () => {} }),
      route: async (_url: string, next: typeof handler) => { handler = next; },
    };
    await installFixtureNetwork(page, "http://127.0.0.1:3000", "http://127.0.0.1:54330");
    const response = { headers: () => ({ "content-security-policy": "default-src 'self'; connect-src 'self' https://*.supabase.co", location: "/login", "x-frame-options": "DENY" }) };
    let fulfilled = false;
    await handler!({
      request: () => ({ resourceType: () => "document" }),
      fetch: async (options: object) => { assert.deepEqual(options, { maxRedirects: 0 }); return response; },
      fulfill: async (options: { response: object; headers: Record<string, string> }) => {
        assert.equal(options.response, response);
        assert.equal(options.headers.location, "/login");
        assert.equal(options.headers["x-frame-options"], "DENY");
        assert.match(options.headers["content-security-policy"], /connect-src 'self' https:\/\/\*\.supabase\.co http:\/\/127\.0\.0\.1:54330/);
        fulfilled = true;
      },
    });
    assert.ok(fulfilled);
    await assert.rejects(() => installFixtureNetwork(page, "https://roducq.nanexi.com", "http://127.0.0.1:54330"));

  });
  it("keeps axe a dev-only dependency; Motion.dev is the only motion runtime", () => {
    const pkg = JSON.parse(read("package.json"));
    assert.ok(pkg.devDependencies["axe-core"]);
    assert.ok(!pkg.dependencies["axe-core"]);
    assert.equal(pkg.dependencies.motion, "14.3.0");
    for (const name of ["framer-motion", "gsap"]) assert.ok(!pkg.dependencies[name]);
  });
});

describe("Forma F — marketing responsiveness and semantics", () => {
  it("shows the complete header row only at the desktop breakpoint", () => {
    const header = read("components/marketing/SiteHeader.tsx");
    // The full row is hidden below lg and becomes a flex row at lg. (The
    // consistency pass reordered the nav's class list, so the two tokens are
    // no longer adjacent; the contract is unchanged.)
    assert.match(header, /hidden[^\n]*lg:flex/);
    assert.match(header, /Dialog\.Trigger asChild/);
    assert.match(header, /Dialog\.Content/);
    assert.match(header, /Dialog\.Title/);
    assert.match(header, /min-width: 1024px/);
    assert.match(header, /aria-current=\{active/);
    assert.match(header, /<ThemeToggle \/>/);
    assert.match(header, /<RoduMark/);
    assert.match(header, /<Wordmark/);
  });
  it("gives all footer destination links a 44×44 minimum", () => {
    assert.match(read("components/marketing/SiteFooter.tsx"), /min-h-11 min-w-11 items-center text-lm-14/);
  });
  it("compares every cell with a real caption and scoped table headings", () => {
    const comparison = read("app/(marketing)/vs/[slug]/page.tsx");
    for (const markup of ["<table", "<caption", "<thead", "<tbody", 'scope="col"', 'scope="row"', "row.feature", "row.roducq", "row.competitor"]) assert.ok(comparison.includes(markup));
    assert.ok(!comparison.includes("overflow-hidden"));
    assert.match(CSS, /\.comparison-table tbody tr \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
    assert.match(CSS, /\.comparison-table thead tr \{ display: grid/);
    assert.ok(!block(".comparison-table thead").includes("overflow: hidden"));
  });
  it("clips decorative glow layers, never the hero or closing copy", () => {
    // The landing page is composition-only now, so the guard follows the
    // decoration into the two bands that carry it. Each bloom layer must be
    // pointer-transparent, below the content, hidden from AT, and inside a
    // band that clips — a bloom that escapes its section is what caused the
    // hero-callout occlusion in docs/screenshots/forma-production-audit/.
    for (const name of ["HeroSection", "FinalCta"]) {
      const band = read(`components/marketing/landing/${name}.tsx`);
      assert.match(band, /<section className="relative isolate overflow-hidden/, `${name}: band must clip`);
      assert.match(band, /pointer-events-none absolute inset-0 -z-10" aria-hidden="true"/, `${name}: decoration must not capture pointer events`);
      assert.doesNotMatch(band, /bg-dark/, `${name}: the marketing surface has no dark slab`);
    }
    // The product frame keeps its illustrative label wherever it lives.
    assert.match(read("components/marketing/landing/WorkspacePreview.tsx"), /Illustrative roducq workspace/);
    // The mock still builds its sidebar/main grid rather than a fixed-width
    // screenshot, so it reflows instead of clipping on a phone.
    assert.match(read("components/marketing/landing/WorkspacePreview.tsx"), /grid-cols-1 md:grid-cols-\[13\.5rem_minmax\(0,1fr\)\]/);
  });
  it("replaces continuous marketing orbits with still, original artwork", () => {
    // /about is the measured Forma About recreation now: the reference
    // hero is type-only, so BriefSourceArt left the page along with the
    // orbiting art it replaced; the only illustration is the labelled,
    // fictional pipeline card in the closing CTA
    // (docs/FORMA_ABOUT_REDESIGN.md). BriefSourceArt itself remains the
    // app's artwork on the brief surfaces, unchanged.
    assert.match(read("app/(marketing)/about/page.tsx"), /AboutHero/);
    assert.match(read("components/marketing/landing/about/AboutCta.tsx"), /aria-hidden="true"/);
    assert.match(read("app/(marketing)/about/content.ts"), /Illustrative example · fictional client/);
    assert.match(read("app/(marketing)/vs/page.tsx"), /ProposalDocumentArt/);
    for (const path of ["app/(marketing)/about/page.tsx", "app/(marketing)/vs/page.tsx"]) assert.doesNotMatch(read(path), /spin_\d+s|animate-pulse/);
    assert.doesNotMatch(read("components/marketing/landing/about/AboutCta.tsx"), /spin_\d+s|animate-pulse/);
  });
});

describe("Forma F — keyboard navigation and focus management", () => {
  it("makes the mobile workspace drawer a proper modal with focus return", () => {
    const drawer = read("components/app-shell/MobileNav.tsx");
    for (const part of ["Dialog.Root", "Dialog.Portal", "Dialog.Content", "Dialog.Title", "onCloseAutoFocus", "returnFocusRef.current?.focus()", "min-width: 600px"]) assert.ok(drawer.includes(part));
    assert.match(drawer, /env\(safe-area-inset-top/);
    assert.match(drawer, /env\(safe-area-inset-bottom/);
    for (const path of ["components/app-shell/Topbar.tsx", "components/app-shell/MobileTabBar.tsx"]) assert.match(read(path), /returnFocusRef=\{/);
  });
  it("supports the full menu-button arrow, Home/End, Escape, Tab and typeahead model", () => {
    const menu = read("components/ui/menu.tsx");
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape", "Tab"]) assert.ok(menu.includes(`"${key}"`));
    assert.match(menu, /aria-controls=\{open \? menuId/);
    assert.match(menu, /item\.tabIndex = -1/);
    assert.match(menu, /startsWith\(event\.key\.toLowerCase\(\)\)/);
    assert.match(read("components/app-shell/Topbar.tsx"), /<LogoutButton\s+role="menuitem"/);
  });
  it("keeps the dialog close target 44px, and returns externally controlled dialogs to their invoker", () => {
    const dialog = read("components/ui/dialog.tsx");
    assert.match(dialog, /right-2 top-2 flex min-h-11 min-w-11/);
    assert.match(dialog, /returnFocusRef\.current = document\.activeElement/);
    assert.match(dialog, /onCloseAutoFocus/);
    assert.match(dialog, /returnFocusRef\.current\.focus\(\)/);
    assert.match(dialog, /useState\(props\.defaultOpen \?\? false\)/);
    assert.match(dialog, /flex flex-col space-y-1.5 pr-10 text-left/);
  });
  it("distinguishes the global and page search landmarks", () => {
    assert.match(read("components/app-shell/Topbar.tsx"), /aria-label="Global search"/);
    assert.match(read("app/(app)/search/page.tsx"), /aria-label="Search workspace"/);
  });
  it("supplies one main landmark on auth/invite and a top-level heading on the fatal boundary", () => {
    assert.match(read("app/(auth)/layout.tsx"), /<main id="main"/);
    assert.match(read("app/invite/[token]/page.tsx"), /<main className=/);
    const fatal = read("app/global-error.tsx");
    assert.match(fatal, /<main/);
    assert.match(fatal, /<h1/);
    assert.match(fatal, /minHeight: 44/);
    assert.match(read("app/(app)/loading.tsx"), /role="status" aria-label="Loading workspace"/);
  });
  it("keeps standalone missing-document, 404 and error states semantic without changing empty-list titles", () => {
    const shared = read("components/ui/page.tsx");
    assert.match(shared, /headingAs = "p"/);
    assert.match(shared, /const Heading = headingAs/);
    for (const path of ["briefs/[id]", "proposals/[id]", "proposals/[id]/versions/[versionId]", "plans/[id]", "updates/[id]", "invoices/[id]", "contracts/[id]"]) assert.match(read(`app/(app)/${path}/page.tsx`), /headingAs="h1"/);
    for (const path of ["app/not-found.tsx", "app/(app)/error.tsx"]) assert.match(read(path), /headingAs="h1"/);
    assert.match(QA, /redirected away from fixture/);
    assert.match(QA, /browser errors:/);
  });
  it("names all status selectors independently of their hydrated value", () => {
    for (const [component, name] of [["briefs/StatusSelect", "Brief"], ["proposals/ProposalStatusSelect", "Proposal"], ["plans/PlanStatusSelect", "Plan"], ["updates/UpdateStatusSelect", "Update"], ["invoices/InvoiceStatusSelect", "Invoice"], ["contracts/ContractStatusSelect", "Contract"]]) {
      const source = read(`components/${component}.tsx`);
      assert.ok(source.includes(`<SelectTrigger aria-label="${name} status"`));
      assert.match(source, /role="alert"/);
    }
  });
  it("associates template labels with unique fields and announces errors", () => {
    const template = read("components/settings/TemplateDialog.tsx");
    assert.match(template, /useId\(\)/);
    for (const field of ["title", "body"]) {
      assert.ok(template.includes('htmlFor={`${fieldId}-' + field + '`}'));
      assert.ok(template.includes('id={`${fieldId}-' + field + '`}'));
    }
    assert.match(template, /role="alert"/);
  });
});

describe("Forma F — motion, typography and shared tokens", () => {
  it("declares consistent 150 / 250 / 450ms motion tokens", () => {
    for (const declaration of ["--motion-fast: 150ms", "--motion-standard: 250ms", "--motion-expressive: 450ms", "--duration-normal: var(--motion-standard)", "--duration-slow: var(--motion-expressive)"]) assert.ok(CSS.includes(declaration));
    assert.match(read("components/ui/dialog.tsx"), /const EXIT_MS = 250/);
    assert.match(read("components/ui/motion-rows.tsx"), /ms = 250/);
  });
  it("cannot leave route, card, nav or SVG content hidden behind an entrance fill", () => {
    for (const selector of [".animate-fade-in", ".animate-slide-in", ".animate-pop-in", ".animate-rise-in", ".animate-route-in", ".animate-forma-rise", ".forma-draw", ".animate-menu-in"]) assert.doesNotMatch(block(selector), /\bboth\b|\bforwards\b/);
  });
  it("lets rich SVG arrivals finish instead of looping indefinitely", () => {
    for (const selector of [".forma-flow", ".forma-drift-node", ".forma-pulse-ring", ".animate-forma-drift"]) assert.doesNotMatch(block(selector), /infinite/);
    assert.doesNotMatch(CSS.match(/\.workflow-pulse \{ animation:[^}]+/g)?.join("" ) || "", /infinite/);
    for (const path of ["components/auth/AuthArtwork.tsx", "components/workflow/WorkflowArt.tsx", "components/workflow/ClientWorkArt.tsx", "components/workflow/FinancialArt.tsx"]) assert.doesNotMatch(read(path), /<animate(?:Motion|Transform)?\b/);
  });
  it("reduces motion in portals, auth and marketing as well as every app plane", () => {
    assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ animation: none !important; transition: none !important; scroll-behavior: auto !important;/);
    assert.match(QA, /reduced-motion-all-routes/);
    assert.match(QA, /assert\.equal\(state\.animations, 0/);
    assert.match(QA, /state\.h1Visible/);
  });
  it("keeps Manrope active and 12px metadata readable rather than shrinking to fit", () => {
    assert.match(read("app/layout.tsx"), /manrope-latin-wght-normal\.woff2/);
    assert.match(read("app/layout.tsx"), /display: "swap"/);
    for (const path of [...sourceFiles("app"), ...sourceFiles("components")]) {
      assert.doesNotMatch(read(path), /text-\[(?:9|11)px\]|font-playfair|font-source-sans/, path);
    }
    assert.match(read("components/workflow/WorkflowArt.tsx"), /className="workflow-labels"/);
    assert.doesNotMatch(read("components/workflow/WorkflowArt.tsx"), /<text\b/);
  });
  it("separates visible control boundaries from decorative card hairlines", () => {
    assert.match(CSS, /--control-border: color-mix\(in srgb, var\(--forma-secondary-text\) 75%, var\(--forma-surface\)\)/);
    assert.match(CSS, /\[role="combobox"\]\) \{ border-color: var\(--control-border\)/);
    assert.match(CSS, /\[aria-invalid="true"\] \{ --control-border: var\(--error\)/);
  });
  it("shares brand, control radii and readable lavender text without removing semantic status colors", () => {
    assert.match(CSS, /--product-accent: var\(--forma-purple\)/);
    assert.match(CSS, /--forma-purple: var\(--product-accent\)/);
    assert.match(CSS, /\.forma-core :is\(input,textarea,select\) \{ border-radius: var\(--radius-control\)/);
    assert.match(CSS, /--secondary-text: color-mix\(in srgb, var\(--forma-secondary-text\) 90%, var\(--forma-text\)\)/);
    for (const token of ["--forma-success", "--forma-error", "--forma-info", "--forma-amber"]) assert.ok(CSS.includes(token));
    assert.match(read("lib/design-tokens.ts"), /terracotta: CORE_TOKENS\.purple/);
    assert.match(read("components/ui/doc-detail.tsx"), /paper-card min-w-0/);
  });
});
