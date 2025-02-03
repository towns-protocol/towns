#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

if [ -z ${ABIGEN_VERSION+x} ]; then
  ABIGEN_VERSION="v1.14.11"
fi

echo "Go version:"
go version
which go
echo "abigen version: requested: ${ABIGEN_VERSION}"
go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} --version
echo "Generating bindings..."

generate_go() {
    local DIR=$1
    local PACKAGE=$2
    local CONTRACT=$3
    local GO_NAME=$4
    local FILENAME=$CONTRACT
    if [[ $# -eq 5 ]]; then
        FILENAME=$5
    fi

    local OUT_DIR="core/contracts/${DIR}"
    mkdir -p "${OUT_DIR}"

    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${FILENAME}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${FILENAME}.sol/${CONTRACT}.bin \
        --pkg "${PACKAGE}" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}

# Base (and other) contracts interfaces
generate_go base base IArchitect architect
generate_go base base Channels channels
generate_go base base IEntitlementsManager entitlements_manager
generate_go base base IEntitlementDataQueryable entitlement_data_queryable
generate_go base base IERC721AQueryable erc721a_queryable
generate_go base base IPausable pausable
generate_go base base IBanning banning
generate_go base base IWalletLink wallet_link
generate_go base base IRuleEntitlement rule_entitlement
generate_go base base IRuleEntitlementV2 rule_entitlement_v2 IRuleEntitlement
generate_go base base IEntitlementChecker i_entitlement_checker
generate_go base base IEntitlementGated i_entitlement_gated
generate_go base base IEntitlement i_entitlement
generate_go base base ICrossChainEntitlement i_cross_chain_entitlement
generate_go base base IRoles i_roles
generate_go base base ITipping tipping
generate_go base base XChain xchain


# Full Base (and other) contracts for deployment from tests
generate_go base/deploy deploy MockCrossChainEntitlement mock_cross_chain_entitlement
generate_go base/deploy deploy MockEntitlementGated mock_entitlement_gated
generate_go base/deploy deploy MockEntitlementChecker mock_entitlement_checker
generate_go base/deploy deploy EntitlementChecker entitlement_checker
generate_go base/deploy deploy WalletLink wallet_link
generate_go base/deploy deploy MockERC20 mock_erc20
generate_go base/deploy deploy MockERC721 mock_erc721
generate_go base/deploy deploy MockERC1155 mock_erc1155
generate_go base/deploy deploy MockWalletLink mock_wallet_link

# River contracts interfaces
generate_go river river INodeRegistry node_registry_v1
generate_go river river IStreamRegistry stream_registry_v1
generate_go river river IOperatorRegistry operator_registry_v1
generate_go river river IRiverConfig river_config_v1

# Full River contracts for deployment from tests
generate_go river/deploy deploy MockRiverRegistry mock_river_registry

# The following structs get included twice in the generated code, this utility removes them from a file
#
#		"IRuleEntitlementBaseCheckOperation":   true,
#		"IRuleEntitlementBaseLogicalOperation": true,
#		"IRuleEntitlementBaseOperation":        true,
#		"IRuleEntitlementBaseRuleData":         true,

mkdir -p bin
go build -o bin/gen-bindings-remove-struct scripts/gen-bindings-remove-struct.go
./bin/gen-bindings-remove-struct core/contracts/base/architect.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/entitlements_manager.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/rule_entitlement.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/rule_entitlement_v2.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/xchain.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/deploy/mock_entitlement_checker.go IRuleEntitlementBaseCheckOperation,IRuleEntitlementBaseLogicalOperation,IRuleEntitlementBaseOperation,IRuleEntitlementBaseRuleData
./bin/gen-bindings-remove-struct core/contracts/base/deploy/mock_wallet_link.go IWalletLinkBaseLinkedWallet

