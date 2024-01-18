#!/bin/bash

set -e

# Expects:
#
# * to be run from repo root
# * for repo to be checked out
#
# Outputs:
#
# * allAppsJson
# * allLibsJson

allAppsJson=
allLibsJson=

for d in libs/* apps/*; do

  pkg="$(basename "$d")"

  if echo "$d" | grep -q apps/; then
    if [ -z "$allAppsJson" ]; then
      allAppsJson='"'$pkg'"'
    else
      allAppsJson="${allAppsJson},"'"'$pkg'"'
    fi

  else
    if [ -z "$allLibsJson" ]; then
      allLibsJson='"'$pkg'"'
    else
      allLibsJson="${allLibsJson},"'"'$pkg'"'
    fi
  fi

done

echo "allAppsJson=[$allAppsJson]"
echo "allAppsJson=[$allAppsJson]" >> $GITHUB_OUTPUT
echo "allLibsJson=[$allLibsJson]"
echo "allLibsJson=[$allLibsJson]" >> $GITHUB_OUTPUT
