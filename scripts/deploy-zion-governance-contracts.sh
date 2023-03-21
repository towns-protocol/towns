#!/usr/bin/env bash
cd packages/contracts/
# yarn clean
set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployLocalMember
make deploy-anvil contract=DeploySpaces
