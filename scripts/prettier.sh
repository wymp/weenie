#!/bin/bash
set -e

ROOT="$(dirname "$0")/.."

DIRS=(src)
if [ -d tests ]; then
  DIRS+=(tests)
fi
prettier --ignore-path "$ROOT/.prettierignore" --config "$ROOT/.prettierrc.json" "${DIRS[@]}" --check $@
