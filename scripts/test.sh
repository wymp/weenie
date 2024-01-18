#!/bin/bash
set -e

ROOT="$(dirname "$0")/.."
PROJECT="$(basename "$PWD")"

jest -c "$ROOT/.jest/global.js" --selectProjects "$PROJECT" $@