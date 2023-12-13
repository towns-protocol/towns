#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

# this line makes sure that the script exits if any command fails
set -ueo pipefail

set -a
. .env.localhost
set +a

# V3 Contracts
make deploy-base-anvil contract=DeployPioneer
make deploy-base-anvil contract=DeployTownOwner
make deploy-base-anvil contract=DeployUserEntitlement
make deploy-base-anvil contract=DeployTokenEntitlement
make deploy-base-anvil contract=DeployTown
make deploy-base-anvil contract=DeployTownFactory

# For testing
make deploy-base-anvil contract=DeployMember
make deploy-base-anvil contract=DeployMockNFT

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/localhost/addresses/townFactory.json casablanca/node/run_files/addresses
