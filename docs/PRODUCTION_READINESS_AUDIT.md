# Roducq — Production Readiness & Core Functionality Audit

**Audit date:** 2026-10-26 (UTC)  
**Repository:** `gunal-official/roducq`  
**Audit base:** `main` / `origin/main` at `3387976202632c78f9733c52973a46d18a9464dd`  
**Session branch:** `arena/2f03779a-roducq` (audit documentation only)  
**Production origin:** `https://roducq.nanexi.com/`  
**Scope:** Read-only production-readiness review. No application changes, production writes, account creation, payment, deployment, merge, or configuration changes were performed.

## A. Executive summary

### Recommendation: **INSUFFICIENT EVIDENCE**

The repository contains a substantial, genuinely implemented workspace application and an unusually broad automated suite. In this audit, all 1,243 existing tests passed; TypeScript, lint, production build, database migration/RLS simulation, PDF verification, and the local production smoke harness passed. The source-level review found robust workspace scoping, role gates, RLS migrations, recovery-grant checks, and a fail-closed Razorpay Live Mode gate.

This is **not** enough to declare production ready for broader onboarding. The production origin could not be reached from the audit sandbox, there are no approved production test identities, Supabase/Vercel settings and runtime logs are not accessible here, and there is no browser binary for authenticated visual/mobile/a11y testing. Current production authentication, actual deployed RLS policies, real account workflows, and live service integrations therefore remain **UNVERIFIED**. Two user-facing implementation gaps and one local route failure are also documented below.

**No verified P0 or P1 blocker was found.** The recommendation remains **INSUFFICIENT EVIDENCE**, not GO or CONDITIONAL GO, because critical production behavior was not testable. Do not broaden onboarding on the evidence in this report alone.

### Verified baseline

| Check | Evidence / result |
| --- | --- |
| Latest `main` | `3387976202632c78f9733c52973a46d18a9464dd`; equals `origin/main` and this checkout's base. |
| PR #66 | Merged at that commit (`2026-10-26T13:15:26Z`). |
| Next.js | `package.json`: `^16.4.3`; lockfile resolves `16.4.3`. |
| Open pull requests | None returned by `gh pr list --state open`. |
| Production deployment metadata | GitHub deployment API reports Production deployment `7332812290`, commit `3387976202632c78f9733c52973a46d18a9464dd`, state `success`, created `2026-10-26T13:17:29Z`. This verifies GitHub's deployment record, **not** live HTTP behavior. |
| Direct production probe | `curl -IL https://roducq.nanexi.com/` failed with `SSL_ERROR_SYSCALL`; live origin inaccessible from this sandbox. |
| Worktree | Clean before audit; build left `tsconfig.json` unchanged. Final worktree contains only this documentation file. |
| Runtime / packages | Node `v22.22.3`; `npm ci` completed; no local `.env` file or production credentials are present. |

### Strengths

- Server-side `auth.getUser()` validation in the proxy and application layout; workspace-aware server actions; role checks for editor/owner-only operations.
- 32 SQL migrations apply cleanly in the offline PGlite database verifier. RLS, workspace separation, viewer behavior, sensitive-money restrictions, invite lifecycle, sharing, and billing write boundaries have many explicit fixture checks.
- Billing code rejects Razorpay Live Mode in the build, verifies checkout signatures and server-side subscription state, and uses webhook signatures, idempotency, and an atomic database write path.
- Good unit coverage for password recovery, OAuth helper wiring, payment safeguards, PDF generation, intake parsers, data models, and components.

### Critical limitations

- No production login, signup, OAuth, password reset, protected application route, customer data, live Supabase policy, or payment flow was exercised.
- No Vercel runtime logs, production env-presence report, or Supabase dashboard access was available. No environment values were read or printed.
- The browser/responsive verifier could not run because Chromium is absent; no current-run axe scan or authenticated keyboard/mobile QA was performed.
- The supplied authority file `pricing.pdf` was not present in the repository/workspace. The repository's pricing implementation and documentation were inspected, but could not be compared with that external authority artifact.

## B. Testing methods and evidence boundaries

Tests were run against the checked-out source at the baseline above, on this sandbox, without production credentials. Source review and local simulation are not substitutes for production verification. Earlier checks recorded in `docs/DEPENDENCY_SECURITY_AUDIT.md`, `docs/FINAL_GO_LIVE_READINESS.md`, and the PR #66 body are cited only as **prior repository evidence**; they are not represented as tests newly performed in this audit.

Commands executed:

| Command | Result |
| --- | --- |
| `npm ci` | **PASS** — 575 packages added; npm reported 4 moderate advisories. |
| `npm test` | **PASS** — 1,243 passed, 0 failed, 0 skipped; 316 top-level test entries / 309 suites in TAP output. |
| `npx tsc --noEmit` | **PASS** — no output/errors. |
| `npm run lint` | **PASS** — no ESLint errors. |
| `npm run build` | **PASS** — Next.js 16.4.3; 45/45 static pages generated. Warnings: React 18 support is deprecated for a future Next.js 17 upgrade; existing Tailwind `duration-[250ms]` ambiguity warning. |
| `npm audit` | **4 moderate / 0 high / 0 critical**, exit status 1. All four report entries relate to GHSA-rj75 through `postcss-selector-parser@6.1.5`, `postcss-nested`, `tailwindcss`, and `tailwindcss-animate`. See dependency finding below and `docs/DEPENDENCY_SECURITY_AUDIT.md` §12.1; do not infer exploitability from the stale advisory range alone. No dependency was changed. |
| `npm run verify:db` | **PASS** — 32 migrations applied; seed idempotency; 15 core tables RLS-enabled; workspace/role, cross-workspace, public-token, and billing policy checks passed in PGlite. This is an offline simulation, not a query against production Supabase. |
| `npm run verify:production` | Initially unable to run without a server; then **PASS** against a local `next start` production build. Metadata checked on `/`, `/about`, `/pricing`, `/vs`, `/vs/notion`; 15 internal landing links crawled; 4 protected-link redirects behaved as expected. Loopback timing samples: 7/10, 7/10, 7/11 ms (TTFB+transfer; local sandbox only, not a CWV measurement). |
| Local protected/public route probe | Anonymous requests to the tested protected app routes returned 307 to `/login`, except `/search` (500 due to missing Supabase env and an omitted proxy prefix; see `AUD-OPS-001`). `/`, auth routes, and `/pricing` returned 200. No authenticated state was available. |
| Local response headers | Production build returned HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and the configured CSP. Live-origin headers remain unverified. |
| `npm run verify:pdf` | **PASS** — 14 sample documents / 20 pages; 0 overflow, structure, or content findings. |
| `npm run verify:responsive` | **NOT RUN** — failed its prerequisite check: Chromium is not installed. No browser download or screenshot was produced. |

