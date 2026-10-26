# Roducq — Dependency Security Audit

> **Status (2026-10-26): complete. The pull request is open; it is not merged
> and not deployed.**
> - The approved remediation (Checkpoint 2: `next@16.4.3` plus six other
>   packages, §8) is applied on branch `arena/22448d87-roducq` and verified in
>   §10.
> - `npm audit`: **11 → 4** vulnerable packages, now **0 critical, 0 high**.
>   The 4 remaining moderate entries are one advisory whose affected range has
>   not caught up with the upstream fix (§10.3).
> - No application code, configuration, test, payment logic, database schema
>   or migration changed.
> - **Final security checks (§12):**
>   - GHSA-rj75 is genuinely patched in the installed
>     `postcss-selector-parser@6.1.5`; the official range correction is
>     pending in github/advisory-database#10456.
>   - The rollback target `next@16.4.1` fixes every critical and high
>     advisory, and a next-only rollback was rehearsed end to end.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository & PR reconciliation | ✅ complete |
| 1 | Dependency security audit | ✅ complete — Checkpoint 1 |
| 2 | Remediation plan | ✅ approved 2026-10-26 — Checkpoint 2 |
| 3 | Apply approved updates | ✅ complete — Checkpoint 3 (§10.1–§10.3) |
| 4 | Automated regression | ✅ complete (§10.5) |
| 5 | Auth, payment-safeguard, backend and route checks | ✅ complete (§10.6) |
| 6 | Browser, accessibility and LCP | ✅ complete (§10.7–§10.8) |
| 7 | Final documentation | ✅ this document and `SECURITY.md` |
| 8 | Pull request | ✅ open against `main` — not merged, not deployed |

**Where each required item is documented**

| # | Item | Section |
| --- | --- | --- |
| 1 | Git baseline | §1 |
| 2 | Node / npm versions | §2 |
| 3 | Initial vulnerability inventory | §4 |
| 4 | Advisory evidence | §4.2, §5 |
| 5 | Approved remediation plan | §8 |
| 6 | Exact package changes | §10.1 |
| 7 | Before/after vulnerability counts | §10.2 |
| 8 | Remaining vulnerabilities | §10.3 |
| 9 | Compatibility results | §10.4 (inputs: §7, §8.4) |
| 10 | Automated test results | §10.5 |
| 11 | Browser and accessibility results | §10.7 |
| 12 | LCP results | §10.8 |
| 13 | Payment and auth safeguard verification | §10.6 |
| 14 | Known limitations | §9 |
| 15 | Rollback instructions | §11 |
| — | Final security checks: GHSA-rj75 and the `next@16.4.1` rollback target | §12 |

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

## 8. Remediation plan (Checkpoint 2 — approved 2026-10-26)

Approved as proposed on 2026-10-26: the `next@16.4.3` variant, plus a
documentation-only refresh of `SECURITY.md`. §10 records the result. Nothing
outside this plan was changed.

