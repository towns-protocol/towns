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
RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

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
# make deploy-any-local rpc=base_anvil type=utils contract=DeployEntrypoint
# make deploy-any-local rpc=base_anvil type=utils contract=DeployAccountFactory


# Only anvil supports automine but this might be a local geth node
if [ "${BASE_EXECUTION_CLIENT}" != "geth_dev" ]; then
    cast rpc evm_setAutomine true --rpc-url $BASE_ANVIL_RPC_URL
fi
cast rpc evm_setAutomine true --rpc-url $RIVER_ANVIL_RPC_URL

# Space Architect
make clear-anvil-deployments
make deploy-any-local rpc=base_anvil type=utils contract=DeployMultiInit
make deploy-any-local rpc=base_anvil type=facets contract=DeployDiamondCut
make deploy-any-local rpc=base_anvil type=facets contract=DeployDiamondLoupe
make deploy-any-local rpc=base_anvil type=facets contract=DeployIntrospection
make deploy-any-local rpc=base_anvil type=facets contract=DeployOwnable
make deploy-any-local rpc=base_anvil type=facets contract=DeployMainnetDelegation
make deploy-any-local rpc=base_anvil type=facets contract=DeployEntitlementChecker
make deploy-any-local rpc=base_anvil type=facets contract=DeployMetadata
make deploy-any-local rpc=base_anvil type=facets contract=DeployNodeOperator
make deploy-any-local rpc=base_anvil type=facets contract=DeploySpaceDelegation
make deploy-any-local rpc=base_anvil type=facets contract=DeployRewardsDistribution
make deploy-any-local rpc=base_anvil type=facets contract=DeployMockMessenger # util
make deploy-any-local rpc=base_anvil type=facets contract=DeployERC721ANonTransferable
make deploy-any-local rpc=base_anvil type=diamonds contract=DeployBaseRegistry
make deploy-any-local rpc=base_anvil type=utils contract=DeployProxyBatchDelegation
make deploy-any-local rpc=base_anvil type=utils contract=DeployRiverBase
make deploy-any-local rpc=base_anvil type=diamonds contract=DeploySpaceFactory
make interact-any-local rpc=base_anvil contract=InteractPostDeploy

# Utils
make deploy-any-local rpc=base_anvil type=utils contract=DeployMember
make deploy-any-local rpc=base_anvil type=utils contract=DeployMockNFT
make deploy-any-local rpc=base_anvil type=utils contract=DeployEntitlementGatedExample
make deploy-any-local rpc=base_anvil type=utils contract=DeployCustomEntitlementExample

# River Registry
make deploy-any-local rpc=river_anvil type=diamonds contract=DeployRiverRegistry

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
