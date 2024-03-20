#!/bin/bash
set -euo pipefail

# Base directory for the instances
BASE_DIR="./run_files"

# Find all node_address files under the base directory
ADDRESS_FILES=$(find "$BASE_DIR" -type f -name 'node_address')

# Check if Homebrew is installed and install cast if needed
if ! command -v cast &> /dev/null; then
    echo "cast is not installed. Please install it before running this script."
    exit 1
fi

# Iterate over each found node_address file to set the balance in Anvil
for file in $ADDRESS_FILES; do
    WALLET_ADDRESS=$(cat "$file")
    if [ -n "$WALLET_ADDRESS" ]; then
        echo "Setting balance for wallet with address $WALLET_ADDRESS"
        cast rpc anvil_setBalance $WALLET_ADDRESS 10000000000000000000 --rpc-url http://127.0.0.1:8545
        # cast balance $WALLET_ADDRESS  --rpc-url http://127.0.0.1:8546 --ether
    else
        echo "No wallet address found in $file."
    fi
done

echo "All wallet addresses processed for balance setting in Anvil."
