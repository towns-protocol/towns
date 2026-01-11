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

# Helper function to copy contract storage from mainnet to anvil
# Queries first N storage slots directly (most contracts use only a few)
copy_contract_storage() {
    local address=$1
    local name=$2
    local max_slots=${3:-10}  # Default to checking first 10 slots
    echo "Copying storage for $name ($address)..."

    for slot in $(seq 0 $max_slots); do
        local slot_hex="0x$(printf '%064x' $slot)"
        local value=$(cast rpc eth_getStorageAt $address "$slot_hex" latest --rpc-url $BASE_RPC_URL 2>/dev/null | tr -d '"')
        if [ -n "$value" ] && [ "$value" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
            cast rpc anvil_setStorageAt $address "$slot_hex" "$value" --rpc-url $BASE_ANVIL_RPC_URL >/dev/null 2>&1 || true
        fi
    done
}

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
copy_contract_storage $ENTRYPOINT_V07_ADDRESS "EntryPoint v0.7"

# Deploy SenderCreator (REQUIRED - EntryPoint v0.7 helper contract for account creation)
SENDER_CREATOR_ADDRESS=0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C
SENDER_CREATOR_BYTECODE=$(cast code $SENDER_CREATOR_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SENDER_CREATOR_ADDRESS $SENDER_CREATOR_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy EntryPointSimulations (REQUIRED - Alto bundler needs this for userOp simulation)
ENTRYPOINT_SIMULATIONS_ADDRESS=0x74Cb5e4eE81b86e70f9045036a1C5477de69eE87
ENTRYPOINT_SIMULATIONS_BYTECODE=$(cast code $ENTRYPOINT_SIMULATIONS_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $ENTRYPOINT_SIMULATIONS_ADDRESS $ENTRYPOINT_SIMULATIONS_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy ERC-4337 EntryPoint v0.6
ENTRYPOINT_V06_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
ENTRYPOINT_V06_BYTECODE=$(cast code $ENTRYPOINT_V06_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $ENTRYPOINT_V06_ADDRESS $ENTRYPOINT_V06_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SimpleAccountFactory v0.6 (for legacy account support)
SIMPLE_ACCOUNT_FACTORY_V06_ADDRESS=0x9406Cc6185a346906296840746125a0E44976454
SIMPLE_ACCOUNT_FACTORY_V06_BYTECODE=$(cast code $SIMPLE_ACCOUNT_FACTORY_V06_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SIMPLE_ACCOUNT_FACTORY_V06_ADDRESS $SIMPLE_ACCOUNT_FACTORY_V06_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SimpleAccount implementation v0.6
SIMPLE_ACCOUNT_IMPL_V06_ADDRESS=0x8ABB13360b87Be5EEb1B98647A016adD927a136c
SIMPLE_ACCOUNT_IMPL_V06_BYTECODE=$(cast code $SIMPLE_ACCOUNT_IMPL_V06_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SIMPLE_ACCOUNT_IMPL_V06_ADDRESS $SIMPLE_ACCOUNT_IMPL_V06_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SimpleAccountFactory v0.7
SIMPLE_ACCOUNT_FACTORY_ADDRESS=0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985
SIMPLE_ACCOUNT_FACTORY_BYTECODE=$(cast code $SIMPLE_ACCOUNT_FACTORY_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SIMPLE_ACCOUNT_FACTORY_ADDRESS $SIMPLE_ACCOUNT_FACTORY_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy ModularAccountFactory v2.0.0
MODULAR_ACCOUNT_FACTORY_ADDRESS=0x00000000000017c61b5bEe81050EC8eFc9c6fecd
MODULAR_ACCOUNT_FACTORY_BYTECODE=$(cast code $MODULAR_ACCOUNT_FACTORY_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MODULAR_ACCOUNT_FACTORY_ADDRESS $MODULAR_ACCOUNT_FACTORY_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL
copy_contract_storage $MODULAR_ACCOUNT_FACTORY_ADDRESS "ModularAccountFactory"

# Deploy ModularAccount v2.0.0 implementation
MODULAR_ACCOUNT_IMPL_ADDRESS=0x00000000000002377B26b1EdA7b0BC371C60DD4f
MODULAR_ACCOUNT_IMPL_BYTECODE=$(cast code $MODULAR_ACCOUNT_IMPL_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $MODULAR_ACCOUNT_IMPL_ADDRESS $MODULAR_ACCOUNT_IMPL_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SemiModularAccountBytecode v2.0.0
SEMI_MODULAR_ACCOUNT_ADDRESS=0x000000000000c5A9089039570Dd36455b5C07383
SEMI_MODULAR_ACCOUNT_BYTECODE=$(cast code $SEMI_MODULAR_ACCOUNT_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SEMI_MODULAR_ACCOUNT_ADDRESS $SEMI_MODULAR_ACCOUNT_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL
copy_contract_storage $SEMI_MODULAR_ACCOUNT_ADDRESS "SemiModularAccount"

# Deploy SingleSignerValidationModule v2.0.0
SINGLE_SIGNER_VALIDATION_ADDRESS=0x00000000000099DE0BF6fA90dEB851E2A2df7d83
SINGLE_SIGNER_VALIDATION_BYTECODE=$(cast code $SINGLE_SIGNER_VALIDATION_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SINGLE_SIGNER_VALIDATION_ADDRESS $SINGLE_SIGNER_VALIDATION_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy ExecutionInstallDelegate v2.0.0 (REQUIRED - modular accounts have immutable reference)
EXECUTION_INSTALL_DELEGATE_ADDRESS=0x0000000000008e6a39E03C7156e46b238C9E2036
EXECUTION_INSTALL_DELEGATE_BYTECODE=$(cast code $EXECUTION_INSTALL_DELEGATE_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $EXECUTION_INSTALL_DELEGATE_ADDRESS $EXECUTION_INSTALL_DELEGATE_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Deploy SemiModularAccountStorageOnly v2.0.0 (for 7702 accounts)
SEMI_MODULAR_STORAGE_ONLY_ADDRESS=0x0000000000006E2f9d80CaEc0Da6500f005EB25A
SEMI_MODULAR_STORAGE_ONLY_BYTECODE=$(cast code $SEMI_MODULAR_STORAGE_ONLY_ADDRESS --rpc-url $BASE_RPC_URL)
cast rpc anvil_setCode $SEMI_MODULAR_STORAGE_ONLY_ADDRESS $SEMI_MODULAR_STORAGE_ONLY_BYTECODE --rpc-url $BASE_ANVIL_RPC_URL

# Stake ModularAccountFactory in EntryPoint (REQUIRED - bundler rejects unstaked factories)
# The factory has an owner check on addStake, so we need to impersonate the owner
ANVIL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
FACTORY_OWNER=$(cast call $MODULAR_ACCOUNT_FACTORY_ADDRESS "owner()(address)" --rpc-url $BASE_ANVIL_RPC_URL)
echo "Factory owner: $FACTORY_OWNER"

# Fund the owner address
cast send $FACTORY_OWNER --value 1ether --private-key $ANVIL_PRIVATE_KEY --rpc-url $BASE_ANVIL_RPC_URL

# Impersonate the owner and stake
cast rpc anvil_impersonateAccount $FACTORY_OWNER --rpc-url $BASE_ANVIL_RPC_URL
cast send $MODULAR_ACCOUNT_FACTORY_ADDRESS \
    "addStake(uint32)" 86400 \
    --value 0.1ether \
    --from $FACTORY_OWNER \
    --unlocked \
    --rpc-url $BASE_ANVIL_RPC_URL
cast rpc anvil_stopImpersonatingAccount $FACTORY_OWNER --rpc-url $BASE_ANVIL_RPC_URL

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

