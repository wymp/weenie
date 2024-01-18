#!/bin/bash
set -e

if ! command -v jq &> /dev/null; then
  >&2 echo "E: jq not found. You must install jq to use this script"
  exit 1
fi

CONFIRM=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    -c|--confirm)
      CONFIRM=1
      shift
      ;;
    *)
      >&2 echo "E: Unknown option $1"
      exit 1
      ;;
  esac
done

ROOT="$(dirname "$0")/../.."

for pkg in "$ROOT/libs"/*; do
  (
    cd "$pkg"
    PKG_NAME="$(jq -r .name package.json)"
    NEW_VERSION="$(jq -r .version package.json)"
    PUBLISHED_VERSION="$(pnpm view "$PKG_NAME" version 2>/dev/null || echo "0.0.0")"
    if [ "$NEW_VERSION" != "$PUBLISHED_VERSION" ]; then
      if [ "$CONFIRM" -eq 1 ]; then
        read -p "Publish $PKG_NAME@$NEW_VERSION? [Y/n] " -n 1 REPLY
        echo
        if [[ "$REPLY" =~ ^[Nn]$ ]]; then
          echo "Skipping $PKG_NAME@$NEW_VERSION"
          continue
        fi
      fi
      echo "Publishing $PKG_NAME@$NEW_VERSION"
      pnpm publish "$@"
    else
      echo "$PKG_NAME@$NEW_VERSION already published"
    fi
  )
done