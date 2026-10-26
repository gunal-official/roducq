import type { Metadata } from "next";

import { ChangelogClosingCta } from "@/components/marketing/landing/changelog/ChangelogClosingCta";
import { ChangelogFeed } from "@/components/marketing/landing/changelog/ChangelogFeed";
import { ChangelogHero } from "@/components/marketing/landing/changelog/ChangelogHero";
import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Changelog — roducq",
  description:
    "Verified product updates, interface improvements, and fixes shipped to roducq, ordered most recent first with direct pull request links.",
  alternates: { canonical: "/changelog" },
  openGraph: {
    title: "Changelog — roducq",
    description:
      "Verified product updates, interface improvements, and fixes shipped to roducq, ordered most recent first.",
    url: "/changelog",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — roducq",
    description:
      "Verified product updates, interface improvements, and fixes shipped to roducq, ordered most recent first.",
    images: [TWITTER_IMAGE],
  },
};

/**
 * /changelog — verified release history for roducq.
 *
 * The marketing layout supplies <SiteHeader /> and <SiteFooter />; on
 * /changelog, SiteHeader switches to the opaque showcase plane (white /
 * dark card surface, no announcement bar, active 2px bottom indicator)
 * measured on the reference (docs/FORMA_CHANGELOG_REFERENCE.md §2).
 */
export default function ChangelogPage() {
  return (
    <>
      <ChangelogHero />
      <ChangelogFeed />
      <ChangelogClosingCta />
    </>
  );
}
