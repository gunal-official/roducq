# Roducq pricing: content and final corrections for approval

**Status:** The owner approved implementation of `/pricing` with the corrected matrix, exact cards and disclosures, five FAQ answers, and CTA destinations below. Only the pricing-page redesign is authorized. No billing, Razorpay, Supabase, authentication, checkout, entitlement, subscription, payment configuration, or schema changes are authorized.

## 1. Source and verification notes — review context, not page copy

- The owner authorized `app/(marketing)/pricing/plans.ts` as a **provisional transcription**. `docs/RODUCQ_PRICING_PAGE.md` and [PR #52](https://github.com/gunal-official/roducq/pull/52) state that the three tiers were transcribed from a Roducq pricing specification; the code names the claimed original `roducq_pricing.pdf`.
- The original Roducq pricing PDF is missing. **Every benefit and its tier placement in the proposed cards and matrix remains unverified against that PDF.** The owner has separately confirmed the prices, seats, Team additional-seat term and badge, and Studio CTA.
- The uploaded `pricing-page.pdf` is a four-page image-only capture of the Forma pricing page. Use it **only as a visual reference**, not as a source of Roducq benefits or prices.
- “Implemented” below means verified by source inspection, not an end-to-end production test. The app currently uses Free/Pro billing and does not map the three advertised tiers to separate checkout or enforce their seat/usage entitlements. The user has directed that the mismatch be disclosed, not fixed in billing code.

## 2. Exact proposed card text

The CTA labels and destinations are part of the proposal. `/signup` is the existing account-creation route, not a paid-plan checkout. The Studio CTA uses the existing mail destination.

### Starter

**For solo consultants and freelancers**

**$29 / month**<br>
**1 seat**

**Button:** Create account → `/signup`

**Includes**

- 15 briefs / month — tier limits are not currently enforced.
- Intake workspace with source preservation.
- Brief drafting with flagged gaps (AI when configured; otherwise a non-AI fallback).
- Generate proposal drafts from briefs.

### Team

**MOST POPULAR**<br>
**For small agencies getting organized**

**$79 / month**<br>
**Up to 5 seats · +$12 / additional seat after 5 seats**

**Button:** Create account → `/signup`

**Everything in Starter, with the Team brief allowance replacing the Starter allowance, plus:**

- Unlimited briefs — tier limits are not currently enforced.
- Generate task plans from proposal deliverables.
- Per-task owners — **Not currently available**.
- Per-task due dates — **Not currently available**.
- Client-update composer.
- Read-only brief sharing — **Not currently available**.
- Edit history and audit trails — **Partial**.

### Studio

**For growing teams running full client operations**

**$199 / month**<br>
**Up to 15 seats**

**Button:** Talk to us → `mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry`

**Everything in Team, with the same availability notes, plus:**

- Configurable update templates.
- Intake inbox with threaded sources.
- Revocable client-update links.

### Exact proposed disclosure accompanying the cards and comparison

> Monthly prices shown. Annual checkout is not available.
>
> Brief and seat limits are not currently enforced by tier. Additional-seat billing is not currently implemented. Starter, Team, and Studio are not mapped to separate paid-plan checkout. Creating an account does not purchase or activate a paid plan.

## 3. Exact proposed comparison matrix

**Proposed matrix legend:** “✓ indicates a capability described in the plan. Access is not currently enforced by Starter, Team, or Studio tier. — means not listed for that plan.” For the three specifically corrected rows below, Starter is shown as **— (Not included)**; Team and Studio are shown as **Not currently available**. These capabilities are not currently implemented in the app, and the label does not promise a future release. The brief-limit disclosure immediately follows the matrix.

| Feature | Starter | Team | Studio |
| --- | --- | --- | --- |
| Monthly price | $29 / month | $79 / month | $199 / month |
| Seats | 1 seat | Up to 5 seats | Up to 15 seats |
| Additional seats | — | +$12 / additional seat after 5 seats | — |
| Briefs | 15 / month* | Unlimited* | Unlimited* |
| Intake workspace with source preservation | ✓ | ✓ | ✓ |
| Brief drafting with flagged gaps† | ✓ | ✓ | ✓ |
| Generate proposal drafts from briefs | ✓ | ✓ | ✓ |
| Generate task plans from proposal deliverables | — | ✓ | ✓ |
| Per-task owners | — (Not included) | Not currently available | Not currently available |
| Per-task due dates | — (Not included) | Not currently available | Not currently available |
| Client-update composer | — | ✓ | ✓ |
| Read-only brief sharing | — (Not included) | Not currently available | Not currently available |
| Edit history and audit trails | — | Partial | Partial |
| Configurable update templates | — | — | ✓ |
| Intake inbox with threaded sources | — | — | ✓ |
| Revocable client-update links | — | — | ✓ |

**Exact matrix notes:**

- `*` Brief limits are not currently enforced by tier.
- `†` AI is used when configured; otherwise brief drafting uses a non-AI fallback.
- The billing disclosure in §2 accompanies this table as well as the cards.

## 4. Approved billing FAQ

### How many seats are listed for each plan?

Starter is listed with 1 seat, Team with up to 5 seats, and Studio with up to 15 seats. Seat limits are not currently enforced by tier.

### What are the brief limits?

Starter is listed with 15 briefs per month; Team and Studio are listed with unlimited briefs. Brief limits are not currently enforced by tier.

### What is Team’s additional-seat price?

Team lists an additional $12 per seat after 5 seats. Additional-seat billing is not currently implemented.

### Is annual checkout available?

No. Annual checkout is not available. The prices shown are monthly.

### Does creating an account purchase or activate a paid plan?

No. Creating an account does not purchase or activate a paid plan. Starter, Team, and Studio are not mapped to separate paid-plan checkout.

## 5. Approved additional CTA destinations

- **Studio banner button:** Talk to us → `mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry`.
- **Bottom CTA button:** Start organizing client work → `/signup`.
- The fictional client-work illustration in the bottom CTA must visibly say **Illustrative example · fictional client**.

## 6. Owner decisions applied

1. **Prices and seats:** Starter $29/month and 1 seat; Team $79/month, up to 5 seats, +$12 per additional seat, **MOST POPULAR**; Studio $199/month, up to 15 seats, **Talk to us**.
2. **Brief allowances:** Keep 15/month and unlimited only with clear not-enforced disclosure.
3. **Implemented capabilities:** Retain intake/source preservation, brief drafting, proposal generation, basic task-plan generation, client updates, update templates, threaded intake, and revocation of update links. AI brief generation is conditional with a non-AI fallback.
4. **Unavailable capabilities:** For per-task owners, per-task due dates, and read-only brief sharing, show Starter as **— (Not included)** and Team and Studio as **Not currently available**. The three capabilities are not currently implemented.
5. **History:** Show edit history and audit trails as **Partial**; do not claim full cross-document coverage.
6. **Omissions:** Do not show unverified support promises, brief/proposal templates, or higher AI caps in the public cards or comparison matrix.
7. **Signup and checkout:** State that account creation does not purchase or activate a paid plan. Keep annual checkout unavailable; no active annual toggle, annual prices, or annual-discount claim.
8. **Protected systems:** Do not modify Razorpay, Supabase, entitlements, subscriptions, checkout, or database schemas.
9. **FAQ:** The owner approved the exact questions and answers in §4; they disclose seats, brief limits, extra seats, annual checkout, and account creation versus paid-plan activation.
10. **Additional CTAs:** Studio banner **Talk to us** uses the specified Studio mailto; bottom **Start organizing client work** uses `/signup`.
11. **Approval:** The owner approved implementation of the corrected `/pricing` content and design. Protected systems and unrelated marketing pages remain out of scope; the requested PR must stay open and unmerged, with no production deployment.

## 7. Historical transcription and individual implementation reconciliation — audit only

This is the complete 16-string historical transcription, retained to document provenance and the owner’s decisions. **It is not proposed public card or matrix copy.** Every string and tier assignment remains unverified against the missing Roducq PDF.

| Plan | Original transcribed feature | Source-level finding and owner-directed treatment |
| --- | --- | --- |
| Starter | `15 briefs / month` | Keep the allowance with the explicit disclosure that tier limits are not currently enforced. |
| Starter | `Intake workspace with source preservation` | Keep. `app/(app)/intake/actions.ts` invokes `create_brief_bundle` to save brief, source, and questions. |
| Starter | `AI-generated briefs with flagged gaps` | Keep with qualification. `lib/ai/brief-generator.ts` uses AI only when configured and falls back to a deterministic non-AI heuristic. |
| Starter | `Basic proposal generation` | Keep as draft generation from briefs. `app/(app)/briefs/[id]/actions.ts` deterministically copies brief fields into a draft. |
| Starter | `Community support` | **Omit** from cards and matrix; operational availability is unverified. |
| Team | `Unlimited briefs` | Keep with the explicit disclosure that tier limits are not currently enforced; no separate commercial unlimited-service attestation was found. |
| Team | `Task-plan generation with owners & due dates` | Keep basic task-plan generation. `app/(app)/proposals/[id]/actions.ts` copies proposal deliverables into tasks; `lib/types/plan.ts` and `supabase/migrations/20260923010000_plans_schema.sql` show tasks contain only `id`, `text`, and `checked`. Label per-task owners and due dates **Not currently available**. |
| Team | `Client-update composer` | Keep. `components/updates/UpdateComposer.tsx` supports composing and saving updates. |
| Team | `Shareable read-only brief links` | Label **Not currently available**. Existing public links in `supabase/migrations/20260923030000_share_links_schema.sql` and `app/(app)/updates/[id]/actions.ts` are for updates, not briefs. |
| Team | `Full edit history & audit trail` | Label **Partial**. Brief edit history, proposal versions, and selected events exist; full cross-document coverage was not established. |
| Team | `Priority email support` | **Omit** from cards and matrix; operational availability is unverified. |
| Studio | `Configurable brief, proposal & update templates` | Keep update templates only. `app/(app)/settings/actions.ts` manages workspace templates and `components/updates/UpdateComposer.tsx` inserts them into updates; equivalent brief/proposal insertion was not found and is omitted. |
| Studio | `Intake inbox with threaded sources` | Keep. `app/(app)/intake/inbox/page.tsx` renders threads; intake actions add sources to a brief. |
| Studio | `Link revocation controls` | Keep only as revocation of client-update links. `app/(app)/updates/[id]/actions.ts` revokes update share links. |
| Studio | `Higher AI usage caps` | **Omit** from cards and matrix; no tier-specific AI caps are enforced by the app. |
| Studio | `Priority support & onboarding` | **Omit** from cards and matrix; service availability is unverified and `components/settings/PlanCard.tsx` describes priority support as planned. |

Other historical footnotes about paid trials, cancellation of these specific advertised tiers, model-training guarantees, and promotional offers are not proposed as unconditional claims. The existing code does not establish a paid-tier trial, a separate three-tier checkout, a third-party training attestation, or an approved launch offer. No annual discount or price is proposed.
