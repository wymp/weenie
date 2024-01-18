#!/bin/bash

set -e

# Expects:
#
# * to be run from repo root
# * for repo to be checked out
# * to have pnpm installed
# * to have env:
#   * hasTopLevelChanges
#   * allAppsJson
#   * allLibsJson
#   * pnpmFilter
#   * pnpmIgnorePattern
#
# Outputs:
#
# * affectedAppsJson
# * affectedLibsJson

if [ -n "$hasTopLevelChanges" ]; then

  affectedAppsJson="$allAppsJson"
  affectedLibsJson="$allLibsJson"

else

  affected="$(pnpm --filter="$pnpmFilter" --changed-files-ignore-pattern="$pnpmIgnorePattern" exec pwd | grep -v 'No projects matched' | tr '\n' ' ')"


  for d in $affected; do
    pkg="$(basename "$d")"
    if echo "$d" | grep -q /apps/; then
      if [ -z "$affectedAppsJson" ]; then
        affectedAppsJson='"'$pkg'"'
      else
        affectedAppsJson="${affectedAppsJson},"'"'$pkg'"'
      fi

    else
      if [ -z "$affectedLibsJson" ]; then
        affectedLibsJson='"'$pkg'"'
      else
        affectedLibsJson="${affectedLibsJson},"'"'$pkg'"'
      fi
    fi

  done

  affectedAppsJson="[$affectedAppsJson]"
  affectedLibsJson="[$affectedLibsJson]"

fi

echo "affectedAppsJson=$affectedAppsJson"
echo "affectedAppsJson=$affectedAppsJson" >> $GITHUB_OUTPUT
echo "affectedLibsJson=$affectedLibsJson"
echo "affectedLibsJson=$affectedLibsJson" >> $GITHUB_OUTPUT
