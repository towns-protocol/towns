#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

: ${RIVER_ENV:?}
export BASE_CHAIN_ID="${BASE_CHAIN_ID:-31337}"
export RIVER_CHAIN_ID="${RIVER_CHAIN_ID:-31338}"

SKIP_CHAIN_WAIT="${SKIP_CHAIN_WAIT:-false}"
BASE_EXECUTION_CLIENT="${BASE_EXECUTION_CLIENT:-''}"
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

# Only anvil supports automine but this might be a local geth node
if [ "${BASE_EXECUTION_CLIENT}" != "geth_dev" ]; then
    cast rpc evm_setAutomine true --rpc-url $BASE_ANVIL_RPC_URL
fi
cast rpc evm_setAutomine true --rpc-url $RIVER_ANVIL_RPC_URL

# Space Architect
make clear-anvil-deployments
make deploy-base-anvil contract=DeployMultiInit
make deploy-base-anvil type=facet contract=DeployDiamondCut
make deploy-base-anvil type=facet contract=DeployDiamondLoupe
make deploy-base-anvil type=facet contract=DeployIntrospection
make deploy-base-anvil type=facet contract=DeployOwnable
make deploy-base-anvil type=facet contract=DeployMainnetDelegation
make deploy-base-anvil type=facet contract=DeployEntitlementChecker
make deploy-base-anvil type=facet contract=DeployMetadata
make deploy-base-anvil type=facet contract=DeployNodeOperator
make deploy-base-anvil type=facet contract=DeploySpaceDelegation
make deploy-base-anvil type=facet contract=DeployRewardsDistribution
make deploy-base-anvil type=facet contract=DeployMockMessenger # util
make deploy-base-anvil type=facet contract=DeployERC721ANonTransferable
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

if [ "${BASE_EXECUTION_CLIENT}" != "geth_dev" ]; then
    cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $BASE_ANVIL_RPC_URL
fi
cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $RIVER_ANVIL_RPC_URL

popd

mkdir -p packages/generated/deployments/${RIVER_ENV}/base/addresses
mkdir -p packages/generated/deployments/${RIVER_ENV}/river/addresses

function copy_addresses() {
    local SOURCE_DIR=$1
    local DEST_DIR=$2
    local CHAIN_ID=$3
    cp contracts/deployments/${SOURCE_DIR}/* packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/addresses
    echo "{\"id\": ${CHAIN_ID}}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/chainId.json

    if [ "$DEST_DIR" = "base" ] && [ -n "$BASE_EXECUTION_CLIENT" ]; then
        echo "{\"executionClient\": \"${BASE_EXECUTION_CLIENT}\"}" > packages/generated/deployments/${RIVER_ENV}/${DEST_DIR}/executionClient.json
    fi
}

# copy base contracts
copy_addresses $BASE_ANVIL_SOURCE_DIR "base" "${BASE_CHAIN_ID}"
# copy river contracts
copy_addresses $RIVER_ANVIL_SOURCE_DIR "river" "${RIVER_CHAIN_ID}"

# Update the config
pushd ./packages/generated
    yarn make-config
popd
