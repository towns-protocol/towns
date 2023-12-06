#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a
make deploy-anvil contract=DeployMultiInit
make deploy-anvil contract=DeployWalletLink

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/localhost/addresses/walletLink.json casablanca/node/run_files/addresses
