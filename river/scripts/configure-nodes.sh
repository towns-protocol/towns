#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..


# check to see if the user passed a --single or --multi flag
# if not, default to --single
if [ "$1" == "--single" ]; then
  ./core/node/run_single.sh -c
elif [ "$1" == "--single_ne" ]; then
  ./core/node/run_single.sh -c --de
elif [ "$1" == "--multi" ]; then
  ./core/node/run_multi.sh -c
elif [ "$1" == "--multi_ne" ]; then
  ./core/node/run_multi.sh -c --de
else
    echo "No flag passed"
    exit 1
fi




