#!/bin/bash

##
## call with a directory or a file
## e.g.
## ./scripts/lint-shell-scripts.sh
## ./scripts/lint-shell-scripts.sh core/scripts
## ./scripts/lint-shell-scripts.sh scripts/lint-shell-scripts.sh
##

# Check if a directory is provided, else use the current directory
DIR="${1:-.}"

# Check if shellcheck is installed
if ! command -v shellcheck &> /dev/null; then
    echo "Error: shellcheck is not installed. Please install it (perhaps with brew) and try again."
    exit 1
fi

declare -a EXCLUDE_CODES=(
    SC2164 # Use 'cd ... || exit' or 'cd ... || return' in case cd fails
    SC2086 # Double quote to prevent globbing and word splitting.
    # Add more codes and their descriptions as needed
)

EXCLUDE_STRING=$(IFS=,; echo "${EXCLUDE_CODES[*]}")
 
# If a single file is provided as an argument, just run shellcheck on that file
if [ "$#" -eq 1 ] && [ -f "$1" ]; then
    FILE="$1"
    echo "Running shellcheck on $FILE with exclusions: $EXCLUDE_STRING ..."
    shellcheck --exclude="$EXCLUDE_STRING" "$FILE"
else
    # Find and run shellcheck on shell script files checked into git
    FILES=$(git -C "$DIR" ls-files | grep '\.sh$')
    
    if [ -z "$FILES" ]; then
        echo "No shell script files found."
        exit 0
    fi
    pushd "$DIR" > /dev/null
    shellcheck --exclude="$EXCLUDE_STRING" $FILES
    popd > /dev/null
fi

