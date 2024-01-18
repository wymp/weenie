#!/bin/bash
set -e

NM="$(basename $PWD)"

pnpm typedoc src/index.ts --sort source-order --out ../../docs/"weenie-${NM}"