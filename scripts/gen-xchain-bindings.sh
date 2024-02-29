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

XCHAIN_DIR="servers/xchain/contracts"
XCHAIN_PACKAGE="_xchain"

mkdir -p "${XCHAIN_DIR}"

generate_go() {
    local NAME=$1

    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${NAME}.sol/${NAME}.abi.json \
        --pkg "${VERSION}${XCHAIN_PACKAGE}" \
        --type "${VERSION}${NAME}" \
        --out "${XCHAIN_DIR}/${VERSION}_xchain_${NAME}.go"
}

generate_go IEntitlementChecker
generate_go IEntitlementGated
generate_go IEntitlementRule
