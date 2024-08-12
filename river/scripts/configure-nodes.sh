#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

export RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

if [ "$1" == "--multi" ]; then
  ./core/node/run_multi.sh -c
elif [ "$1" == "--multi_ne" ]; then
  ./core/node/run_multi.sh -c --de
else
    echo "No flag passed"
    exit 1
fi




