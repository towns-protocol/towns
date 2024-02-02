#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ "$MODE" != "leader" ]; then
        echo "MODE has to be set to 'leader'"
        exit 1
    fi

    if [ -z "$NUM_TOWNS" ]; then
        echo "NUM_TOWNS is not set"
        exit 1
    fi

    if [ -z "$NUM_CHANNELS_PER_TOWN" ]; then
        echo "NUM_CHANNELS_PER_TOWN is not set"
        exit 1
    fi

    if [ -z "$NUM_FOLLOWERS" ]; then
        echo "NUM_FOLLOWERS is not set"
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
}

function start_leader() {
    echo "starting leader"
    echo "NUM_TOWNS: ${NUM_TOWNS}"
    echo "NUM_CHANNELS_PER_TOWN: ${NUM_CHANNELS_PER_TOWN}"
    echo "NUM_FOLLOWERS: ${NUM_FOLLOWERS}"
    echo "COORDINATION_SPACE_ID: ${COORDINATION_SPACE_ID}"
    echo "COORDINATION_CHANNEL_ID: ${COORDINATION_CHANNEL_ID}"
    echo "RIVER_NODE_URL: ${RIVER_NODE_URL}"
    echo "BASE_CHAIN_RPC_URL: ${BASE_CHAIN_RPC_URL}"
    echo "CHANNEL_SAMPLING_RATE: ${CHANNEL_SAMPLING_RATE}"
    echo "LOAD_TEST_DURATION_MS: ${LOAD_TEST_DURATION_MS}"

    sdk_dir="$MONOREPO_ROOT/casablanca/sdk"
    pushd $sdk_dir
        pwd
        yarn run test:ci:stress-test-leader
    popd
}

check_env
start_leader