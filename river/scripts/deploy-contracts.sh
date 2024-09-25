#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

: ${RIVER_ENV:?}
export BASE_CHAIN_ID="${BASE_CHAIN_ID:-31337}"
export RIVER_CHAIN_ID="${RIVER_CHAIN_ID:-31338}"

SKIP_CHAIN_WAIT="${SKIP_CHAIN_WAIT:-false}"
BASE_EXECUTION_CLIENT="${BASE_EXECUTION_CLIENT:-}"
BASE_ANVIL_SOURCE_DIR=${BASE_ANVIL_SOURCE_DIR:-"base_anvil"}
RIVER_ANVIL_SOURCE_DIR=${RIVER_ANVIL_SOURCE_DIR:-"river_anvil"}
RIVER_BLOCK_TIME="${RIVER_BLOCK_TIME:-1}"

echo "Deploying contracts for ${RIVER_ENV} environment"

# Wait for the chains to be ready
if [ "${SKIP_CHAIN_WAIT}" != "true" ]; then
    ./scripts/wait-for-basechain.sh
    ./scripts/wait-for-riverchain.sh
fi

rm -rf contracts/deployments/${RIVER_ENV}
rm -rf packages/generated/deployments/${RIVER_ENV}


pushd contracts

set -a
. .env.localhost
set +a


if [ "${1-}" != "nobuild" ]; then
    make build
fi

# Account Abstraction is not supported on anvil
# make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntrypoint
# make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployAccountFactory


# Only anvil supports automine but this might be a local geth node
if [ "${BASE_EXECUTION_CLIENT}" != "geth_dev" ]; then
    cast rpc evm_setAutomine true --rpc-url $BASE_ANVIL_RPC_URL
fi
cast rpc evm_setAutomine true --rpc-url $RIVER_ANVIL_RPC_URL

# Space Architect
make clear-anvil-deployments context=$RIVER_ENV
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployBaseRegistry
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployProxyBatchDelegation
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployRiverBase
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpace
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceOwner
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployUserEntitlement
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricing
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployFixedPricing
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceFactory
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractPostDeploy
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractSetDefaultUriLocalhost

# Utils
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMember
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMockNFT
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntitlementGatedExample

# River Registry
make deploy-any-local context=$RIVER_ENV rpc=river_anvil type=diamonds contract=DeployRiverRegistry

if [ "${BASE_EXECUTION_CLIENT}" != "geth_dev" ]; then
    cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $BASE_ANVIL_RPC_URL
fi
cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $RIVER_ANVIL_RPC_URL

popd


# mkdir -p packages/generated/deployments/${RIVER_ENV}/{base,river}
cp -r contracts/deployments/${RIVER_ENV} packages/generated/deployments/${RIVER_ENV}


if [ -n "$BASE_EXECUTION_CLIENT" ]; then
    echo "{\"executionClient\": \"${BASE_EXECUTION_CLIENT}\"}" > packages/generated/deployments/${RIVER_ENV}/base/executionClient.json
fi

# Update the config
pushd ./packages/generated
    yarn make-config
popd
