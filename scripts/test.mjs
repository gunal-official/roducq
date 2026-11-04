import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const adapterTest = "tests/lib/stage1b-adapters.test.ts";
const files = ["tests/lib", "tests/components", "tests/db"].flatMap((directory) =>
  readdirSync(join(root, directory))
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => join(directory, file))
    .filter((file) => file !== adapterTest)
    .sort(),
);

// `server-only` intentionally throws outside Next's react-server condition.
// Keep the main suite on the normal Node conditions and run only the injected,
// side-effect-free adapter tests with the server condition enabled.
const standard = spawnSync(process.execPath, ["--test", ...files], { cwd: root, stdio: "inherit" });
const adapter = spawnSync(process.execPath, ["--conditions=react-server", "--test", adapterTest], { cwd: root, stdio: "inherit" });
process.exitCode = standard.status === 0 && adapter.status === 0 ? 0 : 1;
