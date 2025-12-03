#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "stress/scripts/stress_beta_chat.sh"

export SPACE_ID="${SPACE_ID}"
export ANNOUNCE_CHANNEL_ID="${ANNOUNCE_CHANNEL_ID}"
export CHANNEL_IDS="${CHANNEL_IDS}"
export MNEMONIC="${MNEMONIC}"
export BASE_CHAIN_RPC_URL="${BASE_CHAIN_RPC_URL}"
export RIVER_CHAIN_RPC_URL="${RIVER_CHAIN_RPC_URL}"

export CONTAINER_INDEX="${CONTAINER_INDEX:0}"
export CONTAINER_COUNT="${CONTAINER_COUNT:1}"
export STRESS_DURATION="${STRESS_DURATION:-180}"
export PROCESSES_PER_CONTAINER="${PROCESSES_PER_CONTAINER:-2}"
export CLIENTS_COUNT="${CLIENTS_COUNT:-40}"
export RANDOM_CLIENTS_COUNT="${RANDOM_CLIENTS_COUNT:-0}"

export RIVER_ENV="${RIVER_ENV:-beta}"
export STRESS_MODE="${STRESS_MODE:-chat}"
export SESSION_ID="${SESSION_ID:-$(uuidgen)}"

./scripts/start.sh "$@"