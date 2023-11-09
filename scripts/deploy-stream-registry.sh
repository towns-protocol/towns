#!/usr/bin/env bash
cd contracts/
# yarn clean
set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployStreamRegistry

cd ../
cp packages/generated/localhost/addresses/streamRegistry.json casablanca/node/registries/contracts/localhost_stream_registry.json