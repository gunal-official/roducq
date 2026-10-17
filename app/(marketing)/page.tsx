import type { Metadata } from "next";

import { FaqAccordion } from "@/components/marketing/landing/FaqAccordion";
import { FeaturesSection } from "@/components/marketing/landing/FeaturesSection";
import { FinalCta } from "@/components/marketing/landing/FinalCta";
import { HeroSection } from "@/components/marketing/landing/HeroSection";
import { IntegrationsSection } from "@/components/marketing/landing/IntegrationsSection";
import { PricingSection } from "@/components/marketing/landing/PricingSection";
import { StepsSection } from "@/components/marketing/landing/StepsSection";
import { TeamsSection } from "@/components/marketing/landing/TeamsSection";
import { getPricesConfig, formatPrice } from "@/lib/razorpay";
import { getSiteUrl, isLocalSiteUrl, SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "roducq — the workspace that does the client writing",
  description:
    "Turn messy client messages into gap-flagged briefs, proposals, plans and weekly updates — one purpose-built pipeline. Free to start, billed per workspace, never per seat. No e-signature and no payment collection, by design.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "roducq — the workspace that does the client writing",
    description:
      "Turn messy client messages into gap-flagged briefs, proposals, plans and weekly updates — one purpose-built pipeline. Free to start, billed per workspace, never per seat. No e-signature and no payment collection, by design.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "roducq — the workspace that does the client writing",
    description:
      "Turn messy client messages into gap-flagged briefs, proposals, plans and weekly updates — one purpose-built pipeline. Free to start, billed per workspace, never per seat. No e-signature and no payment collection, by design.",
    images: [TWITTER_IMAGE],
  },
};

/**
 * / — the landing page (Forma-referenced redesign, 2026-10-17).
 *
 * THIS FILE IS COMPOSITION ONLY. Every band is a component under
 * components/marketing/landing/, every string a visitor reads lives in
 * ./home/content.ts, and every visual value resolves to an `--lm-*` token in
 * ./landing.css. The page's job is the order, and the order follows the
 * reference exactly:
 *
 *   A. AnnouncementBar — in ../layout.tsx, above the header on every
 *                        marketing route (the reference shows it site-wide)
 *   B. SiteHeader      — in ../layout.tsx, shared with /about /pricing /vs
 *   C. HeroSection     — promise, two ways in, the product frame
 *   D. FeaturesSection — the four jobs, each with its own visual
 *   E. StepsSection    — three steps and one engagement timeline
 *   F. IntegrationsSection
 *   G. TeamsSection
 *   H. PricingSection
 *   I. FaqAccordion
 *   J. FinalCta        — plus the "what roducq doesn't do" callout
 *
 * SERVER COMPONENT, AND IT STAYS ONE. The only interactivity on the page is
 * the scroll reveal (one IntersectionObserver) and the FAQ, which is a
 * native <details>. Nothing here hydrates state, so the landing page ships
 * no client bundle beyond those two.
 *
 * THE ONE ENV READ is billing config, and it is the same read
 * ./pricing/page.tsx makes: the landing page never invents a price, it
 * formats what the operator configured and says so plainly when there is
 * nothing configured.
 */
export default function HomePage() {
  const pricesConfig = getPricesConfig();
  const priceLines = pricesConfig.ok
    ? pricesConfig.prices.map((p) => `${formatPrice(p.amount, p.currency)} ${p.currency}`)
    : [];

  // Structured data: name + the page's own published description only.
  // The URL is included only when a real deployment origin is configured
  // (lib/site.ts) — a localhost URL in JSON-LD would be worse than none.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "roducq",
    description:
      "Turn messy client messages into gap-flagged briefs, proposals, plans and weekly updates — one purpose-built pipeline. Free to start, billed per workspace, never per seat. No e-signature and no payment collection, by design.",
    ...(isLocalSiteUrl() ? {} : { url: `${getSiteUrl()}/` }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* C. Hero */}
      <HeroSection />

      {/* D. Features */}
      <FeaturesSection />

      {/* E. Getting started */}
      <StepsSection />

      {/* F. Integrations */}
      <IntegrationsSection />

      {/* G. Teams */}
      <TeamsSection />

      {/* H. Pricing */}
      <PricingSection
        priceLines={priceLines}
        billingConfigured={pricesConfig.ok}
      />

      {/* I. FAQ */}
      <FaqAccordion />

      {/* J. Closing CTA */}
      <FinalCta />
    </>
  );
}
