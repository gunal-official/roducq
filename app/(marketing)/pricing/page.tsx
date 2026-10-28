import type { Metadata } from "next";
import Link from "next/link";
import { Check, Plus } from "lucide-react";

import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import {
  BILLING_FAQ,
  COMPARISON_GROUPS,
  COMPARISON_LEGEND,
  COMPARISON_NOTES,
  PRICING_DISCLOSURE,
  PRICING_HERO,
  STUDIO_CONTACT,
} from "./pricing-content";
import { PricingPlans } from "./pricing-plans";
import "./pricing.css";

const PRICING_TITLE = "Pricing — roducq";
const PRICING_DESCRIPTION =
  "Compare Starter, Team, and Studio plan terms for Roducq, with clear feature and billing availability.";

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

function PricingDisclosure({ context }: { context: "cards" | "comparison" }) {
  return (
    <div className="rp-disclosure" data-testid={`pricing-disclosure-${context}`}>
      {PRICING_DISCLOSURE.map((line) => <p key={line}>{line}</p>)}
    </div>
  );
}

function ComparisonValue({ value }: { value: string }) {
  if (value === "✓") {
    return (
      <span className="rp-table-check" role="img" aria-label="Capability described in this plan">
        ✓
      </span>
    );
  }
  const status = value === "Not currently available" || value === "Partial";
  return <span className={status ? "rp-table-status" : undefined}>{value}</span>;
}

const COMPARISON_COLUMN_IDS = ["pricing-col-starter", "pricing-col-team", "pricing-col-studio"] as const;

