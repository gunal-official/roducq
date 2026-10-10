import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Inbox,
  LayoutTemplate,
  Link2,
  ListChecks,
  Megaphone,
  Plug,
  Receipt,
  Scale,
  Search,
  Timer,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  CLOSING,
  COMPARE,
  FEATURES,
  FEATURES_SECTION,
  HERO,
  LIMITATION,
  PIPELINE,
  PIPELINE_SECTION,
  PRICING_TEASER,
  RAIL,
  TONE_CHIP_CLASS,
  TONE_RULE_CLASS,
  type IconKey,
} from "./home/content";
import { VS_PAGE_LIST } from "./vs/[slug]/vs-pages";

export const metadata: Metadata = {
  title: "roducq — client-work writing studio",
  description:
    "Turn messy client messages into structured briefs, proposals, plans and weekly updates — one purpose-built pipeline. Free to start, billed per workspace, never per seat. No e-signature and no payment collection, by design.",
};

/**
 * Icon keys → components. The data in ./home/content.ts names an icon by
 * key and never imports React; this map is the single place that resolves
 * one to the other, so the content module stays importable by tooling.
 */
const ICONS: Record<IconKey, LucideIcon> = {
  intake: Inbox,
  brief: ClipboardList,
  proposal: FileText,
  plan: ListChecks,
  update: Megaphone,
  share: Link2,
  template: LayoutTemplate,
  money: Receipt,
  time: Timer,
  search: Search,
  plug: Plug,
};

/** Small uppercase section label — the eyebrow above every band's title. */
function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-accent">
      {children}
    </p>
  );
}

/**
 * The redesigned home page (2026-10-10) — sections A→G.
 *
 *   A Hero · B capability rail · C the pipeline · D feature grid ·
 *   E compare teaser · F pricing teaser · G closing CTA + limits.
 *
 * Markup only: every string a visitor reads lives in ./home/content.ts so
 * the copy can be asserted against the product (tests/components/home.test.ts)
 * and reused by scripts/build-home-screenshots.py without parsing JSX.
 *
 * COLOUR IS NEVER INTERPOLATED. Per-item tints come from the TONE_* maps in
 * ./home/content.ts, whose values are whole literal Tailwind strings — see
 * the "design tokens" describe block in the test file, which fails the build
 * if this page ever goes back to building a class at runtime.
 */
export default function HomePage() {
  return (
    <>
      {/* ── A. Hero ─────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <Badge variant="soft">{HERO.eyebrow}</Badge>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            {HERO.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {HERO.intro}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={HERO.primaryCta.href}>{HERO.primaryCta.label}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={HERO.secondaryCta.href}>
                {HERO.secondaryCta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{HERO.note}</p>
        </div>
      </section>

      {/* ── B. Capability rail ──────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {RAIL.lead}
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2">
            {RAIL.items.map((item) => (
              <li key={item}>
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-xs font-medium"
                >
                  {item}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── C. The pipeline ─────────────────────────────── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Eyebrow>{PIPELINE_SECTION.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {PIPELINE_SECTION.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {PIPELINE_SECTION.intro}
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((step) => {
              const Icon = ICONS[step.icon];
              return (
                <li key={step.step}>
                  <Card className="h-full overflow-hidden">
                    <span
                      className={cn("block h-1 w-full", TONE_RULE_CLASS[step.tone])}
                      aria-hidden="true"
                    />
                    <CardHeader className="space-y-3 p-5">
                      <span
                        className={cn("icon-chip", TONE_CHIP_CLASS[step.tone])}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Step {step.step}
                        </p>
                        <CardTitle className="text-base">{step.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <CardDescription className="text-xs leading-relaxed">
                        {step.copy}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── D. Feature grid ─────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Eyebrow>{FEATURES_SECTION.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {FEATURES_SECTION.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {FEATURES_SECTION.intro}
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = ICONS[feature.icon];
              return (
                <li key={feature.title}>
                  <Card className="h-full">
                    <CardHeader className="space-y-3 p-5">
                      <span
                        className={cn("icon-chip", TONE_CHIP_CLASS[feature.tone])}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-0">
                      <CardDescription className="text-xs leading-relaxed">
                        {feature.copy}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── E. Compare teaser ───────────────────────────── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="flex items-start gap-3">
            <span className="icon-chip icon-chip-accent">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <Eyebrow>{COMPARE.eyebrow}</Eyebrow>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {COMPARE.title}
              </h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {COMPARE.intro}
          </p>

          {/* Chips come from the live comparison list, so this page can
              never advertise a /vs page that does not exist. */}
          <ul className="mt-6 flex flex-wrap gap-2">
            {VS_PAGE_LIST.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/vs/${entry.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-text shadow-rail transition-colors hover:bg-muted"
                >
                  roducq vs {entry.competitor}
                </Link>
              </li>
            ))}
          </ul>

          <Button asChild variant="link" className="mt-6 px-0">
            <Link href={COMPARE.cta.href}>
              {COMPARE.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── F. Pricing teaser ───────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <Eyebrow>{PRICING_TEASER.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {PRICING_TEASER.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {PRICING_TEASER.intro}
          </p>

          <ul className="mt-6 space-y-2">
            {PRICING_TEASER.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 text-sm text-text"
              >
                <span
                  className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                {bullet}
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" className="mt-8">
            <Link href={PRICING_TEASER.cta.href}>
              {PRICING_TEASER.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── G. Closing CTA + the limits callout ─────────── */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {CLOSING.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {CLOSING.intro}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={CLOSING.primaryCta.href}>
                  {CLOSING.primaryCta.label}
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href={CLOSING.secondaryCta.href}>
                  {CLOSING.secondaryCta.label}
                </Link>
              </Button>
            </div>
          </div>

          <div
            className="mx-auto mt-12 max-w-3xl rounded-lg border border-border bg-card p-5 shadow-rail"
            data-testid="home-limitation"
            role="note"
            aria-label={LIMITATION.title}
          >
            <div className="flex items-start gap-3">
              <span className="icon-chip icon-chip-muted">
                <TriangleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-base font-bold tracking-tight">
                  {LIMITATION.title}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-accent">
                  {LIMITATION.summary}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {LIMITATION.detail}
                </p>
                <Link
                  href={LIMITATION.href}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-4 transition-colors hover:text-text"
                >
                  {LIMITATION.hrefLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
