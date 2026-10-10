# Pricing launch-offer banner + Stripe promo codes

This note documents the `/pricing` launch-offer callout and the Stripe
Checkout promotion-code field shipped together so the launch team can turn
the banner on/off and issue codes without another deploy.

## What shipped

1. **Offer callout on `/pricing`** — a pill/badge + promo code + one-line
   description renders above the tier cards, only when Stripe billing is
   configured (i.e. when `STRIPE_SECRET_KEY` + `STRIPE_PRICES` are set).
   The component is a server-side rendered `role="note"` block on
   `app/(marketing)/pricing/page.tsx`; there is no client state or fetch.
2. **Stripe Checkout promotion codes enabled** — every call to
   `createCheckoutSession` now sends `allow_promotion_codes=true`, so
   Stripe's hosted page shows the **"Add promotion code"** field. No
   coupon/discount id is hardcoded; codes are created and managed in the
   Stripe dashboard.

## Env vars

All three are optional and only read by `lib/stripe.ts → getPricingOffer`.

| Var                  | Default                                                          | Purpose                                                    |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `PRICING_OFFER_BADGE`| `LAUNCH OFFER`                                                   | Short pill label inside the accent chip.                   |
| `PRICING_OFFER_TEXT` | `Save 20% for your first 3 months — enter the code at Checkout.` | The sentence. Set to empty string (`""`) to hide banner.   |
| `PRICING_OFFER_CODE` | `LAUNCH20`                                                       | Monospace code shown next to the badge.                    |

Visibility rules:

- Billing **not** configured (`STRIPE_SECRET_KEY` / `STRIPE_PRICES`
  missing) → banner hidden, no placeholder renders (same as the price
  row staying honest about "billing isn't configured yet").
- Billing configured, `PRICING_OFFER_TEXT=""` (or unset but override file
  clears it) → banner hidden. This is the off-switch after the offer ends.
- Billing configured, env vars unset → defaults render (LAUNCH OFFER /
  LAUNCH20 / 20% for 3 months).
- Billing configured, env vars set → the operator's copy renders verbatim.

## Setting up a real code in Stripe

1. Stripe dashboard → **Promotions** → **Coupons** → **New coupon**.
2. Set the discount (e.g. 20% off, Duration: *Once* repeating for 3
   months) and save.
3. **Promotion codes** tab on that coupon → **New promotion code** → enter
   the code that matches `PRICING_OFFER_CODE` (default `LAUNCH20`) and
   activate it.
4. Deploy with the env vars set — customers now see the banner on
   `/pricing` and can enter the code on Checkout to apply the discount.

After the offer ends, set `PRICING_OFFER_TEXT=""` and deactivate the code
in Stripe (do not delete the coupon — existing redemptions stay on the
subscriptions that took them).

## What this intentionally does NOT add

Following the `/pricing` truthfulness contract enforced by
`tests/components/pricing.test.ts`:

- **No seat limits.** The Checkout quantity is still hardcoded to 1
  (per-workspace billing). No new copy claims "up to N seats".
- **No usage quotas.** No briefs-per-month, AI-credit cap or storage
  allowance is added by the banner or the code.
- **No hardcoded discount on the server.** The server never sends a
  coupon id, a `discounts[]` array, or a trial-period override. The
  promotion-code field is shown to the customer, and whatever they enter
  (or don't) is validated entirely by Stripe.

If the marketing ask later includes an auto-applied discount, that
requires a deliberate change to `buildCheckoutSessionParams` (the
existing "no hardcoded coupon" test in `tests/lib/stripe.test.ts` will
fail until it is intentionally updated).

## Screenshots

See `docs/screenshots/`:

- `pricing-light.png` — `/pricing` with billing configured, light theme,
  offer callout visible above tier cards.
- `pricing-dark.png` — same view in dark theme (accent-soft background
  respects the dark token scale).
- `pricing-no-billing.png` — same route with Stripe billing unconfigured
  (no `STRIPE_SECRET_KEY`/`STRIPE_PRICES`): offer callout is hidden and
  the Team tier shows the "Billing isn't configured yet" note, which is
  the same behaviour local dev sees out of the box.

## Files touched

- `app/(marketing)/pricing/page.tsx` — renders the callout from
  `getPricingOffer(pricesConfig.ok)`.
- `lib/stripe.ts` — adds `getPricingOffer`, defaults, and
  `allow_promotion_codes=true` to `buildCheckoutSessionParams`.
- `.env.local.example` — documents the three new env vars.
- `tests/lib/stripe.test.ts` — coverage for promo-code param, absence
  of hardcoded coupons, and offer-config resolution.
- `tests/components/pricing.test.ts` — source-level guards that the
  banner is gated on billing config, that badge/code/text come from the
  resolved offer, and that Checkout enables promotion codes.
- `docs/pricing-offer.md` — this file.
- `docs/screenshots/pricing-*.png` — evidence.
