#!/bin/bash

# Set RIVER_ROOT based on whether an argument is provided
if [ -n "$1" ]; then
    RIVER_ROOT="$1"
else
    # Determine the Git project root
    RIVER_ROOT=$(git rev-parse --show-toplevel)
fi

RUN_DIR="$RIVER_ROOT/packages/stream-metadata"

echo "Starting stream-metadata service in $RUN_DIR"

# Try to change to RUN_DIR
# print an error if it fails, and exit
if ! pushd "$RUN_DIR"; then
    echo "Error: Failed to change directory to $RUN_DIR"
    exit 1
fi

cp ./.env.local.sample .env.local
yarn dev
