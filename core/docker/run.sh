#!/bin/bash
set -euo pipefail

RUN_MODE="${RUN_MODE:-full}"
RACE="${RACE:-false}"

RIVER_NODE_BINARY="/usr/bin/river_node"
cd /riveruser/river_node

if [ "$RACE" == "true" ]; then
    RIVER_NODE_BINARY="/usr/bin/river_node_race"
fi

if [ "$RUN_MODE" == "full" ]; then
    echo "Running full node"
    exec $RIVER_NODE_BINARY run
elif [ "$RUN_MODE" == "archive" ]; then
    echo "Running archive node"
    exec $RIVER_NODE_BINARY archive
elif [ "$RUN_MODE" == "notifications" ]; then
    echo "Running notification service"
    exec $RIVER_NODE_BINARY notifications
else
    echo "Unknown RUN_MODE: $RUN_MODE"
    exit 1
fi
