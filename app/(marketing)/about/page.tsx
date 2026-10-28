import type { Metadata } from "next";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

import { AboutCards } from "@/components/marketing/landing/about/AboutCards";
import { AboutCta } from "@/components/marketing/landing/about/AboutCta";
import { AboutHero } from "@/components/marketing/landing/about/AboutHero";
import { AboutPrinciples } from "@/components/marketing/landing/about/AboutPrinciples";
import { AboutStory } from "@/components/marketing/landing/about/AboutStory";

import "./about.css";

/**
 * /about — the Forma About recreation (owner-approved 2026-10-28).
 *
 * Five bands at the reference's measured geometry: centred hero →
 * split prose → five numbered principles → three link cards →
 * purple CTA. Copy is roducq's own (./content.ts); every product
 * statement is already published elsewhere on the site — see
 * docs/FORMA_ABOUT_REFERENCE.md for the measurements and claim
 * audit, and docs/FORMA_ABOUT_REDESIGN.md for implementation and
 * verification evidence. The shared marketing shell (announcement,
 * header, footer) comes from app/(marketing)/layout.tsx, unchanged.
 */
export const metadata: Metadata = {
  title: "About — roducq",
  description:
    "What roducq is: a writing studio that turns messy client communication into structured briefs, proposals, plans, and updates.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: "/about",
    title: "About — roducq",
    description:
      "What roducq is: a writing studio that turns messy client communication into structured briefs, proposals, plans, and updates.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — roducq",
    description:
      "What roducq is: a writing studio that turns messy client communication into structured briefs, proposals, plans, and updates.",
    images: [TWITTER_IMAGE],
  },
};

export default function AboutPage() {
  return (
    <div className="ab-page">
      <AboutHero />
      <AboutStory />
      <AboutPrinciples />
      <AboutCards />
      <AboutCta />
    </div>
  );
}
