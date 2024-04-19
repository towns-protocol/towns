#!/usr/bin/env bash

set -eo pipefail

# Define a cleanup function
cleanup() {
    # Kill stackup worker if it's running
    if lsof -Pi :8686 -sTCP:LISTEN -t >/dev/null ; then
        kill $(lsof -t -i:8686)
        echo "Previous stackup worker on 8686 killed."
    fi
}

# Register the cleanup function to run on EXIT
trap cleanup EXIT

# Run stackup worker
sh scripts/run-stackup-worker.sh $1 -o

# Run @towns/userops tests
sh scripts/run-userops-package-tests.sh $1

# Run userops-lib tests
sh scripts/run-userops-lib-tests.sh $1


