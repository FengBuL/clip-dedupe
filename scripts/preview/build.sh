#!/usr/bin/env bash
# Renders the real view code against mock data in headless Chrome. Usage: scripts/preview/build.sh
# Needs: google-chrome, and `npm i puppeteer-core lucide-static` in $PREVIEW_DEPS (default /tmp/cdprev).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEPS="${PREVIEW_DEPS:-/tmp/cdprev}"
OUT="$ROOT/.preview-build"
mkdir -p "$OUT" "$DEPS"
if [ ! -d "$DEPS/node_modules/puppeteer-core" ]; then (cd "$DEPS" && npm init -y >/dev/null && npm i puppeteer-core lucide-static --no-audit --no-fund >/dev/null); fi
cp "$ROOT/scripts/preview/page.html" "$OUT/page.html"
node "$ROOT/scripts/preview/make-icons.cjs" "$DEPS" > "$OUT/icons.js"
"$ROOT/node_modules/.bin/esbuild" "$ROOT/scripts/preview/harness.ts" --bundle --format=iife --alias:obsidian="$ROOT/scripts/preview/stub.ts" --outfile="$OUT/bundle.js" --log-level=warning
sed 's/THEME/theme-dark/' "$OUT/page.html" | sed 's#../../styles.css#../styles.css#' > "$OUT/dark.html"
sed 's/THEME/theme-light/' "$OUT/page.html" | sed 's#../../styles.css#../styles.css#' > "$OUT/light.html"
ls "$OUT"
