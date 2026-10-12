// Prints `const ICONS = {...}` with the Lucide icons the plugin uses (Obsidian ships Lucide too).
const fs = require("fs");
const path = require("path");
const dir = path.join(process.argv[2], "node_modules/lucide-static/icons");
const src = fs.readdirSync(path.join(__dirname, "..", "..", "src")).map((f) => path.join(__dirname, "..", "..", "src", f)).filter((f) => f.endsWith(".ts"));
const text = src.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const names = new Set(["circle-help", "help-circle"]);
for (const m of text.matchAll(/setIcon\([^;]*?,\s*(?:"([a-z0-9-]+)"|[^"]*?\?\s*"([a-z0-9-]+)"\s*:\s*"([a-z0-9-]+)")/g)) for (const n of [m[1], m[2], m[3]]) if (n) names.add(n);
for (const m of text.matchAll(/(?:iconButton\([^,]+,\s*|kpi\(|emptyState\([^,]+,\s*|"[a-z-]+",\s*"(?:kpi))\s*"([a-z0-9-]+)"/g)) names.add(m[1]);
["layers", "files", "copy", "text", "whole-word", "check-circle", "circle-check", "refresh-cw", "play", "settings", "undo-2", "chevron-down", "chevron-up", "file-text", "check", "info"].forEach((n) => names.add(n));
const out = {};
for (const n of names) {
  const f = path.join(dir, n + ".svg");
  if (fs.existsSync(f)) out[n] = fs.readFileSync(f, "utf8").replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ").replace(/width="24" height="24"/, "").trim();
  else process.stderr.write("no icon " + n + "\n");
}
process.stdout.write("const ICONS = " + JSON.stringify(out) + ";\n");