The local production server was stopped after checks. No service values/secrets, passwords, cookies, tokens, or OAuth materials were logged by this audit.

## C. Implemented application and route inventory

### Authenticated application routes

The route-group layout `app/(app)/layout.tsx` checks the Supabase user and redirects anonymous sessions to `/login`; `proxy.ts` calls `lib/supabase/middleware.ts`, which enumerates protected prefixes and validates the session. `/` is public marketing for signed-out users and rewrites to `/dashboard` for a signed-in user.

| Route(s) | Intended role / access | Main function | Current test coverage / status |
| --- | --- | --- | --- |
| `/`, `/dashboard` | Signed-in workspace member; dashboard resolves active workspace | Pipeline dashboard, briefs/proposals/plans/updates activity and “needs you” summaries | Dashboard unit/component tests; anonymous redirect verified locally for `/dashboard`; signed-in production rendering **UNVERIFIED**. |
| `/intake`, `/intake/inbox` | Workspace editor for create/write; members can read, subject to role gates | Paste or upload source; create brief; thread follow-up sources; review inbox | Intake parsers and route/action contract tests; PGlite write/RLS checks. Authenticated UI, persistence and AI provider **UNVERIFIED**. |
| `/briefs`, `/briefs/[id]` | Workspace members read; editor required to modify | Brief list/detail, questions, source history, status, generate proposal | Brief/action/source tests; PGlite row isolation and RPC checks; runtime against Supabase **UNVERIFIED**. |
| `/proposals`, `/proposals/[id]`, `/proposals/[id]/versions/[versionId]` | Members read; editors write/restore; history is append-only | Draft/edit proposal, status, PDF export, version history/restore, generate plan | Proposal/version tests and database checks; authenticated workflow/persistence **UNVERIFIED**. |
| `/plans`, `/plans/[id]` | Members read; editors write | Delivery plan and tasks, progress/status, draft update generation, PDF/Markdown export | Plan and PDF checks; authenticated UI/data persistence **UNVERIFIED**. |
| `/updates`, `/updates/[id]` | Members read; editors write; public sharing only through token | Client update drafting, editing, status and revocable read-only public link | Share/version/UI tests and DB token/RLS checks; real app/public data path **UNVERIFIED**. |
| `/contracts`, `/contracts/[id]` | Members read; editors write; invoice-like document controls are workspace-scoped | Manual contract drafting/editing, status, signature metadata, PDF export | Component/PDF and DB checks. No third-party electronic-signature workflow is implemented; real persistence **UNVERIFIED**. |
| `/invoices`, `/invoices/[id]` | Members with `canSeeMoney` read/write; viewers are denied money data | Draft invoices, line items/totals, status, public token links, PDF | Invoice/PDF/share tests and PGlite RLS; runtime/public access **UNVERIFIED**. Invoice creation is not payment collection. |
| `/time` | Editors; money visibility hidden from viewers | Time entries, timer, reports inputs | Time timer / DB constraints, RLS tests; runtime **UNVERIFIED**. |
| `/reports` | Workspace member; financial reports depend on money permissions | Workspace activity/financial reporting | Reports/PDF tests; authenticated report access **UNVERIFIED**. |
| `/search` | Workspace member | Search/filter across workspace records | Search tests exist. Proxy prefix omission and missing-env 500 are recorded as `AUD-OPS-001`; normal configured production behavior **UNVERIFIED**. |
| `/settings` | Members see applicable settings; owner-only settings/actions (team, templates, workspace, integrations, webhooks, billing controls) | Workspace profile/brand, roles/invites, templates, billing, mailbox/integrations, activity, webhooks | Many action/UI and policy checks; no authenticated production exercise. |
| `/onboarding` | Signed-in user with no workspace | Create workspace / accept first-use path | Action/helper tests and DB RPC; live signup/OAuth onboarding **UNVERIFIED**. |

### Authentication and public routes

- Auth UI: `/login`, `/signup`, `/forgot-password`, `/reset-password`.
- Server callback: `/auth/callback`; recovery helper endpoints: `/auth/recovery/status`, `/auth/recovery/claim`.
- Public, token-gated: `/share/[token]` (read-only update) and `/invoice/[token]` (read-only sent invoice); `/invite/[token]` handles an invite token.
- Marketing: `/`, `/about`, `/changelog`, `/features`, `/integrations`, `/pricing`, `/solutions`, `/vs` and `/vs/[slug]`.

Signup/login/OAuth/password recovery are implemented. Password recovery uses Supabase's reset flow, a server-side PKCE callback, a session-bound recovery grant and one-time grant consumption. Passwords are passed to Supabase and are not persisted/logged by the application code reviewed. The forgot-password confirmation is neutral. Google OAuth configuration and redirect allowlisting are operator-controlled in Supabase and could not be inspected.

### Genuine workflow scope / product boundary

- **Client management:** no separate client entity/table or CRM route exists. Client identity is a free-text `client_name` on briefs/proposals/plans/updates/contracts/invoices; datalists are suggestions from brief names. Classify dedicated client CRM as **NOT IMPLEMENTED**.
- **Intake and professional writing:** source capture and extraction, brief drafting, proposal/contract writing, delivery plans, client updates, and invoices are implemented as connected document workflows. AI brief generation is optional (`OPENAI_API_KEY`); source describes a deterministic local parser fallback. No live AI/provider call was made.
- **Editing/persistence:** server actions and Supabase writes exist for major records, with DB constraints/RLS tests. Human use against an authorized staging/production fixture account was not possible, so real end-to-end persistence is **UNVERIFIED**.
- **Collaboration:** workspace membership, owner/member/viewer roles, invitations, activity history, and ownership-aware writes exist. No evidence of simultaneous live co-editing or presence/collaborative editor exists; do not market this as realtime collaboration.
- **Sharing/export:** public share links are implemented for updates; public invoice links are implemented for sent invoices; PDFs/print and selected Markdown export exist. Public brief sharing is not implemented, despite the Team pricing feature text (finding `AUD-FUNC-001`).
- **Search/filtering:** actual search route and component exist; data availability and search quality against a connected Supabase project were not tested.
- **Account management:** password update/recovery, workspace/team controls, invite, role management and leave/delete flows exist. Production account/session settings are not verified.

