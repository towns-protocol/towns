#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "Starting local River chain..."

RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

# If RIVER_BLOCK_TIME is set assign "--block-time XX" to $OPTS
if [ -z ${RIVER_BLOCK_TIME+x} ]; then
  OPTS="${RIVER_ANVIL_OPTS:-}"
else
  OPTS="--block-time $RIVER_BLOCK_TIME ${RIVER_ANVIL_OPTS:-}"
fi

echo "Block time: $RIVER_BLOCK_TIME"
echo "Options: $OPTS"

anvil --chain-id 31338 --port 8546  $OPTS
