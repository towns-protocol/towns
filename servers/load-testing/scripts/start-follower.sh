#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ "$MODE" != "follower" ]; then
        echo "MODE has to be set to 'follower'"
        exit 1
    fi

    if [ -z "$LEADER_URL" ]; then
        echo "LEADER_URL is not set"
        exit 1
    fi

    if [ -z "$FOLLOWER_ID" ]; then
        echo "FOLLOWER_ID is not set"
        exit 1
    fi

}

function start_follower() {
    echo "starting follower"
    echo "FOLLOWER_ID: ${FOLLOWER_ID}"
    echo "LEADER_URL: ${LEADER_URL}"
}

check_env
start_follower
