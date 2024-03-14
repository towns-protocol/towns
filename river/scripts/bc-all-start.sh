#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

./scripts/bc-all-stop.sh

# Function to wait for a process and exit if it fails
wait_for_process() {
    local pid=$1
    local name=$2
    wait "$pid" || { echo "Error: $name (PID: $pid) failed." >&2; exit 1; }
}

# Start contract build in background
./scripts/build-contracts.sh & BUILD_PID=$!

# Start chain in background
./scripts/start-local-basechain.sh &
./scripts/start-local-riverchain.sh &

# Wait for build to finish
wait_for_process "$BUILD_PID" "build"

# Run deployements in parallel
./scripts/deploy-base.sh nobuild & PID1=$!
./scripts/deploy-river.sh nobuild & PID2=$!

# Wait for all deployments to finish
wait_for_process "$PID1" "deploy-base.sh"
wait_for_process "$PID2" "deploy-river.sh"

echo "STARTED ALL CHAINS AND DEPLOYED ALL CONTRACTS, BLOCK_TIME=${RIVER_BLOCK_TIME}"
