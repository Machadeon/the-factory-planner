#!/usr/bin/env bash
# Verifies the static export output in out/ after `next build`.
# Usage: scripts/verify-export.sh [base-path]
#   base-path: expected base path, e.g. /the-factory-planner (default: value of NEXT_PUBLIC_BASE_PATH)
set -euo pipefail

BASE_PATH="${1:-${NEXT_PUBLIC_BASE_PATH:-}}"
OUT_DIR="$(dirname "$0")/../out"

fail() {
  echo "verify-export: FAIL — $1" >&2
  exit 1
}

[ -f "$OUT_DIR/index.html" ] || fail "out/index.html missing"
[ -f "$OUT_DIR/.nojekyll" ] || fail "out/.nojekyll missing"
[ -d "$OUT_DIR/images" ] || fail "out/images/ missing"

if [ -n "$BASE_PATH" ]; then
  grep -q "$BASE_PATH/_next/" "$OUT_DIR/index.html" \
    || fail "out/index.html does not reference $BASE_PATH/_next/"
  grep -q "$BASE_PATH$BASE_PATH" "$OUT_DIR/index.html" \
    && fail "out/index.html contains doubled base path $BASE_PATH$BASE_PATH"
else
  grep -q "\"/_next/" "$OUT_DIR/index.html" \
    || fail "out/index.html does not reference /_next/ at root"
fi

echo "verify-export: OK"
