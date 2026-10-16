import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
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
  Sparkles,
  Timer,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
      {children}
    </p>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-2xl lg:mx-0" role="img" aria-label="Illustrative RoduCQ workspace with example project data; not a live account">
      <div className="absolute inset-0 rounded-surface bg-accent/10 blur-2xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-surface border border-border/70 bg-card shadow-2xl shadow-text/10">
        <div className="flex h-12 items-center justify-between border-b border-border/70 px-4 sm:px-5">
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-error/70" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-success/70" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Studio / Acme launch</span>
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">On track</span>
        </div>
        <div className="grid min-h-[310px] grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-muted/35 p-3 sm:border-b-0 sm:border-r sm:p-4">
            <div className="mb-3 flex items-center gap-2 font-display text-sm font-bold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-control bg-accent text-xs text-on-accent">r</span>
              <span className="hidden sm:inline">roducq</span>
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p>
            <div className="flex flex-wrap gap-1 text-xs sm:block sm:space-y-1">
              {["Overview", "Intake", "Briefs", "Proposals", "Plans", "Updates"].map((item, index) => (
                <div key={item} className={cn("flex items-center gap-2 rounded-control px-2 py-2", index === 3 ? "bg-accent-soft font-semibold text-accent" : "text-muted-foreground")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", index === 3 ? "bg-accent" : "bg-border")} aria-hidden="true" />
                  {item}
                </div>
              ))}
            </div>
          </aside>
          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Client project · updated just now</p>
                <h2 className="mt-1 font-display text-lg font-bold tracking-tight sm:text-xl">Acme launch campaign</h2>
              </div>
              <span className="rounded-control border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">Share brief</span>
            </div>
            <div className="mt-5 rounded-control border border-border bg-bg p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="icon-chip icon-chip-accent !h-7 !w-7 !rounded-control"><FileText className="h-4 w-4" aria-hidden="true" /></span>Proposal v3</div>
                <span className="text-xs text-success">Ready to share</span>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="h-4 w-4/5 rounded-full bg-border/70" />
                <div className="h-4 w-full rounded-full bg-border/50" />
                <div className="h-4 w-3/5 rounded-full bg-border/50" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">Scope · 4 deliverables</span>
                <span className="rounded-full bg-info-soft px-2.5 py-1 text-xs font-medium text-info">Budget captured</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-control border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Next up</p>
                <p className="mt-1 text-xs font-semibold">Delivery plan</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-success"><Check className="h-4 w-4" aria-hidden="true" /> 2 of 4 complete</div>
              </div>
              <div className="rounded-control border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Client update</p>
                <p className="mt-1 text-xs font-semibold">Friday, ready to draft</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-success" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-control border border-border bg-card p-3 shadow-xl sm:flex">
        <span className="icon-chip icon-chip-success !h-9 !w-9"><Check className="h-5 w-5" aria-hidden="true" /></span>
        <span><span className="block text-xs font-semibold">Nothing gets lost</span><span className="text-xs text-muted-foreground">The original message stays attached</span></span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* A. Hero */}
      <section className="relative isolate bg-muted/35">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true"><div className="absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-accent/10 blur-3xl" /></div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:px-10 lg:py-24">
          <div className="max-w-xl">
            <Badge variant="soft" className="gap-2 rounded-full px-3 py-1.5"><Sparkles className="h-4 w-4" aria-hidden="true" />{HERO.eyebrow}</Badge>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.65rem]">{HERO.title}</h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{HERO.intro}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-lg shadow-accent/20">
                <Link href={HERO.primaryCta.href}>{HERO.primaryCta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={HERO.secondaryCta.href}>{HERO.secondaryCta.label}<ArrowDownRight className="h-4 w-4" aria-hidden="true" /></Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{HERO.note}</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/70 pt-5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" aria-hidden="true" /> One workspace, your whole team</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-success" aria-hidden="true" /> Free to start</span>
            </div>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* B. Capability rail */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p className="max-w-xs text-xs font-semibold uppercase leading-relaxed tracking-widest text-muted-foreground">{RAIL.lead}</p>
          <ul className="flex flex-wrap gap-2">
            {RAIL.items.map((item) => <li key={item}><Badge variant="outline" className="rounded-full bg-bg px-3 py-1.5 text-xs font-medium">{item}</Badge></li>)}
          </ul>
        </div>
      </section>

      {/* C. The pipeline */}
      <section className="overflow-hidden bg-bg">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div><Eyebrow>{PIPELINE_SECTION.eyebrow}</Eyebrow><h2 className="mt-4 max-w-lg font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{PIPELINE_SECTION.title}</h2></div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground lg:justify-self-end lg:text-base">{PIPELINE_SECTION.intro}</p>
          </div>
          <ol className="relative mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PIPELINE.map((step) => {
              const Icon = ICONS[step.icon];
              return <li key={step.step} className="relative rounded-surface border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-1">
                <div className="flex items-center justify-between"><span className={cn("icon-chip h-11 w-11 rounded-control", TONE_CHIP_CLASS[step.tone])}><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="font-mono text-xs text-muted-foreground">0{step.step}</span></div>
                <div className={cn("mt-5 h-1 w-10 rounded-full", TONE_RULE_CLASS[step.tone])} aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.copy}</p>
              </li>;
            })}
          </ol>
        </div>
      </section>

      {/* D. Feature grid */}
      <section className="bg-muted/35">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="mx-auto max-w-2xl text-center"><Eyebrow>{FEATURES_SECTION.eyebrow}</Eyebrow><h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{FEATURES_SECTION.title}</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{FEATURES_SECTION.intro}</p></div>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = ICONS[feature.icon];
              return <li key={feature.title} className="group rounded-surface border border-border/80 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <span className={cn("icon-chip h-12 w-12 rounded-surface", TONE_CHIP_CLASS[feature.tone])}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.copy}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-accent">Explore the workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </li>;
            })}
          </ul>
        </div>
      </section>

      {/* E. Compare teaser */}
      <section className="bg-bg">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
          <div><span className="icon-chip icon-chip-accent h-12 w-12 rounded-surface"><Scale className="h-5 w-5" aria-hidden="true" /></span><Eyebrow>{COMPARE.eyebrow}</Eyebrow><h2 className="mt-4 max-w-lg font-display text-3xl font-bold tracking-tight sm:text-4xl">{COMPARE.title}</h2><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{COMPARE.intro}</p><Button asChild variant="link" className="mt-5 min-h-11 px-0"><Link href={COMPARE.cta.href}>{COMPARE.cta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button></div>
          <div className="rounded-surface border border-border bg-muted/35 p-5 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Find your fit</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {VS_PAGE_LIST.map((entry) => <li key={entry.slug}><Link href={`/vs/${entry.slug}`} className="group flex min-h-12 items-center justify-between gap-3 rounded-control border border-border bg-card px-4 text-sm font-medium transition-colors hover:border-accent/50 hover:text-accent">roducq vs {entry.competitor}<ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* F. Pricing teaser */}
      <section className="bg-muted/35">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="overflow-hidden rounded-surface border border-border bg-card shadow-sm">
            <div className="grid lg:grid-cols-[1fr_0.8fr]">
              <div className="p-6 sm:p-10"><Eyebrow>{PRICING_TEASER.eyebrow}</Eyebrow><h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{PRICING_TEASER.title}</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{PRICING_TEASER.intro}</p><Button asChild variant="outline" className="mt-7"><Link href={PRICING_TEASER.cta.href}>{PRICING_TEASER.cta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button></div>
              <div className="border-t border-border bg-bg p-6 sm:p-10 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Straightforward by design</p>
                <ul className="mt-5 space-y-4">{PRICING_TEASER.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-3 text-sm"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><Check className="h-4 w-4" aria-hidden="true" /></span><span>{bullet}</span></li>)}</ul>
                <div className="mt-7 border-t border-border pt-5"><p className="font-display text-3xl font-bold">$0 <span className="font-sans text-sm font-normal text-muted-foreground">to get started</span></p><p className="mt-1 text-xs text-muted-foreground">No trial clock. Cancel the paid plan any time.</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* G. Closing CTA */}
      <section className="bg-bg">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="relative rounded-surface bg-dark px-6 py-14 text-center text-dark-foreground sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-surface" aria-hidden="true"><div className="absolute -right-16 -top-32 h-72 w-72 rounded-full bg-accent/25 blur-3xl" /></div>
            <div className="relative mx-auto max-w-2xl"><Badge variant="soft" className="border border-dark-foreground/10 bg-dark-foreground/10 text-dark-foreground">A clearer next step</Badge><h2 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-5xl">{CLOSING.title}</h2><p className="mt-4 text-sm leading-relaxed text-dark-foreground/75 sm:text-base">{CLOSING.intro}</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg"><Link href={CLOSING.primaryCta.href}>{CLOSING.primaryCta.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button><Button asChild size="lg" variant="outline" className="border-dark-foreground/30 bg-transparent text-dark-foreground hover:bg-dark-foreground/10"><Link href={CLOSING.secondaryCta.href}>{CLOSING.secondaryCta.label}</Link></Button></div></div>
          </div>
          <div className="mx-auto mt-8 max-w-4xl rounded-surface border border-border bg-card p-5 sm:p-6" data-testid="home-limitation" role="note" aria-label={LIMITATION.title}>
            <div className="flex items-start gap-4"><span className="icon-chip icon-chip-muted h-11 w-11 rounded-control"><TriangleAlert className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="font-display text-base font-bold tracking-tight">{LIMITATION.title}</p><p className="mt-1 font-mono text-sm font-semibold text-accent">{LIMITATION.summary}</p><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{LIMITATION.detail}</p><Link href={LIMITATION.href} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent underline underline-offset-4 transition-colors hover:text-text">{LIMITATION.hrefLabel}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></div>
          </div>
        </div>
      </section>
    </>
  );
}
