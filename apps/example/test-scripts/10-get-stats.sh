#!/bin/bash
set -e

ARGS=()
if [ -n "$SESSION_TOKEN" ]; then
  ARGS+=(-H "Authorization: Bearer $SESSION_TOKEN")
fi

curl "${ARGS[@]}" http://localhost:3000/api/v1/stats/requests | jq .
