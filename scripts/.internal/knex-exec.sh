#!/bin/sh
set -e

pnpm knex --knexfile "$([ -e src/knexfile.ts ] && echo "src/knexfile.ts" || echo "dist/knexfile.js")" "$@"