## D. Test coverage matrix

Status denotes what this audit could establish, not what prior documents claim.

| Workflow / control | Status | Evidence and limitations |
| --- | --- | --- |
| Signup and email/password login | **PARTIAL** | UI and Supabase calls exist; unit/component coverage and earlier PR #66 stubbed-browser evidence are documented. No new signed-in user or production auth request was made. Supabase email confirmation and rate-limit settings are inaccessible. |
| Logout/session persistence/expiry/invalid cookies | **UNVERIFIED** | Middleware validates with `auth.getUser`; no dedicated production test identities or browser available. |
| Password reset request/completion/expired token | **PARTIAL** | Current helper/component tests cover neutral response, validation, callback, grant binding/expiry and replay prevention. No real reset email was sent; live template/callback allowlist and real expired token behavior were not tested. |
| Google OAuth | **PARTIAL** | Helper wiring and callback exist; OAuth provider enablement, consent configuration and production callback allowlist are dashboard-controlled and unverified. |
| Anonymous protected-route denial | **PARTIAL** | Local production-build test: tested application routes redirected to `/login`, except `/search` which returns 500 with missing Supabase environment. No production-origin probe. |
| Authenticated dashboard/navigation/loading/empty/error states | **UNVERIFIED** | Code/routes and unit tests exist; no authenticated browser or service-backed account available. |
| Intake text/file extraction | **PARTIAL** | PDF/DOCX/text parser and size/type cases are covered by tests; file extraction is memory-only (5 MB input cap, bounded text). No authenticated browser submission or live optional AI-provider test. |
| Brief creation/editing/ownership | **PARTIAL** | Action tests and DB RPC/RLS fixtures pass; no live Supabase or user-data mutation. |
| Proposal creation/edit/version/restore | **PARTIAL** | Tests and PGlite history/authorization policies pass; app persistence under production auth unverified. |
| Plans/tasks/updates/sharing | **PARTIAL** | Tests and DB membership/token/revoke checks pass; no real public link or authenticated save tested. |
| Contract editing/signing | **PARTIAL** | Document and database mechanisms exist. No external e-sign flow; no real data mutation. |
| Invoice draft/share/export | **PARTIAL** | Totals, PDF, public-token and RLS tests pass; no production invoice/customer data touched. No payment-collection workflow claimed. |
| Time/report/search | **PARTIAL** | Unit and offline DB checks exist; signed-in runtime not tested. `/search` missing-env issue tracked separately. |
| Workspace roles/team/invites/settings | **PARTIAL** | Extensive PGlite and unit checks; real invite email/provider configuration and production identity checks unavailable. |
| Supabase RLS/data isolation | **PARTIAL** | Migrations and offline PGlite tests cover membership/foreign-workspace denial and role restrictions. Actual deployed Supabase migration state, policies, and cross-user behavior **UNVERIFIED**. |
| API/server-action security | **PARTIAL** | 15 route handlers and 19 action modules inventoried; source review and unit tests. No service-backed malicious-input/authorized-identity matrix executed. |
| Razorpay payment safeguards | **PASS (source + automated tests)** / production status **UNVERIFIED** | Live mode is excluded from allowed modes; webhook/checkout tests are in the passing suite; pricing annual config is empty. No real checkout/payment/webhook was sent; production env and provider dashboard were not accessed. |
| Public pricing | **PARTIAL** | Repository code/test match the requested `$29/$79/$199`, `MOST POPULAR`, and Studio contact CTA. Authority PDF absent; billing app uses Free/Pro rather than explicit Starter/Team/Studio mapping. |
| Vercel deployment | **PARTIAL** | Successful GitHub Production deployment metadata for exact baseline commit; no direct live HTTP, Vercel logs/settings, health metrics or env presence check. |
| Browser/mobile/accessibility | **UNVERIFIED** | Chromium unavailable; `verify:responsive` prerequisite failed. No current-run viewport suite, axe scan, keyboard/dialog focus assessment, Firefox or WebKit run. |
| Performance/runtime errors | **PARTIAL** | Local production build and local smoke pass; loopback TTFB samples recorded above. No production RUM, server logs, field CWV, or cross-browser measurement. |

## E. Security review

### Supabase, ownership, and service-role boundaries

- Reviewed all 32 `supabase/migrations/*.sql`; `npm run verify:db` applies them and checks RLS policies using a non-owner PGlite test role and simulated `auth.uid()`.
- Core workspace entities use membership-scoped policies; role-gated writes and money visibility are tested, including viewer restrictions. Several sensitive paths have dedicated security-definer RPCs with pinned `search_path` and token/authorization checks.
- Sharing RPCs return only token-allowed fields; invalid/revoked states are intentionally indistinguishable. Public invoice reads require an active eligible link and exclude draft/revoked cases in verifier fixtures.
- Billing state writes are service-role-only in the database model. The service client is server-only and source callsites are concentrated in cron, provider callback, Razorpay, and owner-gated server actions.
- Intake file processing is extract-only, in memory; no Supabase Storage upload path/bucket was found. Workspace logo data is a bounded data URL with DB constraints and verifier checks.
- Secrets are documented as server-only except Supabase URL/anon key, optional public Razorpay key ID, and Sentry DSN (public ingestion endpoint). Source maps/service role/payment keys are not intentionally exposed to client code in the source reviewed. Actual production env presence/values and client bundles in Vercel were not inspected.
- **Boundary:** offline migration checks do not prove those exact migrations were deployed to the production Supabase project. Production policy state is **UNVERIFIED**.

### API and server-action inventory

There are **15 route-handler files** and **19 server-action modules**. Route handlers:

| Endpoint | Access/control observed in source | Audit limitation |
| --- | --- | --- |
| `POST /api/cron/email`, `GET /api/cron/email` | Cron bearer secret; service-role mailbox sync | No production scheduler/env/log check. |
| `POST /api/cron/webhooks`, `GET /api/cron/webhooks` | Cron bearer secret; service-role retry sweep | No production scheduler/env/log check. |
| `GET /api/email/connect`, `/api/slack/connect`, `/api/notion/connect` | Authenticated session; signed OAuth state; provider configuration checks | No provider accounts or live callback test. |
| `GET /api/email/callback`, `/api/slack/callback`, `/api/notion/callback` | Signed state validation and authenticated user/workspace binding before service-role persistence | No live OAuth state/callback test. |
| `POST /api/intake/extract` | Session check; multipart/type/size/parser validation; extract-only | Local parser tests; no production request. |
| `GET /api/pdf/[kind]/[id]`, `/api/pdf/reports`, `/api/pdf/time` | Session/workspace data access; UUID/kind checks; invoices additionally require money role | No authenticated request or production data. |
| `GET /api/pdf/shared/invoice/[token]` | Public token-based access to eligible shared invoice | No production token exercised. |
| `POST /api/razorpay/verify` | Workspace context; owner check in verifier; payment HMAC + server-side subscription fetch + plan/workspace binding | Mocked/unit only; no provider call. |
| `POST /api/razorpay/webhook` | Raw-body HMAC, event id/body-hash idempotency and atomic ledger/application path | Mocked/unit only; no webhook sent. |

