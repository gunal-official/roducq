/**
 * Head-to-head Lighthouse comparison for two already-built Roducq trees.
 *
 * Written for the PR #54 vs PR #59 performance-score discrepancy.
 * It measures, it does not assert. Nothing here changes the app.
 *
 * WHAT IS PINNED (identical for both builds):
 *   - one Chrome binary            CHROME_PATH (same file for A and B)
 *   - one Lighthouse version       the one resolved next to this script
 *   - one launch flag set          LAUNCH_FLAGS below, verbatim, for A and B
 *   - one viewport + DPR           per profile, emulated through Lighthouse
 *   - one network/CPU profile      per profile (see PROFILES)
 *   - one run order                interleaved A,B,B,A,... so machine drift
 *                                  hits both builds equally
 *
 * WHAT IS RECORDED per run: performance score, FCP, LCP, Speed Index, TBT,
 * CLS, TTI, plus the diagnostic breakdown (main-thread work, JS bootup,
 * total byte weight, number of requests, LCP element) and the effective
 * config Lighthouse believed it ran (throttling, formFactor, UA).
 *
 * USAGE
 *   CHROME_PATH=/path/to/chromium \
 *   BUILD_A=/tmp/perf/base:http://127.0.0.1:3101 \
 *   BUILD_B=/tmp/perf/head:http://127.0.0.1:3102 \
 *   RUNS=5 node scripts/perf/lighthouse-compare.mjs
 *
 *   Optional:
 *     PROFILES=pr54-unthrottled,std-mobile   (default: all four)
 *     ROUTES=/,/solutions                    (default: /)
 *     OUT=docs/evidence/perf/x.json          (default: stdout only)
 *
 * Requires `lighthouse` and `chrome-launcher` to be resolvable from this
 * script's directory or from NODE_PATH. Neither is a dependency of the app;
 * install them outside package.json:
 *   mkdir -p /tmp/perf/tools && cd /tmp/perf/tools && npm init -y \
 *     && npm i --no-save lighthouse@13.5.0 @sparticuz/chromium@153.0.0
 *   NODE_PATH=/tmp/perf/tools/node_modules node scripts/perf/lighthouse-compare.mjs
 */

import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const require = createRequire(import.meta.url);
const lighthouse = require("lighthouse").default ?? require("lighthouse");
const chromeLauncher = require("chrome-launcher");

const RUNS = Number(process.env.RUNS || 5);
// Optional host-contention control: N busy-loop children alive for the whole
// measurement session. Used to show how sensitive the score is to a busy
// machine (the "measurement conditions" hypothesis).
const STRESS_CHILDREN = Number(process.env.STRESS_CHILDREN || 0);
const OUT = process.env.OUT || "";
const CHROME_PATH = process.env.CHROME_PATH || "";

// Parsed as "<tree path>:<base url>". The tree path is only used for
// bookkeeping (reporting the commit each build came from is the caller's job).
const parseBuild = (spec, label) => {
  if (!spec) throw new Error(`missing BUILD_${label} (expected "<path>:<url>")`);
  const at = spec.lastIndexOf("http");
  if (at < 0) throw new Error(`BUILD_${label} must end with a URL: ${spec}`);
  return {
    label,
    tree: spec.slice(0, at).replace(/:$/, ""),
    url: spec.slice(at).replace(/\/$/, ""),
  };
};

const BUILDS = [
  parseBuild(process.env.BUILD_A, "A"),
  parseBuild(process.env.BUILD_B, "B"),
];

const ROUTES = (process.env.ROUTES || "/").split(",").filter(Boolean);

/**
 * The four measurement conditions. Two are stock Lighthouse so the numbers
 * mean what everybody expects; two reproduce the "provided throttling"
 * profiles PR #54 recorded its 100s under.
 */
