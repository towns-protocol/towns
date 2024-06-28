# this script is for funding xchain multi nodes with eth when running 4337 development against geth node
#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Base directory for the instances
BASE_DIR="${1:-../river/core/xchain/run_files}"

# Find all node_address files under the base directory
ADDRESS_FILES=$(find "$BASE_DIR" -type f -name 'node_address')

# Iterate over each found node_address file to set the balance in Anvil
for file in $ADDRESS_FILES; do
    WALLET_ADDRESS=$(cat "$file")
    if [ -n "$WALLET_ADDRESS" ]; then
        echo "Setting balance for wallet with address $WALLET_ADDRESS"
        node ./send-eth.js $WALLET_ADDRESS
    else
        echo "No wallet address found in $file."
    fi
done

echo "All wallet addresses processed for balance setting."
