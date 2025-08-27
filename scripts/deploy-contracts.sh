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

: ${BASE_RPC_URL:?}
: ${BASE_ANVIL_RPC_URL:?}
: ${RIVER_ANVIL_RPC_URL:?}

if [ "${1-}" != "nobuild" ]; then
    pnpm turbo build --filter=@towns-protocol/contracts
fi

# Account Abstraction is not supported on anvil
# make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntrypoint
# make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployAccountFactory

# Deploying contracts with automine is faster
cast rpc evm_setAutomine true --rpc-url $BASE_ANVIL_RPC_URL
cast rpc evm_setAutomine true --rpc-url $RIVER_ANVIL_RPC_URL

# Deploy base contracts
"$SCRIPT_DIR/deploy-base-contracts.sh" nobuild

# Deploy Multicall3
MULTICALL3_ADDRESS=0xcA11bde05977b3631167028862bE2a173976CA11
MULTICALL3_BYTECODE=$(cast code $MULTICALL3_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MULTICALL3_ADDRESS $MULTICALL3_BYTECODE --rpc-url $RIVER_ANVIL_RPC_URL

# River Registry
make deploy-any-local context=$RIVER_ENV rpc=river_anvil type=diamonds contract=DeployRiverRegistry

# Restore to interval mining
cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $BASE_ANVIL_RPC_URL
cast rpc evm_setIntervalMining $RIVER_BLOCK_TIME --rpc-url $RIVER_ANVIL_RPC_URL

cd "$PROJECT_ROOT"

# Ensure the destination directory exists
mkdir -p "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}"
cp -r "$PROJECT_ROOT/packages/contracts/deployments/${RIVER_ENV}/." "$PROJECT_ROOT/packages/generated/deployments/${RIVER_ENV}/"

# Update the config
cd "$PROJECT_ROOT/packages/generated"
pnpm make-config
