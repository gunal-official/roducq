# Roducq — Dependency Security Audit

> **Status: Phases 0–2 complete. Remediation plan PROPOSED — awaiting human
> approval.** No dependency, lockfile, configuration or source change has been
> applied. Everything in §8 is a proposal backed by a throwaway dry-run in
> `/tmp` (outside the repository).

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository & PR reconciliation | ✅ complete |
| 1 | Dependency security audit (this inventory) | ✅ complete — Checkpoint 1 |
| 2 | Remediation plan | ✅ proposed — Checkpoint 2, **stopped for approval** |
| 3 | Apply approved updates | ⏸ blocked on approval |
| 4–6 | Automated, functional, browser/a11y/LCP regression | ⏸ blocked on approval |
| 7–8 | Final documentation, PR | ⏸ blocked on approval |

Audit date: **2026-10-26** (UTC). All advisory data was read from the GitHub
Advisory Database (`gh api /advisories/<GHSA>`), the vendor repository
advisories (`gh api repos/vercel/next.js/security-advisories/<GHSA>`), the npm
registry, upstream release notes, and the official Next.js security posts.
Nothing below is inferred from memory.

---

## 1. Git baseline

| Item | Value |
| --- | --- |
| Repository | `gunal-official/roducq` |
| Baseline | `origin/main` @ `85f94da17fee70763d7a6e8081762af1b0b60e89` — "Merge pull request #65 from gunal-official/arena/26957573-roducq" |
| PR #65 | **MERGED** 2026-10-26T09:21:48Z (merge commit = baseline). Its design changes are already on `main`; nothing from it is re-applied here. |
| Working branch | `arena/22448d87-roducq`, created from `85f94da` (the Arena session branch — its name is fixed by the platform; it serves as the feature branch). Never committed to `main`. |
| Working tree at start | clean (`git status`), shallow clone |
| Open PRs | **none** (`gh pr list --state open` → `[]`) — no duplicate security/dependency work in flight |
| Dependabot alerts | **disabled** for the repository (`HTTP 403 — Dependabot alerts are disabled for this repository`) |
| Repository security advisories | none (`[]`) |
| Production deployment | Vercel deployment `7328221703`, environment *Production*, ref `85f94da`, created 2026-10-26T09:22:36Z by `vercel[bot]`, state `success` (GitHub Deployments API). Production therefore runs **`next@16.3.6`**. |

## 2. Toolchain

| Tool | Version |
| --- | --- |
| Node.js (sandbox) | v22.22.3 |
| npm | 10.9.8 (lockfile v3; package manager unchanged) |
| `package.json` `engines.node` | `>=20.0.0` |
| CI (`.github/workflows/verify.yml`) | `node-version: ">=22.18.0"` |

## 3. Method

```bash
npm ci                                   # 575 packages, exact lockfile
npm audit --json                         # raw output: docs/evidence/dependency-security/npm-audit-before.json
npm ls next react react-dom eslint-config-next
npm ls <pkg> --all                       # dependency path of every finding
```

