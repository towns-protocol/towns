#!/bin/bash
set -e

# Get all package.json files in packages/
cd "$(dirname "$0")/.."
packages=$(find packages/* -name "package.json" -not -path "*/node_modules/*")

# Process each package.json
filters=""
for pkg in $packages; do
    name=$(jq -r .name "$pkg")
    if [ "$name" != "@towns-protocol/sdk" ]; then
        filters="$filters --filter=$name"
    fi
done

echo "$filters"
