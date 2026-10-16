# Razorpay Production Audit — RoduCQ

Date: 2026-10-16. PR: `fix: Razorpay-only billing production readiness`. Production: https://roducq.nanexi.com (not deployed by this PR).

## 1. Repository verification (before editing)
- Fetched `origin/main` (`2926fce`); PR #40 MERGED (2026-10-16), PR #41 MERGED (2026-10-16); push access confirmed (`permissions.push=true`).
- Baseline after `npm ci`: `npm test` 858 pass, `tsc --noEmit` clean, `npm run lint` clean.
- **Finding: Razorpay was NOT implemented at all.** Billing was Stripe-only: `lib/stripe.ts`, `app/api/stripe/webhook/route.ts`, Stripe Checkout + Customer Portal server actions, `STRIPE_*` env, Stripe pricing tests. `docs/billing-webhooks-closeout.md` records a same-day Razorpay pivot that "was reversed before commit" (HISTORICAL).

## 2. Current payment architecture (after this PR)
- `lib/razorpay.ts` (zero-SDK, fetch + Basic auth): server-owned plan config, signature verification (constant-time), webhook parsing, status mapping, Razorpay API (create/fetch/cancel subscription).
- Checkout: Settings `PlanCheckoutButton` → server action `createRazorpayCheckout(currency)` (auth + owner, plan from `RAZORPAY_PLANS`) → official Checkout.js (`https://checkout.razorpay.com/v1/checkout.js`, `subscription_id`) → POST `/api/razorpay/verify`.
- Verification: HMAC_SHA256(`razorpay_payment_id|razorpay_subscription_id`, `RAZORPAY_KEY_SECRET`) + server-side `GET /v1/subscriptions/:id` confirming `notes.workspace_id`, configured `plan_id`, mapped status. Browser success alone grants nothing; failed/canceled checkout shows a toast and charges nothing.
- Webhook: `POST /api/razorpay/webhook` — raw-body HMAC with `RAZORPAY_WEBHOOK_SECRET` (`X-Razorpay-Signature`), allowlist (`subscription.authenticated/activated/charged/pending/halted/paused/resumed/cancelled/completed/updated`, `payment.failed`), idempotency via `billing_webhook_events` (sha256 of raw body; verified by `verify:db`), out-of-order guard via `last_billing_event_at`, safe logging (no signatures/secrets).

## 3. Pricing configuration
Server-owned `RAZORPAY_PLANS` JSON: `[{"currency":"INR","planId":"plan_...","amount":1499}]`. Plan names unchanged (Starter free / Team paid per workspace / Studio contact); prices are NOT changed by this PR — amounts are display values that must match the operator-created Razorpay Plans. Free = no `billing_subscriptions` row (or non-`active` status). No unenforced quotas are advertised (existing copy contract retained). Annual billing remains unavailable (no annual Plans configured).

## 4. Subscription lifecycle & entitlement mapping
| Razorpay status | Stored | Pro? |
|---|---|---|
| active | active | ✅ only this grants Pro |
| authenticated / created / pending | same | ❌ payment not settled / retrying |
| halted | halted | ❌ retries exhausted (UI: "Payment needs attention") |
| paused | paused | ❌ |
| cancelled | canceled | ❌ |
| completed / expired | same | ❌ |
Renewal = `subscription.charged` (stays active); failed payment = `payment.failed`/`subscription.pending`. Cancellation: owner-only `cancelRazorpaySubscription` (cancel_at_cycle_end=1); status flips on webhook. Billing management is in Settings → Plan (status, plan, cancel) — no invented Stripe-style portal.

## 5. Legacy Stripe inventory
| Reference | Class | Action |
|---|---|---|
| `lib/stripe.ts`, `app/api/stripe/webhook`, Checkout/Portal actions, `STRIPE_*` env | ACTIVE | Removed/replaced with Razorpay |
| `billing_subscriptions.stripe_*` columns + historical rows, 2026-09 migrations | HISTORICAL | **Preserved** (additive migration only) |
| README/closeout docs (2026-09-26 phase) | HISTORICAL | Annotated, not rewritten |
| Outbound-webhook HMAC scheme comment ("Stripe-style t/v1") in `lib/webhooks.ts` | LEGACY (naming) | Left: it describes RoduCQ's own outbound webhook format, unrelated to billing |
| Route-inventory evidence JSON under `docs/screenshots/` | HISTORICAL | Left as dated evidence |

## 6. Required configuration (operator — NOT done by this PR)
Vercel Production env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PLANS`, plus existing `SUPABASE_SERVICE_ROLE_KEY`. Razorpay Dashboard: create a Plan per currency in `RAZORPAY_PLANS`; create webhook `https://roducq.nanexi.com/api/razorpay/webhook` with the allowlisted events and the same secret; optionally create the launch Offer matching `PRICING_OFFER_*`. Test/live consistency: key id must be `rzp_test_` in test and `rzp_live_` in live, with Plans/webhook created in the same mode.
**Database**: apply `supabase/migrations/20261016000000_razorpay_billing.sql` before enabling Razorpay env (additive; preserves Stripe history).

## 7. Tests
`tests/lib/razorpay.test.ts`: plan validation, payment/webhook signature valid+invalid, status mapping, mocked Razorpay API success/failure, missing config, no-active-Stripe guards, duplicate/out-of-order wiring guards. Updated pricing/home/forma tests for the Razorpay routes (handler inventory 17→18) and server-owned quantity=1.

## 8. Production verification checklist (pending operator)
- [ ] Apply migration; set Vercel env (test mode first); create Razorpay Plans + webhook.
- [ ] Test-mode end-to-end: checkout → verify → Pro; webhook duplicate/out-of-order; failed payment → halted; cancel at cycle end.
- [ ] Authorized live end-to-end test with a real (refundable) charge — **not done; no real charges were created**.
- [ ] Confirm existing (legacy Stripe-era) workspaces retain data access; no active legacy subscriptions were migrated automatically.

## 9. Known limitations
- Not production-ready until §8 is complete. Pause/resume and payment-method update use Razorpay-hosted flows (no in-app UI); `payment.failed` maps an active sub to `pending` (conservative). Currency set = whatever Plans the operator configures. Screenshots: responsive harness updated for Razorpay; full Chromium re-verification requires a configured test-mode environment.
