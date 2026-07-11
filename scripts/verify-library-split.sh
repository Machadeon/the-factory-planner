#!/usr/bin/env bash
# Verifies structural invariants of the split library drawer (openspec change
# split-library-drawer, spec component-structure R1.S1/R1.S3/R2.S2).
# Usage: scripts/verify-library-split.sh
set -euo pipefail

DIR="$(dirname "$0")/../app/components/library"

fail() {
  echo "verify-library-split: FAIL — $1" >&2
  exit 1
}

# R1.S1 — file set
[ -d "$DIR" ] || fail "$DIR does not exist"
# row-types.ts is a types-only addition (RowState/RowActions shared shape) —
# not a component, doesn't count against "one component per file".
EXPECTED="LibraryDrawer.tsx LibraryFactoryMenu.tsx LibraryFactoryRow.tsx LibraryFolderRow.tsx LibraryTree.tsx MoveToFolderSelect.tsx row-types.ts"
ACTUAL="$(ls "$DIR" | sort | tr '\n' ' ' | sed 's/ $//')"
[ "$ACTUAL" = "$(echo "$EXPECTED" | tr ' ' '\n' | sort | tr '\n' ' ' | sed 's/ $//')" ] \
  || fail "unexpected file set in $DIR: got [$ACTUAL], want [$EXPECTED]"

# R2.S2 — no component imports storage-service mutators directly
if grep -rl "saveLibrary\|addFactory\|updateFactory\|removeFactory\|addFolder\|renameFolder\|removeFolder\|moveFactory" "$DIR" | grep -v MoveToFolderSelect.tsx.bak >/dev/null 2>&1; then
  if grep -rl "from \"@/app/models/storage-service\"\|from \"../../models/storage-service\"\|from \"../../../models/storage-service\"" "$DIR" >/dev/null 2>&1; then
    fail "a component in $DIR imports storage-service directly"
  fi
fi

# R1.S3 — transient state ownership confined to LibraryDrawer.tsx
STATE_VARS="expandedFolders editState moveMenuFactory menuState deleteConfirmFactory deleteConfirmFolder"
for f in "$DIR"/*.tsx; do
  base="$(basename "$f")"
  [ "$base" = "LibraryDrawer.tsx" ] && continue
  for v in $STATE_VARS; do
    if grep -q "useState.*$v\|const \[$v" "$f"; then
      fail "$base defines its own '$v' state — R1.S3 requires this live only in LibraryDrawer.tsx"
    fi
  done
done

echo "verify-library-split: OK"
