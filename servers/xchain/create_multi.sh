#!/bin/bash
set -euo pipefail

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew is not installed. Installing Homebrew first..."
    # Download and execute Homebrew installation script
    # Handle potential failure in downloading the script
    if ! /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
        echo "Failed to install Homebrew."
        exit 1
    fi
fi

# Install yq using Homebrew if not present
if ! command -v yq &> /dev/null; then
    echo "yq is not installed. Installing it using Homebrew..."
    if ! brew install yq; then
        echo "Failed to install yq."
        exit 1
    fi
    echo "yq installed successfully."
fi

# Install yq using Homebrew if not present
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Installing it using Homebrew..."
    if ! brew install jq; then
        echo "Failed to install jq."
        exit 1
    fi
    echo "jq installed successfully."
fi

ENTITLMENT_CHECKER_ADDRESS=$(jq -r '.address' ./packages/generated/localhost/addresses/entitlementChecker.json)
ENTITLMENT_TEST_ADDRESS=$(jq -r '.address' ./packages/generated/localhost/addresses/entitlementGatedExample.json)
RIVER_CHAIN_ID=31338

# Change the current working directory to the directory of the script
cd "$(dirname "$0")"

make

# Number of instances
N=5

# Base directory for the instances
BASE_DIR="./run_files"



mkdir -p "${BASE_DIR}"

# Loop to create N instances in parallel
for (( i=1; i<=N; i++ ))
do
  (
    # Directory for this instance
    INSTANCE_DIR="${BASE_DIR}/instance_${i}"

    if [ -d "${INSTANCE_DIR}" ]; then
        rm -rf "${INSTANCE_DIR}"
    fi
    # Create the directory structure
    mkdir -p "${INSTANCE_DIR}/bin" "${INSTANCE_DIR}/logs" "${INSTANCE_DIR}/config" "${INSTANCE_DIR}/wallet"

    # Copy node binary and config template
    cp "./bin/node" "${INSTANCE_DIR}/bin"
    cp config-template.yaml "${INSTANCE_DIR}/config/config.yaml"

    # Substitute METRIC_PORT and create config.yaml
    METRICS_PORT=$((9080 + i))

    echo "Creating instance_${i}"
    
    yq eval ".metrics.port = \"$METRICS_PORT\"" -i "${INSTANCE_DIR}/config/config.yaml"
    yq eval ".entitlement_contract.address = \"$ENTITLMENT_CHECKER_ADDRESS\"" -i "${INSTANCE_DIR}/config/config.yaml"
    yq eval ".entitlement_contract.chainId = \"$RIVER_CHAIN_ID\"" -i "${INSTANCE_DIR}/config/config.yaml"
    yq eval ".test_contract.address = \"$ENTITLMENT_TEST_ADDRESS\"" -i "${INSTANCE_DIR}/config/config.yaml"
    yq eval ".test_contract.chainId = \"$RIVER_CHAIN_ID\"" -i "${INSTANCE_DIR}/config/config.yaml"

    pushd "${INSTANCE_DIR}"
    # Run each process with 'generate_key' argument
    "./bin/node" genkey
    cast rpc -r http://127.0.0.1:8546 anvil_setBalance `cat wallet/node_address` 10000000000000000000
    echo "Created and funded instance_${i}"

    popd
  ) &
done

# Wait for all background processes to finish
wait

echo "All instances created and funded."
