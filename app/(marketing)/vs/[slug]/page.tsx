import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VS_LIMITATION_NOTE, VS_PAGES } from "./vs-pages";

interface VsPageProps {
  params: Promise<{ slug: string }>;
}

// Only content-backed slugs generate pages; everything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VS_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: VsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = VS_PAGES[slug];
  if (!entry) return {};
  return {
    title: `${entry.heading} — roducq`,
    description: entry.intro,
  };
}

export default async function VsPage({ params }: VsPageProps) {
  const { slug } = await params;
  const entry = VS_PAGES[slug];
  if (!entry) notFound();

  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
      <Link
        href="/vs"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All comparisons
      </Link>
      <Badge variant="secondary" className="mt-4">Comparison</Badge>
      <div className="mt-4 flex items-center gap-3">
        <span className="icon-chip icon-chip-accent h-10 w-10 shrink-0">
          <Scale className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="min-w-0 break-words font-display text-3xl font-bold tracking-tight">
          {entry.heading}
        </h1>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {entry.intro}
      </p>

      <Card className="mt-10">
        <table className="comparison-table">
          <caption className="sr-only">{entry.heading}: a feature-by-feature workflow comparison.</caption>
          <thead>
            <tr>
              <th scope="col">Workflow</th>
              <th scope="col">RoduCQ</th>
              <th scope="col">{entry.competitor}</th>
            </tr>
          </thead>
          <tbody>
            {entry.rows.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td><span className="comparison-cell-label" aria-hidden="true">RoduCQ</span><p>{row.roducq}</p></td>
                <td><span className="comparison-cell-label" aria-hidden="true">{entry.competitor}</span><p>{row.competitor}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {entry.takeaway}
      </p>

      <p className="mt-6 rounded-md border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-text">Limits of this comparison. </span>
        {VS_LIMITATION_NOTE}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/signup" className="inline-flex min-h-11 min-w-11 items-center">Try roducq</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">See pricing</Link>
        </Button>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        <Link href="/vs" className="inline-flex min-h-11 items-center font-medium text-text underline-offset-4 hover:underline">
          Compare roducq with other tools
        </Link>
      </p>
    </div>
  );
}
