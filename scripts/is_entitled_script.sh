#!/bin/bash

# Configuration variables
RPC_URL="${BASE_RPC_URL}"  # Change this to your RPC endpoint
CONTRACT_ADDRESS="0x7Ce9312Cf40CE89426E8262De3F6701b0E27d822"     # Change this to your deployed contract address
# Function to read and validate JSON input
check_json() {
    if ! jq empty "$1" 2>/dev/null; then
        echo "Error: Invalid JSON file"
        exit 1
    fi
}

# Check if JSON file is provided as argument
if [ $# -ne 1 ]; then
    echo "Usage: $0 <input.json>"
    echo "Expected JSON format:"
    echo '{
        "channelId": "0x...",
        "wallets": ["0x...", "0x..."],
        "permission": "0x..."
    }'
    exit 1
fi

INPUT_FILE=$1

# Validate JSON file
check_json "$INPUT_FILE"

# Read values from JSON
CHANNEL_ID=$(jq -r '.channelId' "$INPUT_FILE")
PERMISSION=$(jq -r '.permission' "$INPUT_FILE")

# Convert wallets array to ABI-encoded format
# First, create the array encoding
WALLETS_ARRAY=$(jq -r '.wallets | join(",")' "$INPUT_FILE")

echo "Making cast call with arguments:"
echo "RPC URL: $RPC_URL"
echo "Contract: $CONTRACT_ADDRESS"
echo "Channel ID: $CHANNEL_ID"
echo "Wallets: $WALLETS_ARRAY"
echo "Permission: $PERMISSION"
echo "---"

# Construct the call data
# Function signature: isEntitled(bytes32,address,bytes32)
RESULT=$(cast call \
    --rpc-url "$RPC_URL" \
    "$CONTRACT_ADDRESS" \
    "isEntitledToChannel(bytes32,address,bytes32)(bool)" \
    "$CHANNEL_ID" \
    "$WALLETS_ARRAY" \
    "$PERMISSION")

# Output the result
echo "$RESULT"