Server-action modules are: app shell/workspace switch; brief detail; contract create/detail; intake; invoice create/detail; plan detail; proposal detail/version; settings base/email/integration/team/webhook; time; update detail; auth workspace creation; password recovery; invite acceptance. Source review found session, workspace-context/role checks on write actions, with RLS as the final guard on normal user-client operations. Owner-only settings and service-role operations have corresponding checks. API response/output validation and explicit request-size ceilings vary by endpoint; no production fuzzing or load test was attempted. No destructive input testing was performed.

**CSRF/rate-limits:** Supabase auth abuse controls are operator-configured and not inspectable. Custom share/invite/invoice probing uses a documented in-memory per-IP limiter; by design it is per-instance and resets on redeploy, so it is only casual-abuse mitigation. Login/signup auth goes browser-to-Supabase and is not protected by that app middleware. No live cookie, CSRF, or edge/WAF configuration test was possible.

### Razorpay and pricing safeguards

- Source has `ALLOWED_RAZORPAY_MODES = ["test"]`; `getRazorpayServerConfig()` refuses Live Mode and mode/key-prefix mismatches. Checkout uses server-owned plan IDs/amounts and requires owner role, signature verification, server-side subscription fetch and workspace binding before applying entitlements.
- Webhook handling checks raw-body signature; event processing uses idempotency/ordering and atomic database ledger/state update. Automated payment/security test modules passed as part of `npm test` (the whole suite was 1,243/1,243).
- `ANNUAL_PRICES` remains empty; annual state is shown as unavailable and annual self-serve checkout is not configured in source. No real payment or checkout was initiated. Production credentials/config were not observed, but the build-level Live Mode guard is verified in source/tests.
- Public pricing source lists Starter `$29/month`, 1 seat; Team `$79/month`, up to 5 seats + `$12/seat` after 5, `MOST POPULAR`; Studio `$199/month`, up to 15 seats, “Talk to us.” The matching local `/pricing` page rendered these amounts. Annual purchase is unavailable.
- The app's Settings billing surface, however, is Free/Pro and its Razorpay config is one configured subscription plan per currency, not an explicit Starter/Team/Studio seat-entitlement mapping. Pricing source itself discloses no per-tier quota/seat enforcement and a workspace-per-month checkout. This requires product/commercial clarification before taking paid subscriptions; recorded as `AUD-BILL-001` (P2). The absent `pricing.pdf` also prevents authority comparison.

### Dependency advisory

`npm audit` currently exits nonzero with four moderate rows, zero high/critical. The advisory is GHSA-rj75-hqrm-r3gf and all four rows resolve through the same selector-parser chain. `docs/DEPENDENCY_SECURITY_AUDIT.md` §12.1 records evidence that installed `postcss-selector-parser@6.1.5` contains the upstream 6.x backport, its behavior/benchmark, and the reason GitHub's advisory range still flags `<7.1.6`. This audit reviewed that record and did **not** classify the item as an exploitable production vulnerability. It remains an npm-audit finding until the advisory range is updated/re-run.

## F. Findings

### `AUD-SEC-001` — Login `next` parameter can pass a backslash-based external URL

