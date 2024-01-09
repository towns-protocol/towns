#!/bin/bash

set -e

# TODO: add logic to get the latest block number and pass it to anvil

function check_dependencies() {
    if ! [ -x "$(command -v anvil)" ]; then
        echo "anvil is not installed"
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
        --port 8545
}

check_dependencies
check_env
start_anvil
