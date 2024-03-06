#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

rm -rf river/packages/generated/addresses/base_anvil


export LOCAL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

if [ "${1-}" != "nobuild" ]; then
    forge build
fi

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployMultiInit.s.sol:DeployMultiInit --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployWalletLink.s.sol:DeployWalletLink --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeploySpaceFactory.s.sol:DeploySpaceFactory --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployMember.s.sol:DeployMember --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployMockNFT.s.sol:DeployMockNFT --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployEntitlementChecker.s.sol:DeployEntitlementChecker --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

SAVE_DEPLOYMENTS=1 OVERRIDE_DEPLOYMENTS=1 forge script river/contracts/scripts/deployments/DeployEntitlementGatedExample.s.sol:DeployEntitlementGatedExample --ffi --private-key ${LOCAL_PRIVATE_KEY} --rpc-url base_anvil --broadcast --slow

mkdir -p river/core/node/run_files/addresses
cp contracts/deployments/base_anvil/*.json river/core/node/run_files/addresses/

mv -f contracts/deployments/base_anvil river/packages/generated/addresses/
