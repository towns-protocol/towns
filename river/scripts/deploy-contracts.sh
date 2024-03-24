#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

cd ../contracts
rm -rf addresses/base_anvil
rm -rf addresses/river_anvil

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    make build
fi

# V3 Contracts
make deploy-base-anvil type=contract contract=DeploySpaceFactory
make deploy-base-anvil type=contract contract=DeployMember
make deploy-base-anvil type=contract contract=DeployMockNFT

cd ..
mkdir -p core/node/run_files/addresses
mkdir -p packages/generated/addresses/base_anvil

# copy contracts to specific places
cp contracts/deployments/base_anvil/spaceFactory.json packages/generated/addresses/base_anvil
cp contracts/deployments/base_anvil/spaceOwner.json packages/generated/addresses/base_anvil
cp contracts/deployments/base_anvil/mockNFT.json packages/generated/addresses/base_anvil
cp contracts/deployments/base_anvil/member.json packages/generated/addresses/base_anvil
cp contracts/deployments/base_anvil/spaceFactory.json core/node/run_files/addresses
