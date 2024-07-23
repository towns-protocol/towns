#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Explicitely check required vars are set
: ${RUN_BASE:?}
: ${INSTANCE:?}
: ${RPC_PORT:?}

INSTANCE_DIR="${RUN_BASE}/${INSTANCE}"
OUTPUT_FILE="${INSTANCE_DIR}/config/config.env"

# Ensure the directory for the output file exists
mkdir -p "$INSTANCE_DIR/config"
mkdir -p "$INSTANCE_DIR/logs"
mkdir -p "$INSTANCE_DIR/wallet"
mkdir -p "$INSTANCE_DIR/certs"

echo "RIVER_PORT=${RPC_PORT}" > "$OUTPUT_FILE"

SKIP_GENKEY=${SKIP_GENKEY:-false}

# Generate a new wallet if one doesn't exist and SKIP_GENKEY is not set
if [ "$SKIP_GENKEY" = true ]; then
    echo "Skipping wallet generation for instance '${INSTANCE}'"
elif [ ! -f "${INSTANCE_DIR}/wallet/private_key" ]; then
    echo "Generating a new wallet for instance '${INSTANCE}'"
    cast wallet new --json > "${INSTANCE_DIR}/wallet/wallet.json"
    jq -r .[0].address "${INSTANCE_DIR}/wallet/wallet.json" > "${INSTANCE_DIR}/wallet/node_address"
    jq -r .[0].private_key "${INSTANCE_DIR}/wallet/wallet.json" | sed 's/^0x//' > "${INSTANCE_DIR}/wallet/private_key"
else
    echo "Using existing wallet for instance '${INSTANCE}'"
fi

if [ "$SKIP_GENKEY" = true ]; then
    echo "Skipping certificate generation for instance '${INSTANCE}'"
elif [ ! -f "${INSTANCE_DIR}/certs/cert.pem" ]; then
    ../scripts/generate-certs.sh $(realpath "$INSTANCE_DIR/certs")
else
    echo "Using existing certificate for instance '${INSTANCE}'"
fi



