# Security

## Production checklist (things code alone cannot fix)

Items wired **in code** (Step 14) live in the repo; the items below are the
human-side checklist that must be confirmed in dashboards before real
users touch this app.

**Rate limiting**
- ✅ In-code: `/share/*`, `/invite/*` and `/invoice/` (public routes that
  probe Postgres per request) share a 30 req/min per-IP cap via a
  sliding-window limiter (middleware). Store: the Step 14 **in-memory
  window, permanently** — the product decision is no third-party service
  dependencies (the once-optional Upstash Redis store was rejected and
  removed from the repo; `UPSTASH_*` is never set). Known limitation
  (accepted): in-memory state does NOT survive redeploys and is NOT
  shared across serverless instances — in a multi-instance deploy the
  effective ceiling multiplies by instance count. Treat it as
  casual-abuse mitigation; if a hard multi-instance ceiling is ever
  needed, enforce it at the edge (CDN/WAF) rather than adding a service.
- ⚠️ Login/signup abuse protection is **delegated entirely to Supabase**:
  those pages are client components whose auth calls go browser→Supabase
  Auth API directly, so this repo's middleware never sees them. Confirm
  the project's auth rate limits in the Supabase dashboard (**Project →
  Authentication → Rate Limits**). Do not "fix" this in middleware — it
  would be ineffective and misleading.
- ⚠️ README's local-setup step says to turn **Confirm email OFF** (single-
  step signup). That is a development convenience — reconsider enabling
  email confirmation before accepting real signups (bot-signup friction +
  deliverability sanity).
- [ ] **Backups**: confirm the Supabase project tier + backup settings in
  the dashboard (scheduled snapshots on free; PITR is a paid-tier option).
  Nothing in the repo can verify this. Decide a restore story for client
  data (`brief_sources`, share links) — these are client communications.
- [ ] **Observability**: Sentry only activates when `SENTRY_DSN` or
  `NEXT_PUBLIC_SENTRY_DSN` is set —
  the wiring ships inert by default, so set the env var in production or
  error tracking silently stays off. Wire source-map upload separately
  (Sentry wizard) if stack traces should be readable.
- [ ] **CI gate**: `.github/workflows/verify.yml` runs tsc + build +
  verify:db on every push — but `npm run verify:live` is **intentionally
  not automated** (it needs production credentials). Run it manually
  before every production deploy.

## Known vulnerabilities (npm audit)

**Status as of 2026-10-26**, after the dependency security maintenance recorded
in [`docs/DEPENDENCY_SECURITY_AUDIT.md`](docs/DEPENDENCY_SECURITY_AUDIT.md):
`npm audit` reports **0 critical, 0 high, 4 moderate**. Before that change
(`main` @ `85f94da`, `next@16.3.6`) it reported 1 critical, 3 high and 7
moderate.

- **What remains:** the 4 moderate entries are one advisory,
  GHSA-rj75-hqrm-r3gf. It is reported against `postcss-selector-parser@6.1.5`
  (build-time only, via Tailwind CSS 3) and against the packages that depend
  on it: `postcss-nested`, `tailwindcss` and `tailwindcss-animate`.
  - 6.1.5 is the upstream-patched 6.x release; this was verified against the
    official fix and the installed package (§12.1 of the audit document). The
    advisory's affected range has not been updated to say so yet. The package
    maintainer's correction is pending as github/advisory-database#10456.
  - Re-run `npm audit` when it is. Clearing the warning sooner would need a
    Tailwind CSS 4 migration or `npm audit fix --force`, both out of scope.
- **Now patched:** `next@16.4.3` (GHSA-2464, GHSA-673q, GHSA-p3m5 and the
  September 2026 advisories), `sharp@0.35.5`, `nodemailer@10.1.4`,
  `source-map-js@1.2.2`, `zod@4.6.7` and `fast-uri@3.1.9`.

The "deferred by decision" notes that used to be here (the Next.js 14.2.35
freeze, dated 2026-09-25) are obsolete: the Next.js 16 / ESLint 9 upgrade they
described has since shipped. The audit document above is the source of truth.
It holds the advisory inventory, reachability analysis, verification results
and rollback steps; update it on every audit run.
