#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    make build
fi

make deploy-river-anvil-explicit contract=DeployRiverRegistry

cd ..
mkdir -p casablanca/node/run_files/addresses
cp contracts/deployments/river_anvil/riverRegistry.json casablanca/node/run_files/addresses
