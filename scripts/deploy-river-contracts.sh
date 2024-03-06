#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

rm -rf river/packages/generated/addresses/river_anvil


export LOCAL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

if [ "${1-}" != "nobuild" ]; then
    forge build
fi

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployRiverRegistry.s.sol:DeployRiverRegistry --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url river_anvil --broadcast --slow

mkdir -p river/core/node/run_files/addresses
cp contracts/deployments/river_anvil/riverRegistry.json river/core/node/run_files/addresses
mv -f contracts/deployments/river_anvil river/packages/generated/addresses/
