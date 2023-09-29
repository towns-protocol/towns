#!/usr/bin/env bash
cd contracts/

# this line makes sure that the script exits if any command fails
set -eo pipefail

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

cd ../
cp packages/generated/localhost/addresses/townFactory.json servers/dendrite/zion/contracts/localhost_town_factory.json
cp packages/generated/goerli/addresses/townFactory.json servers/dendrite/zion/contracts/goerli_town_factory.json
cp packages/generated/sepolia/addresses/townFactory.json servers/dendrite/zion/contracts/sepolia_town_factory.json
cp packages/generated/localhost/addresses/townFactory.json casablanca/node/auth/contracts/localhost_town_factory.json
cp packages/generated/goerli/addresses/townFactory.json casablanca/node/auth/contracts/goerli_town_factory.json
cp packages/generated/sepolia/addresses/townFactory.json casablanca/node/auth/contracts/sepolia_town_factory.json
