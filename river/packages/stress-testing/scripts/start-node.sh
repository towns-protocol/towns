#!/usr/bin/env bash

set -eo pipefail

function check_env() {
    if [ -z "$MONOREPO_ROOT" ]; then
        echo "MONOREPO ROOT is not set"
        exit 1
    else
        echo "MONOREPO ROOT is set to $MONOREPO_ROOT"
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


function main() {
    ./packages/stress/scripts/start.sh @
}

# trap cleanup on exit to ensure child processes are killed
trap cleanup EXIT

check_dependencies
check_env
main