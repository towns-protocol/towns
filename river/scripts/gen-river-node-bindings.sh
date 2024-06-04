#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

if [ -z ${ABIGEN_VERSION+x} ]; then
  ABIGEN_VERSION="v1.13.10"
fi

generate_go() {
    local DIR=$1
    local CONTRACT=$2
    local GO_NAME=$3

    local OUT_DIR="core/node/contracts/${DIR}"
    mkdir -p "${OUT_DIR}"

        go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
            --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
            --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
            --pkg "${DIR}" \
            --type "${GO_NAME}" \
            --out "${OUT_DIR}/${GO_NAME}.go"
}

# For explicitely versioned interfaces
generate_go_nover() {
    local CONTRACT=$1
    local GO_NAME=$2

    local OUT_DIR="core/node/contracts"
    mkdir -p "${OUT_DIR}"
    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
        --pkg "contracts" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}

generate_go_deploy() {
    local CONTRACT=$1
    local GO_NAME=$2

    local OUT_DIR="core/node/contracts/deploy"
    mkdir -p "${OUT_DIR}"

    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
        --pkg "deploy" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}


generate_go base IArchitect architect
generate_go base Channels channels
generate_go base IEntitlementsManager entitlements_manager
generate_go base IEntitlementDataQueryable entitlement_data_queryable
generate_go base IERC721AQueryable erc721a_queryable
generate_go base IPausable pausable
generate_go base IBanning banning
generate_go base IWalletLink wallet_link
generate_go base IRuleEntitlement rule_entitlement


# The follwing structs get included twice in the generated code, this utility removes them from a file
#
#		"IRuleEntitlementCheckOperation":   true,
#		"IRuleEntitlementLogicalOperation": true,
#		"IRuleEntitlementOperation":        true,
#		"IRuleEntitlementRuleData":         true,

mkdir -p bin
go build -o bin/gen-bindings-remove-struct scripts/gen-bindings-remove-struct.go
./bin/gen-bindings-remove-struct core/node/contracts/base/architect.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData
./bin/gen-bindings-remove-struct core/node/contracts/base/entitlements_manager.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData

generate_go_nover INodeRegistry node_registry_v1
generate_go_nover IStreamRegistry stream_registry_v1
generate_go_nover IOperatorRegistry operator_registry_v1
generate_go_nover IRiverConfig river_config_v1
generate_go_deploy MockRiverRegistry mock_river_registry
