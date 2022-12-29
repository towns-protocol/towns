#!/usr/bin/env bash
cd contracts/
yarn clean
# source .env
make deploy-anvil contract=Local
make deploy-anvil contract=CouncilNFT
make deploy-anvil contract=Spaces
cp -r ../packages/contracts/localhost/addresses/space-factory.json ../servers/dendrite/zion/contracts/localhost_space_factory/space-factory.json
cp -r ../packages/contracts/localhost/addresses/ ../servers/dendrite/zion/contracts/zion_localhost/
