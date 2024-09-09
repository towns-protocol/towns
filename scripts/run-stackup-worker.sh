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
SKIP_PRIVY_VERIFICATION="true"
OUTPUT_TO_FILE="false"
PAYMASTER_LIMIT="false"

usage() {
    echo "Usage: run-stackup-worker.sh [OPTIONS]"
    echo "Prerequisites: you must ether have a .dev.vars file in ./servers/workers/stackup-worker or pass the following environment variables: STACKUP_PAYMASTER_RPC_URL, PRIVY_APP_KEY"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p | --privy )  
            SKIP_PRIVY_VERIFICATION="false"
            ;;
        -l | --limit )  
            PAYMASTER_LIMIT="true"
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

echo "SKIP_PRIVY_VERIFICATION: ${SKIP_PRIVY_VERIFICATION}"
echo "OUTPUT_TO_FILE: ${OUTPUT_TO_FILE}"

if [ "$SKIP_PRIVY_VERIFICATION" = "true" ]; then
    echo "SKIP_PRIVY_VERIFICATION is true, running with random wallets"
else
    echo "SKIP_PRIVY_VERIFICATION is false, running as privy user."
fi

# if service running on port 8686, kill it
if lsof -Pi :8686 -sTCP:LISTEN -t >/dev/null ; then
    kill $(lsof -t -i:8686)
    echo "Previous stackup worker on 8686 killed."
fi

# Save the current value of ENVIRONMENT to an override variable if it exists
if [ -n "$ENVIRONMENT" ]; then
  ENVIRONMENT_OVERRIDE="$ENVIRONMENT"
fi

if [ -n "$STACKUP_PAYMASTER_RPC_URL" ]; then
  STACKUP_PAYMASTER_RPC_URL_OVERRIDE="$STACKUP_PAYMASTER_RPC_URL"
fi

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
    echo "Warning: .dev.vars file not found at $DEV_VARS_FILE, using CLI vars."
fi

if [ -n "$ENVIRONMENT_OVERRIDE" ]; then
  ENVIRONMENT="$ENVIRONMENT_OVERRIDE"
fi

if [ -n "$STACKUP_PAYMASTER_RPC_URL_OVERRIDE" ]; then
  STACKUP_PAYMASTER_RPC_URL="$STACKUP_PAYMASTER_RPC_URL_OVERRIDE"
fi

# if variables are not present, throw an error
if [ -z "$STACKUP_PAYMASTER_RPC_URL" ]; then
    echo "ERROR: Missing STACKUP_PAYMASTER_RPC_URL"
    exit 1
fi

if [ "$SKIP_PRIVY_VERIFICATION" = "false" ] && [ -z "$PRIVY_APP_KEY" ]; then
    echo "ERROR: Missing PRIVY_APP_KEY"
    exit 1
fi

echo "STACKUP_PAYMASTER_RPC_URL: ${STACKUP_PAYMASTER_RPC_URL}"
echo "PRIVY_APP_KEY: ${PRIVY_APP_KEY}"
echo "ALCHEMY_API_KEY: ${ALCHEMY_API_KEY}"
echo "ENVIRONMENT: ${ENVIRONMENT}"

# Define the yarn command without output redirection
stackup_command="cd ./servers/workers/stackup-worker && yarn dev:local --var ERC4337_ENTRYPOINT_ADDRESS:0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789 SKIP_PRIVY_VERIFICATION:$SKIP_PRIVY_VERIFICATION STACKUP_PAYMASTER_RPC_URL:$STACKUP_PAYMASTER_RPC_URL PRIVY_APP_KEY:$PRIVY_APP_KEY PRIVY_APP_ID:clml5fp7s013vmf0fnkabuaiw ALCHEMY_API_KEY:$ALCHEMY_API_KEY AUTH_SECRET:foo"

if [ -n "$ENVIRONMENT" ]; then
    stackup_command="$stackup_command ENVIRONMENT:$ENVIRONMENT"
fi

# Only allow 1 of each tx type to be processed, additional should reject
if [ "$PAYMASTER_LIMIT" = "true" ]; then
    echo "Running stackup worker with limits on paymaster."
    stackup_command="$stackup_command LIMIT_CREATE_SPACE:1 LIMIT_ROLE_SET:1 LIMIT_ENTITLEMENT_SET:1 LIMIT_CHANNEL_CREATE:1 LIMIT_LINK_WALLET:1 LIMIT_UPDATE_SPACE_INFO:1 LIMIT_BAN_UNBAN:1"
else
    echo "Running stackup worker without limits on paymaster."
    stackup_command="$stackup_command SKIP_LIMIT_VERIFICATION:true"
fi

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
