#!/bin/bash
set -euo pipefail

if [ -z "$RUN_MODE" ]; then
    echo "RUN_MODE is not set. Defaulting to full node"
    RUN_MODE="full"
fi

if [ "$RUN_MODE" == "full" ]; then
    echo "Running full node"
    cd /riveruser/river_node
    exec /usr/bin/river_node run
elif [ "$RUN_MODE" == "archive" ]; then
    echo "Running archive node"
    cd /riveruser/river_node
    exec /usr/bin/river_node archive
elif [ "$RUN_MODE" == "notifications" ]; then
    echo "Running notification service"
    cd /riveruser/river_node
    exec /usr/bin/river_node notifications
else
    echo "Unknown RUN_MODE: $RUN_MODE"
    exit 1
fi
