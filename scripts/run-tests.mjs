// Bundles the pure core and its tests with esbuild, then runs them with Node's built-in test runner.
import { build } from "esbuild";
import { readdirSync, rmSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const out = ".test-build";
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const entries = readdirSync("tests").filter((f) => f.endsWith(".test.ts")).map((f) => `tests/${f}`);
await build({ entryPoints: entries, bundle: true, platform: "node", format: "cjs", target: "node18", outdir: out, logLevel: "warning" });
const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", out], { stdio: "inherit" });
process.exit(r.status ?? 1);
