#!/bin/bash
set -e

DIRS=(src)
if [ -d tests ]; then
  DIRS+=(tests)
fi
prettier "${DIRS[@]}" --check $@