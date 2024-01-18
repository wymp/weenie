#!/bin/bash
set -e

ROOT="$(dirname "$0")/../.."
CMD=
FILTER=".*"
EXCLUDE="$^"
JSON=
OPERATOR="|="
DRY_RUN=

function echo_usage() {
  echo "Usage:"
  echo "   $0 -h|--help                           - Show this help message and exit"
  echo "   $0 ([options]) set [key] [value]       - Set the given key to the given value in package.json. Keys may be specified in jq format."
  echo "   $0 ([options]) [del|delete] [key]      - Delete the given key from package.json. Keys may be specified in jq format."
  echo "   $0 ([options]) sort                    - Sort all the keys in each package.json file alphabetically"
  echo
  echo "Global Options:"
  echo "  -f|--filter [regex]                     - Only include packages matching the given regex"
  echo "  -e|--exclude [regex]                    - Exclude any packages matching the given regex"
  echo "  -d|--dry-run                            - Don't actually modify any files, just output the changes that would be made"
  echo
  echo "'Set' Options:"
  echo "  -j|--json                               - Interpret the value as JSON"
  echo "  -m|--merge                              - Merge the value with the existing value (implies --json)"
  echo
}

function exit_with_error() {
  >&2 echo_usage
  >&2 echo
  >&2 echo "E: $1"
  exit 1
}

function process_set_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      -j|--json)
        JSON="true"
        shift
      ;;

      -m|--merge)
        JSON="true"
        OPERATOR="+="
        shift
      ;;

      *)
        if [ -z "$SET_KEY" ]; then
          SET_KEY="$1"
        elif [ -z "$SET_VAL" ]; then
          SET_VAL="$1"
        else
          exit_with_error "Unknown argument: '$1'"
        fi
        shift
      ;;
    esac
  done

  if [ -z "$SET_KEY" ]; then exit_with_error "No key specified"; fi
  if [ -z "$SET_VAL" ]; then exit_with_error "No value specified"; fi
}

function process_del_args() {
  DEL_KEY="$1"
  if [ -z "$DEL_KEY" ]; then exit_with_error "No key specified"; fi
  if [ -n "$2" ]; then exit_with_error "Unknown argument: '$2'"; fi
}

function process_sort_args() {
  if [ -n "$1" ]; then exit_with-error "Unknown argument: '$1'"; fi
}

function apply_cmd() {
  local OUTPUT
  for pkgjson in "$ROOT/libs"/*/package.json; do
    if ! echo "$pkgjson" | grep -Eq "$FILTER" || echo "$pkgjson" | grep -Eq "$EXCLUDE"; then
      continue
    fi
    if [ "$CMD" == "set" ]; then
      if [ -n "$JSON" ]; then
        OUTPUT="$(jq --argjson val "$SET_VAL" "$SET_KEY += \$val" "$pkgjson")"
      else
        OUTPUT="$(jq --arg val "$SET_VAL" "$SET_KEY |= \$val" "$pkgjson")"
      fi
    elif [ "$CMD" == "delete" ]; then
      OUTPUT="$(jq "del($DEL_KEY)" "$pkgjson")"
    elif [ "$CMD" == "sort" ]; then
      local EXTRA
      OUTPUT="$(jq --sort-keys . "$pkgjson")"
      if jq -e .scripts "$pkgjson" &>/dev/null; then
        EXTRA="$(echo "$OUTPUT" | jq --sort-keys '.scripts')"
        OUTPUT="$(echo "$OUTPUT" | jq --argjson val "$EXTRA" '.scripts |= $val')"
      fi
      if jq -e .dependencies "$pkgjson" &>/dev/null; then
        EXTRA="$(echo "$OUTPUT" | jq --sort-keys '.dependencies')"
        OUTPUT="$(echo "$OUTPUT" | jq --argjson val "$EXTRA" '.dependencies |= $val')"
      fi
      if jq -e .devDependencies "$pkgjson" &>/dev/null; then
        EXTRA="$(echo "$OUTPUT" | jq --sort-keys '.devDependencies')"
        OUTPUT="$(echo "$OUTPUT" | jq --argjson val "$EXTRA" '.devDependencies |= $val')"
      fi
    else
      exit_with_error "Unknown command: '$CMD'"
    fi

    if [ -n "$DRY_RUN" ]; then
      echo ----------------------------------------------------------------------------------------
      echo "$pkgjson:"
      echo "$OUTPUT"
      echo
    else
      echo "$OUTPUT" > "$pkgjson"
    fi
  done
}









while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      echo_usage
      exit
    ;;

    -f|--filter)
      FILTER="$2"
      shift 2
    ;;

    -e|--exclude)
      EXCLUDE="$2"
      shift 2
    ;;

    -d|--dry-run)
      DRY_RUN="true"
      shift
    ;;

    set|sort|delete)
      CMD="$1"
      shift
      break
    ;;

    del)
      CMD="delete"
      shift
      break
    ;;

    *)
      >&2 echo_usage
      >&2 echo
      >&2 echo "Unknown option: '$1'"
      exit 1
      ;;
  esac
done






if [ -z "$CMD" ]; then exit_with_error "No command specified"; fi

if [ "$CMD" == "set" ]; then
  process_set_args "$@"
elif [ "$CMD" == "delete" ]; then
  process_del_args "$@"
elif [ "$CMD" == "sort" ]; then
  process_sort_args "$@"
else
  exit_with_error "Unknown command: '$CMD'"
fi

apply_cmd