Plus: per-advisory lookups in the GitHub Advisory Database; Next.js release
notes for v16.3.7 → v16.4.3; the official posts
[September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release)
and [Next.js Security Update for Upstream Vulnerabilities (Oct 14 2026)](https://nextjs.org/blog/nextjs-security-update-october-14-2026);
code-level reachability (grep of `app/`, `lib/`, `components/`, config) and
Next.js output-file-tracing (`.next/**/*.nft.json`) of a baseline production
build to decide what actually ships in the server runtime.

`npm ls` result for the core framework packages (deduped, single copies):
`next@16.3.6`, `react@18.3.1`, `react-dom@18.3.1`, `eslint-config-next@16.3.6`
(dev). `next@16.3.6` declares `react: ^18.2.0 || ^19.0.0` as its peer range.

---

## 4. Initial vulnerability inventory (baseline `85f94da`)

`npm audit` → **11 vulnerable packages: 1 critical, 3 high, 7 moderate**
(0 low, 0 info) over 658 dependencies (prod 266, dev 273, optional 101,
peer 46). Those 11 packages carry **21 distinct advisories**.

### 4.1 Per-package view

| # | Package | Installed | npm severity | Direct / transitive | Dependency path | Ships in prod runtime? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `next` | 16.3.6 | **critical** | direct (`dependencies`) | `roducq → next` | **yes** |
| 2 | `sharp` | 0.35.4 | high | transitive (optional) | `roducq → next → sharp` | **yes** — traced in `.next/next-server.js.nft.json` (Image Optimization) |
| 3 | `source-map-js` | 1.2.1 | high | transitive | `roducq → postcss@8.5.28 → source-map-js`; `roducq → next → postcss@8.5.23 → source-map-js` | no — build-time (0 server trace files) |
| 4 | `zod` | 4.6.5 | high | transitive | `eslint-config-next → eslint-plugin-react-hooks@7.1.1 → zod`; `openai@7.23.0 → zod` (optional peer) | no — lint-time; 0 server trace files |
| 5 | `nodemailer` | 10.0.10 | moderate | direct (`dependencies`) | `roducq → nodemailer`; `smtp-server → nodemailer` | **yes** — `lib/invite-email.ts` |
| 6 | `smtp-server` | 3.19.13 | moderate (via nodemailer) | direct (`devDependencies`) | `roducq → smtp-server → nodemailer@10.0.10` (exact pin) | no — dev only |
| 7 | `fast-uri` | 3.1.8 | moderate | transitive | `@sentry/nextjs → @sentry/webpack-plugin → webpack → schema-utils → ajv@8 → fast-uri` | no — build-time (0 server trace files) |
| 8 | `postcss-selector-parser` | 6.1.4 | moderate | transitive | `tailwindcss → postcss-selector-parser`; `tailwindcss → postcss-nested → postcss-selector-parser` | no — build-time (0 server trace files) |
| 9 | `postcss-nested` | 6.2.0 | moderate (via #8) | transitive | `tailwindcss → postcss-nested` | no — build-time |
| 10 | `tailwindcss` | 3.4.19 | moderate (via #8) | direct (`devDependencies`) | `roducq → tailwindcss` | no — build-time |
| 11 | `tailwindcss-animate` | 1.0.7 | moderate (via #10) | direct (`dependencies`) | `roducq → tailwindcss-animate → tailwindcss` | no — only `tailwind.config.ts` plugin |

### 4.2 Per-advisory view (all 21)

Severity = GitHub Advisory Database rating (npm's "moderate" = GitHub "medium").
"Reachable" = whether Roducq's code/config exercises the vulnerable path — see §6.

#### `next@16.3.6` — 10 advisories (direct, production)

| Advisory | CVE | Severity (CVSS) | Summary | Affected (16.x) | First patched | Reachable in Roducq | Prod / dev |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | CVE-2026-96889 | **Critical** (v4 9.5) | Unauthenticated RCE in Image Optimization API when SVG files are used (upstream librsvg via `sharp`, glibc Linux) | `>=16.0.0 <=16.4.0` (also `10.0.0–15.5.27`) | **16.4.1** (15.5.28) | **Low likelihood, not excluded** — see §5.1 | prod |
| [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | — | **Critical** (v4 9.5) | Unauthenticated RCE in `use cache` functions returning typed arrays | `>=16.0.0 <=16.4.0` | **16.4.1** | **No** — no Cache Components / `use cache` (§5.2) | prod |
| [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | CVE-2026-94482 | High (v4 8.2) | DoS in App Router using Server Actions (CPU exhaustion blocks the process) | `>=16.0.0 <=16.4.0` (also `13.0.0–15.5.27`) | **16.4.1** | **YES** — 19 `'use server'` modules, incl. unauthenticated auth actions (§5.3) | prod |
| [GHSA-cjq9-62q9-8jv4](https://github.com/advisories/GHSA-cjq9-62q9-8jv4) | CVE-2026-94483 | High (v4 8.3) | SSRF in Image Optimization via allow-listed remote URL | `>=16.0.0 <16.3.8` | 16.3.8 | **No** — no `images.remotePatterns`; vendor: "If no `images.remotePatterns` are configured, your application is not affected". Verified: `/_next/image?url=https://example.com/x.png` → 400 | prod |
| [GHSA-4jqv-mc3x-m676](https://github.com/advisories/GHSA-4jqv-mc3x-m676) | CVE-2026-94543 | Medium (v4 6.3) | Cache poisoning of SSG/ISR pages in self-hosted **Pages Router** apps | `>=16.0.0 <16.3.8` | 16.3.8 | **No** — App Router only (no `pages/`); vendor: "Applications deployed on Vercel are not affected" | prod |
| [GHSA-mcj8-r9mp-w47p](https://github.com/advisories/GHSA-mcj8-r9mp-w47p) | CVE-2026-94484 | Medium (v4 6.3) | SSG/ISR cache poisoning with a root-level catch-all page | `>=16.0.0 <16.3.8` | 16.3.8 | **No** — no `[...x]` / `[[...x]]` routes | prod |
| [GHSA-f87g-xv8r-7p7x](https://github.com/advisories/GHSA-f87g-xv8r-7p7x) | CVE-2026-94485 | Medium (v4 6.3) | Metadata image routes ignore `dynamicParams` (webpack builds) | `>=16.0.0 <16.3.8` | 16.3.8 | **No** — build is Turbopack (`▲ Next.js 16.3.6 (Turbopack)`; vendor: "Applications built with Turbopack are not affected"); `opengraph-image`/`twitter-image` are root-level and static | prod |
| [GHSA-h694-7cp9-m8p3](https://github.com/advisories/GHSA-h694-7cp9-m8p3) | CVE-2026-103004 | Medium (v4 6.3) | Cache leak across root params in nested `'use cache'` | `>=16.3.0 <16.3.8` | 16.3.8 | **No** — `cacheComponents` not enabled | prod |
| [GHSA-3w37-wq28-93x7](https://github.com/advisories/GHSA-3w37-wq28-93x7) | CVE-2026-94544 | Medium (v4 6.3) | Pending `use cache` fill leaks Draft Mode content | `>=16.3.0 <16.3.8` | 16.3.8 | **No** — no Cache Components, no `draftMode()` | prod |
| [GHSA-39w2-rjm5-chcv](https://github.com/advisories/GHSA-39w2-rjm5-chcv) | CVE-2026-94486 | Low (v4 2.3) | Info disclosure via the `next dev` MCP endpoint | `>=16.0.0 <16.3.8` | 16.3.8 | Dev only — affects developers running `npm run dev` (binds `0.0.0.0`); not served in production | dev |

#### Other packages — 11 advisories

| Package | Advisory | CVE | Severity (CVSS) | Summary | Affected | First patched | Reachable in Roducq | Prod / dev |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sharp@0.35.4` | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | CVE-2026-96889 | High (v4 8.9) | librsvg memory bug → possible RCE on glibc Linux when decoding SVG | `<0.35.5` | 0.35.5 | Same root cause as GHSA-2464 (§5.1) | prod |
| `source-map-js@1.2.1` | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | CVE-2026-93749 | High (v4 8.7) | Event-loop DoS via indexed source-map section offsets | `>=1.0.0 <1.2.2` | 1.2.2 | **No** — only PostCSS at build time on first-party CSS; not in any server trace | build |
| `zod@4.6.5` | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | CVE-2023-54404 | High (v4 8.2) | Memory exhaustion validating oversized collections | `<4.6.6` | 4.6.6 | **No** — Roducq defines no zod schemas; `openai` is used via `chat.completions.create` with `response_format: json_object` (zod is only required by `openai/helpers/zod`, never imported); otherwise lint-time only | dev |
| `nodemailer@10.0.10` | [GHSA-8c8m-p3m8-cjg8](https://github.com/advisories/GHSA-8c8m-p3m8-cjg8) | — | Medium (v3.1 6.5) | addressparser: nested comment ends early → extra recipient | `>=3.0.0 <10.1.4` | 10.1.4 | **Low** — see §5.4 | prod |
| `nodemailer@10.0.10` | [GHSA-m943-m63m-w62w](https://github.com/advisories/GHSA-m943-m63m-w62w) | — | Medium (v3.1 6.5) | addressparser: `;` in quoted string/comment ends a group early | `>=3.0.0 <10.1.4` | 10.1.4 | **Low** — §5.4 | prod |
| `nodemailer@10.0.10` | [GHSA-85x2-q946-cp5h](https://github.com/advisories/GHSA-85x2-q946-cp5h) | — | Medium (v3.1 6.5) | addressparser: `>` in quoted local part ends angle-addr early | `>=3.0.0 <10.1.4` | 10.1.4 | **Low** — §5.4 | prod |
| `postcss-selector-parser@6.1.4` | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | CVE-2026-104844 | Medium (v3.1 5.9) | Quadratic parsing of flat selectors → CPU exhaustion | advisory: `<7.1.6` | advisory: 7.1.6 · upstream backport: **6.1.5** (§5.5) | **No** — build-time on trusted CSS; the advisory itself: "Ordinary build-time use on trusted sources is not affected" | build |
| `fast-uri@3.1.8` | [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) | CVE-2026-110306 | Medium (v3.1 6.1) | Scheme spoofing via percent-encoded scheme | `>=3.0.0 <3.1.9` | 3.1.9 | **No** — ajv validating trusted webpack-plugin options at build time | build |
| `fast-uri@3.1.8` | [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) | CVE-2026-110180 | Medium (v3.1 4.8) | Host confusion via WHATWG host canonicalization | `>=3.1.3 <3.1.9` | 3.1.9 | **No** — as above | build |
| `fast-uri@3.1.8` | [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h) | CVE-2026-110095 | Low (v3.1 3.7) | Improper path equivalence in relative-reference normalization | `>=3.0.0 <3.1.9` | 3.1.9 | **No** — as above | build |
| `fast-uri@3.1.8` | [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) | CVE-2026-110725 | Low (v3.1 3.7) | Scheme injection via unescaped colon (`reference: 'suffix'`) | `>=3.0.0 <3.1.9` | 3.1.9 | **No** — as above | build |

`postcss-nested`, `tailwindcss`, `tailwindcss-animate` and `smtp-server`
carry no advisory of their own; npm lists them only because they depend on
`postcss-selector-parser` / `nodemailer`.

### 4.3 Why the PR #51 go-live audit reported "0 critical"

`docs/FINAL_GO_LIVE_READINESS.md` §12 (PR #51, merged 2026-10-18) recorded
13 findings / 0 critical. The
two critical Next.js advisories and the Server Actions DoS were published by
Vercel on **2026-10-14** (vendor repo advisories + v16.4.1), but only entered
the GitHub Advisory Database — the source `npm audit` reads — on
**2026-10-22**. The criticals are therefore new to the tooling, not a
regression introduced since.

---

## 5. The reported critical Next.js advisory — verification

The report ("critical advisory affecting `next@16.3.6`") is **confirmed**.
`npm audit` attributes **two** critical advisories to `next@16.3.6`; both are
authentic, published, not withdrawn, and both list `>=16.0.0 <=16.4.0` as
affected with **16.4.1** as the first patched 16.x release. There is **no
16.3.x backport** (the 16.3 line ends at 16.3.8, which is still inside
`<=16.4.0`), so the minimum fixed version is **16.4.1**.

Authoritative sources: GitHub Advisory Database records; vendor advisories
in `vercel/next.js`; [v16.4.1 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.1)
("This release contains security fixes … Critical: GHSA-673q-mjm6-r5xr,
GHSA-2464-fhr4-w9xw; High: GHSA-p3m5-59mp-jv5r"); and the official
[Oct 14 2026 Next.js security post](https://nextjs.org/blog/nextjs-security-update-october-14-2026),
which instructs `npm install next@16.4.1 # for 16.4`.

### 5.1 GHSA-2464-fhr4-w9xw — RCE in Image Optimization with SVG (Critical 9.5)

- **Description (vendor):** "A memory-related vulnerability has been
  discovered in an upstream library used for Image Optimization can lead to
  possible remote code execution (RCE) when Next.js runs on glibc-based
  Linux." The upstream library is librsvg, reached through `sharp`
  (CVE-2026-96889; sharp advisory GHSA-wq5f-xc86-pv6w).
- **Affected / patched:** `>=16.0.0 <=16.4.0` → **16.4.1**
  (`10.0.0–15.5.27` → 15.5.28).
- **The fix:** the 16.4.1 patch commit
  [`9571ec8`](https://github.com/vercel/next.js/commit/9571ec899f063df6533351bec390ccb2cc0af6a3)
  is "[next/image] Bump `sharp`" — it raises Next's optional dependency to
  `sharp@^0.35.5`. Vendor workaround: "Ensure the version of `sharp` used by
  Next.js is greater than or equal to `0.35.5`."
- **Does Roducq use the affected feature?**
  - The Image Optimization endpoint `/_next/image` **is enabled** (no
    `images.unoptimized`, default loader). On a baseline `next start` it
    optimises local raster images (`/_next/image?url=/apple-icon` → 200 PNG).
  - SVG input is **rejected before sharp** with the default
    `dangerouslyAllowSVG: false`: `/_next/image?url=/icon.svg` → `400 "url"
    parameter is valid but image type is not allowed`.
  - Remote sources are rejected (no `remotePatterns`): `?url=https://example.com/x.png` → 400.
  - The only `next/image` usage (`components/settings/WorkspaceBrandingCard.tsx`)
    sets `unoptimized`, so it never goes through the optimiser.
  - Netlify's platform note states the same `sharp` flaw is reachable via
    `next/og` `ImageResponse` when rendering untrusted input. Roducq's three
    `ImageResponse` routes (`app/opengraph-image.tsx`, `app/twitter-image.tsx`,
    `app/apple-icon.tsx`) are static, take no params, and render only
    code-defined content.
  - Production runs on Vercel. No authoritative Vercel statement about this
    advisory was found, so platform-level mitigation is **not assumed**.
- **Assessment:** exploitation needs attacker-controlled SVG bytes to reach
  `sharp`. No such path was found in the current configuration, but the
  endpoint is live, `sharp@0.35.4` (vulnerable) is in the production server
  trace, the upstream exploit details are not public, and the advisory is
  rated critical. **Treated as a must-fix.**

### 5.2 GHSA-673q-mjm6-r5xr — RCE in `use cache` returning typed arrays (Critical 9.5)

- **Description (vendor):** "A vulnerability in applications using App router
  with Cache Component can lead to remote code execution. The application
  needs to have a `use cache` function that returns multiple typed arrays."
  Related upstream React advisory GHSA-xqc2-xf4c-x3h3. The fix
  ([`a4cea6a`](https://github.com/vercel/next.js/commit/a4cea6aec5da89d116b8960e113189cf51745d2f),
  "Improve Server Component transport protocol") changes Next's vendored
  `react-server-dom-*` packages.
- **Affected / patched:** `>=16.0.0 <=16.4.0` → **16.4.1** (16.x only).
- **Does Roducq use the affected feature?** **No.** `next.config.mjs` does
  not enable `cacheComponents` / `experimental.useCache`, and there is no
  `'use cache'`, `cacheLife`, `cacheTag` or `unstable_cache` anywhere in the
  repository.
- **Assessment:** not exploitable in the current code. The vendor still says
  "You should upgrade immediately even if your application does not have
  similar functions", and the same release is required for §5.3 anyway.

### 5.3 GHSA-p3m5-59mp-jv5r — Server Actions DoS (High 8.2) — **reachable**

"Crafted requests targeting Next.js applications using App Router with at
least one Server Action can lead to excessive CPU usage blocking processing
of further requests in the same process." Roducq has **19** `'use server'`
modules, including **unauthenticated** ones (`app/(auth)/actions.ts`,
`app/(auth)/reset-password/actions.ts`, `app/invite/actions.ts`). No
workaround exists besides upgrading. This is the most directly exploitable
finding, and it also requires **16.4.1**.

### 5.4 nodemailer addressparser (3 × Medium) — low practical exposure

`nodemailer` runs in production only to send team invites
(`lib/invite-email.ts` → `sendInviteEmail`, called from the owner-only
server action in `app/(app)/settings/team-actions.ts`), and only when all
`SMTP_*` variables are configured. The recipient is validated with
`EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` (exactly one `@`, no whitespace)
and a 254-character cap. Every published proof of concept needs whitespace
and/or a second `@`, so those inputs are rejected before nodemailer sees
them. `from` comes from operator configuration. Still a direct production
dependency with a published patch, so it is in the plan.

### 5.5 postcss-selector-parser — upstream backport not yet recognised by the advisory

The advisory lists `< 7.1.6` as affected. On 2026-10-19 the maintainers
released **6.1.5**, whose release notes state: "parse flat selectors in
linear time, closing a CPU exhaustion vulnerability (CVE-2026-104844 /
GHSA-rj75-hqrm-r3gf) … backported from 7.1.6 … **6.1.5 is the patched version
for the 6.x line** … kept alive for … Tailwind CSS 3 in particular, which
depends on `^6.1.2`." The GitHub advisory has not been updated since
2026-10-05, so `npm audit` will keep flagging 6.1.5.

Independent check (scratch install in `/tmp`, script at
`docs/evidence/dependency-security/postcss-selector-parser-bench.cjs`,
output in `…/postcss-selector-parser-6.1.5-backport-benchmark.txt`), parsing
a flat selector `.a.a.a…` with *n* class indexes:

| n indexes | 6.1.4 | 6.1.5 |
| --- | --- | --- |
| 5,000 | 44 ms | 22 ms |
| 10,000 | 116 ms | 16 ms |
| 20,000 | 474 ms | 24 ms |
| 40,000 | **1,667 ms** (≈4× per doubling → quadratic) | **53 ms** (linear) |

Round-trip output is identical on both versions.

---

## 6. Exploitability summary and priority

| Priority | Finding(s) | Why |
| --- | --- | --- |
| **P0 — critical** | `next` GHSA-2464 (+ `sharp` GHSA-wq5f), GHSA-673q | Critical rating. GHSA-673q not reachable; GHSA-2464 low-likelihood but not excluded. Fixed by one upgrade. |
| **P1 — high, production** | `next` GHSA-p3m5 (**reachable**), GHSA-cjq9 (not reachable) | The Server Actions DoS is the most concrete production risk. |
| P1b — high, non-production | `source-map-js`, `zod` | High rating, but build/lint-time only; lockfile-only fixes. |
| **P2 — moderate, production** | `nodemailer` ×3; `next` medium ×5 (none reachable) | Patch available inside the existing major. |
| P3 — dev/build only | `smtp-server`, `fast-uri` ×4, `postcss-selector-parser` chain, `next` GHSA-39w2 (dev server) | No production exposure. |

---

## 7. Compatibility research (inputs to the plan)

| Concern | Finding |
| --- | --- |
| Next.js versions available | 16.3.7, 16.3.8, 16.4.0, **16.4.1** (security), 16.4.2, **16.4.3** (`latest`, 2026-10-23). No 16.3.9. |
| Release deltas | 16.3.7: one Turbopack fix. 16.3.8: 7 security fixes. 16.4.0: feature minor ([blog](https://nextjs.org/blog/next-16-4)). 16.4.1: security only (3 advisories). 16.4.2 / 16.4.3: backported bug fixes only (Turbopack stability; "Don't load the app-page runtime in proxy.ts"; OpenTelemetry trace grouping; Google-font URL fix). |
| React | `next@16.4.1` and `16.4.3` peer `react`/`react-dom`: `^18.2.0 \|\| ^19.0.0` → React **18.3.1 stays supported**. 16.4.0 adds a deprecation **warning** (React 18 support removed in Next 17). App Router RSC uses Next's vendored React either way. |
| Node.js | `next@16.4.x` engines `>=20.9.0` (unchanged from 16.3.6). `nodemailer@10.1.4` / `smtp-server@3.19.24` engines `>=20.0.0`. Node 22.22.3 local, `>=22.18.0` in CI. |
| `eslint-config-next` | 16.3.6 peers `eslint >=9` (9.39.5 installed). Works unchanged with `next@16.4.x` (lint clean in dry-run). No advisory → **no bump required**. |
| `@sentry/nextjs` 10.75.3 | peer `next: ^13.2.0 \|\| ^14.0 \|\| ^15.0.0-rc.0 \|\| ^16.0.0-0` → satisfied. |
| 16.4.0 behaviour changes relevant here | "Return client errors for unrecognized Server Actions" (4xx instead of 5xx); "reject non-2xx internal image responses"; "Pages Router: Deprecate React 18 support"; "Remove the worker thread for turbopack builds" (PostCSS warnings now print — see §8.4). |
| `nodemailer` 10.0.10 → 10.1.4 | Same major. 10.1.0 = hardening of streams/SMTP/pool; 10.1.1–10.1.4 = security/bug fixes. 10.1.4 is also the **exact** version pinned by `smtp-server@3.19.24`, so a single deduped copy remains. |
| Transitive fixes | All in-range, lockfile-only: `source-map-js ^1.2.1 → 1.2.2`, `fast-uri ^3.0.1 → 3.1.9`, `zod ^3.25.0 \|\| ^4.0.0 → 4.6.7`, `postcss-selector-parser ^6.1.2 → 6.1.5`. |
| `zod` supply-chain note | 4.6.6's release notes disclose a compromised git credential (six malicious commits reverted on `main`, "None were ever published to npm"). 4.6.6 and 4.6.7 are both published through GitHub Actions trusted publishing with maintainer approval and SLSA provenance. 4.6.6 contains the fix (`fix(v4): check array, set and map size bounds before parsing elements`); 4.6.7 is a version-only bump whose provenance points into the current history. |

---

## 8. Proposed remediation plan (Checkpoint 2 — awaiting approval)

### 8.1 Exact changes proposed

| Package | Type | From | To (recommended) | Minimum safe | Command | Fixes |
| --- | --- | --- | --- | --- | --- | --- |
| `next` | prod, direct | `^16.3.6` / 16.3.6 | `^16.4.3` / **16.4.3** | **16.4.1** | `npm install next@16.4.3` | all 10 `next` advisories; pulls `sharp` 0.35.4 → **0.35.5** (GHSA-wq5f) via Next's `optionalDependencies` |
| `nodemailer` | prod, direct | `^10.0.10` / 10.0.10 | `^10.1.4` / 10.1.4 | 10.1.4 | `npm install nodemailer@10.1.4` | 3 nodemailer advisories |
| `smtp-server` | dev, direct | `^3.19.13` / 3.19.13 | `^3.19.24` / 3.19.24 | 3.19.24 | `npm install -D smtp-server@3.19.24` | clears its nodemailer chain (pins nodemailer 10.1.4) |
| `source-map-js` | transitive | 1.2.1 | 1.2.2 | 1.2.2 | `npm update source-map-js` (lockfile only) | GHSA-68fv |
| `zod` | transitive | 4.6.5 | 4.6.7 | 4.6.6 | `npm update zod` (lockfile only) | GHSA-mrhx |
| `fast-uri` | transitive | 3.1.8 | 3.1.9 | 3.1.9 | `npm update fast-uri` (lockfile only) | 4 fast-uri advisories |
| `postcss-selector-parser` | transitive | 6.1.4 | 6.1.5 | 6.1.5 (upstream) | `npm update postcss-selector-parser` (lockfile only) | GHSA-rj75 in code (tooling will still flag it — §8.3) |

**Not changed:** `react`, `react-dom` (no React 19 major), `eslint`,
`eslint-config-next`, `tailwindcss` (no v4 major), `@sentry/nextjs`, every
other dependency, `next.config.mjs`, `tsconfig.json`, all source, tests,
billing/Razorpay, auth and Supabase code, migrations.

**Why 16.4.3 rather than 16.4.1:** both clear every advisory and both passed
the same dry-run (§8.4). 16.4.2/16.4.3 add only backported bug fixes on the
same LTS line — no features and no new advisories — including
Turbopack-stability fixes and a `proxy.ts` start-up fix relevant to Roducq's
`proxy.ts`. If the strictest "minimum safe version" reading is preferred,
**16.4.1** is a drop-in alternative (`npm install next@16.4.1`).

### 8.2 Expected vulnerability reduction (measured in the dry-run)

| | critical | high | moderate | low | total |
| --- | --- | --- | --- | --- | --- |
| Before (baseline) | 1 | 3 | 7 | 0 | **11** |
| After (dry-run, `next@16.4.3` or `16.4.1`) | **0** | **0** | 4 | 0 | **4** |

Lockfile delta (dry-run, `next@16.4.3`): **43 version bumps, 0 packages added,
0 removed, 0 dev/optional flag changes**. That is `next` + `@next/env` + 8
`@next/swc-*` platform binaries; `sharp` + 16 `@img/sharp-*` + 10
`@img/sharp-libvips-*` (1.3.3 → 1.3.4) platform binaries; and the six packages
in the table (10 + 27 + 6 = 43). Full list:
`docs/evidence/dependency-security/lockfile-delta-projected-next-16.4.3.txt`.
Projected audits:
`docs/evidence/dependency-security/npm-audit-projected-next-16.4.{3,1}.json`.

### 8.3 What would remain (tooling) and why

The 4 remaining "moderate" entries are **one** advisory, GHSA-rj75-hqrm-r3gf,
reported against `postcss-selector-parser@6.1.5` and its dependents
`postcss-nested`, `tailwindcss` and `tailwindcss-animate`. The code is
patched (§5.5); the advisory's affected range has not caught up. Options to
silence it, all **rejected** under this task's constraints:
- Tailwind CSS 4 migration — unreviewed major upgrade and a redesign risk.
- `overrides` forcing `postcss-selector-parser@7` under Tailwind 3 — an
  unsupported combination (7.x changes the AST API).
- `npm audit fix --force` — prohibited.

Recommendation: accept and document; re-run `npm audit` after GitHub updates
the advisory range.

### 8.4 Compatibility dry-run (throwaway copy in `/tmp`, repository untouched)

Each candidate was applied to a fresh `git archive` of `85f94da` in `/tmp`,
then the CI gates were run. The baseline column is the real repository.

| Gate | Baseline `next@16.3.6` | Dry-run `next@16.4.3` | Dry-run `next@16.4.1` |
| --- | --- | --- | --- |
| `npm test` | 1243 pass / 0 fail / 0 skip | 1243 / 0 / 0 † | 1243 / 0 / 0 |
| `npx tsc --noEmit` | clean | clean | clean |
| `npm run lint` | clean (0 warnings) | clean | clean |
| `npm run build` | ✓ Turbopack, 45/45 static pages | ✓ Turbopack, 45/45 | ✓ Turbopack, 45/45 |
| Route table | — | identical to baseline | identical to baseline |
| `tsconfig.json` after build | unchanged | unchanged | unchanged |
| `npm ls` tree problems | only unmet other-platform optional binaries + 2 pre-existing extraneous optional wasm packages | identical | identical |
| New build warnings | none | 2 (below) | 2 (below) |

† The first 16.4.3 dry-run showed 1 failure: `changelog-page.test.ts` runs
`git cat-file -t cf393b5`, but it skips that check in shallow clones (like the
real checkout). The scratch copy was a fresh non-shallow repo with one commit.
After marking the scratch repo shallow, the suite passed 1243/1243. This was
an environment artefact, not a dependency effect.

New build output on 16.4.x (both are warnings; the build succeeds):
1. `⚠ React 18 support is deprecated in Next.js 16 and will be removed in
   Next.js 17.` — informational. A React 19 upgrade is a separate major
   project, out of scope.
2. `warn - The class duration-[250ms] is ambiguous and matches multiple
   utilities.` (from `components/ui/dialog.tsx`) — **pre-existing**. 16.4.0
   removed the Turbopack build worker thread, so PostCSS/Tailwind warnings
   are now printed. Neither the baseline nor the dry-run CSS contains a
   `duration-[250ms]` rule; Tailwind 3 skipped the ambiguous class in both.
   Not changed here (no unrelated changes).

**CSS output comparison:** of 1,642 rule chunks in the main stylesheet,
**1,638 are byte-identical**. The other 4 are the hashed CSS-module class
names generated by `next/font/local` (`.manrope_316f7e37-module__jXY8va__className`
→ `.jXY8va_className`, same for Fira Code), with identical `font-family`
declarations. The second stylesheet is byte-identical. So the
`postcss-selector-parser`/Tailwind output is unchanged, and the only CSS
difference is class-name minification by 16.4. This will still be confirmed
in a real browser in Phase 6.

### 8.5 Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Framework minor jump 16.3 → 16.4 (router internals, Turbopack, RSC transport change for GHSA-673q) causes a subtle hydration/navigation regression | low–medium | Phases 4–6: full tests/tsc/lint/build, route smoke tests, auth/payment safeguard checks, Chromium at 7 widths, axe, PR #53 LCP suite |
| RSC protocol change → short version skew for tabs open during the deploy | low | Vercel deploys atomically; Next falls back to a hard navigation on deployment mismatch |
| nodemailer 10.1.x stricter RFC 5322 parsing changes delivery for unusual addresses | low | `EMAIL_RE` already limits inputs to a plain addr-spec; Phase 5 sends a real invite through a local `smtp-server` |
| The new React 18 deprecation warning is mistaken for a failure | — | documented here; build exit code 0 |
| `npm audit` still non-zero (4 moderate) | certain | §8.3 — metadata lag, verified fixed; documented as remaining |

### 8.6 Rollback plan

- **Code:** `git revert <dependency-commit>`, or restore `package.json` and
  `package-lock.json` from `85f94da` (`git checkout 85f94da -- package.json
  package-lock.json && npm ci`). The change touches only those two files, so
  it reverts cleanly.
- **Production (after an eventual operator deploy):** Vercel *Instant
  Rollback* to deployment `7328221703` (commit `85f94da`).
- **Caveat:** rolling back re-exposes GHSA-p3m5 (reachable) and both
  critical advisories. Prefer rolling forward, e.g. 16.4.3 → 16.4.1.

---

## 9. Known limitations (so far)

- **Dependabot is disabled** for the repository, so GitHub alert state could
  not be cross-checked; the GitHub Advisory Database was queried directly
  instead.
- **Production could not be probed:** the sandbox cannot open TLS to
  `roducq.nanexi.com` (`SSL_ERROR_SYSCALL`). Production state comes from the
  GitHub Deployments API.
- **Vercel platform mitigation not verified:** no authoritative Vercel
  statement on GHSA-2464 for Vercel-hosted image optimisation was found, so
  none is assumed.
- **`npm audit signatures` could not run:** the sandbox cannot reach
  `tuf-repo-cdn.sigstore.dev` (`ECONNRESET`). Tarball integrity is still
  enforced by `npm ci` against the lockfile's sha512 hashes.
- Exploitability statements are code- and config-based reachability
  analysis. No exploit was attempted.

## 10. Phases 3–8

Pending human approval of §8. This document will be extended with: exact
applied changes, before/after `npm audit`, regression results (tests, tsc,
lint, build), authentication / payment-safeguard / backend verification,
Chromium layout, accessibility and LCP results, final limitations, and
rollback instructions.
