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

function check_env() {
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

    LOCAL_ANVIL_RPC_URL="http://localhost:${PORT}"
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

function handle_sigint() {
    echo "SIGINT received, stopping anvil process with PID: $ANVIL_PID"
    if [ ! -z "$ANVIL_PID" ]; then
        kill -SIGINT $ANVIL_PID
    fi
    exit 0
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

trap handle_sigint SIGINT
check_dependencies
check_env
start_anvil
wait_for_anvil
fund_wallets
anvil_foreground
