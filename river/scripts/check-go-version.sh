#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

#!/bin/bash
GO_VERSION_FILE="go.work"

# Extract the Go version from go.mod
MOD_VERSION_FULL=$(grep "^go " $GO_VERSION_FILE | awk '{print $2}')
MOD_VERSION=$(grep "^go " $GO_VERSION_FILE | awk '{print $2}' | awk -F. '{print $1"."$2}')

# Extract the current Go version
CURRENT_VERSION_FULL=$(go version | awk '{print $3}' | tr -d 'go')
CURRENT_VERSION=$(go version | awk '{print $3}' | tr -d 'go' | awk -F. '{print $1"."$2}')

# Compare the versions
if [[ "$MOD_VERSION" == "$CURRENT_VERSION" ]]; then
    echo
    echo "Local Go version $CURRENT_VERSION_FULL matches with go.mod: $MOD_VERSION_FULL"
    echo
else
    echo
    echo "Required Go version in go.mod: $(tput setaf 9)$MOD_VERSION_FULL$(tput sgr0) Locally installed Go major.minor version: $(tput setaf 9)$CURRENT_VERSION_FULL$(tput sgr0)"
    echo "Please install the required Go version and restart VSCode."
    echo 
    exit 1
fi
