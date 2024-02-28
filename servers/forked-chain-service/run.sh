#!/bin/bash

set -eo pipefail

function check_dependencies() {
    if ! [ -x "$(command -v anvil)" ]; then
        echo "anvil is not installed"
        exit 1
    fi

    if ! [ -x "$(command -v cast)" ]; then
        echo "cast is not installed"
        exit 1
    fi

    if ! [ -x "$(command -v curl)" ]; then
        echo "curl is not installed"
        exit 1
    fi

    if ! [ -x "$(command -v jq)" ]; then
        echo "jq is not installed"
        exit 1
    fi

    if ! [ -x "$(command -v awk)" ]; then
        echo "awk is not installed"
        exit 1
    fi

    if ! [ -x "$(command -v cut)" ]; then
        echo "cut is not installed"
        exit 1
    fi
}

function check_env_main() {
    if [ -z "$FORK_URL" ]; then
        echo "FORK_URL is not set"
        exit 1
    fi

    if [ -z "$CHAIN_ID" ]; then
        echo "CHAIN_ID is not set"
        exit 1
    fi

    if [ -z "$FORK_BLOCK_NUMBER" ]; then
        echo "FORK_BLOCK_NUMBER is not set"
        exit 1
    fi

    if [ -z "$BLOCK_TIME" ]; then
        echo "BLOCK_TIME is not set"
        exit 1
    fi

    if [ -z "$PORT" ]; then
        echo "PORT is not set"
        exit 1
    fi

    if [ -z "$FUNDING_WALLETS_CSV" ]; then
        echo "FUNDING_WALLETS_CSV is not set. Defaulting to empty string."
        FUNDING_WALLETS_CSV=""
    fi

    if [ -z "$NODES_CSV" ]; then
        echo "NODES_CSV is not set. Defaulting to empty string."
        NODES_CSV=""
    fi

    LOCAL_ANVIL_RPC_URL="http://localhost:${PORT}"
}

function check_env_register_or_update_nodes() {
    if [ -z "$PRIVATE_KEY" ]; then
        echo "PRIVATE_KEY is not set"
        exit 1
    fi

    if [ -z "$RIVER_REGISTRY_ADDRESS" ]; then
        echo "RIVER_REGISTRY_ADDRESS is not set"
        exit 1
    fi

    if [ -z "$NODES_CSV" ]; then
        echo "NODES_CSV is not set"
        exit 1
    fi
}

function get_latest_block_number() {
    response=$(curl $FORK_URL -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 5}')

    latest_block_number_hex=$(echo $response | jq -r '.result')

    latest_block_number_int=$(printf "%d\n" $latest_block_number_hex)

    echo $latest_block_number_int
}

function get_fork_block_number() {
    if [ "$FORK_BLOCK_NUMBER" == "latest" ]; then
        get_latest_block_number
    else
        echo $FORK_BLOCK_NUMBER
    fi
}

function fund_wallet() {
    local wallet=$1
    local amount="0x021e19e0c9bab2400000" # 1000 ETH

    
    local curl_data_payload='{
        "method": "anvil_setBalance",
        "id": 1,
        "jsonrpc": "2.0",
        "params": [
            "'${wallet}'", 
            "'${amount}'"
        ]
    }'

    echo "Funding wallet: $wallet"

    curl "$LOCAL_ANVIL_RPC_URL" \
        -X POST \
        -H "Content-Type: application/json" \
        --data "$curl_data_payload"
}

function fund_wallets() {
    # If the FUNDING_WALLETS_CSV is empty, then exit early
    if [ -z "$FUNDING_WALLETS_CSV" ]; then
        echo "FUNDING_WALLETS_CSV is empty. Skipping funding wallets."
        return 0
    fi

    # Remove leading and trailing whitespace
    FUNDING_WALLETS_CSV=$(echo "$FUNDING_WALLETS_CSV" | xargs)

    # Remove linebreak characters
    FUNDING_WALLETS_CSV=$(echo "$FUNDING_WALLETS_CSV" | tr -d '\\n')

    # Remove leading and trailing whitespace
    FUNDING_WALLETS_CSV=$(echo "$FUNDING_WALLETS_CSV" | xargs)

    # Count the number of fields in the CSV
    num_fields=$(echo "$FUNDING_WALLETS_CSV" | awk -F, '{print NF}')

    # Loop over each field, and fund the wallet
    for i in $(seq 1 $num_fields)
    do
        wallet=$(echo "$FUNDING_WALLETS_CSV" | cut -d',' -f$i)
        # Remove leading and trailing whitespace
        wallet=$(echo "$wallet" | xargs)

        # skip empty fields
        if [ -z "$wallet" ]; then
            continue
        fi
        
        echo "funding wallet: $wallet"
        fund_wallet $wallet
    done
}

function wait_for_anvil() {
    echo "Waiting for anvil to start"

    local max_attempts=30
    local attempt=1
    local delay=2  # seconds

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts..."

        # Temporarily disable exit on error
        set +e
        response=$(curl -s -S $LOCAL_ANVIL_RPC_URL -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 5}')
        local status=$?
        # Re-enable exit on error
        set -e

        if [ $status -eq 0 ]; then
            if [[ $response == *"result"* ]]; then
                echo "Anvil is ready"
                return 0
            fi
        else
            echo "Curl failed with status $status"
        fi

        echo "Anvil not ready yet. Waiting for $delay seconds..."
        attempt=$((attempt+1))
        sleep $delay
    done

    echo "Anvil did not start within the expected time."
    return 1
}

