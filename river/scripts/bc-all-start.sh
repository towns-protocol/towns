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

# Start chain in background
./scripts/start-local-basechain.sh &
./scripts/start-local-riverchain.sh &


echo "STARTED ALL CHAINS AND BUILT ALL CONTRACTS, BLOCK_TIME=${RIVER_BLOCK_TIME}"
