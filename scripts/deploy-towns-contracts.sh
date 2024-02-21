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

CHAIN_ID_FILE=packages/generated/dev/addresses/.chainId
# Start with clean chainId file
if [ -f "$CHAIN_ID_FILE" ]; then
    rm "$CHAIN_ID_FILE"
fi

# V3 Contracts
make deploy-base-anvil-nb contract=DeployTownFactory

# For testing
make deploy-base-anvil-nb contract=DeployMember
make deploy-base-anvil-nb contract=DeployMockNFT

cd ..
mkdir -p casablanca/node/run_files/addresses
cp packages/generated/dev/addresses/townFactory.json casablanca/node/run_files/addresses
