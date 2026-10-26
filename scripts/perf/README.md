# Performance comparison harness

`lighthouse-compare.mjs` runs Lighthouse against **two already-built trees**
under identical, pinned conditions and writes one JSON report plus a summary
table. It was written for the PR #54 vs PR #59 score investigation
(`docs/PERF_PR54_VS_PR59_LIGHTHOUSE.md`) and is the recommended way to make any
future "Lighthouse says X" claim in this repo.

It is **not** part of the app: it adds no dependency to `package.json` and it
never touches application code.

## What it pins

- one Chrome binary (`CHROME_PATH`), the same file for both sides
- one Lighthouse version (whatever resolves next to the script)
- one launch-flag list (`STANDARD_FLAGS`), identical for both sides
- one viewport/DPR and one network+CPU profile per named profile
- interleaved run order (A,B then B,A), so machine drift affects both sides

## Install (outside `package.json`)

```bash
mkdir -p /tmp/perf/tools && cd /tmp/perf/tools
npm init -y
npm i --no-save lighthouse@13.5.0 @sparticuz/chromium@153.0.0

# extract the bundled browser and the shared libs it needs
node -e "
const fs=require('fs'),zlib=require('zlib');
for (const f of ['al2023.tar.br','swiftshader.tar.br']) {
  const out=f.replace('.br','');
  fs.writeFileSync('/tmp/'+out, zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/'+f)));
}"
mkdir -p /tmp/al2023 /tmp/swiftshader
tar -xf /tmp/al2023.tar -C /tmp/al2023
tar -xf /tmp/swiftshader.tar -C /tmp/swiftshader
node --input-type=module -e "import c from '@sparticuz/chromium'; console.log(await c.executablePath())"
# -> /tmp/chromium
```

## Run

```bash
cd <repo root>
NODE_PATH=/tmp/perf/tools/node_modules \
CHROME_PATH=/tmp/chromium \
LD_LIBRARY_PATH=/tmp/al2023/lib:/tmp/swiftshader \
RUNS=5 ROUTES=/ PROFILES=std-mobile,std-desktop,pr54-unthrottled,pr54-cpu4 \
BUILD_A=/path/to/treeA:http://127.0.0.1:3101 \
BUILD_B=/path/to/treeB:http://127.0.0.1:3102 \
OUT=/tmp/perf/report.json \
node scripts/perf/lighthouse-compare.mjs
```

`BUILD_*` is `<tree path>:<base url>`; the tree path is bookkeeping only.

## Options

| Env | Default | Meaning |
| --- | --- | --- |
| `RUNS` | `5` | runs per route × profile × build |
| `ROUTES` | `/` | comma-separated paths |
| `PROFILES` | all four | see below |
| `OUT` | stdout | where to write the JSON report |
| `FLAG_MODE` | `standard` | `sparticuz` adds `--single-process`, `--in-process-gpu`, … |
| `STRESS_CHILDREN` | `0` | busy-loop processes alive during the session (contention control) |
| `CHROME_PATH` | — | the browser binary |

## Profiles

| Name | Lighthouse throttling | Viewport |
| --- | --- | --- |
| `std-mobile` | stock Lighthouse 13 mobile (`simulate` 150 ms RTT / ~1.6 Mbps / 4× CPU) | 412×823 @1.75 |
| `std-desktop` | stock Lighthouse 13 desktop preset | 1350×940 @1 |
| `pr54-unthrottled` | `provided` (no network model, no CPU slowdown) — the profile PR #54 and PR #59 both recorded | 412×823 @1.75 |
| `pr54-cpu4` | `devtools`, 4× CPU, network unthrottled — PR #54 scenario B | 412×823 @1.75 |

## Controls

- **A/A:** point `BUILD_A` and `BUILD_B` at the same server. Any difference you
  see is Lighthouse + host noise. Measure this before believing any A/B delta.
- **Contention:** `STRESS_CHILDREN=2` and `6`. On a 2-vCPU host this costs
  10–30 score points with the code unchanged.
- **Bad-flag demo:** `FLAG_MODE=sparticuz` shows the invalid measurements
  (`--single-process` loses Speed Index and forces TBT to 0).

## Reading the output

Use medians **with the min–max range**, never a single run. In this repo's own
measurements a single build produced 76–97 on stock mobile throttling in the same
session, so a 1–5 point delta means nothing without a spread.
