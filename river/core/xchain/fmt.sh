#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# In addition to running gofumpt this script also limits line length to 120 characters
# There is no good way to run golines for single file from .vscode
# due to this bug: https://github.com/golang/vscode-go/issues/2582

# Set ARGS to -w if not set, otherwie to cmd line args
ARGS=${@:-"-w"}

OUTPUT=$(go list -f '{{.Dir}}' ./... | grep -v /contracts | xargs golines --base-formatter=gofumpt --max-len=120 $ARGS)
if [ -n "$OUTPUT" ]
then
    echo "$OUTPUT"
fi

if [ "$ARGS" == "-l" ] && [ -n "$OUTPUT" ]
then
    exit 1
fi