- **Severity:** P2 — open redirect / phishing risk; no direct session-cookie disclosure established.
- **Affected component:** `app/(auth)/login/page.tsx` lines 36–42 and 70–73; callback has a stricter guard in `app/auth/callback/route.ts`.
- **Reproduction (no real account used):** open `/login?next=%2F%5C%5Cattacker.example`; `URLSearchParams` produces a path beginning `/` and not `//`, so the current filter accepts it. After a successful password sign-in, `router.replace(next)` passes it to Next's router. In the installed Next 16.4.3 router, navigation constructs a `URL` and performs hard navigation when it is external; browser URL normalization treats a path beginning `/\\attacker.example` as `https://attacker.example/`. This behavior was verified by standards-based `new URL()` normalization and the installed router implementation; no attacker-controlled external host was visited.
- **Expected:** accept only a same-origin absolute path, reject backslashes and any path normalized to another origin.
- **Actual:** login filter blocks `//` but not `\`; the callback's `safeNext()` correctly blocks backslashes, but password-login redirect does not use that guard.
- **Impact:** a crafted trusted login link can redirect a user to an attacker-controlled site after authentication, enabling phishing. No evidence that the auth token/cookie itself is sent to that host.
- **Recommended remediation (not applied):** share a single strict same-site path validator with the callback; additionally parse against the app origin and require origin equality before client navigation. Add regression cases for literal and percent-encoded backslashes and scheme-relative paths.
- **Status:** static reproduction confirmed; no successful login executed.

### `AUD-FUNC-001` — Pricing advertises shareable brief links, while the implemented public share object is an update

- **Severity:** P2 — incorrect advertised capability / workflow gap.
- **Affected component:** `app/(marketing)/pricing/plans.ts` Team feature at line 208; `supabase/migrations/20260923030000_share_links_schema.sql`; `/share/[token]` and `lib/data/shares.ts`.
- **Reproduction:** inspect the Team tier copy, then the schema: `share_links.update_id` is the required unique foreign key; `get_shared_document()` joins to `public.updates` and returns update fields; `/share/[token]` renders an update. No brief-share table/RPC/public brief route exists.
- **Expected:** a Team feature advertised as “Shareable read-only brief links” is available as a client-facing read-only brief link, or the feature is described as an update link instead.
- **Actual:** the implemented public share flow is for client updates, not briefs. This capability is therefore **NOT IMPLEMENTED** as advertised.
- **Impact:** prospective/paying users may expect a brief-sharing workflow that the app does not provide.
- **Recommended remediation (not applied):** before onboarding, either change the claim to the real update-link capability or separately approve/implement the advertised workflow. This audit makes no marketing-page changes.
- **Status:** confirmed from schema and route implementation; not a production visual check.

### `AUD-OPS-001` — `/search` omitted from the proxy's protected-prefix and missing-config fail-closed list

- **Severity:** P2 — local configuration/runtime failure and route-guard inconsistency; **no auth bypass verified**.
- **Affected component:** `lib/supabase/middleware.ts` `APP_PREFIXES` (lines 16–29), `app/(app)/layout.tsx` (lines 18–27), `/search`.
- **Reproduction:** with no Supabase URL/anon key configured, `GET /search` against the local production build returned **500** and logged the Supabase client's “URL and Key are required” error. Other tested protected prefixes returned **307 /login** because proxy's unconfigured branch fails closed. `/search` is a real page under the `(app)` route group but is absent from `APP_PREFIXES`.
- **Expected:** an unauthenticated request to any application route should follow the documented fail-closed `/login` path (or a controlled configuration notice), not crash.
- **Actual:** with missing configuration, `/search` reaches the app layout and fails during `createClient()` before its user check. With Supabase configured, the app layout still checks `auth.getUser()`; no data disclosure or auth bypass was reproduced. Production environment presence is unknown.
- **Impact:** route inconsistency and 500 on this page if Supabase env is absent/misconfigured; may surface as an unhandled runtime error in that configuration.
- **Recommended remediation (not applied):** include `/search` in the proxy list and/or make the app layout gracefully handle missing Supabase configuration; add a route-inventory regression test that compares all `(app)` URL roots with protected prefixes.
- **Status:** local missing-env reproduction confirmed; production impact unverified.

### `AUD-BILL-001` — In-app billing plan does not map explicitly to the three public tiers

- **Severity:** P2 — commercial clarity / entitlement risk, not a payment-safeguard bypass.
- **Affected component:** `components/settings/PlanCard.tsx`, `app/(app)/settings/page.tsx`, `lib/razorpay.ts`, and public pricing plan configuration.
- **Reproduction:** compare Settings' `Free`/`Pro` plan states and one plan per configured currency with public Starter/Team/Studio tiers and their seat/price statements. Public pricing code says Starter `$29`, Team `$79`, Studio `$199`; the app billing path is a workspace-level Free→Pro model and explicitly notes that per-tier quota/seat enforcement and annual plans are not enforced/configured.
- **Expected:** published tier prices, seat limits, included features, app entitlement state, and checkout offer should map consistently before self-serve paid onboarding.
- **Actual:** no in-app entitlement/checkout mapping for three tiers or additional seats was identified. Source discloses the limitations, but the correspondence between advertised tier purchase and actual paid plan remains unresolved; production checkout/config is not inspected and Live Mode is disabled by design.
- **Impact:** user confusion or incorrect entitlement expectations if public tier cards are interpreted as available application plans.
- **Recommended remediation (not applied):** keep payments disabled until the product owner approves an explicit tier/seat/price-to-entitlement mapping and confirms the pricing authority document. Do not alter Razorpay safeguards in this audit.
- **Status:** source-level mismatch/limitation confirmed; no production purchase was attempted.

No P0 or P1 finding was verified.

## G. Production observations and unavailable checks

- **Deployment:** latest GitHub Production deployment record is successful for the baseline commit. No direct production response was available; do not infer HTTP health from deployment metadata.
- **Runtime errors/logs:** Vercel logs are inaccessible in this environment. The local `/search` missing-env failure is the only reproduced request error. No production 4xx/5xx pattern or unhandled exception trend can be reported.
- **Production environment:** presence of Supabase URL/anon key, service-role key, `AUTH_SECRET`, OAuth credentials/callbacks, `CRON_SECRET`, Sentry DSN, SMTP and Razorpay Test Mode settings is **UNVERIFIED**. Values were neither requested nor printed.
- **Domain/TLS/security headers/cache:** HTTPS and deployed security headers could not be directly checked. Local production build returns the headers configured in `next.config.mjs`; public page cache headers were local-only. The live origin probe failed before an HTTP response.
- **Database:** production Supabase connectivity, deployed migration head, RLS state, backups and restore readiness are **UNVERIFIED**. Only offline PGlite tests passed.
- **Email:** password-reset, invite and provider email delivery configuration/runtime are **UNVERIFIED**. No real reset email was sent.
- **Mobile/a11y:** no Chromium/Firefox/WebKit binary. No new viewport checks at 320–1440px, keyboard/focus walkthrough, dialog test, touch target audit, contrast measurement, reduced-motion browser run, axe scan, or screenshots were generated in this audit. Prior browser measurements in existing docs are historical evidence, not current production verification.
- **LCP protection:** no application code was changed. Existing tests/documentation address the PR #53 LCP opacity/no-JS/reduced-motion constraints; no browser LCP measurement was collected in this run.

## H. Remediation order — approval required before implementation

1. **P0 — none verified.** Continue to keep production payments disabled.
2. **P1 — none verified.** Production auth and data-isolation controls remain unverified and must not be treated as passing.
3. **P2 — first review:**
   - `AUD-SEC-001`: strict same-origin post-login `next` validation and regression cases.
   - `AUD-OPS-001`: ensure `/search` participates in protected/fail-closed behavior.
   - `AUD-FUNC-001`: correct the brief-sharing promise or separately scope approval for the capability.
   - `AUD-BILL-001`: resolve tier/seat/price-to-entitlement mapping before paid onboarding.
4. **Required evidence before broader onboarding:** authorized staging/test identities; real but isolated Supabase project with migration/policy status access; Vercel deployment/log/env-presence checks that never print secret values; allowlisted auth callbacks; controlled signup/login/logout/session/reset/OAuth tests; two authorized identities for cross-workspace access; Chromium viewport and accessibility tests; production read-only health/header probe from an approved network. Production writes, reset emails, customer data, and payments remain excluded unless separately approved.

## I. Go / No-Go

**INSUFFICIENT EVIDENCE.** No verified P0/P1 blocker emerged from the repository and local test evidence, but the critical live authentication, deployed Supabase authorization, and operational checks could not be performed. The confirmed P2 findings also require human review. Roducq is **not yet evidenced as ready for broader user onboarding** by this audit.

## J. Audit approval gate (at initial audit completion)

At the time of the initial audit closeout, this document recorded findings and recommendations only; no application fix, dependency update, database/RLS change, authentication/payment configuration change, deployment, or PR merge had been performed. The user later approved implementation of `AUD-SEC-001` and `AUD-OPS-001` only. Their implementation and re-verification are recorded in Section L. `AUD-FUNC-001` and `AUD-BILL-001` remain unapproved and untouched.

## K. Detailed remediation plan — proposed, not approved or applied

This plan is for human review only. It does not authorize implementation. The order puts the authentication redirect first, followed by the isolated route-guard defect, then the user-facing product/pricing gaps. No dependencies, Supabase schema/policies, or Razorpay safeguards are in scope.

### Priority 1 — `AUD-SEC-001`: close the post-login external redirect

**Goal:** After password login or Google OAuth, a return destination must remain on the serving origin. Preserve legitimate internal invite/deep links.

**Files affected (proposed):** `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`, and the shared validator in `lib/auth/password-recovery.ts`. Regression coverage belongs in existing `tests/lib/password-recovery.test.ts`, `tests/components/password-recovery.test.ts`, and `tests/lib/oauth.test.ts`; a focused new `tests/lib/safe-redirect.test.ts` is optional if the validator is extracted to a new helper module instead.

**Reproduction:**

1. Open `/login?next=%2F%5C%5Cattacker.example` (no credentials needed to demonstrate parsing/validation).
2. `URLSearchParams.get("next")` decodes this to a slash followed by backslashes. The current login test only checks `startsWith("/")` and not `startsWith("//")`, so it accepts the value.
3. A successful password login calls `router.replace(next)`. Next 16.4.3 constructs a URL from the string; browser URL normalization can turn the backslash path into an external origin and Next performs a hard navigation.
4. Do not sign in to a real account or navigate to an attacker domain during remediation verification. Reproduce with the pure validator and a mocked router, then use an isolated staging identity only if separately authorized.

**Minimal proposed change:**

- Replace the permissive inline check in `app/(auth)/login/page.tsx` with one shared same-origin path validator.
- Prefer extracting/reusing one helper for both login and `app/auth/callback/route.ts` rather than maintaining subtly different guards. The validator should reject empty values, non-root-relative URLs, `//`, literal backslashes, and any value whose parsed URL origin differs from the trusted current app origin. Invalid values should use the current safe fallback (`/intake` for the login page; `/dashboard` for the callback, subject to current intended flow).
- Pass only the validated path to both `router.replace()` and `GoogleSignInButton`; do not use an unvalidated query value at either callsite. Keep the server callback's validation as defense in depth.
- Keep the check independent of cookies/session data; do not log the input, token, or credentials.

