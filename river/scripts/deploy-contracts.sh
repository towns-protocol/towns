#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

: ${RIVER_ENV:?}
export BASE_CHAIN_ID="${BASE_CHAIN_ID:-31337}"
export BASE_CONTRACT_VERSION="${BASE_CONTRACT_VERSION:-dev}"
export RIVER_CHAIN_ID="${RIVER_CHAIN_ID:-31338}"
export RIVER_CONTRACT_VERSION="${RIVER_CONTRACT_VERSION:-dev}"

SKIP_CHAIN_WAIT="${SKIP_CHAIN_WAIT:-false}"
BASE_ANVIL_SOURCE_DIR=${BASE_ANVIL_SOURCE_DIR:-"base_anvil"}
RIVER_ANVIL_SOURCE_DIR=${RIVER_ANVIL_SOURCE_DIR:-"river_anvil"}

echo "Deploying contracts for ${RIVER_ENV} environment"

# Wait for the chains to be ready
if [ "${SKIP_CHAIN_WAIT}" != "true" ]; then
    ./scripts/wait-for-basechain.sh
    ./scripts/wait-for-riverchain.sh
fi

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
RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

cast rpc evm_setAutomine true --rpc-url $BASE_ANVIL_RPC_URL
cast rpc evm_setAutomine true --rpc-url $RIVER_ANVIL_RPC_URL

# Space Architect
make clear-anvil-deployments
make deploy-base-anvil type=contract contract=DeployBaseRegistry
make deploy-base-anvil type=contract contract=DeployProxyBatchDelegation
make deploy-base-anvil type=contract contract=DeployRiverBase
make deploy-base-anvil type=contract contract=DeploySpaceFactory
make interact-base-anvil type=contract contract=InteractPostDeploy

# Utils
make deploy-base-anvil type=contract contract=DeployMember
make deploy-base-anvil type=contract contract=DeployMockNFT
make deploy-base-anvil type=contract contract=DeployEntitlementGatedExample
make deploy-base-anvil type=contract contract=DeployCustomEntitlementExample

# River Registry
make deploy-river-anvil type=contract contract=DeployRiverRegistry

cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $BASE_ANVIL_RPC_URL
cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $RIVER_ANVIL_RPC_URL

popd

mkdir -p packages/generated/deployments/${RIVER_ENV}/base/addresses
mkdir -p packages/generated/deployments/${RIVER_ENV}/river/addresses

function copy_addresses() {
    local SOURCE_DIR=$1
    local DEST_DIR=$2
    local CHAIN_ID=$3
    local CONTRACT_VERSION=$4
    cp contracts/deployments/${SOURCE_DIR}/* packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/addresses
    echo "{\"id\": ${CHAIN_ID}}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/chainId.json
    echo "{\"version\": \"${CONTRACT_VERSION}\"}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/contractVersion.json
}

# copy base contracts
copy_addresses $BASE_ANVIL_SOURCE_DIR "base" "${BASE_CHAIN_ID}" "${BASE_CONTRACT_VERSION}"
# copy river contracts
copy_addresses $RIVER_ANVIL_SOURCE_DIR "river" "${RIVER_CHAIN_ID}" "${RIVER_CONTRACT_VERSION}"

# Update the config
./packages/generated/scripts/make-config.sh
