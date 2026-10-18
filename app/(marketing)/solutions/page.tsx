import type { Metadata } from "next";

import { SOCIAL_IMAGE } from "@/lib/site";

import { ClosingCta } from "@/components/marketing/landing/solutions/ClosingCta";
import { PlanBand } from "@/components/marketing/landing/solutions/PlanBand";
import { SectionNav } from "@/components/marketing/landing/solutions/SectionNav";
import { SolutionsHero } from "@/components/marketing/landing/solutions/SolutionsHero";
import { SolutionsShowcase } from "@/components/marketing/landing/solutions/SolutionsShowcase";

/**
 * /solutions — how the four client-work practices
 * (solo, studio, agency, consultancy) shape the same
 * roducq pipeline.
 *
 * The composition follows the live capture of
 * forma-visuvate.framer.website/solutions (see
 * docs/FORMA_SOLUTIONS_REFERENCE.md for every measured
 * value); the content is Roducq's own, approved at the
 * content gate (docs/FORMA_SOLUTIONS_PAGE_AUDIT.md).
 *
 * The marketing shell (header, footer, announcement
 * band, motion provider) comes from the route group's
 * layout, exactly like /, /about, /pricing and /vs.
 */
export const metadata: Metadata = {
  title: "Solutions — roducq",
  description:
    "How solo practices, design studios, agencies and consultancies run the same roducq pipeline: intake to brief, brief to proposal, proposal to plan, plan to update.",
  alternates: { canonical: "/solutions" },
  openGraph: {
    type: "website",
    url: "/solutions",
    title: "Solutions — roducq",
    description:
      "How solo practices, design studios, agencies and consultancies run the same roducq pipeline: intake to brief, brief to proposal, proposal to plan, plan to update.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solutions — roducq",
    description:
      "How solo practices, design studios, agencies and consultancies run the same roducq pipeline: intake to brief, brief to proposal, proposal to plan, plan to update.",
    images: [SOCIAL_IMAGE],
  },
};

export default function SolutionsPage() {
  return (
    <>
      <SolutionsHero />
      <SectionNav />
      <SolutionsShowcase />
      <PlanBand />
      <ClosingCta />
    </>
  );
}
