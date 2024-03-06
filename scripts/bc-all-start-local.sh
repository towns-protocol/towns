#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./river/scripts/bc-all-stop.sh

# Start chain in background
./river/scripts/start-local-basechain.sh &
./river/scripts/start-local-riverchain.sh &

# Build & Deploy contracts
./scripts/deploy-base-contracts.sh
./scripts/deploy-river-contracts.sh nobuild

echo "STARTED ALL CHAINS AND DEPLOYED ALL CONTRACTS, BLOCK_TIME=${RIVER_BLOCK_TIME:-0}"
