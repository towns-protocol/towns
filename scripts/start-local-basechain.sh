#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "Starting local Base chain..."

RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"
OPTS="--block-time $RIVER_BLOCK_TIME ${RIVER_ANVIL_OPTS:-}"

echo "Block time: $RIVER_BLOCK_TIME"
echo "Options: $OPTS"

anvil --chain-id 31337 --port 8545 $OPTS
