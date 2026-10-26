/**
 * Dead-utility gate for the marketing surface.
 *
 * The landing design system's rule is that every visual decision resolves to
 * an `--lm-*` token surfaced through a `lm-*` utility (tailwind.config.ts).
 * When a utility has no mapping, Tailwind emits no rule at all and the class
 * silently does nothing — the failure mode is invisible in review and showed
 * up eight times on /pricing alone (`tracking-lm-*`, `leading-lm-*`) plus
 * `bg-lm-chip-wash`, `text-lm-26`, `text-lm-11` and
 * `border-lm-border-hairline` elsewhere. See
 * docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md §5.
 *
 * This script reads the COMPILED CSS, so it needs a build first:
 *
 *   npm run build && node scripts/check-marketing-utilities.mjs
 *
 * It prints every class name that the marketing markup asks for and the
 * stylesheet never defines, and exits 1 when it finds one.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS_DIR = ".next/static/chunks";
if (!existsSync(CSS_DIR)) {
  console.error(
    `No compiled CSS at ${CSS_DIR}. Run \`npm run build\` first — this check reads what Tailwind actually emitted.`,
  );
  process.exit(2);
}

// Backslashes are stripped from both sides so an escaped selector such as
// `.min-\[1200px\]\:text-lm-67` compares equal to the raw class token.
const css = readdirSync(CSS_DIR)
  .filter((file) => file.endsWith(".css"))
  .map((file) => readFileSync(join(CSS_DIR, file), "utf8"))
  .join("\n")
  .replace(/\\/g, "");

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(path);
  }
}
walk("components/marketing");
walk("app/(marketing)");

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** class token → the files that name it */
const tokens = new Map();
for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  for (const match of source.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
    const value = match[1];
    if (!/lm-/.test(value)) continue;
    for (const token of value.split(/\s+/)) {
      if (!/lm-/.test(token)) continue;
      // Template expressions, custom properties and dynamic fragments are
      // not class names.
      if (/[${}()]/.test(token) || token.startsWith("--")) continue;
      if (!tokens.has(token)) tokens.set(token, new Set());
      tokens.get(token).add(file);
    }
  }
}

const dead = [...tokens.entries()]
  .filter(([token]) => !css.includes(`.${token}`))
  .sort(([a], [b]) => a.localeCompare(b));

if (dead.length === 0) {
  console.log(
    `${tokens.size} lm-* utilities scanned, 0 without a compiled rule (${statSync(join(CSS_DIR, readdirSync(CSS_DIR).find((f) => f.endsWith(".css")))).size} B+ of CSS read).`,
  );
  process.exit(0);
}

for (const [token, where] of dead) {
  console.log(`DEAD  ${token.padEnd(34)} <- ${[...where].slice(0, 3).join(", ")}`);
}
console.error(`\n${dead.length} lm-* utilit(ies) compile to nothing.`);
process.exit(1);
