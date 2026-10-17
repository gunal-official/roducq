import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import type { Metadata } from "next";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

import { ProposalDocumentArt } from "@/components/workflow/ClientWorkArt";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VS_LIMITATION_NOTE, VS_PAGE_LIST } from "./[slug]/vs-pages";

export const metadata: Metadata = {
  title: "Comparisons — roducq",
  description:
    "How roducq compares with Notion, Bonsai, HoneyBook, Dubsado, 17hats, FreshBooks, ClickUp, Basecamp and PandaDoc for client work.",
  alternates: { canonical: "/vs" },
  openGraph: {
    type: "website",
    url: "/vs",
    title: "Comparisons — roducq",
    description:
      "How roducq compares with Notion, Bonsai, HoneyBook, Dubsado, 17hats, FreshBooks, ClickUp, Basecamp and PandaDoc for client work.",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparisons — roducq",
    description:
      "How roducq compares with Notion, Bonsai, HoneyBook, Dubsado, 17hats, FreshBooks, ClickUp, Basecamp and PandaDoc for client work.",
    images: [TWITTER_IMAGE],
  },
};

export default function VsHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Badge variant="secondary">Comparisons</Badge>
          <div className="mt-4 flex items-center gap-3">
            <span className="icon-chip icon-chip-accent h-10 w-10 shrink-0">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How roducq compares
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            roducq is a narrow tool: it turns raw client messages into briefs,
            proposals, plans and updates. The tools below cover different parts of a
            practice. Pick the one closest to your work.
          </p>
        </div>
        <div className="marketing-art mx-auto"><ProposalDocumentArt /></div>
      </div>

      <p className="mt-8 rounded-md border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-text">Limits of these comparisons. </span>
        {VS_LIMITATION_NOTE}
      </p>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VS_PAGE_LIST.map((entry) => (
          <li key={entry.slug}>
            <Link
              href={`/vs/${entry.slug}`}
              className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardContent className="flex h-full items-start justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-display text-base font-bold tracking-tight">
                      roducq vs {entry.competitor}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {entry.summary}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
