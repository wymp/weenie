#!/bin/bash
set -e

NM="$(basename $PWD)"
ENTRYPOINT="$(jq -r .main package.json)"

pnpm typedoc "$ENTRYPOINT" --sort source-order --out ../../docs/"weenie-${NM}"