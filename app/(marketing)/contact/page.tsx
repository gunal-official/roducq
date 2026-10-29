import type { Metadata } from "next";
import Link from "next/link";
import { Mail, HelpCircle, ShieldCheck } from "lucide-react";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import { ContactForm } from "./ContactForm";

const PAGE_DESCRIPTION = 
  "Choose sales for plans and pricing, or support for help with your workspace.";

export const metadata: Metadata = {
  title: "Contact — roducq",
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    url: "/contact",
    title: "Contact — roducq",
    description: PAGE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact — roducq",
    description: PAGE_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

const CONTACT_CATEGORIES = [
  {
    icon: Mail,
    title: "Sales",
    description:
      "Questions about plans, billing, or workspace setup for your team. We'll get back to you by email.",
  },
  {
    icon: HelpCircle,
    title: "Support",
    description:
      "Help with your workspace or billing. We'll do our best to respond quickly.",
  },
  {
    icon: ShieldCheck,
    title: "Security",
    description:
      "To report a vulnerability or ask about data protection, visit our Security page.",
    href: "/security",
  },
];

const WHAT_HAPPENS_NEXT = [
  {
    step: "01",
    title: "We read it",
    description: "A person on our team reads it and passes it to whoever can answer.",
  },
  {
    step: "02",
    title: "We reply",
    description: "We'll respond by email. Sales inquiries may include a follow-up call if appropriate.",
  },
  {
    step: "03",
    title: "You try it",
    description: "Set up a workspace with your own projects. Self-service signup is available.",
  },
];

export default function ContactPage() {
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Contact Section - Two-column layout */}
      <section className="bg-lm-card py-16 md:py-24">
        <div className="lm-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left column: Hero + Categories */}
            <div className="space-y-8">
              {/* Hero content - left aligned */}
              <div>
                <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em]">
                  Contact
                </p>
                <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-lm-semibold tracking-[-0.03em] text-lm-ink">
                  Contact <span className="text-lm-ink-accent">us</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lm-18 text-lm-ink-soft">
                  Choose sales for plans and pricing, or support for help with your workspace. Your message goes to the right person either way.
                </p>
              </div>

              {/* Contact Categories with dividers */}
              <div className="space-y-8 pt-8">
                {CONTACT_CATEGORIES.map((category, index) => (
                  <div key={category.title} className={index > 0 ? "border-t border-lm-border-soft pt-8" : ""}>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <category.icon className="h-6 w-6 text-lm-ink-accent" aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-lm-18 font-lm-semibold text-lm-ink">
                          {category.title}
                        </h2>
                        <p className="mt-2 text-lm-15 text-lm-ink-soft">
                          {category.href ? (
                            <Link href={category.href} className="text-lm-ink-accent hover:underline">
                              {category.description}
                            </Link>
                          ) : (
                            category.description
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: Form */}
            <div className="bg-lm-card rounded-2xl border border-lm-border-soft p-8 shadow-lm-md">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* What happens next */}
      <section className="bg-lm-card py-16 md:py-20">
        <div className="lm-shell max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left">
            <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em]">
              After you send a message
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-lm-semibold tracking-[-0.03em] text-lm-ink">
              What happens next
            </h2>
          </div>
          <div className="mt-12 border border-lm-border-soft rounded-lm-panel">
            <div className="grid gap-8 md:grid-cols-3 md:divide-x md:divide-lm-border-soft">
              {WHAT_HAPPENS_NEXT.map((item) => (
                <div key={item.step} className="p-6 md:p-8 md:first:pl-8 md:last:pr-8">
                  <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em] text-left">
                    {item.step}
                  </p>
                  <h3 className="mt-4 text-xl font-lm-semibold text-lm-ink text-left">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-lm-15 text-lm-ink-soft text-left">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
