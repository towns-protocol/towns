#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "stress/scripts/start.sh"

# environment
export RIVER_ENV="${RIVER_ENV}"
export BASE_CHAIN_RPC_URL="${BASE_CHAIN_RPC_URL}"
export RIVER_CHAIN_RPC_URL="${RIVER_CHAIN_RPC_URL}"
export MNEMONIC="${MNEMONIC}"
# stress
export SPACE_ID="${SPACE_ID}"
export ANNOUNCE_CHANNEL_ID="${ANNOUNCE_CHANNEL_ID:-}"
export CHANNEL_IDS="${CHANNEL_IDS}"
export SESSION_ID="${SESSION_ID}" # used to identify metrics across multiple containers in the same run
export STRESS_MODE="${STRESS_MODE}" # values are chat, info
export STRESS_DURATION="${STRESS_DURATION:-600}"
# extra validation
if [ -z "$SESSION_ID" ]; then
  echo "SESSION_ID is required"
  exit 1
fi

# logging
export DEBUG="${DEBUG:-}"
if [ -z "$DEBUG" ]; then
    export DEBUG="stress:*"
fi
export DEBUG_DEPTH="${DEBUG_DEPTH:-10}"
# stride 
export CONTAINER_INDEX="${CONTAINER_INDEX:-0}"
export CONTAINER_COUNT="${CONTAINER_COUNT:-1}"
export PROCESSES_PER_CONTAINER="${PROCESSES_PER_CONTAINER:-1}"
export CLIENTS_COUNT="${CLIENTS_COUNT:-10}"

# optional deployment environment variables, all required if pointed to a custom deployment
export BASE_CHAIN_ID="${BASE_CHAIN_ID:-}" # not required if using deployment in packages/generated/deployments
export SPACE_FACTORY_ADDRESS="${SPACE_FACTORY_ADDRESS:-}" # not required if using deployment in packages/generated/deployments
export SPACE_OWNER_ADDRESS="${SPACE_OWNER_ADDRESS:-}" # not required if using deployment in packages/generated/deployments
export RIVER_CHAIN_ID="${RIVER_CHAIN_ID:-}" # not required if using deployment in packages/generated/deployments
export RIVER_REGISTRY_ADDRESS="${RIVER_REGISTRY_ADDRESS:-}" # not required if using deployment in packages/generated/deployments
export CONTRACT_VERSION="${CONTRACT_VERSION:-}" # not required if using deployment in packages/generated/deployments

# validation
# if clients per process is greater than clients count, exit
if [ $PROCESSES_PER_CONTAINER -eq 0 ]; then
  echo "PROCESSES_PER_CONTAINER should be gte 0"
  exit 1
fi
if [ $CONTAINER_COUNT -gt $CLIENTS_COUNT ]; then
  echo "CONTAINER_COUNT cannot be greater than CLIENTS_COUNT"
  exit 1
fi

# calculate number of clients per container
export CLIENTS_PER_CONTAINER=$((CLIENTS_COUNT / CONTAINER_COUNT))

# hopefully this is mod 0
if [ $PROCESSES_PER_CONTAINER -gt $CLIENTS_PER_CONTAINER ]; then
  echo "CLIENTS_PER_PROCESS cannot be greater than PROCESSES_PER_CONTAINER"
  exit 1
fi

# calculate number of processes
export CLIENTS_PER_PROCESS=$((CLIENTS_PER_CONTAINER / PROCESSES_PER_CONTAINER))
# calculate the start index for this container
export PROCESS_START_INDEX=$((CONTAINER_INDEX * PROCESSES_PER_CONTAINER))
# calculate the end index for this container
export PROCESS_END_INDEX=$((PROCESS_START_INDEX + PROCESSES_PER_CONTAINER))

# print all these variables
echo "CONTAINER_INDEX: $CONTAINER_INDEX"
echo "CONTAINER_COUNT: $CONTAINER_COUNT"
echo "CLIENTS_PER_PROCESS: $CLIENTS_PER_PROCESS"
echo "CLIENTS_COUNT: $CLIENTS_COUNT"
echo "CLIENTS_PER_CONTAINER: $CLIENTS_PER_CONTAINER"
echo "PROCESSES_PER_CONTAINER: $PROCESSES_PER_CONTAINER"
echo "PROCESS_START_INDEX: $PROCESS_START_INDEX"
echo "PROCESS_END_INDEX: $PROCESS_END_INDEX"

if [ $((CONTAINER_COUNT * PROCESSES_PER_CONTAINER * CLIENTS_PER_PROCESS)) -ne $CLIENTS_COUNT ]; then
  echo "container count * processes per container * clients per process should equal clients count"
  exit 1
fi

yarn build

# Array to hold process IDs
declare -a pids

# start the clients
for i in $(seq $PROCESS_START_INDEX $((PROCESS_END_INDEX - 1))); do  # seq is inclusive
  PROCESS_INDEX=$i CLIENTS_PER_PROCESS=$CLIENTS_PER_PROCESS yarn start &
  pids+=($!)
done

# Wait for all processes to finish
for pid in "${pids[@]}"; do
  echo "Waiting on PID $pid to complete..."
  wait $pid || true
done

echo "All processes have completed."


