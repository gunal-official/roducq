const dir = process.argv[2];
const parser = require(require.resolve('postcss-selector-parser', { paths: [dir] }));
const v = require(require.resolve('postcss-selector-parser/package.json', { paths: [dir] })).version;
for (const n of [5000, 10000, 20000, 40000]) {
  const sel = '.a'.repeat(n);           // flat selector: n class indexes in ONE word token
  const t0 = process.hrtime.bigint();
  const out = parser().processSync(sel);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`v${v}  n=${String(n).padStart(6)}  bytes=${String(sel.length).padStart(6)}  parse=${ms.toFixed(1).padStart(9)} ms  roundtrip=${out === sel}`);
}
