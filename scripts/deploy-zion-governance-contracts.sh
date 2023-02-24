#!/usr/bin/env bash
cd contracts/
yarn clean
source .env.localhost
make deploy-anvil contract=DeployMember
make deploy-anvil contract=DeploySpaces

cp -r ../packages/contracts/localhost/addresses/ ../servers/dendrite/zion/contracts/zion_localhost/