const PROFILES = {
  // Lighthouse 13 defaults: simulated throttling (Moto-G-class: 150 ms RTT,
  // ~1.6 Mbps, 4x CPU), mobile 412x823 @1.75.
  "std-mobile": {
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttlingMethod: "simulate",
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562.5,
      downloadThroughputKbps: 1471.36,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4,
    },
  },
  // Same viewport, no network model, no CPU model.
  "std-desktop": {
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttlingMethod: "simulate",
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
  },
  // PR #54 scenario A as recorded in docs/FORMA_SPEC_CROSS_REFERENCE_AUDIT.md
  // and as reproduced in docs/evidence/solutions-final/lcp-results.json:
  // mobile viewport, device metrics only, no network throttle, no CPU throttle.
  "pr54-unthrottled": {
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttlingMethod: "provided",
    throttling: { rttMs: 0, throughputKbps: 0, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 1 },
  },
  // PR #54 scenario B: same, plus a 4x CPU slowdown applied through DevTools.
  "pr54-cpu4": {
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttlingMethod: "devtools",
    throttling: { rttMs: 0, throughputKbps: 0, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0, cpuSlowdownMultiplier: 4 },
  },
};

const selectedProfiles = (process.env.PROFILES || Object.keys(PROFILES).join(","))
  .split(",")
  .filter((p) => p in PROFILES);
if (!selectedProfiles.length) throw new Error("no valid PROFILES selected");

// Identical for every run of every build. Deliberately excludes --single-process
// and --in-process-gpu: both change main-thread accounting and therefore TBT.
const STANDARD_FLAGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--font-render-hinting=none",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=Translate,BackForwardCache",
];

// The launch flags @sparticuz/chromium documents for its bundled binary
// (the browser path earlier verification used). Kept as a separate mode
// because --single-process and --in-process-gpu materially change how
// main-thread work is scheduled and therefore TBT.
const SPARTICUZ_FLAGS = [
  ...STANDARD_FLAGS,
  "--single-process",
  "--no-zygote",
  "--in-process-gpu",
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "--disable-web-security",
  "--disable-site-isolation-trials",
  "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process,Translate,BackForwardCache",
];

const FLAG_MODE = process.env.FLAG_MODE || "standard";
const LAUNCH_FLAGS = FLAG_MODE === "sparticuz" ? SPARTICUZ_FLAGS : STANDARD_FLAGS;

const num = (audits, id) => {
  const a = audits[id];
  return a && typeof a.numericValue === "number" ? a.numericValue : null;
};

const lcpElement = (lhr) => {
  // Lighthouse 13.x: the insight is a list of two items — a table of subparts
  // (TTFB / render delay) and a node item carrying the selector.
  const items = lhr.audits["lcp-breakdown-insight"]?.details?.items ?? [];
  const nodeItem = items.find((i) => i && (i.selector || i.node));
  const node = nodeItem?.node ?? nodeItem ?? null;
  const table = items.find((i) => i && i.type === "table");
  const subparts = table?.items
    ? Object.fromEntries(table.items.map((row) => [row.subpart, row.duration]))
    : null;
  const legacy =
    lhr.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node ?? null;
  const resolved = node ?? legacy;
  if (!resolved && !subparts) return null;
  return {
    selector: resolved?.selector ?? null,
    nodeLabel: resolved?.nodeLabel ?? null,
    subparts,
  };
};

