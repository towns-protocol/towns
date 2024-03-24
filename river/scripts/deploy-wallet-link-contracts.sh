#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    make build
fi

make deploy-base-anvil type=contract contract=DeployMultiInit
make deploy-base-anvil type=contract contract=DeployWalletLink

cd ..

mkdir -p core/node/run_files/addresses
mkdir -p packages/generated/addresses/base_anvil

cp contracts/deployments/base_anvil/walletLink.json packages/generated/addresses/base_anvil
cp contracts/deployments/base_anvil/walletLink.json core/node/run_files/addresses
