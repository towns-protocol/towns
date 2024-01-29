#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ "$MODE" != "follower" ]; then
        echo "MODE has to be set to 'follower'"
        exit 1
    fi

    if [ -z "$FOLLOWER_ID" ]; then
        echo "FOLLOWER_ID is not set"
        exit 1
    fi

    if [ -z "$COORDINATION_SPACE_ID" ]; then
        echo "COORDINATION_SPACE_ID is not set"
        exit 1
    fi

    if [ -z "$COORDINATION_CHANNEL_ID" ]; then
        echo "COORDINATION_CHANNEL_ID is not set"
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
}

function start_follower() {
    echo "starting follower"
    echo "FOLLOWER_ID: ${FOLLOWER_ID}"
    echo "COORDINATION_SPACE_ID: ${COORDINATION_SPACE_ID}"
    echo "COORDINATION_CHANNEL_ID: ${COORDINATION_CHANNEL_ID}"
    echo "RIVER_NODE_URL: ${RIVER_NODE_URL}"
    echo "BASE_CHAIN_RPC_URL: ${BASE_CHAIN_RPC_URL}"
    echo "CHANNEL_SAMPLING_RATE: ${CHANNEL_SAMPLING_RATE}"
    echo "LOAD_TEST_DURATION_MS: ${LOAD_TEST_DURATION_MS}"
    echo "MAX_MSG_DELAY_MS: ${MAX_MSG_DELAY_MS}"
    echo "JOIN_FACTOR: ${JOIN_FACTOR}"

    sdk_dir="$MONOREPO_ROOT/casablanca/sdk"
    pushd $sdk_dir
        pwd
        yarn run test:ci:stress-test-follower
    popd
}

check_env
start_follower
