#!/bin/bash
set -euo pipefail

# Get the absolute path of the script directory and project root
SCRIPT_DIR="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/packages/contracts"

set -a
. .env.localhost
set +a

: ${RIVER_ENV:?}
: ${BASE_RPC_URL:?}
: ${BASE_ANVIL_RPC_URL:?}

# Build if not called with nobuild
if [ "${1-}" != "nobuild" ]; then
    forge build
fi

# Deploy Multicall3
MULTICALL3_ADDRESS=0xcA11bde05977b3631167028862bE2a173976CA11
MULTICALL3_BYTECODE=$(cast code $MULTICALL3_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MULTICALL3_ADDRESS $MULTICALL3_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy Permit2
PERMIT2_ADDRESS=0x000000000022D473030F116dDEE9F6B43aC78BA3
PERMIT2_BYTECODE=$(cast code $PERMIT2_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $PERMIT2_ADDRESS $PERMIT2_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Space Architect
make clear-anvil-deployments context=$RIVER_ENV
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployProxyBatchDelegation
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployTownsBase
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMockUSDC
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployBaseRegistry
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpace
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceOwner
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySpaceFactory
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployRiverAirdrop
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployAppRegistry
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySwapRouter
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeploySubscriptionModule
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=diamonds contract=DeployAccountModules
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractPostDeploy
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractSetDefaultUriLocalhost
make interact-any-local context=$RIVER_ENV rpc=base_anvil contract=InteractClaimCondition

# Utils
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMember
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployMockNFT
make deploy-any-local context=$RIVER_ENV rpc=base_anvil type=utils contract=DeployEntitlementGatedExample
