/**
 * Tiny, client-safe marketing-shell copy. Keep this module separate from the
 * full homepage content so the shared header/footer do not pull every page
 * string into their client bundles.
 */
export const ANNOUNCEMENT = {
  badge: "New",
  label: "Included on the free plan",
  text: "Team roles, templates and signed outbound webhooks",
  href: "/pricing",
  hrefLabel: "See what's included",
};

export const HOME_ANNOUNCEMENT = {
  badge: "Roducq",
  label: "Client work, made clearer",
  text: "Intake, briefs, proposals and client updates in one workspace",
  href: "/solutions",
  hrefLabel: "Explore solutions",
};

/** Homepage-only label: an account is not a free or paid plan. */
export const HOME_FOOTER_CTA = { label: "Create an account", href: "/signup" };
