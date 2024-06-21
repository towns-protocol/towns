#!/bin/bash
set -euo pipefail

if [ -z "$RUN_MODE" ]; then
    echo "RUN_MODE is not set. Defaulting to full node"
    RUN_MODE="full"
fi

if [ "$RUN_MODE" == "full" ]; then
    echo "Running full node"
    exec /usr/bin/supervisord -c /etc/full_node.supervisord.conf
elif [ "$RUN_MODE" == "archive" ]; then
    echo "Running archive node"
    exec /usr/bin/supervisord -c /etc/archive_node.supervisord.conf
else
    echo "Unknown RUN_MODE: $RUN_MODE"
    exit 1
fi
