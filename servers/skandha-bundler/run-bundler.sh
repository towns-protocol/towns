
#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./../../scripts/wait-for-basechain.sh

# Ethereum node endpoint
NODE_URL="http://127.0.0.1:8545"

# the entrypoint address, which is deterministic
CONTRACT_ADDRESS="0x1F470e62B947Eb5e289B4573E4c6EeE090CbC379"

JSON_PAYLOAD=$(jq -n --arg addr "$CONTRACT_ADDRESS" '{"jsonrpc":"2.0","method":"eth_getCode","params":[$addr, "latest"],"id":1}')

RESPONSE=$(curl -sX POST --data "$JSON_PAYLOAD" -H "Content-Type: application/json" $NODE_URL 2>&1)

# Check if the JSON response indicates the existence of the contract
if [[ $RESPONSE == *"\"result\":\"0x\""* ]]; then
    echo "No entrypoint contract found at $CONTRACT_ADDRESS. Deploying..."
    ./../../scripts/deploy-account-abstraction.sh
else
    echo "Entrypoint deployed at $CONTRACT_ADDRESS. Skipping deployment..."
fi

docker compose up --build
