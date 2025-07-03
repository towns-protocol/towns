#!/bin/bash

# Script to find function names for selectors in contract compilation artifacts.
# We may still use selectors that are not found by this script if they are implemented
# in external libraries.
# Usage: ./find-method-selector.sh <selector>
# Example: ./find-method-selector.sh 9575f6ac

# Check if selector argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <selector>"
    echo "Example: $0 9575f6ac"
    echo ""
    echo "This script searches for the given selector in contract compilation artifacts"
    echo "and returns the contract name and function name."
    exit 1
fi

SELECTOR="$1"

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed. Please install jq to use this script."
    echo "On macOS: brew install jq"
    echo "On Ubuntu/Debian: sudo apt-get install jq"
    exit 1
fi

# Change to script directory to ensure relative paths work
cd "$(dirname "$0")/.."

# Find files containing the selector (with quotes as shown in the example)
FILES=$(grep -lr "\"$SELECTOR\"" packages/contracts/out/**/*.json 2>/dev/null)

if [ -z "$FILES" ]; then
    echo "No files found containing selector: $SELECTOR"
    exit 1
fi

# Count the number of files
FILE_COUNT=$(echo "$FILES" | wc -l)
echo "Found $FILE_COUNT file(s) containing selector $SELECTOR"
echo ""

# Process each file
echo "$FILES" | while read -r file; do
    if [ -f "$file" ]; then
        # Extract contract name from file path
        # packages/contracts/out/ContractName.sol/ContractName.json -> ContractName
        DIR_NAME=$(basename "$(dirname "$file")")
        CONTRACT_NAME="${DIR_NAME%.sol}"
        
        # Parse JSON and find the function name for this selector
        FUNCTION_NAME=$(jq -r --arg selector "$SELECTOR" '.methodIdentifiers | to_entries[] | select(.value == $selector) | .key' "$file" 2>/dev/null)
        
        if [ -n "$FUNCTION_NAME" ] && [ "$FUNCTION_NAME" != "null" ]; then
            echo "Contract: $CONTRACT_NAME"
            echo "Function: $FUNCTION_NAME"
            echo "Selector: $SELECTOR"
            echo "File: $file"
            echo ""
        else
            # Check if selector exists elsewhere in the file (might be in ABI or other sections)
            if grep -q "\"$SELECTOR\"" "$file"; then
                echo "Warning: Selector $SELECTOR found in $file but not in methodIdentifiers"
                echo "Contract: $CONTRACT_NAME"
                echo "File: $file"
                echo ""
            fi
        fi
    fi
done 