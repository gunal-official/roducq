import type { Metadata } from "next";

import { SOCIAL_IMAGE } from "@/lib/site";

import { DetailsBand } from "@/components/marketing/landing/features/DetailsBand";
import { FeaturesClosingCta } from "@/components/marketing/landing/features/FeaturesClosingCta";
import { FeaturesHero } from "@/components/marketing/landing/features/FeaturesHero";
import { FeaturesSectionNav } from "@/components/marketing/landing/features/FeaturesSectionNav";
import { FeaturesShowcase } from "@/components/marketing/landing/features/FeaturesShowcase";

/**
 * /features — the six-part tour of the roducq workspace:
 * automations, projects & plans, updates & time, integrations,
 * insights and collaboration.
 *
 * The composition follows the live capture of
 * forma-visuvate.framer.website/features (see
 * docs/FORMA_FEATURES_PAGE_AUDIT.md for every measured value); the
 * content is Roducq's own, approved at the content gate (audit §7).
 * No Forma name, sentence, task term, ticket id or mock datum is
 * reproduced, and the reference's calendar, board/timeline, two-way
 * sync, command menu, CSV/JSON export and comments are deliberately
 * absent because roducq ships none of them.
 *
 * The marketing shell (header, footer, announcement band, motion
 * provider) comes from the route group's layout, exactly like /,
 * /about, /pricing, /solutions and /vs.
 */
export const metadata: Metadata = {
  title: "Features — roducq",
  description:
    "See the roducq workspace: event-driven automations, proposal-to-plan checklists, weekly updates and time logs, read-only integrations, PDF reports, and role-based sharing.",
  alternates: { canonical: "/features" },
  openGraph: {
    type: "website",
    url: "/features",
    title: "Features — roducq",
    description:
      "Event-driven automations, proposal-to-plan checklists, weekly updates and time logs, read-only integrations, PDF reports, and role-based sharing in one workspace.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Features — roducq",
    description:
      "Event-driven automations, proposal-to-plan checklists, weekly updates and time logs, read-only integrations, PDF reports, and role-based sharing in one workspace.",
    images: [SOCIAL_IMAGE],
  },
};

export default function FeaturesPage() {
  return (
    <>
      <FeaturesHero />
      <FeaturesSectionNav />
      <FeaturesShowcase />
      <DetailsBand />
      <FeaturesClosingCta />
    </>
  );
}
