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

# Deploy ERC-4337 EntryPoint v0.7
ENTRYPOINT_V07_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
ENTRYPOINT_V07_BYTECODE=$(cast code $ENTRYPOINT_V07_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $ENTRYPOINT_V07_ADDRESS $ENTRYPOINT_V07_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SimpleAccountFactory v0.7
SIMPLE_ACCOUNT_FACTORY_ADDRESS=0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985
SIMPLE_ACCOUNT_FACTORY_BYTECODE=$(cast code $SIMPLE_ACCOUNT_FACTORY_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SIMPLE_ACCOUNT_FACTORY_ADDRESS $SIMPLE_ACCOUNT_FACTORY_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy ModularAccountFactory v2.0.0
MODULAR_ACCOUNT_FACTORY_ADDRESS=0x00000000000017c61b5bEe81050EC8eFc9c6fecd
MODULAR_ACCOUNT_FACTORY_BYTECODE=$(cast code $MODULAR_ACCOUNT_FACTORY_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MODULAR_ACCOUNT_FACTORY_ADDRESS $MODULAR_ACCOUNT_FACTORY_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy ModularAccount v2.0.0 implementation
MODULAR_ACCOUNT_IMPL_ADDRESS=0x00000000000002377B26b1EdA7b0BC371C60DD4f
MODULAR_ACCOUNT_IMPL_BYTECODE=$(cast code $MODULAR_ACCOUNT_IMPL_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MODULAR_ACCOUNT_IMPL_ADDRESS $MODULAR_ACCOUNT_IMPL_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SemiModularAccountBytecode v2.0.0
SEMI_MODULAR_ACCOUNT_ADDRESS=0x000000000000c5A9089039570Dd36455b5C07383
SEMI_MODULAR_ACCOUNT_BYTECODE=$(cast code $SEMI_MODULAR_ACCOUNT_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SEMI_MODULAR_ACCOUNT_ADDRESS $SEMI_MODULAR_ACCOUNT_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SingleSignerValidationModule v2.0.0
SINGLE_SIGNER_VALIDATION_ADDRESS=0x00000000000099DE0BF6fA90dEB851E2A2df7d83
SINGLE_SIGNER_VALIDATION_BYTECODE=$(cast code $SINGLE_SIGNER_VALIDATION_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SINGLE_SIGNER_VALIDATION_ADDRESS $SINGLE_SIGNER_VALIDATION_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

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
