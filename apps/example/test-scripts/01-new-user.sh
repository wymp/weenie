#!/bin/bash
set -e

NAME="${NAME:-Jim Chavo}"
EMAIL="${EMAIL:-jc@example.com}"
PASSWORD="${PASSWORD:-password}"
IS_ADMIN="${IS_ADMIN:-true}"

JSON='{
  "data": {
    "name": "'$NAME'",
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'",
    "isAdmin": '$IS_ADMIN'
  }
}'

res="$(curl -H 'Content-Type: application/json' -d "$JSON" http://localhost:3000/api/v1/users/register)"
if echo "$res" | jq -e .error &>/dev/null; then
  echo "$res" | jq .
  exit 1
else
  SESSION_TOKEN="$(echo "$res" | jq -r '.data.session.token')"
  echo "Success! Copy/paste the following to set your session token for subsequent requests:"
  echo
  echo "export SESSION_TOKEN=\"$SESSION_TOKEN\""
fi
