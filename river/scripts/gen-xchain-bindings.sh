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

generate_go IEntitlementChecker i_entitlement_checker
generate_go IEntitlementGated i_entitlement_gated
generate_go IEntitlement i_entitlement
generate_go ICustomEntitlement i_custom_entitlement
generate_go MockCustomEntitlement mock_custom_entitlement
generate_go MockEntitlementGated mock_entitlement_gated

mkdir -p bin
go build -o bin/gen-bindings-remove-struct scripts/gen-bindings-remove-struct.go
./bin/gen-bindings-remove-struct core/xchain/contracts/${VERSION}/mock_entitlement_gated.go IRuleEntitlementCheckOperation,IRuleEntitlementLogicalOperation,IRuleEntitlementOperation,IRuleEntitlementRuleData
