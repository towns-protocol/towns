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
    echo "RIVER_NODE_URL: ${RIVER_NODE_URL}"
    echo "BASE_CHAIN_RPC_URL: ${BASE_CHAIN_RPC_URL}"
    echo "CHANNEL_SAMPLING_RATE: ${CHANNEL_SAMPLING_RATE}"
    echo "LOAD_TEST_DURATION_MS: ${LOAD_TEST_DURATION_MS}"

    # 30 minutes
    local safety_margin_ms=1800000

    # convert load_test_duration_ms to number, and add 30 minutes
    local timeout_duration_ms=$(expr $LOAD_TEST_DURATION_MS + $safety_margin_ms)

    sdk_dir="$MONOREPO_ROOT/casablanca/sdk"
    pushd $sdk_dir
        pwd
        if ! ( timeout $timeout_duration_ms yarn run test:ci:stress-test-leader ); then
            echo "Terminating the leader"
            exit 1
        fi
    popd
}

check_env
start_leader