const median = (xs) => {
  const s = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const min = (xs) => (xs.length ? Math.min(...xs) : null);
const max = (xs) => (xs.length ? Math.max(...xs) : null);
const round = (x, d = 1) => (typeof x === "number" ? Number(x.toFixed(d)) : null);

const runOne = async (build, route, profileName) => {
  const profile = PROFILES[profileName];
  const url = `${build.url}${route}`;
  const chrome = await chromeLauncher.launch({
    chromePath: CHROME_PATH || undefined,
    chromeFlags: LAUNCH_FLAGS,
    logLevel: "silent",
  });
  try {
    const runnerResult = await lighthouse(
      url,
      {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance"],
        formFactor: profile.formFactor,
        screenEmulation: profile.screenEmulation,
        throttlingMethod: profile.throttlingMethod,
        throttling: profile.throttling,
        disableStorageReset: false,
        quiet: true,
      },
      {
        extends: "lighthouse:default",
        settings: {
          onlyCategories: ["performance"],
          formFactor: profile.formFactor,
          screenEmulation: profile.screenEmulation,
          throttlingMethod: profile.throttlingMethod,
          throttling: profile.throttling,
        },
      },
    );
    const lhr = runnerResult.lhr;
    const a = lhr.audits;
    return {
      build: build.label,
      tree: build.tree,
      route,
      profile: profileName,
      url,
      fetchTime: lhr.fetchTime,
      status: runnerResult.lhr.runtimeError?.code ?? "ok",
      lighthouseVersion: lhr.lighthouseVersion,
      userAgent: lhr.userAgent,
      requestedConfig: {
        formFactor: profile.formFactor,
        throttlingMethod: profile.throttlingMethod,
        throttling: profile.throttling,
        screenEmulation: profile.screenEmulation,
      },
      effectiveConfig: {
        formFactor: lhr.configSettings.formFactor,
        throttlingMethod: lhr.configSettings.throttlingMethod,
        throttling: lhr.configSettings.throttling,
        screenEmulation: lhr.configSettings.screenEmulation,
        emulatedUserAgent: lhr.configSettings.emulatedUserAgent ?? null,
      },
      perfScore: lhr.categories.performance.score,
      metrics: {
        fcpMs: num(a, "first-contentful-paint"),
        lcpMs: num(a, "largest-contentful-paint"),
        speedIndexMs: num(a, "speed-index"),
        tbtMs: num(a, "total-blocking-time"),
        cls: num(a, "cumulative-layout-shift"),
        ttiMs: num(a, "interactive"),
      },
      diagnostics: {
        mainThreadWorkMs: num(a, "mainthread-work-breakdown"),
        bootupMs: num(a, "bootup-time"),
        scriptEvaluationMs: num(a, "bootup-time"),
        totalByteWeight: num(a, "total-byte-weight"),
        domSize: num(a, "dom-size"),
        serverResponseMs: num(a, "server-response-time"),
        requestCount: a["network-requests"]?.details?.items?.length ?? null,
        renderBlockingCount: a["render-blocking-resources"]?.details?.items?.length ?? null,
        unusedJsBytes: a["unused-javascript"]?.details?.overallSavingsBytes ?? null,
      },
      lcpElement: lcpElement(lhr),
    };
  } finally {
    try {
      await chrome.kill();
    } catch {
      /* ignore */
    }
  }
};

/** Fixed, app-independent CPU calibration so the host speed is on record. */
const calibrate = () => {
  const script = `
    const t0 = process.hrtime.bigint();
    let x = 0;
    for (let i = 0; i < 3e7; i++) x += Math.sqrt(i) % 3;
    const t1 = process.hrtime.bigint();
    process.stdout.write(String(Number(t1 - t0) / 1e6));
  `;
  const samples = [];
  for (let i = 0; i < 3; i++) {
    samples.push(Number(execFileSync(process.execPath, ["-e", script]).toString()));
  }
  return { hostCpuCalibrationMs: samples, hostCpuCalibrationMedianMs: median(samples) };
};

const summarize = (runs) => {
  const groups = new Map();
  for (const r of runs) {
    const key = `${r.route}|${r.profile}|${r.build}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const [key, rs] of [...groups.entries()].sort()) {
    const [route, profile, build] = key.split("|");
    const m = (f) => rs.map(f).filter((v) => typeof v === "number");
    out.push({
      route,
      profile,
      build,
      runs: rs.length,
      score: m((r) => r.perfScore),
      median: {
        perfScore: median(m((r) => r.perfScore)) * 100,
        fcpMs: round(median(m((r) => r.metrics.fcpMs))),
        lcpMs: round(median(m((r) => r.metrics.lcpMs))),
        speedIndexMs: round(median(m((r) => r.metrics.speedIndexMs))),
        tbtMs: round(median(m((r) => r.metrics.tbtMs))),
        cls: round(median(m((r) => r.metrics.cls)), 4),
        ttiMs: round(median(m((r) => r.metrics.ttiMs))),
        mainThreadWorkMs: round(median(m((r) => r.diagnostics.mainThreadWorkMs))),
        bootupMs: round(median(m((r) => r.diagnostics.bootupMs))),
        totalByteWeight: round(median(m((r) => r.diagnostics.totalByteWeight))),
      },
      spread: {
        perfScore: { min: round(min(m((r) => r.perfScore)) * 100), max: round(max(m((r) => r.perfScore)) * 100) },
        lcpMs: { min: round(min(m((r) => r.metrics.lcpMs))), max: round(max(m((r) => r.metrics.lcpMs))) },
        tbtMs: { min: round(min(m((r) => r.metrics.tbtMs))), max: round(max(m((r) => r.metrics.tbtMs))) },
      },
    });
  }
  return out;
};

const startStress = () => {
  const children = [];
  for (let i = 0; i < STRESS_CHILDREN; i++) {
    const child = spawn(process.execPath, ["-e", "for(;;){Math.sqrt(Math.random());}"], {
      stdio: "ignore",
    });
    children.push(child);
  }
  return children;
};

const main = async () => {
  const stress = startStress();
  const startedAt = new Date().toISOString();
  const calibration = calibrate();
  const runs = [];
  const failures = [];

  for (const route of ROUTES) {
    for (const profileName of selectedProfiles) {
      for (let i = 0; i < RUNS; i++) {
        // Interleave: A,B then B,A on alternate iterations.
        const order = i % 2 === 0 ? BUILDS : [...BUILDS].reverse();
        for (const build of order) {
          const tag = `${route} ${profileName} ${build.label} run ${i + 1}/${RUNS}`;
          try {
            const r = await runOne(build, route, profileName);
            runs.push(r);
            process.stderr.write(
              `[ok]   ${tag}  score=${(r.perfScore * 100).toFixed(0)}  ` +
                `fcp=${r.metrics.fcpMs?.toFixed(0)} lcp=${r.metrics.lcpMs?.toFixed(0)} ` +
                `si=${r.metrics.speedIndexMs?.toFixed(0)} tbt=${r.metrics.tbtMs?.toFixed(0)} ` +
                `cls=${r.metrics.cls?.toFixed(3)}\n`,
            );
          } catch (err) {
            failures.push({ tag, error: String(err && err.stack ? err.stack : err) });
            process.stderr.write(`[fail] ${tag}  ${err.message}\n`);
          }
        }
      }
    }
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    lighthouseVersion: runs[0]?.lighthouseVersion ?? null,
    chromePath: CHROME_PATH,
    flagMode: FLAG_MODE,
    launchFlags: LAUNCH_FLAGS,
    runsPerCell: RUNS,
    builds: BUILDS,
    routes: ROUTES,
    profiles: Object.fromEntries(selectedProfiles.map((p) => [p, PROFILES[p]])),
    calibration,
    stressChildren: STRESS_CHILDREN,
    summary: summarize(runs),
    failures,
    runs,
  };

  const json = JSON.stringify(report, null, 2);
  if (OUT) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, json);
    process.stderr.write(`\nwrote ${OUT}\n`);
  } else {
    process.stdout.write(json);
  }

  process.stderr.write(`\n${"route".padEnd(12)}${"profile".padEnd(20)}${"build".padEnd(7)}` +
    `${"score".padEnd(9)}${"FCP".padEnd(8)}${"LCP".padEnd(8)}${"SI".padEnd(8)}${"TBT".padEnd(8)}${"CLS".padEnd(7)}\n`);
  for (const s of report.summary) {
    const m = s.median;
    process.stderr.write(
      `${s.route.padEnd(12)}${s.profile.padEnd(20)}${s.build.padEnd(7)}` +
        `${m.perfScore.toFixed(0).padEnd(9)}${String(m.fcpMs).padEnd(8)}${String(m.lcpMs).padEnd(8)}` +
        `${String(m.speedIndexMs).padEnd(8)}${String(m.tbtMs).padEnd(8)}${String(m.cls).padEnd(7)}\n`,
    );
  }
  for (const child of stress) child.kill("SIGKILL");
  if (failures.length) process.stderr.write(`\n${failures.length} run(s) failed\n`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
