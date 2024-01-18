#!/bin/bash
set -e

if ! command -v jq &> /dev/null; then
  >&2 echo "E: jq not found. You must install jq to use this script"
  exit 1
fi

ROOT="$(dirname "$0")/../.."

ARGS=()
NO_BUMP=
while [ $# -gt 0 ]; do
  case "$1" in
    --no-bump) NO_BUMP=1 ;;
    *) ARGS+=("$1") ;;
  esac
  shift
done

if [ "${#ARGS[@]}" -eq 0 ] && [ -z "$NO_BUMP" ]; then
  >&2 echo "E: Please specify 'major', 'minor' or 'patch'"
  >&2 echo
  exit 1
fi

if [ -z "$NO_BUMP" ]; then
  pnpm version --commit-hooks false --git-tag-version false "${ARGS[@]}" >/dev/null
fi
VERSION="$(jq -r '.version' "$ROOT"/package.json)"

for pkg in apps/*/package.json libs/*/package.json; do
  OUTPUT="$(jq --arg version "$VERSION" '.version|=$version' "$pkg")"
  echo "$OUTPUT" > "$pkg"
done

echo "All versions set to $VERSION"
