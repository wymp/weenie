#!/bin/bash
set -e

ROOT="$(dirname "$0")/.."

FILES=('./src/**/*.{ts,tsx,js,jsx}')
if [ -d ./tests ]; then
  FILES+=('./tests/**/*.{ts,tsx,js,jsx}')
fi

ESLINT_USE_FLAT_CONFIG=1 eslint -c "$ROOT/eslint.config.js" --cache --cache-location ./node_modules/.cache/eslint-cache $@ "${FILES[@]}"
