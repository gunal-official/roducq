# Lighthouse performance score — PR #54 vs PR #59

Investigation record for the reported performance-score discrepancy between
**PR #54** ("Audit Forma spec and add footer back-to-top link", merge commit
`3315a1fc`) and **PR #59** ("Final Solutions page refinement and regression
verification", merge commit `d2266eb`).

Run date: **2026-10-25** (UTC). Everything below was measured on one machine,
in one session, with one browser binary and one Lighthouse version.

**Nothing in the application was changed by this investigation.** No page was
redesigned, no animation was touched, no production behaviour was altered, and
nothing was deployed.

---

## 1. Verdict

**No genuine performance regression is demonstrated, and the scored gap between
the two PRs is a measurement-conditions artefact, not a code change.**

1. On the same machine, under the same browser, Lighthouse version, viewport,
   CPU and network profile, **the PR #54 build and the PR #59 build produce the
   same scores** on `/` — the only route the two PRs share. On the profile PR #54
   recorded its 100s under, *both* builds score **100 (100–100 over 5 runs each)**.
2. PR #54's recorded pattern — **100** for scenarios A, C and D and **94–99**
   for the 4× CPU scenario B — **reproduces exactly here on the PR #59 build**.
   PR #54's numbers were therefore not a property of PR #54's code.
3. PR #59's own recorded scores (§5.4 of `docs/FORMA_SOLUTIONS_FINAL_VERIFICATION.md`:
   76–84 mobile, 64–70 desktop) **do not reproduce on either build** in this
   session under any pinned profile. They are consistent with **host CPU
   contention in that sandbox**, which is reproducible here: with six busy-loop
   processes on the same 2-vCPU host, the *same unmodified code* scored 66–73
   under stock Lighthouse mobile throttling, and an identical-build A/A control
   produced a 19-point swing (76 vs 95).
4. Metric by metric, no PR #54 → PR #59 difference survives the noise floor:
   every comparison in §6 has a permutation-test p ≥ 0.24, and the spread
   *inside one build* is larger than the difference *between builds*.

Two facts bound the question, and both matter:

- **`/solutions` did not exist in PR #54.** The route was created by PR #55
  (`0e71789`). A request to `/solutions` against the PR #54 build returns **404**
  (verified). Any "PR #54 vs PR #59" comparison of the Solutions page is
  comparing a page with no page.
- PR #54's Lighthouse numbers were recorded on **`/`**, the landing page, as part
  of re-running PR #53's four LCP scenarios. `/` is the only route where a
  like-for-like comparison exists, and that is what §5–§7 measure.

---

## 2. What each PR actually recorded

