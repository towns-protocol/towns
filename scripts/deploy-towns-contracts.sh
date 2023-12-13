#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

if [ "$1" != "nobuild" ]; then
    make build
fi

# V3 Contracts
make deploy-base-anvil-nb contract=DeployPioneer
make deploy-base-anvil-nb contract=DeployTownOwner
make deploy-base-anvil-nb contract=DeployUserEntitlement
make deploy-base-anvil-nb contract=DeployTokenEntitlement
make deploy-base-anvil-nb contract=DeployTown
make deploy-base-anvil-nb contract=DeployTownFactory

# For testing
make deploy-base-anvil-nb contract=DeployMember
make deploy-base-anvil-nb contract=DeployMockNFT

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/localhost/addresses/townFactory.json casablanca/node/run_files/addresses
