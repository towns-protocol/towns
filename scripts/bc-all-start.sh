#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

CONTRACTS_CHANGED="${1:-true}"  # Default to native if not specified
export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

./scripts/bc-all-stop.sh

if [ "$CONTRACTS_CHANGED" = "true" ]; then
    echo "Starting native Anvil chains (contracts changed)..."
    ./scripts/start-local-basechain.sh &
    ./scripts/start-local-riverchain.sh &
    echo "STARTED NATIVE ANVIL CHAINS, BLOCK_TIME=${RIVER_BLOCK_TIME}"
else
    echo "Starting Docker-based Anvil chains (no contract changes)..."
    cd ./core
    just USE_DOCKER_CHAINS=1 anvils
    echo "STARTED DOCKER ANVIL CHAINS, BLOCK_TIME=${RIVER_BLOCK_TIME}"
fi
