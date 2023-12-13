#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

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

# Wait for both chains to start
./scripts/wait-for-basechain.sh
./scripts/wait-for-riverchain.sh

# Run deployements in parallel
./scripts/deploy-base.sh & PID1=$!
./scripts/deploy-river.sh & PID2=$!

# Wait for all deployments to finish
wait_for_process "$PID1" "deploy-base.sh"
wait_for_process "$PID2" "deploy-river.sh"

echo "STARTED ALL CHAINS AND DEPLOYED ALL CONTRACTS"
