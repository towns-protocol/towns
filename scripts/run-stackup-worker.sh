#!/usr/bin/env bash

set -eo pipefail

usage()
{
cat << EOF
usage: $0 PARAM [-e|--environment] [-h|--help] [-o|--output]

OPTIONS:
   PARAM                The param
   -h|--help            Show this message
   -p|--privy           Run as privy user
   -o|--output          Output to a file
EOF
}

# Initialize variables
SKIP_TOWNID_VERIFICATION="true"
OUTPUT_TO_FILE="false"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p | --privy )  
            SKIP_TOWNID_VERIFICATION="false"
            ;;
        -o | --output )  
            OUTPUT_TO_FILE="true"
            ;;
        -h | --help )
            usage
            exit
            ;;
        * )                     
            usage
            exit 1
            ;;
    esac
    shift
done

echo "SKIP_TOWNID_VERIFICATION: ${SKIP_TOWNID_VERIFICATION}"
echo "OUTPUT_TO_FILE: ${OUTPUT_TO_FILE}"

if [ "$SKIP_TOWNID_VERIFICATION" = "true" ]; then
    echo "SKIP_TOWNID_VERIFICATION is true, running with random wallets"
else
    echo "SKIP_TOWNID_VERIFICATION is false, running as privy user."
fi

# if service running on port 8686, kill it
if lsof -Pi :8686 -sTCP:LISTEN -t >/dev/null ; then
    kill $(lsof -t -i:8686)
    echo "Previous stackup worker on 8686 killed."
fi

STACKUP_API_TOKEN=""
PRIVY_APP_KEY=""
ALCHEMY_API_KEY=""

# read the .dev.vars file from ./servers/workers/stackup-worker and look for the above variables
DEV_VARS_FILE="./servers/workers/stackup-worker/.dev.vars"
# Check if the file exists
if [ -f "$DEV_VARS_FILE" ]; then
    # Source the file to read variables
    source "$DEV_VARS_FILE"
    echo "Variables loaded from $DEV_VARS_FILE"
else
    echo "ERROR: .dev.vars file not found at $DEV_VARS_FILE"
    exit 1
fi

# if variables are not present, throw an error
if [ -z "$STACKUP_API_TOKEN" ]; then
    echo "ERROR: Missing STACKUP_API_TOKEN in $DEV_VARS_FILE"
    exit 1
fi

if [ -z "$PRIVY_APP_KEY" ]; then
    echo "ERROR: Missing PRIVY_APP_KEY in $DEV_VARS_FILE"
    exit 1
fi

if [ -z "$ALCHEMY_API_KEY" ]; then
    echo "ERROR: Missing ALCHEMY_API_KEY in $DEV_VARS_FILE"
    exit 1
fi

echo "STACKUP_API_TOKEN: ${STACKUP_API_TOKEN}"
echo "PRIVY_APP_KEY: ${PRIVY_APP_KEY}"
echo "ALCHEMY_API_KEY: ${ALCHEMY_API_KEY}"

# Define the yarn command without output redirection
stackup_command="cd ./servers/workers/stackup-worker && yarn dev:local --var PAYMASTER_ADDRESS:0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 SKIP_LIMIT_VERIFICATION:true SKIP_TOWNID_VERIFICATION:$SKIP_TOWNID_VERIFICATION STACKUP_API_TOKEN:$STACKUP_API_TOKEN PRIVY_APP_KEY:$PRIVY_APP_KEY PRIVY_APP_ID:clml5fp7s013vmf0fnkabuaiw ALCHEMY_API_KEY:$ALCHEMY_API_KEY AUTH_SECRET:foo ENVIRONMENT:test-beta"

# Run the command either in the background or in the foreground based on user's choice
if [ "$OUTPUT_TO_FILE" = "true" ]; then
    # Output to a file
    output_file="$(dirname "$DEV_VARS_FILE")/e2e_stackup_worker_output.txt"
    echo "Running stackup worker in the background"
    echo "Outputting to $output_file"
      # Append output redirection to the yarn command
    eval $stackup_command > "$output_file" 2>&1 &
else
    eval $stackup_command
fi
