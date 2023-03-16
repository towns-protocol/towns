#!/usr/bin/env bash
cd packages/contracts/
yarn clean
source .env.localhost
make deploy-anvil contract=DeployMember
make deploy-anvil contract=DeploySpaces
