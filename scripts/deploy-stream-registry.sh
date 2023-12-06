#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployStreamRegistry

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/localhost/addresses/streamRegistry.json casablanca/node/run_files/addresses
