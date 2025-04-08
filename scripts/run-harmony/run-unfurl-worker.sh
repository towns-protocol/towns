#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Call the common helper script
"$SCRIPT_DIR/run-worker-common.sh" "unfurl-worker" "1cb3562b1f4e80c4951ae6a9416ce0aa" "$ENVIRONMENT"

# Exit with the status of the helper script
exit $?