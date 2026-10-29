import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

const PAGE_TITLE = "Privacy Policy — roducq";
const PAGE_DESCRIPTION = "What we collect, why we collect it, and the choices you have.";

/**
 * /privacy — Privacy Policy page
 *
 * Legal page with privacy policy content. Uses the same marketing shell
 * (header, footer) as other marketing pages via the route group layout.
 *
 * Roducq is operated by Nanexi AI.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

const PRIVACY_NAV = [
  { href: "#who-we-are", label: "Who we are" },
  { href: "#information-we-collect", label: "Information we collect" },
  { href: "#how-we-use-information", label: "How we use information" },
  { href: "#connected-apps", label: "Connected apps and integrations" },
  { href: "#how-information-is-shared", label: "How information is shared" },
  { href: "#data-retention", label: "Data retention" },
  { href: "#security", label: "Security" },
  { href: "#your-rights", label: "Your rights and choices" },
  { href: "#international-transfers", label: "International transfers" },
  { href: "#children", label: "Children" },
  { href: "#changes", label: "Changes to this policy" },
  { href: "#contact", label: "Contact us" },
] as const;

const LAST_UPDATED = "Last updated: October 29, 2026";

export default function PrivacyPage() {
  return (
    <div className="pr-page">
      {/* Hero section */}
      <section className="bg-lm-card py-16 md:py-24">
        <div className="lm-shell max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main content */}
            <main className="flex-1">
              <p className="text-lm-14 font-lm-semibold text-lm-ink-accent uppercase tracking-[0.14em]">
                Legal
              </p>
              <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-lm-semibold tracking-[-0.03em] text-lm-ink">
                Privacy <span className="text-lm-ink-accent">Policy</span>
              </h1>
              <p className="mt-6 text-lm-18 text-lm-ink-soft">
                {PAGE_DESCRIPTION}
              </p>
              <p className="mt-4 text-lm-14 text-lm-muted">{LAST_UPDATED}</p>

              {/* Privacy policy content */}
              <div className="mt-12 prose max-w-none prose-h2:text-lm-28 prose-h2:font-lm-semibold prose-h2:tracking-[-0.03em] prose-h2:text-lm-ink prose-h3:text-lm-21 prose-h3:font-lm-semibold prose-h3:tracking-[-0.02em] prose-h3:text-lm-ink prose-p:text-lm-15 prose-p:text-lm-ink-soft prose-p:leading-relaxed prose-strong:text-lm-ink prose-strong:font-lm-semibold prose-a:text-lm-ink-accent prose-a:hover:underline">
                <section id="who-we-are">
                  <h2>Who we are</h2>
                  <p>
                    This policy explains how roducq is operated. roducq is
                    operated by Nanexi AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
                    &ldquo;our&rdquo;) and explains how we collect, use, and protect
                    personal information when you use roducq.
                  </p>
                </section>

                <section id="information-we-collect">
                  <h2>Information we collect</h2>
                  <p>We collect only what we need to run and improve roducq.</p>
                  <h3>Account information</h3>
                  <p>
                    When you sign up, we collect your email address, password,
                    and other account details as a secure hash, and workspace
                    metadata.
                  </p>
                  <h3>Workspace content</h3>
                  <p>
                    The content you create or upload in roducq: briefs,
                    proposals, plans, updates, comments, files, and other content
                    you add to your workspace.
                  </p>
                  <h3>Billing information</h3>
                  <p>
                    Payments are processed by our payment processor, Razorpay.
                    We do not store your full card details.
                  </p>
                  <h3>Usage data</h3>
                  <p>
                    We collect information about how you use roducq, such as
                    features used, device and browser type, and error logs.
                  </p>
                  <h3>Communications</h3>
                  <p>
                    We may send you emails about your account, updates, or
                    support issues. You can opt out of promotional emails at any
                    time.
                  </p>
                </section>

                <section id="how-we-use-information">
                  <h2>How we use information</h2>
                  <p>
                    We use the information we collect to:
                  </p>
                  <ul>
                    <li>
                      Provide roducq&rsquo;s features, including generating
                      briefs, proposals, plans, summaries, and client updates based
                      on the content in your workspace
                    </li>
                    <li>Process payments and manage your subscriptions</li>
                    <li>Respond to your requests and provide support</li>
                    <li>
                      Understand how roducq is used so we can improve it
                    </li>
                    <li>Send you updates and product announcements</li>
                    <li>
                      Detect, prevent, and address fraud, abuse, or security
                      issues
                    </li>
                  </ul>
                  <p>
                    We do not sell personal information, and we do not use your
                    workspace content for advertising at any time.
                  </p>

                  <h3>Connected apps and integrations</h3>
                  <p>
                    When you connect third-party apps to roducq, those apps may
                    access your workspace data based on their permissions. We are
                    not responsible for their use of your data.
                  </p>
                </section>

                <section id="how-information-is-shared">
                  <h2>How information is shared</h2>
                  <h3>Within our workforce</h3>
                  <p>
                    Our team may access your information to operate roducq, such
                    as hosting, email delivery, and payment processing, under
                    contracts that prohibit use for other purposes.
                  </p>
                  <h3>With third-party services</h3>
                  <p>
                    We use third-party vendors to help us operate roducq, such as
                    hosting, email delivery, and payment processing, under
                    contracts that prohibit use for other purposes.
                  </p>
                  <h3>For legal reasons</h3>
                  <p>
                    We may disclose information if required by law or to protect
                    the rights, safety, or security of our users, Nanexi AI, or the
                    public.
                  </p>
                  <h3>In a business transfer</h3>
                  <p>
                    If Nanexi AI is involved in a merger or acquisition, we will
                    notify you and ensure your information is protected.
                  </p>
                </section>

                <section id="data-retention">
                  <h2>Data retention</h2>
                  <p>
                    We store personal information for as long as your account is
                    active or as needed to provide roducq. You may contact us at
                    contact@nanexi.com to request deletion of your account and
                    workspace information.
                  </p>
                  <p>
                    We may retain de-identified or aggregated information that
                    cannot be linked to you.
                  </p>
                </section>

                <section id="security">
                  <h2>Security</h2>
                  <p>
                    We apply reasonable technical and organizational measures
                    designed to protect personal information. No system is 100%
                    secure. If you discover a vulnerability, please report it to
                    contact@nanexi.com.
                  </p>
                </section>

                <section id="your-rights">
                  <h2>Your rights and choices</h2>
                  <p>
                    Depending on where you live, you may have the right to access,
                    correct, export, or delete your personal information. To make
                    a request, contact us at contact@nanexi.com. We will respond
                    as soon as reasonably practicable.
                  </p>
                </section>

                <section id="international-transfers">
                  <h2>International transfers</h2>
                  <p>
                    We may process information outside your country. When we
                    transfer personal information internationally, we use
                    appropriate safeguards.
                  </p>
                </section>

                <section id="children">
                  <h2>Children</h2>
                  <p>
                    roducq is designed for client work and is not directed to
                    children under 16. We do not knowingly collect personal
                    information from children. If you believe we have collected
                    information from a child, please contact us at
                    contact@nanexi.com.
                  </p>
                </section>

                <section id="changes">
                  <h2>Changes to this policy</h2>
                  <p>
                    We may update this policy from time to time. If the changes
                    are material, we will notify you by email or through roducq
                    before they take effect. Continued use of roducq after notice
                    constitutes acceptance of the updated terms.
                  </p>
                </section>

                <section id="contact">
                  <h2>Contact us</h2>
                  <p>
                    Questions about this policy or your information?
                    <Link href="mailto:contact@nanexi.com">
                      Contact us
                    </Link>
                    &nbsp;and we will be glad to help.
                  </p>
                </section>
              </div>
            </main>

            {/* Sidebar navigation */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <p className="text-lm-12 font-lm-semibold text-lm-muted uppercase tracking-[0.14em] mb-4">
                  On this page
                </p>
                <nav aria-label="Page sections">
                  <ul className="space-y-2">
                    {PRIVACY_NAV.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="block text-lm-14 text-lm-muted-readable hover:text-lm-ink-accent transition-colors duration-200 py-1.5"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
