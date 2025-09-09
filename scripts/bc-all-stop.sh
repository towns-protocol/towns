#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# Function to wait for a process and exit if it fails
wait_for_process() {
    local pid=$1
    local name=$2
    wait "$pid" || { echo "Error: $name (PID: $pid) failed." >&2; exit 1; }
}

./scripts/kill-on-port.sh 8545 & PID1=$!
./scripts/kill-on-port.sh 8546 & PID2=$!

# Stop Docker containers if they exist
docker stop towns-base-chain towns-river-chain 2>/dev/null || true
docker rm towns-base-chain towns-river-chain 2>/dev/null || true

wait_for_process "$PID1" "stop_base_anvil"
wait_for_process "$PID2" "stop_river_anvil"
