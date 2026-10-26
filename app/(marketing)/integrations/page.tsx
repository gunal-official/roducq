import type { Metadata } from "next";

import { SOCIAL_IMAGE } from "@/lib/site";

import { ConnectingSteps } from "@/components/marketing/landing/integrations/ConnectingSteps";
import { IntegrationsCatalog } from "@/components/marketing/landing/integrations/IntegrationsCatalog";
import { IntegrationsClosingCta } from "@/components/marketing/landing/integrations/IntegrationsClosingCta";
import { IntegrationsHero } from "@/components/marketing/landing/integrations/IntegrationsHero";
import { RequestIntegration } from "@/components/marketing/landing/integrations/RequestIntegration";

/**
 * /integrations — the connectors and native outputs roducq really has.
 *
 * The composition follows the live capture of
 * forma-visuvate.framer.website/integrations (see
 * docs/FORMA_INTEGRATIONS_REFERENCE.md for every measured value); the content
 * is Roducq's own, approved at the content gate
 * (docs/FORMA_INTEGRATIONS_PAGE_AUDIT.md §4). The five bands are the
 * reference's own five:
 *
 *   hero -> catalog -> how connecting works -> request -> closing CTA
 *
 * SEVEN ENTRIES, NOT TWELVE. The reference advertises twelve integrations for
 * a task manager. Roducq ships three external connectors (Slack, Notion, a
 * connected mailbox) and four native capabilities (signed webhooks, PDF
 * export, file import, client links) — every one of them cited to code in
 * app/(marketing)/integrations/content.ts and re-checked by the test suite.
 * No board import, calendar, task tracker, design-tool or code-host card
 * exists here because none of them exist in the product, and the reference's
 * "syncs both ways" claim is absent because every Roducq connector is
 * read-only.
 *
 * The marketing shell (header, footer, announcement band, motion provider)
 * comes from the route group's layout, exactly like /, /about, /pricing,
 * /solutions, /features and /vs.
 */
export const metadata: Metadata = {
  title: "Integrations — roducq",
  description:
    "Connect Slack, Notion and a client mailbox to roducq, then send work back out with signed webhooks, PDF exports, file import and revocable client links.",
  alternates: { canonical: "/integrations" },
  openGraph: {
    type: "website",
    url: "/integrations",
    title: "Integrations — roducq",
    description:
      "Three external connectors and four native outputs: Slack, Notion and a connected mailbox in; signed webhooks, PDFs, file import and client links out.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Integrations — roducq",
    description:
      "Three external connectors and four native outputs: Slack, Notion and a connected mailbox in; signed webhooks, PDFs, file import and client links out.",
    images: [SOCIAL_IMAGE],
  },
};

export default function IntegrationsPage() {
  return (
    <>
      <IntegrationsHero />
      <IntegrationsCatalog />
      <ConnectingSteps />
      <RequestIntegration />
      <IntegrationsClosingCta />
    </>
  );
}
