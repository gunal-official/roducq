import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const serverOnlyTests = new Set([
  "tests/lib/stage1b-adapters.test.ts",
  "tests/lib/webhook-worker.test.ts",
]);
const files = ["tests/api", "tests/lib", "tests/components", "tests/db"].flatMap((directory) =>
  readdirSync(join(root, directory))
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => join(directory, file))
    .filter((file) => !serverOnlyTests.has(file))
    .sort(),
);

// `server-only` intentionally throws outside Next's react-server condition.
// Keep HTTP orchestration tests on normal Node conditions; run server adapter
// and worker tests with the server condition enabled.
const standard = spawnSync(process.execPath, ["--test", ...files], { cwd: root, stdio: "inherit" });
const server = spawnSync(process.execPath, ["--conditions=react-server", "--test", ...serverOnlyTests], { cwd: root, stdio: "inherit" });
process.exitCode = standard.status === 0 && server.status === 0 ? 0 : 1;