### 8.1 Exact changes (as approved)

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
Turbopack-stability fixes and a `proxy.ts` cold-start optimisation (the proxy
no longer loads the app-page runtime; not a correctness fix, see §12.2). If
the strictest "minimum safe version" reading is preferred,
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
   utilities.` (from `components/ui/dialog.tsx`) — **pre-existing**.
   - Tailwind's own CLI prints the same warning on the baseline tree, with no
     Next.js involved (verified in Phase 4).
   - Neither the baseline nor the updated CSS contains a `duration-[250ms]`
     rule; Tailwind 3 skipped the ambiguous class in both.
   - Next 16.4.0 removed the Turbopack build worker thread
     (vercel/next.js#96862). That is a plausible but unconfirmed reason the
     warning now appears in `next build` output; the PR does not mention
     logging.
   - Not changed here (no unrelated changes).

**CSS output comparison:** of 1,642 rule chunks in the main stylesheet,
**1,638 are byte-identical**. The other 4 are the hashed CSS-module class
names generated by `next/font/local` (`.manrope_316f7e37-module__jXY8va__className`
→ `.jXY8va_className`, same for Fira Code), with identical `font-family`
declarations. The second stylesheet is byte-identical. So the
`postcss-selector-parser`/Tailwind output is unchanged, and the only CSS
difference is class-name minification by 16.4. Phase 6 confirmed this in a
real browser: full-page screenshots of all eight marketing routes are
pixel-identical between the two builds (§10.7).

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

*Superseded by §11, which was re-verified in the final checks (§12.2).*

---

## 9. Known limitations

- **Not deployed; production not probed.** By instruction nothing was deployed.
  - The sandbox cannot open TLS to `roducq.nanexi.com`, so production state
    comes from the GitHub Deployments API: deployment `7328221703` of
    `85f94da`.
  - After an operator deploys, smoke-test the Vercel preview first: `/`,
    `/login`, `/pricing` and one signed-in page.
- **No real Supabase.** Auth, session, protected-rendering and Server Action
  checks ran against in-process stubs (§10.6): the repository's own
  `verify:responsive` stub, and an ad-hoc stateful GoTrue/PostgREST stub.
  - `scripts/verify-auth.mjs`, `verify:live` and `verify:live:policies` need a
    real project and credentials, so they were not run.
  - No `@supabase/*` package changed (0 of the 43 lockfile changes).
- **No real Razorpay.** No request reached Razorpay: the sandbox has no route
  to it, and no Test Mode keys were used.
  - Safeguards were verified with the existing unit tests, plus runtime probes
    that used obviously fake `rzp_live_` placeholder values (§10.6).
- **Lab performance only.** LCP and Lighthouse numbers come from a 2-vCPU
  sandbox serving over loopback.
  - There is no CDN and no real network; Lighthouse's throttling is simulated.
  - The numbers support the baseline-vs-updated comparison (same machine,
    interleaved runs). They are not production field data.
- **Chromium only.** Chromium 153.0.8010.0, headless, from
  `@sparticuz/chromium@153.0.0`, the same binary earlier PRs used. The
  Playwright browser CDN is unreachable from the sandbox. Firefox and WebKit
  were not tested.
- **Test-harness accommodations.** These are in test code only; the app is
  unchanged, and both builds behaved identically under all three.
  1. **CSP:** the loopback stub origin is appended to the `connect-src` of test
     documents. This is the same approach as the repository's own harness
     (`scripts/responsive/phase-f.mjs`).
  2. **Redirect follow-ups:** Playwright does not route them, so the recovery
     test reloads `/reset-password` once after `/auth/callback`. That gives the
     page a CSP-patched document.
  3. **Host:** the auth tests use `http://localhost:<port>`. Route handlers
     build redirects from `request.url`, whose origin under `next start` is
     `localhost`. On Vercel it is the public host.
- **`npm audit` still exits non-zero** (4 moderate, §10.3) until GitHub
  updates the affected range for GHSA-rj75. CI does not run `npm audit`, so
  CI is not blocked.
- **React 18 deprecation.** Next 16.4 warns that React 18 support goes away in
  Next 17. A React 19 upgrade must come before any Next 17 upgrade; it is out
  of scope here.
- **Pre-existing observations, identical on the baseline and not changed (out
  of scope):**
  - **Hero clip:** `verify:responsive` flags the marketing-home hero, which
    clips decorative content inside `overflow-hidden`, at every width.
  - **Tailwind:** the `duration-[250ms]` ambiguity in
    `components/ui/dialog.tsx`.
  - **axe "needs review":** 628 colour-contrast nodes that axe could not
    decide automatically. PR #65 covered them with manual contrast sampling.
  - **Layout shift:** occasional homepage layout shift in single LCP runs,
    caused by the hero's decorative `lm-bloom-a` / `lm-bloom-b` layer. It
    occurs on both builds with no statistical difference (§10.8).
- **Dependabot is disabled,** so GitHub alert state could not be
  cross-checked. The GitHub Advisory Database was queried directly instead.
- **`npm audit signatures` could not run;** the sandbox cannot reach
  `tuf-repo-cdn.sigstore.dev`. `npm ci` still enforced every tarball's sha512
  hash from the lockfile.
- **Vercel platform mitigation for GHSA-2464 is not assumed;** no authoritative
  statement was found.
- **Exploitability statements** are code- and configuration-based reachability
  analysis. No exploit was attempted.

## 10. Phases 3–8 — implementation and verification

### 10.1 Exact package changes (applied)

Commands run on 2026-10-26, exactly as approved. There was no
`npm audit fix`, no `--force`, and no lockfile deletion or regeneration:

```bash
npm install --no-audit --no-fund next@16.4.3 nodemailer@10.1.4
npm install --no-audit --no-fund -D smtp-server@3.19.24
npm update  --no-audit --no-fund source-map-js zod fast-uri postcss-selector-parser
```

`package.json` (three ranges, nothing else):

| Package | Section | Before | After |
| --- | --- | --- | --- |
| `next` | dependencies | `^16.3.6` | `^16.4.3` |
| `nodemailer` | dependencies | `^10.0.10` | `^10.1.4` |
| `smtp-server` | devDependencies | `^3.19.13` | `^3.19.24` |

Resolved versions in `package-lock.json`:

| Package | Before | After | Addresses |
| --- | --- | --- | --- |
| `next`, `@next/env`, 8 × `@next/swc-*` | 16.3.6 | **16.4.3** | the 10 `next` advisories (§4.2) |
| `sharp`, 16 × `@img/sharp-*` | 0.35.4 | **0.35.5** | GHSA-wq5f (pulled by `next`'s optional dependencies) |
| 10 × `@img/sharp-libvips-*` | 1.3.3 | 1.3.4 | libvips binaries matching sharp 0.35.5 |
| `nodemailer` | 10.0.10 | **10.1.4** | GHSA-8c8m, GHSA-m943, GHSA-85x2 |
| `smtp-server` (dev) | 3.19.13 | 3.19.24 | its `nodemailer` dependency |
| `source-map-js` | 1.2.1 | 1.2.2 | GHSA-68fv |
| `zod` | 4.6.5 | 4.6.7 | GHSA-mrhx |
| `fast-uri` | 3.1.8 | 3.1.9 | GHSA-w74x, GHSA-wjr9, GHSA-xhq7, GHSA-333x |
| `postcss-selector-parser` | 6.1.4 | 6.1.5 | GHSA-rj75 in code (still flagged — §10.3) |

- **Lockfile delta:** 43 version changes; 0 packages added, 0 removed, 0
  dev/optional flag changes. The `npm ls` total is unchanged at 658.
- **Identical to what was approved:** the applied `package.json` and
  `package-lock.json` are byte-identical to the Checkpoint-2 dry-run, and
  `npm audit --json` is byte-identical to the approved projection
  (`npm-audit-projected-next-16.4.3.json`).
- **Unchanged:** `react` / `react-dom` 18.3.1, `eslint` 9.39.5,
  `eslint-config-next` 16.3.6, `typescript` 5.9.3, `tailwindcss` 3.4.19,
  `@sentry/nextjs` 10.75.3, `@supabase/ssr` 0.12.7,
  `@supabase/supabase-js` 2.117.2, and every other package.

The branch carries three commits on top of `85f94da`:
1. `5abb03a`: this audit at Phases 0–2.
2. `973fe84`: `package.json` and `package-lock.json` only.
3. A documentation commit: this section, the evidence files, and `SECURITY.md`.

### 10.2 `npm audit` before and after

| | critical | high | moderate | low | vulnerable packages | distinct advisories |
| --- | --- | --- | --- | --- | --- | --- |
| Before (`85f94da`) | 1 | 3 | 7 | 0 | **11** | 21 |
| After | **0** | **0** | 4 | 0 | **4** | 1 |

| Package (baseline severity) | After |
| --- | --- |
| `next` (critical) | resolved — 16.4.3 |
| `sharp`, `source-map-js`, `zod` (high) | resolved |
| `nodemailer`, `smtp-server`, `fast-uri` (moderate) | resolved |
| `postcss-selector-parser` (moderate) | still flagged — GHSA-rj75, fixed in code (§10.3) |
| `postcss-nested`, `tailwindcss`, `tailwindcss-animate` (moderate, through `postcss-selector-parser`) | still flagged — same advisory |

Evidence: `docs/evidence/dependency-security/npm-audit-before.json` and
`npm-audit-after.json`.

### 10.3 Remaining vulnerabilities

One advisory remains: **GHSA-rj75-hqrm-r3gf (moderate)**. It accounts for all
four remaining entries.

- **Where it is reported:** against `postcss-selector-parser@6.1.5` (affected
  range `<7.1.6`) and against three packages that depend on it:
  `postcss-nested`, `tailwindcss` and `tailwindcss-animate`.
- **The code is fixed.** 6.1.5 is upstream's backport of the 7.1.6 fix to the
  6.x line (`legacy-v6` dist-tag). On the advisory's quadratic input, parse
  time drops from 1,667 ms to 53 ms at n = 40,000 (§5.5;
  `postcss-selector-parser-6.1.5-backport-benchmark.txt`).
- **Build-time only.** It runs inside Tailwind CSS 3 during `next build`, and
  no server output-file trace includes it (§3, §4.1).
- **Not removable within scope.** The options are a Tailwind CSS 4 migration
  (an unreviewed major), an `overrides` entry forcing 7.x under Tailwind 3 (an
  unsupported combination), or `npm audit fix --force` (prohibited).
- **Verified (§12.1):** the installed copy matches the signed registry
  tarball, contains the same code change as the official 7.1.6 fix, and no
  longer reproduces the advisory's proof of concept.
- **Correction pending:** on 2026-10-20 the package maintainer filed
  github/advisory-database#10456 to add 6.1.5 as the patched 6.x version.
  Re-run `npm audit` once GitHub applies it. No further code change is
  expected.

This branch does **not** claim the dependency tree is vulnerability-free.

### 10.4 Compatibility results

| Concern | Result |
| --- | --- |
| Node | `next@16.4.3` requires `>=20.9.0`. The repo declares `>=20.0.0`; CI uses `>=22.18.0`. Verified on Node 22.22.3. |
| React | Peer range `^18.2.0 \|\| ^19.0.0`, so `react` / `react-dom` 18.3.1 are kept. The build now prints a React 18 deprecation notice for Next 17. |
| App Router runtime | React vendored inside `next`: `19.3.0-canary-cbb046ab-20260731` → `19.3.0-canary-278794d7-20261002`. Rendering and hydration code therefore changed, so LCP was measured on all eight marketing routes (§10.8). |
| `eslint-config-next` | Stays 16.3.6 (peer `eslint >=9`). Lint is clean, so no update was needed. |
| `@sentry/nextjs` 10.75.3 | Accepts `next ^16.0.0-0`. The build is clean. |
| TypeScript | `tsc --noEmit` clean. |
| Build | Turbopack ✓, 45/45 static pages. Route table identical; `tsconfig.json` unchanged after the build. |
| CSS | Tailwind CLI output is byte-identical between `postcss-selector-parser` 6.1.4 and 6.1.5. `next build` CSS differs only in `next/font` class names. |
| Rendered output | All 8 marketing routes are pixel-identical at 375 and 1440 px (§10.7). |
| Server Actions / RSC transport | The signup and password-reset Server Actions behave identically (307 redirect and 200). An unauthenticated replay is refused identically (§10.6). |
| `sharp` / image optimiser | `/_next/image` probes are identical: SVG is still rejected before `sharp`, a same-origin PNG returns 200, and remote and non-image URLs return 400. |
| Email | The invite message is byte-identical between `nodemailer` 10.0.10 and 10.1.4, after normalising per-send IDs, dates and MIME boundaries. |
| PDFs | All 14 generated PDFs are byte-identical. |
| Build warnings | Two new lines, neither fails the build: the React 18 deprecation, and the pre-existing Tailwind ambiguity (§8.4). |

**Compatibility fixes required: none.** No source, configuration or test file
was changed.

### 10.5 Automated test results

Both trees were measured in the same session on 2026-10-26. Full detail is in
`docs/evidence/dependency-security/automated-gates.txt`. Where the baseline
numbers come from:
- `npm test`, `tsc`, `lint` and `build`: the real checkout at `85f94da`,
  before Phase 3.
- `npm ci`, `verify:db`, `verify:pdf` and the Phase 6 build: a pristine
  `git archive` of `85f94da`.

The updated column is this branch after a clean `npm ci`.

| Gate | Baseline (`next@16.3.6`) | Updated (`next@16.4.3`) |
| --- | --- | --- |
| `npm ci` | ✓ 575 packages | ✓ 575 packages |
| `npm test` | 1243 pass / 0 fail / 0 skip (309 suites) | **1243 pass / 0 fail / 0 skip** (309 suites) |
| `npx tsc --noEmit` | clean | **clean** |
| `npm run lint` | clean | **clean** |
| `npm run build` | ✓ 45/45, no warnings | **✓ 45/45**, 2 non-failing warnings (§10.4) |
| `npm run verify:db` (offline CI gate) | 218 checks pass | **218 checks pass** — same list |
| `npm run verify:pdf` (offline CI gate) | 14 documents, 0 findings | **14 documents, 0 findings**; all PDFs byte-identical |
| `tsconfig.json` after build | unchanged | **unchanged** |

The suite includes two safeguard subsets:
- payment safeguards: 9 files, **258/258**;
- authentication and authorisation: 8 files, **74/74**.

No test was added, removed, skipped or modified.

### 10.6 Authentication, payment-safeguard and backend verification

**Protected code is untouched.** Outside documentation, `git diff 85f94da`
contains only `package.json` and `package-lock.json`. Zero files changed under
any of these:
- `app/`, `lib/`, `components/`;
- `supabase/` (32 migrations), `tests/`, `scripts/`, `.github/`;
- `proxy.ts`, `next.config.mjs`, `tsconfig.json`;
- the ESLint, Tailwind and PostCSS configuration;
- the instrumentation and Sentry files.

**Authentication: real Chromium, both builds, 40/40 each, identical outcomes.**

*Method.* Each tree's `verify:responsive` build ran under `next start` against
an in-process, stateful GoTrue/PostgREST stub, and the same script drove both
builds. Passwords were never logged; the stub records only their length.

*Console output.* It was identical on both builds: only the 3 errors the tests
cause on purpose (one 400 from the wrong password, two 403s from recovery
claims). Server logs showed 0 errors.

| Area | Checks |
| --- | --- |
| Protected-route redirects | Anonymous requests to the 12 app prefixes, `/settings/billing` and `/invoices/<id>` → 307 `/login` (14/14). Six public routes → 200. |
| Sign-in | A wrong password shows the error and creates no session. The correct password lands on `/intake` inside the app shell with the session cookie set. |
| Session handling | The session survives a reload. A signed-in `/login` bounces to `/intake`. A signed-in `/` rewrites to the Pipeline dashboard while the URL stays `/`. |
| Logout | Goes to `/login` and clears the session cookie; protected routes redirect again. |
| Signup | Client `signUp` → Server Action `createWorkspaceAction` → `create_workspace` RPC as the new user → `/intake`. |
| Server Action authorisation | Replaying the captured `createWorkspaceAction` without a session returns "session has expired" and makes no RPC. |
| Password recovery | Forgot-password sends a PKCE (S256) recover request with the `/auth/callback` redirect. The email link's code is exchanged server-side and the recovery-grant cookie is set. The form appears; `updatePasswordAction` issues `PUT /auth/v1/user` and shows "Password updated". The grant is consumed and the user signed out. Signing in with the new password works. Replaying the used link shows "Reset link problem". |
| Recovery guards | A normal password session cannot open the reset form, and `/auth/recovery/claim` returns 403. Anonymous `/reset-password` shows "Reset link problem". |

The repository's own `verify:responsive` harness also rendered every signed-in
workspace page with a stub session, and drove its dialogs and interactions.
The results were identical to the baseline (§10.7).

**Payments: production payments remain disabled, Live Mode cannot be
enabled, and no annual checkout exists.**

- **Code.** `lib/razorpay.ts`, `lib/billing/*`, `app/api/razorpay/*`, the
  settings billing components and the pricing plans are unchanged (0 diff).
- **Unit tests.** 9 files, 258/258. They include:
  - "unset defaults to test — never live";
  - "RAZORPAY_MODE=live is refused even with a live key";
  - "a live key with the default (unset) mode is refused";
  - "there is no env var that enables live mode";
  - "a live public key can never be exposed via the test path";
  - "Test Mode gate is enforced at every billing entry point";
  - "annual is unavailable in self-serve checkout today".
- **Runtime, billing unconfigured** (identical on both builds):
  - anonymous `POST /api/razorpay/verify` → 401;
  - unsigned webhook → refused with 500 "Webhook handling failed.". In this
    test environment no Supabase service-role key is configured, so the route
    stops before signature verification. This probe shows only that the
    webhook is refused. Signature verification itself is covered by the
    `billing-webhook` and `razorpay-security` unit tests, which are among
    the 258;
  - `/pricing` Annual tab → "annual unavailable" banner, no checkout link, and
    no request to any `razorpay.com` host;
  - owner `/settings` → no "Upgrade to Pro" button and no Test Mode badge.
- **Runtime, fake live-mode configuration** (identical on both builds): with
  `RAZORPAY_MODE=live` and obviously fake `rzp_live_` placeholder keys,
  - a signed-in owner's `POST /api/razorpay/verify` → 500 "Razorpay Live Mode
    is disabled in this build…";
  - clicking "Upgrade to Pro" → `createRazorpayCheckout` refuses with the same
    message, Checkout.js never loads, and no request is made to
    `razorpay.com`;
  - a webhook with a bad signature → refused (500, the same early stop as
    above).

**Backend.**
- API routes compile, and the route table is identical (`/api/razorpay/*`,
  `/auth/callback`, `/auth/recovery/*` and the rest).
- `verify:db` passes 218 checks (RLS, RPCs, invite and share tokens) on both
  trees.
- No schema change, no migration, and no authentication-logic change.

**Email (`nodemailer` 10.1.4).** The app's real `lib/invite-email.ts` sent an
invite to a local `smtp-server`: **10/10 checks on both trees**.
- Checked: AUTH, envelope, headers, the multipart/alternative structure, and
  the invite URL in both the text and HTML parts.
- A rejected AUTH returns `send-failed`; missing SMTP configuration returns
  `not-configured`.
- The normalised message is byte-identical between 10.0.10 and 10.1.4.

**Marketing routes.** All 17 public marketing URLs return 200 on both builds,
with identical titles: `/`, `/features`, `/solutions`, `/integrations`,
`/pricing`, `/changelog`, `/about`, `/vs`, and the nine `/vs/*` pages.

### 10.7 Browser and accessibility results

**Environment.**
- Browser: Chromium 153.0.8010.0, headless (`@sparticuz/chromium@153.0.0`,
  installed under `/tmp`, outside `package.json`), driven by
  `playwright-core` 1.63.0.
- Accessibility rules: `axe-core` 4.14.0, the repository's devDependency.
- Servers: production builds of both trees under `next start` on loopback.
  Baseline and updated were measured in the same session with the same
  scripts.

**a) Marketing shell, axe and motion.** Source:
`scripts/verify-marketing-consistency.mjs`, phases `shell,axe,motion`, run on
all eight routes at the seven requested widths (320, 375, 390, 768, 1024,
1200, 1440), light and dark.

| Check | Baseline | Updated |
| --- | --- | --- |
| Rows (8 routes × 7 widths × 2 themes) | 112 | 112 |
| Horizontal overflow | 0 | **0** |
| Header and footer rendered | 112 / 112 | **112 / 112** |
| Tap targets < 44 px | 0 | **0** |
| Header theme toggle switches (≥ 1024 px) | 48 / 48 | **48 / 48** |
| First Tab lands on the skip link, every stop visibly focused | 112 / 112 | **112 / 112** |
| Page errors | 0 | **0** |
| axe runs (320 / 768 / 1440 × light / dark; WCAG 2.1/2.2 A, AA, best practice) | 48 | 48 |
| axe violations | 0 | **0** |
| axe "needs review" | colour-contrast, 628 nodes | identical |
| Reduced motion: running animations / hidden bands | 0 / 0 | **0 / 0** |
| No JavaScript: h1 present; text length per route | 8 / 8; — | **8 / 8; identical** |
| Per-row differences, baseline vs updated | — | **0** |

Two `span.lm-pill-swap` elements on `/solutions` sit at opacity 0 without
JavaScript. They are the alternate text of the pill swap; they are identical
on both builds and already recorded in PR #65's `motion-final.json`.

**b) Console errors, mobile menu, theme at every width.** An ad-hoc script ran
8 routes × the 7 widths on each build: **56/56 clean on both**.
- 0 console errors, 0 page errors, 0 failed requests, and 0 HTTP errors.
- **Mobile menu** (320, 375, 390, 768 px): 32/32. It opens as a dialog with
  navigation links and focus inside, switches theme from inside, closes on
  Escape, and returns focus to its trigger.
- **Header theme toggle:** 48/48 from 375 px up. At 320 px the theme control
  is reached through the menu.

**c) Rendered equivalence.** An ad-hoc script compared 8 routes × {375,
1440} px with reduced motion: **16/16 pairs identical** on all three measures.
- DOM signature: tags, roles, labels, hrefs, alt text and text, excluding
  classes.
- Visible text.
- Full-page screenshots: **pixel-identical, 0 differing pixels**. The
  approved marketing design is unchanged.

**d) Whole app, including the signed-in workspace.** Source:
`scripts/verify-responsive.mjs` with `RUN_INTERACT=1 RUN_DIALOG=1`, at its
fixed widths (320, 375, 414, 600, 768, 1024, 1440).
- **Coverage:** 57 pages × 7 widths = 399 page renders, plus 16 dialog and
  interaction steps (415 result rows in total).
- **Results, on both builds:** 392 page renders pass and 7 are findings; all
  16 steps pass.
- **0 per-row differences** across all 415 rows, in overflow, offending
  elements, cut-offs, fixed elements escaping the viewport, tap targets and
  page errors.
- The 2 dialog probes and 14 interaction steps pass identically. The
  interactions cover the timer pill and stop form, select popover, team
  confirm, mobile drawer, and checkout-return banners.
- **The 7 findings are pre-existing and identical on `85f94da`.** The
  marketing-home hero section clips decorative content wider than the
  viewport inside `overflow-hidden`, and the harness counts that as cut-off
  text. Page-level horizontal overflow is 0.

### 10.8 LCP results

**Why all eight routes.** The React runtime vendored inside `next` changed
(§10.4). The task's rule is to expand LCP testing to every marketing route if
rendering or hydration changed. So the PR #53 suite ran on all eight marketing
routes, not only `/` and `/solutions`.

**PerformanceObserver suite (primary).**

*Source.* `scripts/verify-marketing-consistency.mjs PHASES=lcp RUNS=3`, which
implements the four PR #53 scenarios:

| Scenario | Viewport | Conditions |
| --- | --- | --- |
| A | mobile 412×823 @1.75 DPR | unthrottled |
| B | mobile 412×823 @1.75 DPR | 4× CPU throttle (CDP), network unthrottled |
| C | desktop 1440×900 @1 DPR | unthrottled |
| D | mobile 412×823 @1.75 DPR | `prefers-reduced-motion: reduce` |

*Measurement.*
- Every run uses a fresh browser context.
- LCP is the last `largest-contentful-paint` entry. CLS is the sum of
  `layout-shift` entries without recent input.
- Passes were interleaved: updated → baseline → baseline → updated.
- That gives **6 runs per route × scenario × build**: 384 page loads in total.

*Environment.* Chromium 153.0.8010.0 headless; production `next start` on
loopback; 2-vCPU sandbox.

Median LCP in ms, shown as **updated / baseline** (6 runs each):

| Route | A mobile | B mobile 4× CPU | C desktop | D reduced motion | LCP element (same on both builds) |
| --- | --- | --- | --- | --- | --- |
| `/` | 180 / 184 | 332 / 362 | 286 / 380 | 254 / 234 | `p.lm-hero-in` (hero lead) |
| `/features` | 132 / 128 | 278 / 268 | 148 / 160 | 126 / 124 | `p.lm-hero-in` |
| `/solutions` | 122 / 122 | 256 / 238 | 136 / 130 | 122 / 122 | `p.lm-hero-in` |
| `/integrations` | 126 / 122 | 224 / 256 | 138 / 130 | 118 / 118 | `p.lm-hero-in` |
| `/pricing` | 110 / 108 | 224 / 244 | 128 / 128 | 116 / 112 | `h1.lm-hero-in` |
| `/changelog` | 116 / 118 | 222 / 230 | 126 / 132 | 124 / 118 | `p.lm-hero-in` / `p.text-lm-16-5`, varying by scenario |
| `/about` | 102 / 112 | 212 / 196 | 114 / 116 | 104 / 108 | intro `p.max-w-xl` |
| `/vs` | 112 / 110 | 208 / 194 | 120 / 126 | 112 / 108 | limits note `p.rounded-md` |

- **Target met everywhere.** All 384 runs are under 2,500 ms on both builds.
  The worst single run is 428 ms on both builds, on `/`.
- **No regression.** The medians move both ways by amounts within run-to-run
  spread. Full ranges are in `lcp-ab.json`.
- **Valid LCP candidates.** Each route × scenario has the same LCP element on
  both builds. Every candidate is real text content, at `opacity: 1` at first
  paint.
- **No errors.** 0 errored runs and 0 page errors.
- **CLS.** It is ≤ 0.004 in every run on seven of the eight routes.
  - `/` shows intermittent single-run shifts on **both** builds, mostly under
    4× CPU.
  - Scenario B: non-zero in 3 of 6 runs on each build. Worst run: 0.2792
    updated vs 0.3622 baseline. Median: 0.062 vs 0.038.
  - Scenario D: the baseline had one run at 0.2695.
  - This predates the change. PR #65's own `lcp-final.json` has 0.136 (B) and
    0.2955 (D) on `/`, and `docs/PERF_PR54_VS_PR59_LIGHTHOUSE.md` recorded
    0.134.

**Homepage CLS: a larger sample and its source.** In the first sample,
scenario B shifted more often on the updated build (6 vs 2 of 16 runs above
0.1). That difference was checked, not assumed away. Both follow-ups below
were interleaved.

1. **Ten more runs per scenario per build** (16 in total for each):
   - Scenario B: CLS above 0.1 in 6/16 (updated) vs 2/16 (baseline). Worst
     run: 0.280 vs 0.362.
   - Scenarios A and D: only the baseline shifted (1 and 2 runs).
   - Scenario C: ≤ 0.037 on both.
   - Across all 64 homepage runs per build: 6 vs 5 runs above 0.1.
   - LCP stayed far under budget: worst run 452 ms (updated) vs 620 ms
     (baseline).
2. **Shift sources,** recorded under exactly the harness's scenario B
   conditions:
   - Conditions: a 412×823 @1.75 viewport without `isMobile`, 4× CPU, and
     `load` + 1,200 ms; 12 runs per build.
   - Runs with a shift: 2/12 updated vs 4/12 baseline.
   - **The shifting nodes are identical on both builds:** the hero's
     decorative background layer, `div.lm-bloom-a.lm-drift` and
     `div.lm-bloom-b.lm-drift`, inside the `pointer-events-none absolute`
     wrapper.
   - At about 350–400 ms, bloom-b moves down 40 px and bloom-a's height drops
     from about 329 px to 182 px.

**Pooled scenario B, 28 runs per build:**
- CLS above 0.1 in 7 (updated) vs 5 (baseline) runs: Fisher exact,
  two-sided, p = 0.75.
- CLS above 0.01 in 10 vs 9 runs: p = 1.0.

There is no evidence of a difference between the builds. The shift is a
property of the approved hero decoration and predates this change. Fixing it
would be a marketing-design change, so it is left for a separate task.

**Lighthouse (secondary, lab).**

*Setup.*
- Harness: `scripts/perf/lighthouse-compare.mjs`, as described in
  `scripts/perf/README.md`.
- Lighthouse 13.5.0 and Chromium 153.0.8010.0, installed under `/tmp`, outside
  `package.json`.
- Standard launch flags (no `--single-process`), on `/` and `/solutions`.
- 3 runs per route × profile × build, interleaved A,B / B,A.

*Profiles:*
- `std-mobile`: stock Lighthouse mobile, simulated 150 ms RTT, ~1.6 Mbps, 4×
  CPU.
- `std-desktop`: stock Lighthouse desktop.
- `pr54-unthrottled`: no throttling, mobile viewport.
- `pr54-cpu4`: 4× CPU, network unthrottled.

*Host.* CPU calibration median 476 ms; 48/48 runs succeeded.

Median, with (min–max). A = baseline 16.3.6, B = updated 16.4.3:

| Route | Profile | Score A | Score B | LCP A (ms) | LCP B (ms) | TBT A (ms) | TBT B (ms) | CLS (worst run) A / B |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | std-mobile | 92 (89–92) | 93 (93–94) | 3,001 (2,996–3,115) | 2,870 (2,427–3,006) | 200 (176–252) | 177 (144–208) | 0 / 0 |
| `/` | std-desktop | 100 | 100 | 639 (622–680) | 666 (639–675) | 23 (19–23) | 6 (0–12) | 0.004 / 0 |
| `/` | pr54-unthrottled | 100 (95–100) | 100 | 252 (234–265) | 233 (217–317) | 0 | 0 | 0.136 / 0 |
| `/` | pr54-cpu4 | 96 (82–97) | 96 (95–97) | 482 (330–515) | 464 (439–528) | 223 (200–224) | 220 (204–260) | 0.286 / 0 |
| `/solutions` | std-mobile | 96 (94–97) | 96 (94–97) | 2,483 (2,475–3,002) | 2,422 (2,415–3,131) | 84 (81–126) | 84 (64–167) | 0 / 0 |
| `/solutions` | std-desktop | 100 | 100 | 646 (631–651) | 647 (644–653) | 0 | 0 | 0 / 0 |
| `/solutions` | pr54-unthrottled | 100 | 100 | 191 (181–194) | 185 (170–236) | 0 | 0 | 0 / 0 |
| `/solutions` | pr54-cpu4 | 99 (98–99) | 98 (98–99) | 408 (264–443) | 428 (256–466) | 112 (104–170) | 168 (107–178) | 0 / 0 |

- **No regression.** Every A/B difference is within the A and B ranges and
  goes both ways.
  - Example: `/solutions` pr54-cpu4 TBT is 112 (104–170) vs 168 (107–178) ms.
  - Scores agree within one point.
  - The LCP element is the same selector on both builds
    (`p.lm-hero-in`, the hero lead).
  - Page weight is about 200 bytes *lower* on 16.4.3, from the shorter font
    class names.
- **The 2.5 s target and Lighthouse's stock mobile profile.**
  - The PR #53 scenarios (`pr54-unthrottled`, `pr54-cpu4`) and `std-desktop`
    stay far under 2.5 s on both builds.
  - Under **stock simulated mobile** (slow 4G plus 4× CPU), `/` measures about
    3.0 s on **both** builds, with B's median slightly lower.
  - That matches what this repository recorded before this change:
    `docs/PERF_PR54_VS_PR59_LIGHTHOUSE.md` shows 2,973 and 3,002 ms for PR #54
    and PR #59. It is a property of the page under a simulated slow network,
    not a regression.
  - `/solutions` sits at about 2.4–2.5 s on that profile.
  - Improving it would mean changing the marketing page, which is out of scope
    for security maintenance.
- **CLS.** Lighthouse also caught the intermittent homepage shift, on the
  **baseline** (0.136 and 0.286 in single runs). The updated build scored 0
  in all 24 of its Lighthouse runs.

### 10.9 Evidence index (`docs/evidence/dependency-security/`)

| File | Content |
| --- | --- |
| `npm-audit-before.json` / `npm-audit-after.json` | raw `npm audit --json`, before and after |
| `npm-audit-projected-next-16.4.{3,1}.json`, `lockfile-delta-projected-next-16.4.3.txt` | Checkpoint-2 dry-run (the applied result is byte-identical to the 16.4.3 projection) |
| `postcss-selector-parser-6.1.5-backport-benchmark.txt`, `postcss-selector-parser-bench.cjs` | GHSA-rj75 fix benchmark |
| `automated-gates.txt` | Phase 4 gates, baseline vs updated |
| `auth-payment-flows.json` | §10.6 auth flows (40 checks) and Live-Mode gate (3 checks), both builds |
| `invite-email-smtp.json` | §10.6 `nodemailer` send path, both trees |
| `marketing-browser-ab.json` | §10.7 a–c: shell, axe and motion summaries with the per-row diff; supplement; rendered equivalence |
| `responsive-harness-ab.json` | §10.7 d: `verify:responsive`, baseline vs updated |
| `lcp-ab.json`, `lighthouse-ab.json` | §10.8 |
| `ghsa-rj75-verification.json` | §12.1: official advisory record, upstream fix comparison, artifact verification, proof of concept, pending correction |
| `next-16.4.1-rollback-verification.json` | §12.2: advisory evaluation per version, rollback rehearsal, gates, runtime proxy checks |

The ad-hoc scripts (auth flows, mail check, supplement, equivalence, LCP merge)
lived under `/tmp` and are deliberately **not** committed; this task's diff is
limited to dependencies and documentation. Their method is described in each
section above. The repository scripts are reproducible as-is:
- `scripts/verify-marketing-consistency.mjs`
- `scripts/verify-responsive.mjs`
- `scripts/perf/lighthouse-compare.mjs`
- `npm run verify:db` and `npm run verify:pdf`

## 11. Rollback instructions

Re-verified in the final checks (§12.2). The rule is: **never go below
`next@16.4.1`**. Every 16.x release up to 16.4.0 is affected by both critical
advisories (GHSA-2464, GHSA-673q) and by GHSA-p3m5, which is reachable in
Roducq.

**Before merge.** Close the pull request. `main` is untouched.

**If 16.4.3 misbehaves after merge — preferred: roll back `next` only.**

```bash
npm install next@16.4.1
```

- **Rehearsed** on a copy of this branch. Only `next`, `@next/env` and the
  eight `@next/swc-*` binaries change (10 lockfile entries); `sharp` 0.35.5 and
  every other fix stay in place.
- **Result:**
  - `npm audit` stays at 0 critical / 0 high (4 moderate, GHSA-rj75).
  - Tests 1243/1243; `tsc` and lint clean.
  - Build 45/45, with an identical route table.
  - 37/37 runtime proxy checks, identical to 16.4.3.
- **Intermediate option:** `16.4.2` (also 0 advisories), if the regression
  comes from 16.4.3's backports. It was not rehearsed, so run the same gates
  first.
- **Pinning:** to stop a later `npm install` from floating back to the release
  you are avoiding, pin exactly (`npm install --save-exact next@16.4.1`).
  Remove the pin once the regression is fixed upstream, because an exact pin
  also blocks future security patches.

**After an operator deploy (production).**
- Do **not** use Vercel *Instant Rollback* to deployment `7328221703`, or to
  any other deployment built from `85f94da`. Those run `next@16.3.6` and
  re-expose both critical advisories. Ship the 16.4.1 change through a normal
  PR and deploy instead.
- Instant Rollback is acceptable only as a short emergency measure, for
  example while the site is down. If you use it, deploy the 16.4.1 fix
  immediately afterwards.

**Full rollback (not recommended).**
- `git revert 973fe84`, or
  `git checkout 85f94da -- package.json package-lock.json && npm ci`, restores
  all 11 vulnerable packages (1 critical, 3 high).
- Use it only as an explicit, time-boxed risk acceptance.
- Afterwards, confirm: `npm test` shows 1243/1243, `npm run build` succeeds,
  and `npm audit` reports 11.

**Partial rollback of a transitive fix.**
- Each transitive fix can be undone on its own with
  `npm install <pkg>@<old version>`. Each one reintroduces only that package's
  advisories (§10.1).
- `nodemailer` 10.1.4 → 10.0.10 reintroduces 3 moderate advisories, and also
  needs `smtp-server` 3.19.13.

## 12. Final security checks (2026-10-26)

Two follow-up checks were requested after the PR opened. No dependency was
changed, and every experiment ran in throwaway copies under `/tmp`.

### 12.1 GHSA-rj75: is the installed `postcss-selector-parser@6.1.5` genuinely patched?

**Answer: yes, in code and in behaviour. The official advisory record has not
caught up yet.**

| Evidence | Finding |
| --- | --- |
| Official advisory (GHSA-rj75-hqrm-r3gf / CVE-2026-104844, medium, CVSS 5.9) | Affected `< 7.1.6`; first patched in 7.1.6. Last updated 2026-10-05, two weeks **before** 6.1.5 existed. Its OSV record in `github/advisory-database` has a single range (introduced 0, fixed 7.1.6) and has never been edited. |
| Upstream release | 6.1.5 (2026-10-19), published by the maintainer: "fix … (GHSA-rj75-hqrm-r3gf) backported from 7.1.6 … **6.1.5 is the patched version for the 6.x line**." It is published under the `legacy-v6` npm dist-tag. |
| Code | The backport commit `70b0779c` (PR #346, merged by the maintainer into `6.x.x`) was compared with the official fix `62b19179`. After normalising quotes, whitespace and comments, their 12 changed code lines in `src/parser.js` are **identical**. They cover all three passes the advisory names: `uniqs()`, the Sass-interpolation filter, and the `indices.forEach` membership tests. |
| Installed artifact | One copy (under `tailwindcss` 3.4.19, deduplicated under `postcss-nested`). The lockfile integrity equals the registry's, and both npm registry ECDSA signatures over it verify. A fresh tarball hashes to the same sha512, and the installed directory is byte-identical to it (37 files). The registry's `gitHead` is `d90b6e38`, the 6.1.5 release commit, whose parent is the backport. The compiled `dist/parser.js` contains the three `Set`-based fixes, while 6.1.4's still has the `indexOf` scans. No npm provenance attestation was published for 6.1.5. |
| Proof of concept | Upstream's own regression-test method: the hostile-vs-benign parse-time ratio at N = 60,000, where healthy is < 2 (table below). The advisory's 400 KB headline payload takes **40.7 s** on 6.1.4 vs **256 ms** on the installed 6.1.5 (245 ms on 7.1.6). |
| Behaviour | All 1,539 distinct selectors in this repository's Tailwind output parse to identical ASTs and output on 6.1.4 and 6.1.5. |
| Reachability in Roducq | The advisory says: "Ordinary build-time use on trusted sources is not affected." Roducq parses only its own CSS, at build time. |

| Build | `.a` ratio | `#a` ratio | `#{a}` ratio | Upstream threshold (< 2) |
| --- | --- | --- | --- | --- |
| 6.1.4 (vulnerable) | 18.48 | 17.75 | 9.17 | fail |
| **6.1.5 (installed)** | **0.36** | **0.24** | **0.06** | **pass** |
| 7.1.5 (vulnerable) | 15.38 | 17.96 | 8.14 | fail |
| 7.1.6 (official fix) | 0.25 | 0.20 | 0.06 | pass |

Hostile-payload parse times at N = 60,000:
- 6.1.4: about 3.6 s for classes and ids, 1.8 s for interpolations.
- Installed 6.1.5: 73 ms, 47 ms and 13 ms.

All four builds pass upstream's correctness assertions.

**Why `npm audit` still flags it.** `npm audit` reads the GitHub advisory
range, and that range predates the backport.
- **The correction:** on 2026-10-20 the package maintainer filed
  **github/advisory-database#10456** to split the range into `0 → 6.1.5` and
  `7.0.0 → 7.1.6`. The maintainer (@MoOx) authored the original fix and
  published both releases. The PR is open, awaiting GitHub's review.
- **Duplicates:** three duplicate community PRs exist. #10457 is open.
  #10481 and #10676 were closed by their own authors after the maintainer
  asked them to close the duplicates; GitHub did not reject them.
- **After it is applied:** this advisory should drop out of `npm audit` for
  this tree. Re-run it then.

Evidence: `ghsa-rj75-verification.json`.

### 12.2 Is `next@16.4.1` a safe rollback target?

**Answer: yes. It fixes every relevant critical and high advisory, and a
next-only rollback was rehearsed end to end.**

| Evidence | Finding |
| --- | --- |
| GitHub Advisory Database | All 77 advisories that list `next` (none withdrawn), with ranges evaluated using npm's `semver`. 16.3.6 is affected by 10 (2 critical, 2 high); **16.4.1, 16.4.2 and 16.4.3 by none**. The API's own `affects=next@<version>` filter agrees (10 / 0 / 0). |
| Critical and high on 16.x | GHSA-673q-mjm6-r5xr and GHSA-2464-fhr4-w9xw (critical) and GHSA-p3m5-59mp-jv5r (high) affect `>= 16.0.0, <= 16.4.0` and are patched in **16.4.1**. GHSA-cjq9-62q9-8jv4 (high) affects `< 16.3.8`. |
| Release notes | v16.4.1 is the security release for exactly those three advisories. v16.4.2 and v16.4.3 are bug-fix backports with no advisories, so 16.4.1 misses no security fix. |
| Transitive | `next@16.4.1` requires `sharp ^0.35.5`, as 16.4.3 does (16.3.6 allowed `^0.35.4`). So a rollback cannot fall back to sharp 0.35.4 (GHSA-wq5f, high). Its other dependencies are identical to 16.4.3's, and it vendors the **same** React build (`19.3.0-canary-278794d7-20261002`). |
| Rehearsal (copy of PR head `90053fe`, then `npm install next@16.4.1`) | `package.json`: only `next` changes, to `^16.4.1`. Lockfile: 10 entries change (`next`, `@next/env`, 8 × `@next/swc-*`), 0 added, 0 removed. Kept: sharp 0.35.5, nodemailer 10.1.4, zod 4.6.7, source-map-js 1.2.2, fast-uri 3.1.9, postcss-selector-parser 6.1.5. `npm audit`: **0 critical, 0 high**, 4 moderate (GHSA-rj75), identical to this PR. |
| Gates on the rehearsal | `npm test` 1243/1243 (0 skipped), `tsc` clean, lint clean, build ✓ 45/45. The route table is identical to 16.4.3's. |
| Runtime (`proxy.ts`), 16.4.1 vs 16.4.3 | 37/37 checks on each, identical details, no unexpected server errors. Signed out: 13 protected routes → 307 `/login`, and 13 public routes → 200. With a session, which the proxy verified against the Supabase stub: the auth pages redirect to `/intake`, and `/` is rewritten into the app. The `/share/*` rate limiter returns 429 on request 31. Security headers are present, and the image-optimiser probes are unchanged. |

**Correction to §8.1.** The 16.4.3 `proxy.ts` change (#100423, a backport of
#100384) is a cold-start optimisation, not a correctness fix.
- It stops the proxy loading the 688 KB app-page runtime. On a minimal proxy
  the cold path goes from 53.8 ms to 39.1 ms.
- 16.4.1 runs Roducq's proxy correctly, as the runtime checks above show.

**Unsafe "rollbacks".** Each of these returns to `next@16.3.6` and re-exposes
both critical advisories and the reachable high one:
- anything below 16.4.1 on the 16.x line;
- `git revert 973fe84`;
- restoring `85f94da`'s package files;
- Vercel Instant Rollback to a deployment built from `85f94da`.

§11 now lists the safe procedure first.

Evidence: `next-16.4.1-rollback-verification.json`.