| | PR #54 (merge `3315a1fc`, 2026-10-18) | PR #59 (merge `d2266eb`, 2026-10-19) |
| --- | --- | --- |
| Route measured | `/` (PR #53 scenarios A–D) | `/solutions` and `/` |
| Lighthouse | 13.5.0 | 13.5.0 |
| Browser | Chromium 153.0.8010.0 (`@sparticuz/chromium` 153.0.0) | same |
| Profile as recorded | mobile 412×823 @1.75 DPR, animations on; **unthrottled** (A, C, D) and **4× CPU, network unthrottled** (B) | mobile/desktop, `throttling: "provided"`, `cpu: 1` (per `docs/evidence/solutions-final/lcp-results.json`) |
| Score recorded | **100 / 100 / 100** (A, C, D); **99 / 96 / 94** (B) | **76–84** mobile, **64–70** desktop |
| Lighthouse LCP recorded | A 234.5 ms, B 450 ms, C 323 ms, D 239 ms | `/solutions` A 186 ms, B 177 ms, C 218 ms |
| Runner | not committed | not committed (`lcp-run.mjs`, kept outside the tree) |

Both PRs' score columns were produced by uncommitted ad-hoc runners, and
neither document pins the browser launch flags, the host load, or Lighthouse's
resolve-the-config-side effects. That is the gap this investigation closes.

PR #59 was honest about this. §5.4 of its verification doc says the category
scores are "**not a pass or fail**", that the cause was not isolated, and that
"running the same Lighthouse profile on the `fd1a573`-era build and the current
build, on the same machine, is the follow-up that would settle it." That is
exactly the experiment in §5 below, extended back to PR #54's build because that
is the build whose 100s are being compared against.

---

## 3. Method — conditions pinned for both builds

| Condition | Value |
| --- | --- |
| Host | Debian 12, 2 vCPU (Intel Xeon @ 2.60 GHz), 3 GB RAM, otherwise idle |
| Host calibration | fixed 3×10⁷-iteration JS workload: 459.4 ms median (447.3 / 459.4 / 460.8) |
| Node / Next | Node 22.22.3, Next.js 16.3.6 (`npm run build` in both trees) |
| Lighthouse | **13.5.0**, same installed copy for every run |
| Browser | **one binary**, Chromium 153.0.8010.0 (`@sparticuz/chromium` 153.0.0, `LD_LIBRARY_PATH` from its `al2023` archive) |
| Launch flags | one fixed list, identical for A and B (see §8 for the excluded `--single-process` set) |
| Viewport / DPR | emulated by Lighthouse per profile: mobile 412×823 @1.75, desktop 1350×940 @1 |
| Order | runs interleaved A,B then B,A — machine drift hits both builds equally |
| Runs | 5 per cell for the main comparison; 3 per cell for the controls |
| Server | both builds served by `next start` on `127.0.0.1`, one port each, local, no proxy |

Builds were produced from clean exports of the two merge commits
(`git archive 3315a1fc` and `git archive d2266eb`). Both trees have a
**byte-identical `package-lock.json`** (verified), so the same `node_modules`
was installed once with `npm ci` and hardlinked into the second tree; both were
then built with `npm run build` on this machine, sequentially.

### Profiles

| Name | Lighthouse throttling | Viewport | Purpose |
| --- | --- | --- | --- |
| `pr54-unthrottled` | `provided` — no network model, no CPU slowdown | mobile 412×823 @1.75 | PR #54 scenario A / D, and the profile PR #59 recorded |
| `pr54-cpu4` | `devtools`, 4× CPU, network unthrottled | mobile 412×823 @1.75 | PR #54 scenario B |
| `std-mobile` | stock Lighthouse 13 mobile (`simulate`: 150 ms RTT, ~1.6 Mbps, 4× CPU) | mobile 412×823 @1.75 | what "Lighthouse score" means by default |
| `std-desktop` | stock Lighthouse 13 desktop preset | desktop 1350×940 @1 | desktop comparison |

Harness: `scripts/perf/lighthouse-compare.mjs` (no application dependency;
Lighthouse and Chromium are installed outside `package.json`). Raw output for
every phase is in `docs/evidence/perf-pr54-vs-pr59/`.

---

## 4. Scores and Core Web Vitals — `/`, PR #54 build (A) vs PR #59 build (B)

Five runs per cell, interleaved. Medians; "(min–max)" is the observed range
inside that cell.

| Profile | Build | **Performance** | FCP (ms) | LCP (ms) | Speed Index (ms) | TBT (ms) | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pr54-unthrottled` | A (#54) | **100** (100–100) | 221 | 221 | 393 | 0 | 0 |
| `pr54-unthrottled` | B (#59) | **100** (100–100) | 198 | 198 | 364 | 0 | 0 |
| `pr54-cpu4` | A (#54) | **98** (96–99) | 405 | 405 | 561 | 163 | 0 |
| `pr54-cpu4` | B (#59) | **98** (94–99) | 341 | 341 | 518 | 139 | 0 |
| `std-desktop` | A (#54) | **100** (100–100) | 301 | 715 | 523 | 2 | 0 |
| `std-desktop` | B (#59) | **100** (100–100) | 301 | 679 | 488 | 2 | 0 |
| `std-mobile` | A (#54) | **95** (76–97) | 1,068 | 2,973 | 1,231 | 76 | 0 |
| `std-mobile` | B (#59) | **93** (92–97) | 1,071 | 3,002 | 1,071 | 122 | 0 |

Reading this table:

- **Under PR #54's own recorded profile, both builds score a flat 100.** PR #54's
  "100s" are not evidence of a faster build; they are what this unthrottled
  profile yields whenever the host is idle. Two of its three 100s (A, C, D) are
  reproduced by *both* trees, 5 runs out of 5.
- **PR #54's 4× CPU scenario reproduces too** — 96–99 (#54) and 94–99 (#59),
  against the 99/96/94 it recorded.
- Under **stock Lighthouse mobile throttling** — a condition neither PR used —
  the builds land at 95 and 93, a 2-point difference with a 21-point within-build
  range and, per §6, p ≈ 0.7.
- CLS is 0 in 38 of the 40 phase-1 runs. Two runs spiked: 0.355 on **A**
  (`std-mobile` run 3 → score 76) and 0.134 on **B** (`pr54-cpu4` run 3 → score 94).
  Occasional CLS spikes therefore happen on the *baseline* build too (§5).

### 4.1 The LCP element is the same on both builds

Lighthouse 13.5 reports the LCP element through `lcp-breakdown-insight`. In every
run where the harness captured it (48 runs across phases 3–5, both routes, both
builds) the element was the **hero lead paragraph**, `p.lm-hero-in`:

| Route | Selector | Runs |
| --- | --- | --- |
| `/` | `section.relative > div.lm-shell > div.mx-auto > p.lm-hero-in` | 36 |
| `/solutions` | `section.bg-lm-card > div.lm-shell > div.mx-auto > p.lm-hero-in` | 12 |

That is the element PR #53 fixed and PR #54 re-verified (37,536 px² mobile /
52,456 px² desktop). Its typical breakdown under PR #54's profile is TTFB ≈ 15 ms,
element render delay ≈ 188 ms. The LCP *mechanism* — the clip-path reveal that
keeps the paragraph registered as a candidate at first paint — therefore still
works identically in both builds.

(The element field is absent from the phase-1 and phase-2 evidence files: the
harness's extractor was corrected part-way through the session. The metric values
in those files do not depend on it.)

---

## 5. Controls — how much of this is just Lighthouse?

### 5.1 A/A identity control: the same tree measured as "build A" and "build B"

Both sides pointed at the **identical** PR #59 tree and server, three runs per
cell, plus `/solutions` (which exists only in this tree).

| Route | Profile | Side A | Side B |
| --- | --- | --- | --- |
| `/` | `pr54-unthrottled` | 100, 100, 100 | 100, 100, 100 |
| `/` | `std-mobile` | 92, 95, 95 (median 95) | 94, 94, **76** (median 94) |
| `/solutions` | `pr54-unthrottled` | 100, 100, 100 | 100, 100, 100 |
| `/solutions` | `std-mobile` | 97, 94, 94 (median 94) | 95, 94, 95 (median 95) |

**The same code, same server, same profile, same session produced a 19-point
difference (76 vs 95).** The 76 run is the one carrying CLS 0.36 — a late layout
shift Lighthouse sometimes catches and sometimes does not. The score band that
PR #59 reported (76–84) sits entirely inside this self-inflicted spread.

### 5.2 Host contention: the reproduction of "low score, normal LCP"

Because PR #59 measured while its own Python/Chromium jobs, two Next servers and
`next build` were alive on a 2-vCPU box, host load is the obvious suspect for
"LCP is in the same range, but the scores are much lower". Tested directly, with
the application code unchanged:

| Condition (same 2 vCPU host) | Profile | A (#54) scores | B (#59) scores | B TBT |
| --- | --- | --- | --- | --- |
| idle | `std-mobile` | 95 (median) | 93 (median) | 122 ms |
| 2 busy loops | `std-mobile` | 83, 87, 74 | 94, 81, 84 | 538 ms |
| 6 busy loops | `std-mobile` | 66, 69, 69 | 69, 71, 73 | 1,184 ms |

Two busy processes cost **10–15 points**; six cost **25–30 points**, with FCP
unchanged and LCP roughly unchanged — precisely the signature PR #59 saw
("LCP in the same range, but the cause has not been isolated"). Under
`pr54-unthrottled` the same contention barely moves the score (100 → 99), because
that profile has so much headroom that nothing crosses a scoring threshold —
which is also why that profile is a poor regression detector.

The task did not reproduce a *loading* condition where the `provided` profile
drops into the 70s; on this hardware it stays at 99–100 even at 3× CPU
oversubscription. That is worth stating plainly: **PR #59's exact 76–84 / 64–70
numbers were not reproduced under any pinned condition here, on either build.**
An unreproducible number cannot be attributed to a code change.

---

## 6. Metric-by-metric: is any difference real?

Two-sample permutation tests on the phase-1 paired runs (5 vs 5, 20,000
resamples; median difference). With this sample size they are indicative, not
decisive — which is itself the point.

| Metric | Profile | A median | B median | Δ (A−B) | p |
| --- | --- | --- | --- | --- | --- |
| Performance score | `std-mobile` | 95 | 93 | +2 | 0.71 |
| TBT | `std-mobile` | 75.5 ms | 122 ms | −46.5 ms | 0.24 |
| FCP | `std-mobile` | 1,068 ms | 1,071 ms | −2 ms | 0.57 |
| LCP | `std-mobile` | 2,973 ms | 3,002 ms | −29 ms | 0.72 |
| Speed Index | `std-mobile` | 1,231 ms | 1,071 ms | +160 ms | 0.39 |
| LCP | `pr54-unthrottled` | 221 ms | 198 ms | +23 ms | 0.43 |
| Speed Index | `pr54-unthrottled` | 393 ms | 364 ms | +29 ms | 0.29 |
| TBT | `pr54-cpu4` | 163 ms | 139 ms | +24 ms | 0.57 |
| Performance score | `pr54-cpu4` | 98 | 98 | 0 | 1.00 |

**No metric is separable.** TBT under `std-mobile` is the largest relative
difference (−46 ms), but the A/A control produced a 183 ms vs 88 ms TBT split
between two *identical* builds, and the A cell contains a single 40 ms run next
to a 199 ms run. It is noise, not a regression, and it runs in the direction
that *helps* PR #59's build as often as not.

---

## 7. Why there is no code-level mechanism for a regression on `/`

`/` is the only shared route, and the shared-code delta between the two commits
is small and measurable without a browser.

| Item | PR #54 build | PR #59 build | Δ |
| --- | --- | --- | --- |
| `/` HTML document bytes | 326,258 | 326,302 | +44 |
| `/` referenced CSS | 123,185 B | 136,244 B | **+13,059 B (+10.6 %)** |
| `/` referenced JS | 804,942 B | 808,439 B | +3,497 B (+0.4 %) |
| `/` Lighthouse total byte weight | 361,696 B | 364,812 B | +3,116 B (+0.9 %) |
| `/` class tokens in the served DOM | — | — | **no class added or removed** |
| `/solutions` (does not exist in #54) | 404 | 200: CSS 136,244 B + JS 824,487 B, LH byte weight 429,166 B | n/a |
| `app/(marketing)/landing.css` diff | — | +423 lines, **0 removed** | every pre-existing rule untouched |
| Main-thread work, `pr54-unthrottled` | 478.5 ms | 493.2 ms | +3 % (A/A control: 481–537 ms) |
| Bootup / script evaluation | 102 ms | 118 ms | noise-band |

The +13 KB of CSS is the Solutions page's own stylesheet, which is bundled into
the shared marketing CSS chunk, plus two scoped overrides the PR added for
accessibility (dark-mode closing-CTA contrast, reduced-motion headline state).
The +3.5 KB of JS is `ThemeIconToggle` and the two `lucide` icons it needs, pulled
in by the shared `SiteHeader`. The served DOM of `/` is class-for-class identical
between the two builds, so none of the new utilities are applied to it, and
`landing.css` only grew — no existing selector was edited, so no `/` rule can
have changed.

On the profile both PRs used, that delta is worth **0 points**. On stock mobile
throttling it is worth nothing measurable either (§6). It is documented here
because it is the only code-side difference on the shared route, not because it
is large enough to explain a 20-point gap.

---

## 8. A failed hypothesis worth recording: the earlier Chrome flags

Earlier verification drove this browser through `@sparticuz/chromium`'s own
recommended launch arguments. Reproducing that exactly here
(`FLAG_MODE=sparticuz`: `--single-process`, `--no-zygote`, `--in-process-gpu`) gives:

| Route | Profile | Score | Speed Index | TBT |
| --- | --- | --- | --- | --- |
| `/` | `pr54-unthrottled` | 98 (1 of 3 runs; the other 2 unscorable) | 395 / missing / missing | 0 |
| `/` | `std-mobile` | unscorable in all runs | missing | 0 |

`--single-process` collapses main-thread accounting: **10 of 12 runs produced no
Speed Index at all**, so Lighthouse could not compute a category score, and
**every** run reported TBT = 0 ms regardless of load. Those are not low scores,
they are invalid measurements, and they are the wrong explanation for PR #59's
numbers too — invalid runs report `null`, not `77`. The flags are therefore
excluded from the comparison and the exclusion is pinned in the harness.

The useful lesson is narrower and still real: **when the browser flags change,
the score moves by more than any code change under investigation.** Two archives
of "Lighthouse said X" are not comparable unless this list is identical.

---

## 9. Conclusions

1. **Not a code regression.** On `/`, the PR #54 and PR #59 builds are
   indistinguishable across FCP, LCP, Speed Index, TBT, CLS and the overall
   Performance score, on four pinned profiles, 40 paired runs. No metric reaches
   p < 0.24, and the between-build differences are smaller than the within-build
   spread of a single build.
2. **PR #54's 100s are reproducible — on both builds.** They are a property of an
   unthrottled profile on an idle host, not of PR #54's code. Both trees score
   100/100/100 there, and both reproduce the 94–99 pattern of the 4× CPU scenario.
3. **PR #59's 76–84 / 64–70 are not reproducible** on either build in any pinned
   condition, including 3× CPU oversubscription. The most likely explanation
   remains host contention during that session, which is demonstrably worth
   10–30 points on this hardware (§5.2), plus the fact that the runner behind
   those numbers was never committed.
4. **Lighthouse variability alone is large enough to explain the reported gap.**
   Same build, same session: 76 vs 95 on identical code. The A/A control is the
   single most important number in this document.
5. **Nothing should be changed in the app in response to this.** No regression was
   demonstrated, so per the brief, no design, animation or production behaviour
   is touched. The two candidate follow-ups — trimming the +13 KB shared CSS and
   investigating the occasional 0.35 CLS spike — are pre-existing/independent and
   are not justified by a PR #54 → PR #59 difference.

### Recommended handling of PR #59's §5.4

Replace the open item with something testable:

- State that PR #54's 100s and PR #59's 76–84 were produced by two different,
  uncommitted profiles on different hosts, and are not comparable.
- Record the reproducible result: `/` scores **100 (100–100)** on the
  `provided` mobile profile and **95/93 (std-mobile)** on both builds here, and
  `/solutions` scores **100** and **94–95** — i.e. the page is in the same band
  as the landing page.
- Adopt `scripts/perf/lighthouse-compare.mjs` (or the same pinned conditions) for
  any future score claim, and quote medians with min–max, never a single run.
- Keep the honest scope note: local lab numbers on a shared 2-vCPU sandbox, not
  field data.

---

## 10. Limitations

- **No field data.** These are lab measurements on a shared 2-vCPU container, not
  CrUX/RUM. They say "the two builds behave the same", not "users see 100".
- **n = 5 per cell** for the main comparison. The permutation tests are reported
  with that caveat; the A/A control and the contention experiments are what make
  the conclusion robust, not the p-values.
- **`/solutions` has no PR #54 counterpart** (404), so the page itself was only
  measured as build-vs-same-build and against `/` on the same build. It scores in
  the same band as `/`, which is all that can be claimed.
- **One browser, one platform.** Chromium 153 only; Safari and Firefox were not
  measured, and no real mobile device was used. Lighthouse's emulated mobile UA
  was not verifiable through this headless binary (UA reports `HeadlessChrome`).
- **PR #59's runner was never committed**, so its exact configuration can only be
  inferred from `docs/evidence/solutions-final/lcp-results.json`
  (`throttling: "provided"`, `cpu: 1`, `formFactor: "mobile"`). Its numbers were
  reproduced as closely as that record allows, and did not match.

---

## 11. Reproducing this

```bash
# 1. two clean trees, one dependency install (lockfiles are identical)
mkdir -p /tmp/perf/base /tmp/perf/head
git archive 3315a1fc | tar -x -C /tmp/perf/base     # PR #54 merge
git archive d2266eb | tar -x -C /tmp/perf/head     # PR #59 merge
(cd /tmp/perf/base && npm ci && npm run build)
cp -al /tmp/perf/base/node_modules /tmp/perf/head/node_modules
(cd /tmp/perf/head && npm run build)

# 2. tools, kept outside the app's package.json
mkdir -p /tmp/perf/tools && cd /tmp/perf/tools && npm init -y \
  && npm i --no-save lighthouse@13.5.0 @sparticuz/chromium@153.0.0
# extract the bundled Chromium + its al2023 libs (see scripts/perf/README.md)

# 3. serve both builds
(cd /tmp/perf/base && npx next start -H 127.0.0.1 -p 3101) &
(cd /tmp/perf/head && npx next start -H 127.0.0.1 -p 3102) &

# 4. measure, interleaved
cd /home/user/roducq
NODE_PATH=/tmp/perf/tools/node_modules CHROME_PATH=/tmp/chromium \
LD_LIBRARY_PATH=/tmp/al2023/lib:/tmp/swiftshader \
RUNS=5 ROUTES=/ PROFILES=std-mobile,std-desktop,pr54-unthrottled,pr54-cpu4 \
BUILD_A=/tmp/perf/base:http://127.0.0.1:3101 \
BUILD_B=/tmp/perf/head:http://127.0.0.1:3102 \
OUT=/tmp/perf/repro.json node scripts/perf/lighthouse-compare.mjs
```

Controls: `STRESS_CHILDREN=2|6` for the contention experiment;
`BUILD_A` and `BUILD_B` pointing at the same server for the A/A control;
`FLAG_MODE=sparticuz` to reproduce the invalid `--single-process` measurements.

Evidence files in `docs/evidence/perf-pr54-vs-pr59/`:

| File | Contents |
| --- | --- |
| `phase1-main.json` | `/`, #54 vs #59, 4 profiles × 5 runs |
| `phase2-sparticuz-flags.json` | `--single-process` control (invalid measurements) |
| `phase3-solutions-identity.json` | A/A identity control + `/` vs `/solutions` |
| `phase4-contention.json` | 2 busy loops |
| `phase5-heavy-contention.json` | 6 busy loops |

---

## 12. PR and deployment status

- **This investigation changed no application code.** The only files added are
  the harness (`scripts/perf/`), the evidence JSON and this document; a short
  cross-reference note was added to §5.4 of
  `docs/FORMA_SOLUTIONS_FINAL_VERIFICATION.md`.
- **PR #59 is already merged upstream.** Its merge commit `d2266eb`
  ("Merge pull request #59 …", `merged_at` 2026-10-25T23:29:04Z) is the tip of
  `main` and the base of this session's branch, so there is no open PR #59 left
  to keep open or to hold back. Nothing was re-opened, reverted or merged by this
  investigation, and **nothing was deployed**.
- No new pull request was opened from this branch: the brief asks for
  documentation and a determination, not a review request.
