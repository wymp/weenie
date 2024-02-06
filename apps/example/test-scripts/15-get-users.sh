#!/bin/bash
set -e 

USER_ID="$1"

URL_PATH="/api/v1/users$([ -n "$USER_ID" ] && echo "/$USER_ID" || echo "")"

ARGS=()
if [ -n "$SESSION_TOKEN" ]; then
  ARGS+=(-H "Authorization: Bearer $SESSION_TOKEN")
fi

curl "${ARGS[@]}" "http://localhost:3000${URL_PATH}" | jq .
