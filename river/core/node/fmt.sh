#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Set ARGS to -w if not set, otherwie to cmd line args
ARGS=${@:-"-w"}

OUTPUT=$(go list -f '{{.Dir}}' ./... | grep -v /contracts | grep -v /protocol | xargs gofumpt $ARGS)
echo "$OUTPUT"

if [ "$ARGS" == "-l" ] && [ -n "$OUTPUT" ]; then
    exit 1
else

