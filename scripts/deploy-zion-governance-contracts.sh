#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

# this line makes sure that the script exits if any command fails
set -ueo pipefail

set -a
. .env.localhost
set +a

# V3 Contracts
make deploy-anvil contract=DeployPioneer
make deploy-anvil contract=DeployTownOwner
make deploy-anvil contract=DeployUserEntitlement
make deploy-anvil contract=DeployTokenEntitlement
make deploy-anvil contract=DeployTown
make deploy-anvil contract=DeployTownFactory

# For testing
make deploy-anvil contract=DeployMember
make deploy-anvil contract=DeployMockNFT

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/localhost/addresses/townFactory.json casablanca/node/run_files/addresses
