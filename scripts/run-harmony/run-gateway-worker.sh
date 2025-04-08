#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <environment>"
    exit 1
fi

ENVIRONMENT=$1

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Call the common helper script
"$SCRIPT_DIR/run-worker-common.sh" "gateway-worker" "1ca3562b1f4e8001b7d5ec2cfc1b2cd5" "$ENVIRONMENT"

# Exit with the status of the helper script
exit $?