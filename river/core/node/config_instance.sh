#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Explicitely check required vars are set
: ${RUN_BASE:?}
: ${INSTANCE:?}

BLOCK_TIME_MS=${BLOCK_TIME_MS:-2000}

INSTANCE_DIR="${RUN_BASE}/${INSTANCE}"
TEMPLATE_FILE="./config-template.yaml"
OUTPUT_FILE="${INSTANCE_DIR}/config/config.yaml"
ENABLE_DEBUG_ENDPOINTS=true

# Ensure the directory for the output file exists
mkdir -p "$INSTANCE_DIR/config"
mkdir -p "$INSTANCE_DIR/logs"
mkdir -p "$INSTANCE_DIR/wallet"
mkdir -p "$INSTANCE_DIR/certs"

cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

SKIP_GENKEY=${SKIP_GENKEY:-false}

grep -o '<.*>' "$TEMPLATE_FILE" | sort | uniq | while read -r KEY; do
    key=$(echo "$KEY" | sed 's/^.\(.*\).$/\1/')
    value=${!key:?$key is not set}

    if [ -z "$value" ]; then
        echo "Error: Missing value for key $key" >&2
        exit 1
    fi

    # Check if key exists in the template file
    if ! grep -q "<${key}>" "$OUTPUT_FILE"; then
        echo "Error: Key $key not found in template." >&2
        exit 1
    fi

    # Substitute the key with the value, adjust for macOS or Linux without creating backup files
    if [ "$(uname)" == "Darwin" ]; then  # macOS
        sed -i '' "s^<${key}>^${value}^g" "$OUTPUT_FILE"
    else  # Linux
        sed -i "s^<${key}>^${value}^g" "$OUTPUT_FILE"
    fi
done

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



