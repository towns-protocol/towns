#!/bin/bash
set -ueo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

VERSION="${1:-localhost}"
if [ "$VERSION" = "localhost" ]; then
  VERSION="dev"
elif [ "$VERSION" = "base_sepolia" ]; then
  VERSION="v3"
fi

if [ -z ${ABIGEN_VERSION+x} ]; then
  ABIGEN_VERSION="v1.13.10"
fi

XCHAIN_DIR="core/xchain/contracts"
BINDING_DIR="core/xchain/bindings"

mkdir -p "${XCHAIN_DIR}/${VERSION}"

generate_go() {
    local CONTRACT=$1
    local GO_NAME=$2

    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
        --pkg "${VERSION}" \
        --type "${GO_NAME}" \
        --out "${XCHAIN_DIR}/${VERSION}/${GO_NAME}.go"
}

generate_test_binding() {
    local CONTRACT=$1
    local GO_NAME=$2

    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
        --pkg "dev" \
        --type "${GO_NAME}" \
        --out "${XCHAIN_DIR}/test/${GO_NAME}.go"
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


# Interfaces
generate_go IEntitlementChecker i_entitlement_checker
generate_go IEntitlementGated i_entitlement_gated
generate_go IEntitlement i_entitlement
generate_go ICustomEntitlement i_custom_entitlement
generate_go IWalletLink i_wallet_link

# Contracts
generate_go MockCustomEntitlement mock_custom_entitlement
generate_go MockEntitlementGated mock_entitlement_gated
generate_go MockEntitlementChecker mock_entitlement_checker
generate_go EntitlementChecker entitlement_checker
generate_go WalletLink wallet_link

# Unversion contracts
generate_test_binding MockERC20 mock_erc20
generate_test_binding MockERC721 mock_erc721

mkdir -p bin
go build -o bin/gen-bindings-remove-struct scripts/gen-bindings-remove-struct.go
./bin/gen-bindings-remove-struct core/xchain/contracts/${VERSION}/mock_entitlement_gated.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData
./bin/gen-bindings-remove-struct core/xchain/contracts/${VERSION}/wallet_link.go IWalletLinkBaseLinkedWallet
