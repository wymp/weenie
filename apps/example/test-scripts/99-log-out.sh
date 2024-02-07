#!/bin/bash
set -e

ARGS=()
if [ -n "$SESSION_TOKEN" ]; then
  ARGS+=(-H "Authorization: Bearer $SESSION_TOKEN")
fi

ARGS+=(-d '{"data":null}')
ARGS+=(-H "Content-Type: application/json")

curl "${ARGS[@]}" http://localhost:3000/api/v1/users/logout | jq .
