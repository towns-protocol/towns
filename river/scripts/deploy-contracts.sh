#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

: ${RIVER_ENV:?}
export BASE_CHAIN_ID="${BASE_CHAIN_ID:-31337}"
export BASE_CONTRACT_VERSION="${BASE_CONTRACT_VERSION:-dev}"
export RIVER_CHAIN_ID="${RIVER_CHAIN_ID:-31338}"
export RIVER_CONTRACT_VERSION="${RIVER_CONTRACT_VERSION:-dev}"

echo "Deploying contracts for ${RIVER_ENV} environment"

./scripts/wait-for-basechain.sh
./scripts/wait-for-riverchain.sh

rm -rf contracts/deployments/*
rm -rf packages/generated/deployments/${RIVER_ENV}


pushd contracts

set -a
. .env.localhost
set +a


if [ "${1-}" != "nobuild" ]; then
    make build
fi

# Account Abstraction is not supported on anvil
# make deploy-base-anvil type=contract contract=DeployEntrypoint
# make deploy-base-anvil type=contract contract=DeployAccountFactory

# Space Architect
make deploy-base-anvil type=contract contract=DeploySpaceFactory
make deploy-base-anvil type=contract contract=DeployMember
make deploy-base-anvil type=contract contract=DeployMockNFT

# Wallet Link
make deploy-base-anvil type=contract contract=DeployMultiInit
make deploy-base-anvil type=contract contract=DeployWalletLink

# Entitlement Checker
make deploy-base-anvil type=facet contract=DeployEntitlementChecker
make deploy-base-anvil type=contract contract=DeployEntitlementGatedExample

# River Registry
make deploy-river-anvil type=contract contract=DeployRiverRegistry

popd

mkdir -p packages/generated/deployments/${RIVER_ENV}/base/addresses
mkdir -p packages/generated/deployments/${RIVER_ENV}/river/addresses

function copy_addresses() {
    SOURCE_DIR=$1
    DEST_DIR=$2
    CHAIN_ID=$3
    CONTRACT_VERSION=$4
    cp contracts/deployments/${SOURCE_DIR}/* packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/addresses
    echo "{\"id\": ${CHAIN_ID}}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/chainId.json
    echo "{\"version\": \"${CONTRACT_VERSION}\"}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/contractVersion.json
}

# copy base contracts
copy_addresses "base_anvil" "base" "${BASE_CHAIN_ID}" "${BASE_CONTRACT_VERSION}"
# copy river contracts
copy_addresses "river_anvil" "river" "${RIVER_CHAIN_ID}" "${RIVER_CONTRACT_VERSION}"

# Update the config
./packages/generated/scripts/make-config.sh
