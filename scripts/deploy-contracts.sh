#!/bin/bash
set -euo pipefail

# Get the absolute path of the script directory and project root
SCRIPT_DIR="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

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
    "$SCRIPT_DIR/wait-for-basechain.sh"
    "$SCRIPT_DIR/wait-for-riverchain.sh"
fi

rm -rf "$PROJECT_ROOT/packages/contracts/deployments/${RIVER_ENV}"
rm -rf "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}"

cd "$PROJECT_ROOT/packages/contracts"

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    yarn turbo build --filter=@towns-protocol/contracts
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
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTownsBase
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpace
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceOwner
make deploy-facet-local context=$RIVER_ENV rpc=base_anvil contract=UserEntitlement
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV2
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTieredLogPricingV3
make deploy-facet-local context=$RIVER_ENV rpc=base_anvil contract=FixedPricing
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceFactory
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployRiverAirdrop
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractPostDeploy
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractSetDefaultUriLocalhost
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractClaimCondition
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

cd "$PROJECT_ROOT"

# Ensure the destination directory exists
mkdir -p "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}"
cp -r "$PROJECT_ROOT/packages/contracts/deployments/${RIVER_ENV}/." "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}/"

if [ -n "$BASE_EXECUTION_CLIENT" ]; then
    echo "{\"executionClient\": \"${BASE_EXECUTION_CLIENT}\"}" > "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}/base/executionClient.json"
fi

# Update the config
cd "$PROJECT_ROOT/packages/generated"
yarn make-config