function FeatureComparison() {
  return (
    <section className="rp-comparison-section" aria-labelledby="pricing-comparison-heading">
      <div className="lm-shell">
        <p className="rp-eyebrow">Plan details</p>
        <h2 id="pricing-comparison-heading" className="rp-section-title font-display">
          Compare plan details
        </h2>
        <p className="rp-section-intro" id="pricing-comparison-legend">
          {COMPARISON_LEGEND}
        </p>
        <p className="rp-scroll-hint">Scroll to compare all plans.</p>
        <div
          className="rp-comparison-scroll"
          role="region"
          aria-label="Compare Starter, Team, and Studio plans"
          aria-describedby="pricing-comparison-legend pricing-matrix-notes"
          tabIndex={0}
          data-testid="pricing-comparison-scroll"
        >
          <table className="rp-comparison-table" data-testid="pricing-comparison-table">
            <caption className="sr-only">Compare Starter, Team, and Studio plans</caption>
            <colgroup>
              <col className="rp-feature-column" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Feature</span></th>
                <th id={COMPARISON_COLUMN_IDS[0]} scope="col"><span>Starter</span><small>$29 / month</small></th>
                <th id={COMPARISON_COLUMN_IDS[1]} scope="col"><span>Team</span><small>$79 / month</small></th>
                <th id={COMPARISON_COLUMN_IDS[2]} scope="col"><span>Studio</span><small>$199 / month</small></th>
              </tr>
            </thead>
            {COMPARISON_GROUPS.map((group, groupIndex) => {
              const groupId = `pricing-group-${groupIndex}`;
              return (
                <tbody key={group.title}>
                  <tr className="rp-table-group">
                    <th id={groupId} scope="rowgroup" colSpan={4}>{group.title}</th>
                  </tr>
                  {group.rows.map((row, rowIndex) => {
                    const rowId = `${groupId}-row-${rowIndex}`;
                    return (
                      <tr key={row.feature}>
                        <th id={rowId} scope="row">{row.feature}</th>
                        {row.values.map((value, index) => (
                          <td key={`${row.feature}-${index}`} headers={`${groupId} ${rowId} ${COMPARISON_COLUMN_IDS[index]}`}>
                            <ComparisonValue value={value} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
        <div className="rp-matrix-notes" id="pricing-matrix-notes">
          {COMPARISON_NOTES.map((note) => <p key={note}>{note}</p>)}
        </div>
        <PricingDisclosure context="comparison" />
      </div>
    </section>
  );
}

function StudioBanner() {
  return (
    <section className="rp-studio-section" aria-labelledby="pricing-studio-heading">
      <div className="lm-shell">
        <div className="rp-studio-banner">
          <div className="rp-studio-copy">
            <p className="rp-banner-eyebrow">Studio</p>
            <h2 id="pricing-studio-heading" className="font-display">More room for client work.</h2>
            <p>Bring briefs, proposals, and updates together as your client work grows.</p>
          </div>
          <ul className="rp-studio-highlights">
            <li><Check aria-hidden="true" /> Configurable update templates.</li>
            <li><Check aria-hidden="true" /> Intake inbox with threaded sources.</li>
            <li><Check aria-hidden="true" /> Revocable client-update links.</li>
          </ul>
          <a href={STUDIO_CONTACT} className="rp-button rp-button--white" data-testid="studio-banner-cta">
            Talk to us<span className="sr-only"> (opens your email client)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function BillingFaq() {
  return (
    <section className="rp-faq-section" aria-labelledby="billing-faq-heading">
      <div className="lm-shell rp-faq-layout">
        <div className="rp-faq-intro">
          <p className="rp-eyebrow">Billing FAQ</p>
          <h2 id="billing-faq-heading" className="rp-section-title font-display">Questions about pricing</h2>
          <p>Find answers to common questions about plan terms and availability.</p>
        </div>
        <div className="rp-faq-list" data-testid="billing-faq">
          {BILLING_FAQ.map((item, index) => (
            <details className="lm-faq rp-faq" key={item.question} open={index === 0}>
              <summary>
                <span>{item.question}</span>
                <Plus className="lm-faq-icon" aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="rp-closing-section" aria-labelledby="pricing-closing-heading">
      <div className="lm-shell">
        <div className="rp-closing-banner">
          <div className="rp-closing-copy">
            <h2 id="pricing-closing-heading" className="font-display">
              Make room for <span>clearer client work.</span>
            </h2>
            <p>Bring your briefs, proposals, and client updates together in one workspace.</p>
            <Link href="/signup" className="rp-button rp-button--white rp-closing-button" data-testid="pricing-bottom-cta">
              Start organizing client work
            </Link>
          </div>
          <figure className="rp-client-illustration">
            <div className="rp-brief-mock">
              <div className="rp-brief-topline">
                <span>Client brief</span><span>Draft</span>
              </div>
              <h3>Maple &amp; Field</h3>
              <p className="rp-brief-subtitle">A thoughtful new identity</p>
              <div className="rp-brief-rule" />
              <dl>
                <div><dt>Objective</dt><dd>Refresh the studio’s visual identity.</dd></div>
                <div><dt>Scope</dt><dd>Creative direction · website copy</dd></div>
                <div><dt>Next step</dt><dd>Turn the brief into a proposal</dd></div>
              </dl>
            </div>
            <figcaption>Illustrative example · fictional client</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <div className="rp-page">
      <section className="rp-hero-section" aria-labelledby="pricing-page-heading">
        <div className="lm-shell">
          {/* The hero is visible on the first paint. Neither it nor an ancestor
              starts at opacity 0 (PR #53), including without JavaScript. */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="rp-eyebrow lm-hero-in">{PRICING_HERO.eyebrow}</p>
            <h1
              id="pricing-page-heading"
              className="rp-hero-title lm-hero-in font-display min-[1200px]:text-lm-54"
            >
              {PRICING_HERO.before}<span>{PRICING_HERO.accent}</span>
            </h1>
            <p className="rp-hero-description lm-hero-in">{PRICING_HERO.description}</p>
          </div>
          <div className="rp-plans-prelude"><p>Monthly prices shown.</p></div>
          <PricingPlans />
          <PricingDisclosure context="cards" />
        </div>
      </section>
      <FeatureComparison />
      <StudioBanner />
      <BillingFaq />
      <ClosingCta />
    </div>
  );
}
