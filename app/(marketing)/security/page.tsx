import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import { ShieldCheck, Key, Users, FileText, Clock, Lock } from "lucide-react";

const PAGE_DESCRIPTION = 
  "Encryption, access controls, connected apps, and what happens to your data when you leave.";

export const metadata: Metadata = {
  title: "Security — roducq",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/security" },
  openGraph: {
    type: "website",
    url: "/security",
    title: "Security — roducq",
    description: PAGE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security — roducq",
    description: PAGE_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

const SECURITY_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Encryption everywhere",
    description:
      "Data is encrypted in transit with TLS 1.2 or higher, and at rest with AES-256. Backups are encrypted too.",
  },
  {
    icon: Key,
    title: "Access you control",
    description:
      "Two-step verification and project-level roles keep the right people in the right places.",
  },
  {
    icon: Users,
    title: "Your data, portable",
    description:
      "Your data belongs to you. Contact us to request a full data export or workspace deletion.",
  },
  {
    icon: FileText,
    title: "A clear record",
    description:
      "Activity logs and edit history give you a clear record of what changed and when.",
  },
  {
    icon: Lock,
    title: "Careful integrations",
    description:
      "Connected apps use OAuth with the narrowest permissions roducq needs. Disconnect an app and its access is revoked immediately.",
  },
  {
    icon: Clock,
    title: "Private by design",
    description:
      "roducq does not sell your data or use the contents of your workspace to advertise to you. Staff access is limited and logged.",
  },
];

const RESPONSIBLE_DISCLOSURE = {
  title: "Reporting a security issue",
  description:
    "Please report security issues privately so we can fix them before they are disclosed. We will confirm we received your report, keep you updated, and credit you if you want.",
  guidelines: [
    "Give us reasonable time to investigate before sharing details publicly.",
    "Do not access, change, or delete data that is not yours.",
    "Avoid testing that degrades service for other people.",
  ],
  cta: "Report an issue",
  ctaHref: "mailto:contact@nanexi.com",
};

const DISCLAIMER = {
  text: "This page describes how roducq is designed to handle security. No third-party compliance certifications are claimed.",
};

export default function SecurityPage() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      
      {/* Hero Section */}
      <section className="bg-lm-card py-16 md:py-24">
        <div className="lm-shell max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em]">
              Security
            </p>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-lm-semibold tracking-[-0.03em] text-lm-ink">
              How roducq <span className="text-lm-ink-accent">protects</span> your data
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lm-18 text-lm-ink-soft">
              Encryption, access controls, connected apps, and what happens to your data when you leave.
            </p>
          </div>
        </div>
      </section>

      {/* Security Features Grid */}
      <section className="bg-lm-card py-16 md:py-20">
        <div className="lm-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {SECURITY_FEATURES.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-lm-ink-accent" />
                </div>
                <div>
                  <h2 className="text-lm-18 font-lm-semibold text-lm-ink">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-lm-15 text-lm-ink-soft">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsible Disclosure CTA */}
      <section className="bg-gradient-to-br from-lm-accent via-lm-accent to-lm-accent-dark py-16 md:py-20">
        <div className="lm-shell max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-lm-card rounded-2xl p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em]">
                  Responsible disclosure
                </p>
                <h2 className="mt-4 text-3xl md:text-4xl font-lm-semibold tracking-[-0.03em] text-lm-ink">
                  {RESPONSIBLE_DISCLOSURE.title}
                </h2>
                <p className="mt-4 text-lm-16 text-lm-ink-soft">
                  {RESPONSIBLE_DISCLOSURE.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {RESPONSIBLE_DISCLOSURE.guidelines.map((guideline, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-lm-ink-accent mt-1.5" />
                      <span className="text-lm-15 text-lm-ink-soft">{guideline}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center md:justify-end">
                <Link
                  href={RESPONSIBLE_DISCLOSURE.ctaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lm-button bg-lm-accent px-6 py-3 text-lm-15 font-lm-semibold text-lm-on-accent shadow-lm-sm transition-colors hover:bg-lm-accent-strong"
                >
                  {RESPONSIBLE_DISCLOSURE.cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-lm-card py-12">
        <div className="lm-shell max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lm-14 text-lm-muted-readable">{DISCLAIMER.text}</p>
        </div>
      </section>
    </>
  );
}
