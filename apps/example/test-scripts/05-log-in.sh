#!/bin/bash
set -e

EMAIL="${EMAIL:-$1}"
EMAIL="${EMAIL:-jc@example.com}"
PASSWORD="${PASSWORD:-$2}"
PASSWORD="${PASSWORD:-password}"

JSON='{
  "data": {
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }
}'

res="$(curl -H 'Content-Type: application/json' -d "$JSON" http://localhost:3000/api/v1/users/login)"
if echo "$res" | jq -e .error &>/dev/null; then
  echo "$res" | jq .
  exit 1
else
  SESSION_TOKEN="$(echo "$res" | jq -r '.data.session.token')"
  echo "Success! Copy/paste the following to set your session token for subsequent requests:"
  echo
  echo "export SESSION_TOKEN=\"$SESSION_TOKEN\""
fi
