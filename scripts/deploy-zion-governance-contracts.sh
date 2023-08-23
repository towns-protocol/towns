#!/usr/bin/env bash
cd contracts/
# yarn clean
set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployMember
make deploy-anvil contract=DeploySpaceUpgrades
make deploy-anvil contract=DeployMockNFT
