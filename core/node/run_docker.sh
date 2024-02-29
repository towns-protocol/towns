#!/bin/bash -ue

if [ -z "$MODE" ]; then
    echo "MODE environment variable not set. Defaulting to single-node."
    MODE="single-node"
fi

if [ "$MODE" == "single-node" ]; then
    cd /usr/config/run_files/docker-single-node
elif [ "$MODE" == "multi-node" ]; then
    cd /usr/config/run_files/docker-multi-node
else
    echo "Invalid MODE environment variable. Must be 'single-node' or 'multi-node'."
    exit 1
fi

if [ -n "$SKIP_GENKEY" ]; then
    echo "Using private key set by env var."
elif [ ! -f "./wallet/private_key" ]; then
    echo "Generating a new wallet."
    /usr/bin/node genkey
fi

/usr/bin/node run