**Regression tests / acceptance criteria:**

- Pure helper tests accept ordinary internal destinations such as `/intake`, `/invite/<valid-token>`, and `/dashboard?tab=...` and preserve intended query/hash behavior.
- Reject `//attacker.example`, `https://attacker.example`, `/\\attacker.example`, `/\attacker.example`, scheme URLs, and encoded/literal backslash variants after URL decoding/normalization.
- Assert invalid login destinations resolve to the fixed fallback and the mocked router receives only a same-origin path.
- Assert the callback applies the same policy and still routes a recovery exchange to `/reset-password`.
- Run the existing auth/OAuth/password-recovery tests and full `npm test`, TypeScript, lint, build. Do not use real credentials or send reset emails.

**Risks to existing functionality:** An overly strict validator could break legitimate invite links or safe deep links; retain valid application paths and their query parameters. The existing callback's recovery override must remain higher priority than `next`. A fallback change could strand users away from an intended invitation, so test `/login?next=/invite/<token>` explicitly. Avoid broad URL decoding beyond the browser's already-decoded query value, which could create inconsistent double-decoding behavior.

**Rollback:** Revert only the validator/callsite change if valid internal return flows regress; keep tests that capture the security regression and correct the implementation before re-release.

### Priority 2 — `AUD-OPS-001`: protect `/search` and restore graceful fail-closed behavior

**Goal:** `/search` behaves like every other authenticated application route, including when Supabase configuration is absent; public token routes remain public.

**Files affected (proposed):** `lib/supabase/middleware.ts` (add the protected prefix). Add route-guard regression coverage in a new `tests/components/protected-routes.test.ts` or the existing `tests/components/search.test.ts`; optionally extend `scripts/verify-production.mjs` for the local route smoke check. No Supabase migration or policy file is to be changed.

**Reproduction:**

