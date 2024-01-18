#!/bin/bash

set -e

# Expects:
#
# * to be run from repo root
# * for repo to be checked out
# * to have env:
#   * NX_BASE
#
# Outputs:
#
# * hasTopLevelChanges
# * pnpmFilter
# * pnpmIgnorePattern


# Determine if any important top-level files have changed that would require a full re-deploy of everything
hasTopLevelChanges="$(
  git diff --name-only "$NX_BASE" | \
  grep -qE '^(\.github|\.jest|deploy/dockerfile.+|scripts|\.dockerignore|\.npmrc|\.eslint\.config\.js|package\.json|pnpm-lock|pnpm-workspace|tsconfig)' && \
  echo 1 || \
  echo ""
)"

pnpmFilter="$([ -n "$hasTopLevelChanges" ] && echo "*" || echo "...[$NX_BASE]")"
pnpmIgnorePattern="**/tests,**/*.md"

echo "hasTopLevelChanges=$hasTopLevelChanges"
echo "hasTopLevelChanges=$hasTopLevelChanges" >> $GITHUB_OUTPUT
echo "pnpmFilter=$pnpmFilter"
echo "pnpmFilter=$pnpmFilter" >> $GITHUB_OUTPUT
echo "pnpmIgnorePattern=$pnpmIgnorePattern"
echo "pnpmIgnorePattern=$pnpmIgnorePattern" >> $GITHUB_OUTPUT