function cleanup() {
    echo "Stopping anvil process with PID: $ANVIL_PID"
    if [ ! -z "$ANVIL_PID" ]; then
        kill -SIGINT $ANVIL_PID
        ANVIL_PID=""
    else
        echo "Anvil process was already stopped. No need to stop again."
    fi
}

function handle_exit() {
    local exit_status=$?
    echo "Exit received"
    cleanup
    if [ $exit_status -eq 0 ]; then
        exit 1
    fi
    exit $exit_status
}

function start_anvil() {
    fork_block_number=$(get_fork_block_number)

    echo "Starting anvil with fork block number: $fork_block_number"

    anvil \
        --fork-url $FORK_URL \
        --chain-id $CHAIN_ID \
        --fork-block-number "$fork_block_number" \
        --fork-chain-id $CHAIN_ID \
        --block-time $BLOCK_TIME \
        --host "0.0.0.0" \
        --port $PORT &

    # Capture the PID of the background process
    local anvil_pid=$!
    echo "Anvil started in background with PID: $anvil_pid"

    # Export PID to make it available in subsequent functions
    export ANVIL_PID=$anvil_pid
}

function anvil_foreground() {
    # Wait for the anvil process to complete, if needed
    if [ ! -z "$ANVIL_PID" ]; then
        echo "Waiting for anvil process to complete"
        wait $ANVIL_PID
    fi
}

function register_node() {
    local node_address=$1
    local node_url=$2

    cast send \
        --rpc-url $LOCAL_ANVIL_RPC_URL \
        --private-key $PRIVATE_KEY \
        $RIVER_REGISTRY_ADDRESS \
        "registerNode(address,string)" \
        $node_address \
        $node_url > /dev/null
}

function update_node() {
    local node_address=$1
    local node_url=$2

    cast send \
        --rpc-url $LOCAL_ANVIL_RPC_URL \
        --private-key $PRIVATE_KEY \
        $RIVER_REGISTRY_ADDRESS \
        "updateNodeUrlByOperator(address nodeAddress, string url)" \
        $node_address \
        $node_url > /dev/null
}

function node_exists() {
    local node_address=$1
    
    # if the node doesnt exist, this will revert.
    # so detect that and return false

    cast call \
        --rpc-url $LOCAL_ANVIL_RPC_URL \
        $RIVER_REGISTRY_ADDRESS \
        "getNode(address)" \
        $node_address &>/dev/null

    # Check exit status of the cast call
    if [ $? -eq 0 ]; then
        echo "true"
    else
        # Reverted or other error
        echo "false"
    fi
}

function register_or_update_node() {
    local node_address=$1
    local node_url=$2

    local exists=$(node_exists $node_address)

    if [ "$exists" == "true" ]; then
        echo "Node exists at $node_address, updating"
        update_node $node_address $node_url
    else
        echo "Node does not exist at $node_address, adding"
        register_node $node_address $node_url
    fi
}

function register_or_update_nodes() {
    if [ -n "$NODES_CSV" ]; then
        echo "Adding or updating nodes"

        check_env_register_or_update_nodes

        # Convert CSV to space-separated values for easier processing
        CSV=$(echo "$NODES_CSV" | tr ',' ' ')

        # Initialize index
        INDEX=1
        # Count total number of items in CSV
        TOTAL_ITEMS=$(echo $CSV | wc -w)

        # Process pairs
        while [ $INDEX -le $TOTAL_ITEMS ]; do
            NODE=$(echo $CSV | cut -d ' ' -f $INDEX)
            URL=$(echo $CSV | cut -d ' ' -f $(($INDEX + 1)))
            echo "Processing node $NODE with URL $URL"
            register_or_update_node "$NODE" "$URL"
            INDEX=$(($INDEX + 2))
        done

        # echo "Waiting for BLOCK_TIME to allow nodes to be added or updated"
        sleep $BLOCK_TIME

        echo "Getting all nodes"

        solidity_nodes=$(get_all_nodes)
        solidity_nodes_csv=$(nodes_from_solidity_to_csv "$solidity_nodes")

        # check if the nodes in the solidity contract are the same as the nodes we tried to add
        # if they are not, then we have a problem

        if [ "$(csv_set_equality "$NODES_CSV" "$solidity_nodes_csv")" == "false" ]; then
            echo "Nodes in solidity contract do not match the nodes we tried to add or update"
            echo "Nodes in solidity contract: $solidity_nodes_csv"
            echo "Nodes we tried to add or update: $NODES_CSV"
            exit 1
        else
            echo "Nodes in solidity contract match the nodes we tried to add or update"
        fi

    else
        echo "NODES_CSV is empty. Skipping adding or updating nodes."
    fi
}

function nodes_from_solidity_to_csv() {
    local nodes=$1

    csv_output=$(echo $nodes | sed 's/[(\[]//g' | sed 's/[)\]]//g' | sed 's/), /, /g' | sed 's/, /,/g' | sed 's/"//g')

    echo $csv_output
}

function csv_set_equality() {
    local set1=$1
    local set2=$2

    # Sort the sets
    set1_sorted=$(echo $set1 | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')
    set2_sorted=$(echo $set2 | tr ',' '\n' | sort | tr '\n' ',' | sed 's/,$//')

    # Compare the sorted sets
    if [ "$set1_sorted" == "$set2_sorted" ]; then
        echo "true"
    else
        echo "false"
    fi
}

function get_all_nodes() {
    cast call \
        --rpc-url $LOCAL_ANVIL_RPC_URL \
        $RIVER_REGISTRY_ADDRESS \
        "getAllNodes()((address,string)[])"
}

function main() {
    check_dependencies
    check_env_main
    start_anvil
    wait_for_anvil
    fund_wallets
    register_or_update_nodes
    anvil_foreground
}

trap handle_exit EXIT
main