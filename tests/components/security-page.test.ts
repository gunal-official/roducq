/**
 * /security — source, content, truthfulness, and registration tests.
 *
 * Mirrors the offline Node test architecture of changelog-page.test.ts,
 * about-page.test.ts, and solutions-page.test.ts: real module imports
 * + source inspection, zero external test dependencies.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FOOTER } from "../../app/(marketing)/home/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/security/page.tsx");
const SITEMAP = read("app/sitemap.ts");
const HARNESS = read("scripts/verify-responsive.mjs");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE_NO_COMMENTS = stripComments(PAGE);

// Security feature data from the page source
const SECURITY_FEATURE_TITLES = [
  "Encryption everywhere",
  "Access you control",
  "Your data, portable",
  "A clear record",
  "Careful integrations",
  "Private by design",
];

// Metadata from the page
const METADATA_TITLE = "Security — roducq";
const METADATA_DESCRIPTION = "Encryption, access controls, connected apps, and what happens to your data when you leave.";

// Responsible disclosure data
const RESPONSIBLE_DISCLOSURE_TITLE = "Reporting a security issue";
const RESPONSIBLE_DISCLOSURE_CTA = "Report an issue";
const RESPONSIBLE_DISCLOSURE_HREF = "mailto:security@roducq.dev";

// Disclaimer
const DISCLAIMER_TEXT = "This page describes how roducq is designed to handle security. No third-party compliance certifications are claimed.";


describe("/security — shell and metadata are preserved", () => {
  it("delegates to the shared (marketing) layout", () => {
    assert.doesNotMatch(PAGE, /SiteHeader/);
    assert.doesNotMatch(PAGE, /SiteFooter/);
    assert.doesNotMatch(PAGE, /id="top"/, "layout.tsx already owns #top");
  });

  it("keeps the published SEO metadata", () => {
    assert.match(PAGE, /export const metadata/);
    assert.match(PAGE, /title:\s*"Security — roducq"/);
    assert.match(PAGE, /description:\s*PAGE_DESCRIPTION/);
    assert.match(PAGE, /canonical:\s*"\/security"/);
    assert.match(PAGE, /type:\s*"website"/);
    assert.match(PAGE, /url:\s*"\/security"/);
  });

  it("renders the security content in the correct order", () => {
    const heroIdx = PAGE.indexOf("Hero Section");
    const featuresIdx = PAGE.indexOf("Security Features Grid");
    const ctaIdx = PAGE.indexOf("Responsible Disclosure CTA");
    const disclaimerIdx = PAGE.indexOf("Disclaimer");
    
    assert.ok(heroIdx > 0, "hero section exists");
    assert.ok(featuresIdx > heroIdx, "features section follows hero");
    assert.ok(ctaIdx > featuresIdx, "CTA section follows features");
    assert.ok(disclaimerIdx > ctaIdx, "disclaimer follows CTA");
  });

  it("has exactly one h1", () => {
    const h1Matches = PAGE_NO_COMMENTS.match(/<h1[\s>]/g);
    assert.equal(h1Matches?.length, 1, "exactly one h1 element");
  });

  it("has correct heading hierarchy with no skipped levels", () => {
    // Extract all heading tags (both literal and in the mapped features)
    const headings = PAGE_NO_COMMENTS.match(/<h[1-6][\s>]/g) || [];
    
    // Count literal headings in source:
    // - 1 h1 (hero title)
    // - 1 h2 (CTA title)
    // - 1 h2 template in the features map (which renders 6 times)
    const h1Count = headings.filter(h => h.includes("h1")).length;
    const h2Count = headings.filter(h => h.includes("h2")).length;
    const h3Count = headings.filter(h => h.includes("h3")).length;
    const h4Count = headings.filter(h => h.includes("h4")).length;
    const h5Count = headings.filter(h => h.includes("h5")).length;
    const h6Count = headings.filter(h => h.includes("h6")).length;
    
    assert.equal(h1Count, 1, "exactly one h1");
    assert.equal(h2Count, 2, "two h2 elements in source (1 CTA + 1 feature template that renders 6 times)");
    assert.equal(h3Count, 0, "no h3 elements");
    assert.equal(h4Count, 0, "no h4 elements");
    assert.equal(h5Count, 0, "no h5 elements");
    assert.equal(h6Count, 0, "no h6 elements");
    
    // Verify the features use h2 (not h3)
    assert.match(PAGE, /<h2 className="text-lm-18 font-lm-semibold text-lm-ink">/);
    
    // Verify no skipped levels: h1 should be followed by h2, not h3+
    const h1Index = headings.findIndex(h => h.includes("h1"));
    if (h1Index >= 0 && headings.length > h1Index + 1) {
      const nextHeading = headings[h1Index + 1];
      assert.ok(nextHeading.includes("h2"), "h1 is followed by h2, not a lower level");
    }
  });
});

describe("/security — approved copy", () => {
  it("hero carries the security title and subtitle", () => {
    assert.match(PAGE, /How roducq.*protects.*your data/);
    assert.match(PAGE, /Encryption, access controls/);
  });

  it("renders all six security features with correct titles", () => {
    for (const title of SECURITY_FEATURE_TITLES) {
      assert.match(PAGE, new RegExp(title), `feature title: ${title}`);
    }
  });

  it("responsible disclosure CTA renders with correct copy and href", () => {
    assert.match(PAGE, /Reporting a security issue/);
    assert.match(PAGE, /Please report security issues privately/);
    assert.match(PAGE, /Give us reasonable time to investigate/);
    assert.match(PAGE, /Do not access, change, or delete data that is not yours/);
    assert.match(PAGE, /Avoid testing that degrades service for other people/);
    assert.match(PAGE, /Report an issue/);
    assert.match(PAGE, /mailto:security@roducq.dev/);
  });

  it("disclaimer text is present", () => {
    assert.match(PAGE, /This page describes how roducq is designed to handle security/);
  });
});

describe("/security — registration and routing", () => {
  it("registers /security in FOOTER (home/content.ts)", () => {
    const companyColumn = FOOTER.columns.find((col) => col.title === "Company");
    assert.ok(companyColumn, "Company column exists in FOOTER");
    assert.ok(
      companyColumn.links.some((link) => link.href === "/security"),
      "Security link exists in Company column"
    );
  });

  it("registers /security in sitemap.ts", () => {
    assert.match(SITEMAP, /"\/security"/);
  });

  it("registers /security in verify-responsive.mjs PAGES array", () => {
    assert.match(HARNESS, /marketing-security/);
    assert.match(HARNESS, /url:\s*"\/security"/);
  });
});

describe("/security — product truthfulness", () => {
  it("does not claim SSO support", () => {
    assert.doesNotMatch(PAGE, /single sign-on|SSO/i);
  });

  it("does not claim Enterprise tier", () => {
    assert.doesNotMatch(PAGE, /Enterprise/i);
  });

  it("uses roducq branding, not Forma", () => {
    // Check that we use "roducq" not "Forma" in descriptions
    const lowerPage = PAGE.toLowerCase();
    assert.ok(lowerPage.includes("roducq"), "uses roducq branding");
    // The word "Forma" should not appear in security descriptions
    assert.doesNotMatch(PAGE_NO_COMMENTS, /Forma does not sell/);
    assert.doesNotMatch(PAGE_NO_COMMENTS, /Forma needs/);
  });

  it("uses OAuth correctly", () => {
    assert.match(PAGE, /Connected apps use OAuth/);
    assert.match(PAGE, /roducq needs/);
  });

  it("describes data portability accurately", () => {
    assert.match(PAGE, /Contact us to request a full data export/);
  });

  it("describes logging accurately", () => {
    assert.match(PAGE, /Activity logs and edit history/);
    assert.doesNotMatch(PAGE, /Automations log/);
  });
});
