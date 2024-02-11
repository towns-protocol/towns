#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

VERSION="${1:-dev}"
if [ "$VERSION" = "localhost" ]; then
  VERSION="dev"
fi

if [ -z ${ABIGEN_VERSION+x} ]; then
  ABIGEN_VERSION="v1.13.10"
fi

generate_go() {
    local VER=$1
    local CONTRACT=$2
    local GO_NAME=$3

    local OUT_DIR="casablanca/node/contracts/${VER}"
    mkdir -p "${OUT_DIR}"
    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --pkg "${VER}" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}

# For explicitely versioned interfaces
generate_go_nover() {
    local CONTRACT=$1
    local GO_NAME=$2

    local OUT_DIR="casablanca/node/contracts"
    mkdir -p "${OUT_DIR}"
    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --pkg "contracts" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}

generate_go_deploy() {
    local CONTRACT=$1
    local GO_NAME=$2

    local OUT_DIR="casablanca/node/contracts/deploy"
    mkdir -p "${OUT_DIR}"
    go run github.com/ethereum/go-ethereum/cmd/abigen@${ABIGEN_VERSION} \
        --abi contracts/out/${CONTRACT}.sol/${CONTRACT}.abi.json \
        --bin contracts/out/${CONTRACT}.sol/${CONTRACT}.bin \
        --pkg "deploy" \
        --type "${GO_NAME}" \
        --out "${OUT_DIR}/${GO_NAME}.go"
}

generate_go ${VERSION} TownArchitect town_architect
generate_go ${VERSION} Channels channels
generate_go ${VERSION} EntitlementsManager entitlements_manager
generate_go ${VERSION} Pausable pausable
generate_go ${VERSION} WalletLink wallet_link

generate_go_nover IRiverRegistry river_registry_v1
generate_go_deploy RiverRegistry river_registry_deploy
