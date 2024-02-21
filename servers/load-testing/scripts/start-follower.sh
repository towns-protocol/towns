#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ "$MODE" != "follower" ]; then
        echo "MODE has to be set to 'follower'"
        exit 1
    fi

    if [ -z "$RIVER_NODE_URL" ]; then
        echo "RIVER_NODE_URL is not set"
        exit 1
    fi

    if [ -z "$BASE_CHAIN_RPC_URL" ]; then
        echo "BASE_CHAIN_RPC_URL is not set"
        exit 1
    fi

    if [ -z "$CHANNEL_SAMPLING_RATE" ]; then
        echo "CHANNEL_SAMPLING_RATE is not set"
        exit 1
    fi

    if [ -z "$LOAD_TEST_DURATION_MS" ]; then
        echo "LOAD_TEST_DURATION_MS is not set"
        exit 1
    fi

    if [ -z "$MAX_MSG_DELAY_MS" ]; then
        echo "MAX_MSG_DELAY_MS is not set"
        exit 1
    fi

    if [ -z "$JOIN_FACTOR" ]; then
        echo "JOIN_FACTOR is not set"
        exit 1
    fi

    if [ -z "$NUM_CLIENTS_PER_PROCESS" ]; then
        echo "NUM_CLIENTS_PER_PROCESS is not set"
        exit 1
    fi

    if [ -z "$CLIENT_ID" ]; then
        echo "CLIENT_ID is not set"
        exit 1
    fi
}

function start_follower() {
    echo "starting follower"
    echo "RIVER_NODE_URL: ${RIVER_NODE_URL}"
    echo "BASE_CHAIN_RPC_URL: ${BASE_CHAIN_RPC_URL}"
    echo "CHANNEL_SAMPLING_RATE: ${CHANNEL_SAMPLING_RATE}"
    echo "LOAD_TEST_DURATION_MS: ${LOAD_TEST_DURATION_MS}"
    echo "MAX_MSG_DELAY_MS: ${MAX_MSG_DELAY_MS}"
    echo "JOIN_FACTOR: ${JOIN_FACTOR}"
    echo "NUM_CLIENTS_PER_PROCESS: ${NUM_CLIENTS_PER_PROCESS}"
    echo "CLIENT_ID: ${CLIENT_ID}"

    # 30 minutes
    local safety_margin_ms=1800000

    # convert load_test_duration_ms to number, and add 30 minutes
    local timeout_duration_ms=$(expr $LOAD_TEST_DURATION_MS + $safety_margin_ms)

    sdk_dir="$MONOREPO_ROOT/casablanca/sdk"
    pushd $sdk_dir
        if ! ( timeout $timeout_duration_ms yarn run test:ci:stress-test-follower ); then
            echo "Terminating the follower - client-id: ${CLIENT_ID}"
            exit 1
        fi
    popd
}

check_env
start_follower
