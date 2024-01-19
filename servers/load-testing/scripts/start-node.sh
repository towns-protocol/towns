#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ "$MODE" != "leader" ] && [ "$MODE" != "follower" ]; then
        echo "MODE has to be equal to 'leader' or 'follower'"
        exit 1
    fi
    if [ -z "$MONOREPO_ROOT" ]; then
        echo "MONOREPO ROOT is not set"
        exit 1
    fi
}

function check_dependencies() {
    if ! command -v echo &> /dev/null
    then
        echo "echo was not found"
        exit 1
    fi
}

function start_node() {
    echo "starting node"
    if [ "$MODE" == "leader" ]; then
        start_leader_script=${MONOREPO_ROOT}/servers/load-testing/scripts/start-leader.sh
        ${start_leader_script}
    else
        start_follower_script=${MONOREPO_ROOT}/servers/load-testing/scripts/start-follower.sh
        ${start_follower_script}
    fi
}

check_env
check_dependencies
start_node