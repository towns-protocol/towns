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

function cleanup() {
    echo "cleaning up"
    pkill -P $$ # kill all child processes
}

function start_node() {
    echo "starting node"
    if [ "$MODE" == "leader" ]; then
        start_leader_script=${MONOREPO_ROOT}/packages/stress-testing/scripts/start-leader.sh
        ${start_leader_script}
    else
        start_follower_script=${MONOREPO_ROOT}/packages/stress-testing/scripts/start-follower.sh
        ${start_follower_script}
    fi
}

function main() {
    # Assign PROCESSES_PER_CONTAINER to processesPerContainer, default to 1 if not set
    followersPerContainer=${PROCESSES_PER_CONTAINER:-1}

    for ((i=1; i<=followersPerContainer; i++))
    do
        CLIENT_ID="${i}" start_node &
    done
    wait
}

# trap cleanup on exit to ensure child processes are killed
trap cleanup EXIT

check_dependencies
check_env
main