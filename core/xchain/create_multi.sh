#!/bin/bash
set -euo pipefail

# Skip script execution if running in a CI environment
if [ -z "${CI:-}" ]; then
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
fi

# Change the current working directory to the directory of the script
cd "$(dirname "$0")"


: ${RUN_ENV:?}
: ${RIVER_ENV:?}
: ${BASE_REGISTRY_ADDRESS:?}

make build

source ../../packages/contracts/.env.localhost
OPERATOR_ADDRESS=$(cast wallet addr $LOCAL_PRIVATE_KEY)

echo "Registration of operator $OPERATOR_ADDRESS in base registry at address $BASE_REGISTRY_ADDRESS"
# register operator
cast send \
    --rpc-url http://127.0.0.1:8545 \
    --private-key $LOCAL_PRIVATE_KEY \
    $BASE_REGISTRY_ADDRESS \
    "registerOperator(address)" \
    $OPERATOR_ADDRESS \
    2 > /dev/null

# set operator to approved
cast send \
    --rpc-url http://127.0.0.1:8545 \
    --private-key $TESTNET_PRIVATE_KEY \
    $BASE_REGISTRY_ADDRESS \
    "setOperatorStatus(address,uint8)" \
    $OPERATOR_ADDRESS \
    2 \
    2 > /dev/null

# Number of instances
N=5

# Base directory for the instances
BASE_DIR="../run_files/${RUN_ENV}/xchain"
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
    cp "../run_files/bin/river_node" "${INSTANCE_DIR}/bin"
    touch "${INSTANCE_DIR}/config/config.yaml"

    echo "Creating instance_${i}"

    yq eval ".log.level = \"debug\"" -i "${INSTANCE_DIR}/config/config.yaml"

    pushd "${INSTANCE_DIR}"
    # Run each process with 'generate_key' argument
    "./bin/river_node" genkey

      NODE_ADDRESS=$(cat wallet/node_address)

      echo "Registration of node $NODE_ADDRESS in base registry at address $BASE_REGISTRY_ADDRESS"
      cast send \
        --rpc-url http://127.0.0.1:8545 \
        --private-key $LOCAL_PRIVATE_KEY \
        $BASE_REGISTRY_ADDRESS \
        "registerNode(address)" \
        $NODE_ADDRESS \
        2 > /dev/null

    popd
  )
done


echo "All instances created."
