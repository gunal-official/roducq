import type { Metadata } from "next";
import Link from "next/link";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";

const PAGE_TITLE = "Terms of Service — roducq";
const PAGE_DESCRIPTION = "The agreement between you and roducq for using our website, apps, and services.";

/**
 * /terms — Terms of Service page
 *
 * Legal page with terms of service content. Uses the same marketing shell
 * (header, footer) as other marketing pages via the route group layout.
 *
 * Roducq is operated by Nanexi AI.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
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

const TERMS_NAV = [
  { href: "#agreement", label: "Agreement to these terms" },
  { href: "#your-account", label: "Your account" },
  { href: "#plans-billing-cancellation", label: "Plans, billing, and cancellation" },
  { href: "#acceptable-use", label: "Acceptable use" },
  { href: "#your-content", label: "Your content" },
  { href: "#connected-apps", label: "Connected apps and third-party services" },
  { href: "#changes-to-the-services", label: "Changes to the Services" },
  { href: "#suspension-and-termination", label: "Suspension and termination" },
  { href: "#disclaimers", label: "Disclaimers" },
  { href: "#limitation-of-liability", label: "Limitation of liability" },
  { href: "#governing-law", label: "Governing law" },
  { href: "#changes-to-these-terms", label: "Changes to these terms" },
  { href: "#contact-us", label: "Contact us" },
] as const;

const LAST_UPDATED = "Last updated: October 29, 2026";

export default function TermsPage() {
  return (
    <div className="te-page">
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
                Terms of <span className="text-lm-ink-accent">Service</span>
              </h1>
              <p className="mt-6 text-lm-18 text-lm-ink-soft">
                {PAGE_DESCRIPTION}
              </p>
              <p className="mt-4 text-lm-14 text-lm-muted">{LAST_UPDATED}</p>

              {/* Terms of service content */}
              <div className="mt-12 prose max-w-none prose-h2:text-lm-28 prose-h2:font-lm-semibold prose-h2:tracking-[-0.03em] prose-h2:text-lm-ink prose-h3:text-lm-21 prose-h3:font-lm-semibold prose-h3:tracking-[-0.02em] prose-h3:text-lm-ink prose-p:text-lm-15 prose-p:text-lm-ink-soft prose-p:leading-relaxed prose-strong:text-lm-ink prose-strong:font-lm-semibold prose-a:text-lm-ink-accent prose-a:hover:underline">
                <section id="agreement">
                  <h2>Agreement to these terms</h2>
                  <p>
                    These terms are between you and Nanexi AI, the operator of
                    roducq (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By
                    accessing or using roducq, you confirm that you are authorized
                    to accept these terms for you or the organization you
                    represent.
                  </p>
                </section>

                <section id="your-account">
                  <h2>Your account</h2>
                  <p>
                    You must be at least 16 years old to use most of roducq.
                    Keep your login details confidential and let us know if you
                    suspect unauthorized access. Workspace administrators control
                    who can access their workspace and what they can see.
                  </p>
                </section>

                <section id="plans-billing-cancellation">
                  <h2>Plans, billing, and cancellation</h2>
                  <p>
                    <strong>Free plan.</strong> This plan is available at no
                    cost, with the limits described on our
                    <Link href="/pricing">pricing page</Link>.
                  </p>
                  <p>
                    <strong>Paid plans.</strong> Paid plans are billed in
                    advance through our payment processor. Fees are non-refundable
                    except where required by law. If you cancel, your paid plan
                    remains active until the end of the billing period you have
                    paid for.
                  </p>
                </section>

                <section id="acceptable-use">
                  <h2>Acceptable use</h2>
                  <p>Please use roducq responsibly. You agree not to:</p>
                  <ul>
                    <li>Breach the law or infringe anyone&rsquo;s rights</li>
                    <li>
                      Upload malware or attempt to disrupt, probe, or gain
                      unauthorized access to roducq
                    </li>
                    <li>
                      Use roducq for spam, phishing, or other abusive purposes
                    </li>
                    <li>
                      Reverse engineer roducq except where the law allows it
                    </li>
                  </ul>
                </section>

                <section id="your-content">
                  <h2>Your content</h2>
                  <p>
                    You own the content you and your team add to roducq. You
                    give us the right to host, copy, and display it as needed to
                    provide and operate roducq for you. You are responsible for
                    ensuring that content does not violate anyone&rsquo;s rights.
                  </p>
                </section>

                <section id="connected-apps">
                  <h2>Connected apps and third-party services</h2>
                  <p>
                    roducq can connect to apps provided by third-party
                    companies. These apps are governed by their own terms and
                    privacy policies. We are not responsible for them. When you
                    connect an app, you authorize roducq to exchange data with
                    that app as described in the integration.
                  </p>
                </section>

                <section id="changes-to-the-services">
                  <h2>Changes to the Services</h2>
                  <p>
                    We may update roducq at any time. If we stop using a feature
                    you pay for, we may offer a feature of similar value at no
                    additional cost. If we cannot, we will provide reasonable
                    notice and a chance to export your content first.
                  </p>
                </section>

                <section id="suspension-and-termination">
                  <h2>Suspension and termination</h2>
                  <p>
                    We may suspend or terminate access at any time. If we suspend
                    or terminate access to your account, we will provide
                    reasonable notice.
                  </p>
                </section>

                <section id="disclaimers">
                  <h2>Disclaimers</h2>
                  <p>
                    We work hard to keep roducq reliable, but it is provided
                    &ldquo;as is&rdquo; and &ldquo;as available&rdquo;.
                    <strong>[REQUIRES LEGAL REVIEW]</strong> To the extent
                    permitted by law, we disclaim all warranties of
                    merchantability or fitness for a particular purpose.
                  </p>
                </section>

                <section id="limitation-of-liability">
                  <h2>Limitation of liability</h2>
                  <p>
                    <strong>[REQUIRES LEGAL REVIEW]</strong> To the extent
                    permitted by law, we will not be liable for indirect,
                    incidental, special, consequential, or punitive damages, or
                    for lost profits or data. Our total liability for any claim
                    related to roducq is limited to the amount you paid us in the
                    12 months before the claim arose.
                  </p>
                </section>

                <section id="governing-law">
                  <h2>Governing law</h2>
                  <p>
                    These terms are governed by the laws of [Jurisdiction]
                    without regard to its conflict of law rules. Disputes will
                    be handled in the courts of [Venue] unless applicable law
                    requires otherwise.
                  </p>
                </section>

                <section id="changes-to-these-terms">
                  <h2>Changes to these terms</h2>
                  <p>
                    We may update these terms from time to time. If the changes
                    are material, we will notify you by email or through roducq
                    before they take effect. Continued use of roducq after notice
                    constitutes acceptance of the updated terms.
                  </p>
                </section>

                <section id="contact-us">
                  <h2>Contact us</h2>
                  <p>
                    Questions about these terms?
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
                    {TERMS_NAV.map((item) => (
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
