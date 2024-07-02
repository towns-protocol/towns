#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v "gofumpt" >/dev/null 2>&1; then
    go install mvdan.cc/gofumpt@latest >/dev/null 2>&1
fi
if ! command -v "golines" >/dev/null 2>&1; then
    go install github.com/segmentio/golines@latest >/dev/null 2>&1
fi

# Read all lines from stdin into the variable 'input'
INPUT=$(cat)

FMT_CMD="golines --base-formatter=gofumpt --max-len=120"

# If arguments are empty and stdin is not empty, run formatter on stdin to stdout
if [[ -z "$*" && -n "${INPUT}" ]]
then
    echo "${INPUT}" | ${FMT_CMD}
    exit 0
fi

# Set ARGS to -w if not set, otherwie to cmd line args
ARGS=${@:-"-w"}

OUTPUT=$(go list -f '{{.Dir}}' ./... | grep -v /contracts | grep -v /protocol | grep -v /mocks | xargs ${FMT_CMD} $ARGS)
if [ -n "$OUTPUT" ]
then
    echo "$OUTPUT"
fi

if [ "$ARGS" == "-l" ] && [ -n "$OUTPUT" ]
then
    exit 1
fi
