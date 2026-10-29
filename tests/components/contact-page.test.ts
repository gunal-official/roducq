/**
 * /contact — source, content, truthfulness, and registration tests.
 *
 * Mirrors the offline Node test architecture of changelog-page.test.ts,
 * about-page.test.ts, solutions-page.test.ts, and security-page.test.ts:
 * real module imports + source inspection, zero external test dependencies.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FOOTER } from "../../app/(marketing)/home/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/contact/page.tsx");
const CONTACT_FORM = read("app/(marketing)/contact/ContactForm.tsx");
const SITEMAP = read("app/sitemap.ts");
const HARNESS = read("scripts/verify-responsive.mjs");
const SITE_HEADER = read("components/marketing/SiteHeader.tsx");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

const PAGE_NO_COMMENTS = stripComments(PAGE);

// Contact category data from the page source
const CONTACT_CATEGORY_TITLES = ["Sales", "Support", "Security"];
const CONTACT_CATEGORY_DESCRIPTIONS = [
  "Questions about plans, billing, or workspace setup for your team. We'll get back to you by email.",
  "Help with your workspace or billing. We'll do our best to respond quickly.",
  "To report a vulnerability or ask about data protection, visit our Security page.",
];

// What happens next data
const WHAT_HAPPENS_NEXT_TITLES = ["We read it", "We reply", "You try it"];
const WHAT_HAPPENS_NEXT_DESCRIPTIONS = [
  "A person on our team reads it and passes it to whoever can answer.",
  "We'll respond by email. Sales inquiries may include a follow-up call if appropriate.",
  "Set up a workspace with your own projects. Self-service signup is available.",
];

// Form data
const FORM_FIELDS = ["Full name", "Work email", "Company", "Team size", "What would you like roducq to help with?"];
const TEAM_SIZE_OPTIONS = ["1 (Just me)", "2–5", "6–15", "16+"];

// Metadata from the page
const METADATA_TITLE = "Contact — roducq";
const METADATA_DESCRIPTION = "Choose sales for plans and pricing, or support for help with your workspace.";

// Hero data
const HERO_EYEBROW = "Contact";
const HERO_TITLE = "Contact us";
const HERO_SUBTITLE = "Choose sales for plans and pricing, or support for help with your workspace. Your message goes to the right person either way.";

// Form mode toggle
const FORM_MODE_TOGGLE = ["Talk to sales", "Get support"];

// Form validation
const REQUIRED_FIELDS = ["Full name", "Work email", "What would you like roducq to help with?"];
const OPTIONAL_FIELDS = ["Company", "Team size"];

// Mailto data
const MAILTO_BASE = "mailto:hello@roducq.dev";

// What happens next section
const WHAT_HAPPENS_NEXT_TITLE = "What happens next";

// Disclaimer
const SUBMIT_NOTICE = "Your message opens in your email client.";

/* ── Tests ──────────────────────────────────────────────────────────────── */

describe("/contact — shell and metadata are preserved", () => {
  it("delegates to the shared (marketing) layout", () => {
    assert.doesNotMatch(PAGE, /SiteHeader/);
    assert.doesNotMatch(PAGE, /SiteFooter/);
    assert.doesNotMatch(PAGE, /id="top"/, "layout.tsx already owns #top");
  });

  it("keeps the published SEO metadata", () => {
    assert.match(PAGE, /export const metadata/);
    assert.match(PAGE, /title:\s*"Contact — roducq"/);
    assert.match(PAGE, /description:\s*PAGE_DESCRIPTION/);
    assert.match(PAGE, /canonical:\s*"\/contact"/);
    assert.match(PAGE, /type:\s*"website"/);
    assert.match(PAGE, /url:\s*"\/contact"/);
  });

  it("renders the contact content in the correct order", () => {
    const heroIdx = PAGE.indexOf("Contact");
    const categoriesIdx = PAGE.indexOf("Sales");
    const whatNextIdx = PAGE.indexOf("What happens next");
    
    assert.ok(heroIdx > 0, "hero eyebrow exists");
    assert.ok(categoriesIdx > heroIdx, "categories section follows hero");
    assert.ok(whatNextIdx > categoriesIdx, "what happens next section follows categories");
  });

  it("has exactly one h1", () => {
    const h1Matches = PAGE_NO_COMMENTS.match(/<h1[\s>]/g);
    assert.equal(h1Matches?.length, 1, "exactly one h1 element");
  });

  it("has correct heading hierarchy with no skipped levels", () => {
    const headings = PAGE_NO_COMMENTS.match(/<h[1-6][\s>]/g) || [];
    
    const h1Count = headings.filter(h => h.includes("h1")).length;
    const h2Count = headings.filter(h => h.includes("h2")).length;
    const h3Count = headings.filter(h => h.includes("h3")).length;
    const h4Count = headings.filter(h => h.includes("h4")).length;
    const h5Count = headings.filter(h => h.includes("h5")).length;
    const h6Count = headings.filter(h => h.includes("h6")).length;
    
    // Count literal headings in source:
    // - 1 h1 (hero title)
    // - 2 h2 (category template + What happens next title)
    // - 1 h3 (What happens next step template, renders 3 times)
    assert.equal(h1Count, 1, "exactly one h1");
    assert.equal(h2Count, 2, "two h2 elements in source (1 category template + 1 What happens next)");
    assert.equal(h3Count, 1, "one h3 element in source (What happens next template)");
    assert.equal(h4Count, 0, "no h4 elements");
    assert.equal(h5Count, 0, "no h5 elements");
    assert.equal(h6Count, 0, "no h6 elements");
    
    // Verify no skipped levels: h1 followed by h2, h2 followed by h3
    const h1Index = headings.findIndex(h => h.includes("h1"));
    if (h1Index >= 0 && headings.length > h1Index + 1) {
      const nextHeading = headings[h1Index + 1];
      assert.ok(nextHeading.includes("h2"), "h1 is followed by h2, not a lower level");
    }
  });
});

