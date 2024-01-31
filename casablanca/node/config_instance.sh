#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Explicitely check required vars are set
: ${RUN_BASE:?}
: ${INSTANCE:?}

INSTANCE_DIR="${RUN_BASE}/${INSTANCE}"
TEMPLATE_FILE="./config-template.yaml"
OUTPUT_FILE="${INSTANCE_DIR}/config/config.yaml"

# Ensure the directory for the output file exists
mkdir -p "$INSTANCE_DIR/config"
mkdir -p "$INSTANCE_DIR/logs"
mkdir -p "$INSTANCE_DIR/wallet"

cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

SKIP_GENKEY=${SKIP_GENKEY:-false}

if [ "$(uname)" == "Darwin" ]; then  # macOS
    SED_I="''"
else  # Linux
    SED_I=""
fi

 grep -o '<.*>' "$TEMPLATE_FILE" | while read KEY; do
    key=$(echo "$KEY" | sed 's/^.\(.*\).$/\1/')
    value=${!key:?$key is not set}

    if [ -z "$value" ]; then
        echo "Error: Missing value for key $key" >&2
        exit 1
    fi

    # Check if key exists in the template file
    if ! grep -q "<${key}>" $OUTPUT_FILE; then
        echo "Error: Key $key not found in template." >&2
        exit 1
    fi

    # Substitute the key with the value
    sed -i ${SED_I} "s^<${key}>^${value}^g" $OUTPUT_FILE
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
