#!/bin/bash
set -euo pipefail

RUN_MODE="${RUN_MODE:-full}"
RACE="${RACE:-false}"
TOWNS_ENV="${TOWNS_ENV:-omega}"

case "$TOWNS_ENV" in
    mainnet|main)
        TOWNS_ENV="omega"
        ;;
esac

CONFIG_PATH="/riveruser/river_node/env/${TOWNS_ENV}/config.yaml"
if [ ! -f "$CONFIG_PATH" ]; then
    echo "Missing config for environment '$TOWNS_ENV' at $CONFIG_PATH"
    exit 1
fi

RIVER_NODE_BINARY="/usr/bin/river_node"
cd /riveruser/river_node

if [ "$RACE" == "true" ]; then
    RIVER_NODE_BINARY="/usr/bin/river_node_race"
fi

echo "Running ${RUN_MODE} node with environment '$TOWNS_ENV'"

case "$RUN_MODE" in
    full|run)
        COMMAND="run"
        ;;
    archive|notifications|app-registry)
        COMMAND=$RUN_MODE
        ;;
    *)
        echo "Unknown RUN_MODE: $RUN_MODE"
        exit 1
        ;;
esac

exec $RIVER_NODE_BINARY $COMMAND -c "$CONFIG_PATH"
