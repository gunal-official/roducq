import Link from "next/link";
import type { Metadata } from "next";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import { ArrowRight, MessageSquare, PenLine, Share2, Workflow } from "lucide-react";

import { BriefSourceArt } from "@/components/workflow/ClientWorkArt";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

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

const BUILT_TODAY = [
  {
    icon: PenLine,
    title: "Intake with gap-flagged briefs",
    copy: "Paste a client email, call notes, or a chat log; get a structured draft that flags what's vague or missing as tracked open questions.",
  },
  {
    icon: MessageSquare,
    title: "A real source trail",
    copy: "Every pasted message stays verbatim and immutable, threaded onto its brief — you can always point back to what the client actually said.",
  },
  {
    icon: Workflow,
    title: "A pipeline, not a pile of docs",
    copy: "Briefs become proposals, proposals become plans, plans drive client updates. Each stage carries the last one's structure forward.",
  },
  {
    icon: Share2,
    title: "Client-facing output",
    copy: "Public, revocable share links for updates, plus reusable templates for the messages you send most.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            About roducq
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            A writing studio for client work.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            roducq is a <strong className="font-medium text-text">client-work writing studio</strong>
            {": "}a single workspace for the writing trail that runs through every
            freelance or studio engagement — intake, briefs, proposals, plans,
            and client updates.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Client work starts as scattered communication: an email here, a call
            note there, a &ldquo;quick question&rdquo; in chat. roducq takes
            that raw material as-is and structures it — flagging gaps early,
            keeping every source attached, and carrying the result forward stage
            by stage instead of asking you to re-type it into five different
            documents.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/signup">
                Try it <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="marketing-art"><BriefSourceArt /></div>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What&apos;s inside today
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {BUILT_TODAY.map(({ icon: Icon, title, copy }) => (
            <Card key={title} className="transition-transform hover:-translate-y-1">
              <CardHeader className="space-y-1 p-4">
                <div className="flex items-center gap-2.5">
                  <span className="icon-chip icon-chip-accent h-8 w-8">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-bold tracking-tight">{title}</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {copy}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20 rounded-surface border border-border bg-card p-6 sm:p-10">
        <p className="text-sm leading-relaxed text-muted-foreground">
          It&apos;s built for the people who live in this workflow — freelance
          designers, developers, writers, and small studios — and it&apos;s in
          early access, which means the people using it now shape what ships
          next. Built on Next.js and Supabase, with every workspace&apos;s data
          walled off behind row-level security.
        </p>
      </section>
    </div>
  );
}