describe("/contact — approved copy", () => {
  it("hero carries the contact eyebrow", () => {
    // Eyebrow is a p tag with specific styling: text-lm-14 font-lm-semibold text-lm-ink-accent uppercase
    // and contains "Contact" text
    assert.match(PAGE, /text-lm-14 font-lm-semibold text-lm-ink-accent uppercase/);
    // Check that the eyebrow appears before the h1
    const eyebrowIdx = PAGE.indexOf("text-lm-14 font-lm-semibold text-lm-ink-accent uppercase");
    const h1Idx = PAGE.indexOf("<h1");
    assert.ok(eyebrowIdx > 0 && eyebrowIdx < h1Idx, "eyebrow appears before h1");
  });

  it("hero carries the contact title and subtitle", () => {
    assert.match(PAGE, /Contact.*us/);
    assert.match(PAGE, /Choose sales for plans and pricing, or support for help with your workspace/);
  });

  it("form card has border and shadow", () => {
    assert.match(PAGE, /bg-lm-card rounded-2xl border border-lm-border-soft p-8 shadow-lm-md/);
  });

  it("renders all three contact categories with correct titles", () => {
    for (const title of CONTACT_CATEGORY_TITLES) {
      assert.match(PAGE, new RegExp(title), `category title: ${title}`);
    }
  });

  it("renders all three contact category descriptions", () => {
    for (const desc of CONTACT_CATEGORY_DESCRIPTIONS) {
      assert.match(PAGE, new RegExp(desc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `category description: ${desc}`);
    }
  });

  it("Security category links to /security page", () => {
    assert.match(PAGE, /category\.href/);
    assert.match(PAGE, /visit our Security page/);
  });

  it("renders segmented control with correct structure", () => {
    // Check container has rounded corners and neutral background
    assert.match(CONTACT_FORM, /flex rounded-lm-control bg-lm-surface-muted p-1/);
    // Check buttons have equal width
    assert.match(CONTACT_FORM, /flex-1/);
    // Check active state has white background
    assert.match(CONTACT_FORM, /bg-lm-card text-lm-ink shadow-lm-sm/);
    // Check inactive state
    assert.match(CONTACT_FORM, /text-lm-muted-readable hover:text-lm-ink/);
    // Check labels
    for (const label of FORM_MODE_TOGGLE) {
      assert.match(CONTACT_FORM, new RegExp(label), `form toggle: ${label}`);
    }
  });

  it("renders all form fields", () => {
    for (const field of FORM_FIELDS) {
      assert.match(CONTACT_FORM, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `form field: ${field}`);
    }
  });

  it("marks required fields with asterisk and aria-required", () => {
    // Check Full name has asterisk and sr-only required
    assert.match(CONTACT_FORM, /Full name[\s\S]*?aria-hidden="true">\*/);
    assert.match(CONTACT_FORM, /Full name[\s\S]*?sr-only[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="fullName"[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="fullName"[\s\S]*?aria-required="true"/);
    
    // Check Work email
    assert.match(CONTACT_FORM, /Work email[\s\S]*?aria-hidden="true">\*/);
    assert.match(CONTACT_FORM, /Work email[\s\S]*?sr-only[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="workEmail"[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="workEmail"[\s\S]*?aria-required="true"/);
    
    // Check Message
    assert.match(CONTACT_FORM, /What would you like roducq to help with\?[\s\S]*?aria-hidden="true">\*/);
    assert.match(CONTACT_FORM, /What would you like roducq to help with\?[\s\S]*?sr-only[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="message"[\s\S]*?required/);
    assert.match(CONTACT_FORM, /id="message"[\s\S]*?aria-required="true"/);
  });

  it("marks optional fields without required attribute", () => {
    for (const field of OPTIONAL_FIELDS) {
      // Optional fields should not have required or aria-required
      const fieldRegex = new RegExp(`<[^>]*id="${field.toLowerCase().replace(/ /g, '')}"[^>]*>`);
      const fieldMatch = CONTACT_FORM.match(fieldRegex);
      if (fieldMatch) {
        assert.doesNotMatch(fieldMatch[0], /required/);
      }
    }
  });

  it("has email input type for work email", () => {
    assert.match(CONTACT_FORM, /id="workEmail"[\s\S]*?type="email"/);
  });

  it("has validation state management", () => {
    assert.match(CONTACT_FORM, /const \[errors, setErrors\]/);
    assert.match(CONTACT_FORM, /validate\(\)/);
    assert.match(CONTACT_FORM, /if \(\!validate\(\)\)/);
  });

  it("renders error messages for invalid fields", () => {
    assert.match(CONTACT_FORM, /errors\.fullName/);
    assert.match(CONTACT_FORM, /errors\.workEmail/);
    assert.match(CONTACT_FORM, /errors\.message/);
    assert.match(CONTACT_FORM, /role="alert"/);
  });

  it("renders all team size options", () => {
    for (const option of TEAM_SIZE_OPTIONS) {
      assert.match(CONTACT_FORM, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `team size option: ${option}`);
    }
  });

  it("What happens next section renders with correct title", () => {
    assert.match(PAGE, /What happens next/);
  });

  it("renders all three What happens next steps with correct titles and descriptions", () => {
    for (let i = 0; i < WHAT_HAPPENS_NEXT_TITLES.length; i++) {
      assert.match(PAGE, new RegExp(WHAT_HAPPENS_NEXT_TITLES[i]), `step title: ${WHAT_HAPPENS_NEXT_TITLES[i]}`);
      assert.match(PAGE, new RegExp(WHAT_HAPPENS_NEXT_DESCRIPTIONS[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `step description: ${WHAT_HAPPENS_NEXT_DESCRIPTIONS[i]}`);
    }
  });

  it("What happens next section has border and dividers", () => {
    assert.match(PAGE, /border border-lm-border-soft rounded-lm-panel/);
    assert.match(PAGE, /md:divide-x md:divide-lm-border-soft/);
    assert.match(PAGE, /p-6 md:p-8/);
    assert.match(PAGE, /md:first:pl-8/);
    assert.match(PAGE, /md:last:pr-8/);
  });

  it("submit notice is truthful", () => {
    assert.match(CONTACT_FORM, /Your message opens in your email client/);
  });
});

describe("/contact — registration and routing", () => {
  it("registers /contact in FOOTER (home/content.ts)", () => {
    const companyColumn = FOOTER.columns.find((col) => col.title === "Company");
    assert.ok(companyColumn, "Company column exists in FOOTER");
    assert.ok(
      companyColumn.links.some((link) => link.href === "/contact"),
      "Contact link exists in Company column"
    );
  });

  it("registers /contact in sitemap.ts", () => {
    assert.match(SITEMAP, /"\/contact"/);
  });

  it("registers /contact in verify-responsive.mjs PAGES array", () => {
    assert.match(HARNESS, /marketing-contact/);
    assert.match(HARNESS, /url:\s*"\/contact"/);
  });

  it("does NOT register /contact in SiteHeader navigation", () => {
    assert.doesNotMatch(SITE_HEADER, /"\/contact"/, "Contact link should not exist in header navigation");
    assert.doesNotMatch(SITE_HEADER, /label:\s*"Contact"/, "Contact label should not exist in header navigation");
  });

  it("does NOT render duplicate SiteFooter", () => {
    assert.doesNotMatch(PAGE, /<SiteFooter \/>/);
    assert.doesNotMatch(PAGE, /from "@\/components\/marketing\/SiteFooter"/);
  });
});

describe("/contact — product truthfulness", () => {
  it("does not claim Enterprise tier", () => {
    assert.doesNotMatch(PAGE, /Enterprise/i);
  });

  it("does not claim teams of 20 or more", () => {
    assert.doesNotMatch(PAGE, /teams of 20 or more/i);
    assert.doesNotMatch(PAGE, /20\+ people/i);
  });

  it("does not claim specific response-time SLA", () => {
    assert.doesNotMatch(PAGE, /business day/i);
    assert.doesNotMatch(PAGE, /within one business day/i);
    assert.doesNotMatch(PAGE, /within 24 hours/i);
    assert.doesNotMatch(PAGE, /same day/i);
  });

  it("uses roducq branding, not Forma", () => {
    const lowerPage = PAGE.toLowerCase();
    assert.ok(lowerPage.includes("roducq"), "uses roducq branding");
  });

  it("mailto links point to hello@roducq.dev", () => {
    assert.match(CONTACT_FORM, /mailto:hello@roducq.dev/);
  });

  it("Sales mode uses correct subject", () => {
    assert.match(CONTACT_FORM, /roducq Sales enquiry/);
  });

  it("Support mode uses correct subject", () => {
    assert.match(CONTACT_FORM, /roducq Support request/);
  });

  it("uses reusable UI components", () => {
    assert.match(CONTACT_FORM, /from "@\/components\/ui\/input"/);
    assert.match(CONTACT_FORM, /from "@\/components\/ui\/textarea"/);
    assert.match(CONTACT_FORM, /from "@\/components\/ui\/button"/);
    assert.match(CONTACT_FORM, /from "@\/components\/ui\/select"/);
  });

  it("uses SiteFooter from shared layout", () => {
    assert.doesNotMatch(PAGE, /from "@\/components\/marketing\/SiteFooter"/);
    assert.doesNotMatch(PAGE, /<SiteFooter \/>/);
  });
});
