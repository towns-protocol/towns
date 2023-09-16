#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Ensure at least 3 arguments (instance_name and at least one key-value pair)
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 instance_dir KEY VALUE [KEY VALUE]..."
    exit 1
fi

INSTANCE_NAME=$1
INSTANCE_DIR="./run_files/${INSTANCE_NAME}"
TEMPLATE_FILE="./config-template.yaml"
OUTPUT_FILE="${INSTANCE_DIR}/config/config.yaml"
shift # Removing the instance_name argument from the list

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

# Parse key-value pairs from the arguments
while [[ "$#" -gt 1 ]]; do
    key=$1
    value=$2

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

    shift 2
done

# Check if any placeholders remain
if grep -q '<.*>' $OUTPUT_FILE; then
    echo "Error: Not all placeholders were substituted!" >&2
    exit 1
fi

# Generate a new wallet if one doesn't exist and SKIP_GENKEY is not set

if [ "$SKIP_GENKEY" = true ]; then
    echo "Skipping wallet generation for instance '${INSTANCE_NAME}'"
elif [ ! -f "${INSTANCE_DIR}/wallet/private_key" ]; then
    echo "Generating a new wallet for instance '${INSTANCE_NAME}'"
    cd "$INSTANCE_DIR"
    go run ../../node/main.go genkey
    go run ../../node/main.go fund_wallet
else
    echo "Using existing wallet for instance '${INSTANCE_NAME}'"
    # Old wallets might not be funded yet
    cd "$INSTANCE_DIR"
    go run ../../node/main.go fund_wallet
fi
