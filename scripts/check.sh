#!/bin/sh
set -e

for what in typecheck prettier lint test; do
  if grep -q '"'$what'"' package.json; then
    pnpm $what
  fi
done