1. Build the app and run `npm start` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` absent.
2. Request `GET /search`: observed local response is 500 because `/search` is not in `APP_PREFIXES`, the app layout reaches `createClient()`, and Supabase throws before the layout's `auth.getUser()` check.
3. Request `/briefs` under the same conditions: observed behavior is 307 to `/login` via the proxy's missing-config branch.

**Minimal proposed change:**

- Add the `/search` path to `APP_PREFIXES` in `lib/supabase/middleware.ts`, the smallest direct correction for the reproduced omission.
- Add a regression test tying all current `(app)` route roots to the protected-route inventory, so future additions like `/search` cannot silently bypass the list. If route-inventory testing is too invasive, add a direct `/search` assertion plus checks that `/share/[token]`, `/invoice/[token]`, and marketing paths remain public.
- Consider making the `(app)` layout render a controlled configuration state if Supabase is missing, but treat that as optional follow-up. The prefix change alone should fix the observed missing-env `/search` behavior without changing auth/session flow.

**Regression tests / acceptance criteria:**

- With Supabase env absent, local production-build requests to `/search` and all protected URL roots return the documented `/login` redirect, not 500.
- With a configured-but-anonymous test stub, `/search` redirects to `/login`; with an authorized test session, it renders only that session's workspace data.
- `/share/<token>`, `/invoice/<token>`, `/login`, `/pricing`, and `/` remain public according to their existing design.
- A route-inventory test detects newly added application pages not represented in the proxy guard.

**Risks to existing functionality:** Over-broad prefix matching could accidentally require auth for similarly named public paths. Keep the existing exact-or-slash-boundary matching (`pathname === prefix || pathname.startsWith(prefix + "/")`) and test public singular `/invoice/` separately from protected plural `/invoices/`. A new inventory test must account for Next route groups, dynamic segments, and root rewrite behavior rather than comparing raw filesystem paths naïvely.

**Rollback:** Revert the `/search` prefix/test change if it intercepts a documented public route; retain a failing route-inventory test until the route classification is corrected.

### Priority 3 — `AUD-FUNC-001`: resolve the advertised brief-sharing capability

**Goal:** Ensure the Team tier does not promise a workflow the product does not provide, while respecting the user's approved pricing authority.

**Files affected (minimal copy correction, only after pricing-owner approval):** `app/(marketing)/pricing/plans.ts` and its exact-copy assertions in `tests/components/pricing.test.ts`; update `docs/RODUCQ_PRICING_PAGE.md` only if that reference document is meant to remain synchronized. No schema or public sharing route is part of this minimal path. A separately approved brief-sharing feature would require a new design and likely a Supabase migration, `lib/data/shares.ts`, `/share` route/action changes, and dedicated DB/API tests; those are explicitly out of scope here.

**Reproduction:**

1. Inspect Team's feature list in `app/(marketing)/pricing/plans.ts`: it says “Shareable read-only brief links.”
2. Follow the current implementation: `share_links.update_id` references `updates`; `get_shared_document()` selects from `updates`; `/share/[token]` renders an update. There is no brief-share table, RPC, or public brief page.

**Minimal proposed path (recommended for this audit's scope):**

- First obtain and reconcile the authoritative `pricing.pdf` (it was not available in the audit workspace) and get product-owner approval for the public claim.
- If the approved commercial intent is that the existing feature is update sharing, correct the single Team feature label to accurately describe “Shareable read-only client-update links” (or other owner-approved wording). This is a copy correction, not a redesign or feature implementation.
- If the pricing authority requires read-only brief links, do **not** quietly change the schema or add a public endpoint under this remediation plan. Keep the claim explicitly blocked from being presented as available until a separately approved feature design covers token issuance/revocation, RLS/security-definer behavior, public data minimization, caching, and access tests. No database or app changes are authorized here.

**Regression tests / acceptance criteria:**

- Pricing assertions check approved exact wording and avoid describing update links as brief links.
- A capability contract test verifies that the advertised share noun matches the actual public resource (`updates`) and its link-management controls.
- Existing share-link tests continue to verify invalid/revoked indistinguishability, public field minimization, and token access. If a future brief-sharing feature is separately approved, require two-workspace fixtures and explicit public-field/RLS tests before enabling copy.

**Risks to existing functionality:** A wording change may conflict with the pricing PDF or sales collateral; do not make it until the authority is available and an owner confirms the intended product promise. Implementing brief sharing instead is not a minimal copy fix and would introduce new public-data exposure and database-policy risk. Avoid unrequested redesign or changes to unrelated pricing tiers.

**Rollback:** If approved wording conflicts with the source-of-truth document, restore the approved copy only after the product owner determines that the claimed brief-sharing capability is actually available; otherwise keep the discrepancy as a release blocker rather than reverting to an unsupported claim.

### Priority 4 — `AUD-BILL-001`: settle the tier-to-checkout/entitlement contract before paid onboarding

**Goal:** Establish one approved mapping among Starter/Team/Studio, public prices/seats, Settings' Free/Pro state, Razorpay Test Mode configuration, and enforced workspace entitlements.

**Files potentially affected after a separate commercial decision:** `app/(marketing)/pricing/plans.ts`, `components/settings/PlanCard.tsx`, `app/(app)/settings/page.tsx`, and (only if approved entitlements require it) `lib/billing/entitlements.ts`; existing tests `tests/components/pricing.test.ts` and `tests/lib/billing-entitlements.test.ts`, plus a focused new `tests/lib/plan-mapping.test.ts` if a mapping helper is introduced. `lib/razorpay.ts`, webhook code, Supabase migrations/policies, and payment configuration are explicitly frozen and excluded from this plan; a mapping that cannot be represented without changing them requires a new approval and scope.

**Reproduction:**

1. Compare public `PLAN_TIERS` (Starter `$29` / one seat, Team `$79` / up to five seats plus `$12` per additional seat, Studio `$199` / contact CTA) with `components/settings/PlanCard.tsx` and `lib/razorpay.ts`.
2. Settings uses `Free`/`Pro`; Razorpay configuration is one recurring configured plan per currency, not a tier-and-seat catalog. Pricing copy itself says tier quotas/seat enforcement are not enforced in code. No Live Mode/payment call is required to reproduce the source-level mapping gap.

**Minimal proposed path:**

- Treat this first as a product/commercial decision, not a coding task. Obtain the approved pricing PDF and define a written matrix: public tier, current application entitlement, seat count, allowed features/quotas, currency/amount, checkout eligibility, and the intended meaning of Free/Pro.
- Preserve the frozen safeguards: no Live Mode, no live keys, no annual checkout, no pricing changes, and no checkout creation during verification. Do not modify `lib/razorpay.ts`, webhook logic, Supabase schema/policies, or subscription ledger in this plan.
- If there is no approved and enforceable tier mapping yet, keep self-serve paid checkout unavailable and display the current early-access/request path accurately. Do not imply that a public tier purchase automatically enforces seats/usage that the app does not enforce.
- If the owner approves implementation later, scope the smallest coherent entitlement change separately. It may require more than UI copy because enforcing seats/features/quotas safely can need server-side entitlement checks and database support; it must not be represented as a copy-only fix if the purchase semantics remain ambiguous.

**Regression tests / acceptance criteria:**

- A pure configuration/plan-mapping test proves every enabled checkout amount/currency maps to exactly one owner-approved tier and supported entitlement.
- Assert additional-seat behavior is either enforced end-to-end or clearly marked not offered; no over-seat workspace silently receives a paid-tier claim.
- Assert missing, duplicate, or mismatched tier/currency/price configuration fails closed and does not start checkout.
- Preserve existing security tests: Live Mode always refused, annual purchase unavailable, non-owner checkout denied, browser-supplied amount/plan ignored, checkout signature/server fetch required, invalid webhook signature rejected, duplicate webhook idempotent, and subscription changes are server-authorized.
- Test billing UI state for no configuration, Test Mode, active, pending/halted and canceled states using mocks; no real Razorpay account or payment.

**Risks to existing functionality:** A tier map can unintentionally alter existing Free/Pro entitlements or legacy Stripe handling; do not change entitlements until legacy rows and migration/rollback semantics are reviewed. Blocking a configured Test Mode checkout could affect authorized internal QA, so preserve a safe test-only path only if it is clearly segregated and approved. Any seat/count change affects team invite flows and requires role/seat edge-case tests. This finding is not permission to enable payments.

**Rollback:** If a later approved mapping causes entitlement or checkout regressions, restore the prior Free/Pro behavior without weakening the Live Mode gate or accepting unverified subscription events; database rollback would require a separately reviewed migration plan and is outside this audit.

### Cross-finding verification and release gate

After explicit approval and any separately authorized implementation:

1. Run focused regression tests for each finding, followed by `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run verify:db`, `npm run verify:pdf`, and `npm audit` (no forced remediation).
2. Run a local production-build route smoke check with absent Supabase env; confirm `/search` no longer 500s and public paths remain public.
3. Run authorized staging browser checks with dedicated fixtures only: valid/invalid internal redirect destinations, signed-out/protected route redirects, signed-in session persistence, two-user workspace isolation, and mobile keyboard/accessibility passes. Do not create production users or send reset emails.
4. Re-check the pricing PDF and obtain written commercial approval of all visible claims and checkout/entitlement behavior.
5. Keep all real payments disabled. Any request to change Razorpay, Supabase, production auth, production data, or deploy requires a separate explicit approval and review.

**Status at plan preparation:** no fixes had yet been made. The user subsequently approved implementation of `AUD-SEC-001` and `AUD-OPS-001` only; implementation, tests, verification, and remaining limitations are recorded in Section L. `AUD-FUNC-001` and `AUD-BILL-001` were not approved and remain unchanged.

## L. Approved remediation implementation and verification

**Approval scope:** The user approved `AUD-SEC-001` (auth redirect validation) and `AUD-OPS-001` (`/search` route protection) only. The work was performed on the session's assigned feature branch. No work was done for `AUD-FUNC-001` or `AUD-BILL-001`.

### Implemented changes

- **`AUD-SEC-001`:** Added `lib/auth/redirects.ts` with a shared rooted-path validator, encoded-backslash rejection, normalized same-origin check, and request-origin selection limited to deployment-configured origins. The login page validates `next` against `getSiteUrl()` before both password-login navigation and passing the destination to Google OAuth. The OAuth/recovery callback validates `next` again and uses only a request origin that matches configured `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`; otherwise it falls back to configured `getSiteUrl()` and refuses to exchange a callback code from an untrusted request origin. Recovery requests continue to override `next` and land on `/reset-password`. Query strings, fragments and valid invite paths are preserved.
- **`AUD-OPS-001`:** Extracted the URL-prefix inventory and exact-or-descendant matcher into `lib/supabase/protected-routes.ts`, added `/search`, and wired the existing middleware through that helper. The missing-Supabase-config branch therefore redirects `/search` to `/login` as it does other protected routes.
- **Integration verification:** Extended `scripts/verify-production.mjs` to verify `/search` returns a login redirect, public marketing/share/invoice routes remain unauthenticated, `/searching` is not captured by the `/search` prefix, and a callback request carrying a test code with an untrusted `Host` header redirects to the configured local origin without exchanging the code or redirecting to the supplied host. This run explicitly unset the public Supabase URL/key variables, confirming the `/search` guard behavior in the missing-config case.
- **Not changed:** No pricing copy, brief-sharing feature, billing tier, entitlement, checkout, Razorpay safeguard/configuration, Supabase schema/policy, dependency, or payment behavior was changed.

### Exact files changed

- `app/(auth)/login/page.tsx`
- `app/auth/callback/route.ts`
- `lib/auth/redirects.ts` (new)
- `lib/supabase/middleware.ts`
- `lib/supabase/protected-routes.ts` (new)
- `scripts/verify-production.mjs`
- `tests/components/password-recovery.test.ts`
- `tests/lib/redirects.test.ts` (new)
- `tests/lib/protected-routes.test.ts` (new)
- `docs/PRODUCTION_READINESS_AUDIT.md`

### Verification results

| Check | Result |
| --- | --- |
| Focused tests: `node --test tests/lib/redirects.test.ts tests/lib/protected-routes.test.ts tests/components/password-recovery.test.ts tests/components/search.test.ts` | **PASS** — 24 passed, 0 failed. Covers external/scheme-relative/literal and encoded backslashes, trusted-origin allowlisting/Host fallback, internal paths/query/hash/invites, route-root coverage, exact path boundaries, public paths, auth callback and recovery-priority source contracts. |
| `npm test` | **PASS** — 1,253 passed, 0 failed, 0 skipped. |
| `npx tsc --noEmit` | **PASS** — no TypeScript errors. |
| `npm run lint` | **PASS** — no ESLint errors. |
| `npm run build` | **PASS** — Next.js 16.4.3; 45/45 static pages generated. Existing informational React 18 deprecation and Tailwind ambiguous utility warnings remain. |
| `npm run verify:db` | **PASS** — all 32 migrations apply and existing PGlite/RLS checks pass. No migration or production database operation was performed. |
| `npm run verify:pdf` | **PASS** — 14 sample documents / 20 pages; 0 overflow, structure, or content findings. |
| `npm run verify:production` | **PASS** against the local production build. New checks passed: `/search` → 307 `/login`; `/`, `/pricing`, `/share/not-a-uuid`, and `/invoice/not-a-uuid` return 200 without auth redirects; `/searching` remains outside the `/search` prefix; a callback request with `Host: attacker.example` redirects to the configured local origin, not the supplied host. Existing metadata, security-header, landing-link and local timing checks also passed. This is local HTTP evidence, not production verification. |
| `npm audit` | **EXIT 1 (existing advisory)** — 4 moderate, 0 high, 0 critical. The reported entries remain the documented GHSA-rj75 selector-parser chain; no dependencies were changed. |

The production build did not modify `tsconfig.json`. The local production server was stopped after smoke testing.

### Remaining limitations and risks

- No authorized staging identity was available, so successful password-login, Google OAuth, and session callback flows were not exercised in an authenticated browser. The pure helper tests and local callback error/Host integration test do not replace a full authorized staging sign-in.
- No production request was made; the earlier sandbox TLS failure still prevents verifying deployed redirects, current production host configuration, or live Supabase behavior. The callback accepts the request origin only if it matches deployment-controlled origin configuration. A custom production domain must be present in trusted configuration (normally `NEXT_PUBLIC_SITE_URL`) for callback redirects to stay on that domain; production env presence was not inspected.
- Browser/Chromium checks were not run. No valid share/invoice token backed by an authorized test database was used; the local smoke test confirms public routes are not bounced to login and that invalid-format tokens render their generic public state, not that live shared records resolve.
- The shared redirect validator retains the input path/query/fragment verbatim after validation. Existing internal invite/deep-link destinations are covered by helper tests, but complete browser navigation with a real session remains a staging check.
- `AUD-FUNC-001` and `AUD-BILL-001` remain open as findings from the initial audit, pending their own explicit approval. No claim or payment behavior associated with them was altered.

**Current status:** approved code changes and tests are on the assigned feature branch for review against `main`. This work has not been deployed; no production account, reset email, database write, or payment was used.
