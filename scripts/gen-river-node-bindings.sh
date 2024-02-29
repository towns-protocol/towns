#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

VERSION="${1:-dev}"
if [ "$VERSION" = "localhost" ]; then
  VERSION="dev"
elif [ "$VERSION" = "base_sepolia" ]; then
  VERSION="v3"
fi

if [ "$VERSION" = "base_sepolia" ]; then
  VERSION="v3"
fi

if [ -z ${ABIGEN_VERSION+x} ]; then
  ABIGEN_VERSION="v1.13.10"
fi

generate_go() {
    local VER=$1
    local CONTRACT=$2
    local GO_NAME=$3

    local OUT_DIR="core/node/contracts/${VER}"
    mkdir -p "${OUT_DIR}"
    
        go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
            --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
            --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
            --pkg "${VER}" \
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


generate_go ${VERSION} IArchitect town_architect
generate_go ${VERSION} Channels channels
generate_go ${VERSION} IEntitlementsManager entitlements_manager
generate_go ${VERSION} IPausable pausable
generate_go ${VERSION} IWalletLink wallet_link
generate_go ${VERSION} IRuleEntitlement rule_entitlement


# The follwing structs get included twice in the generated code, this utility removes them from a file
#
#		"IRuleEntitlementCheckOperation":   true,
#		"IRuleEntitlementLogicalOperation": true,
#		"IRuleEntitlementOperation":        true,
#		"IRuleEntitlementRuleData":         true,

mkdir -p bin
go build -o bin/gen-bindings-remove-struct scripts/gen-bindings-remove-struct.go
./bin/gen-bindings-remove-struct core/node/contracts/${VERSION}/town_architect.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData
./bin/gen-bindings-remove-struct core/node/contracts/${VERSION}/entitlements_manager.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData

generate_go_nover IRiverRegistry river_registry_v1
generate_go_deploy MockRiverRegistry mock_river_registry
