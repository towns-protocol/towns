#!/bin/bash

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <worker_name> <copy_values_key> <environment>"
    exit 1
fi

WORKER_NAME=$1
COPY_VALUES_KEY=$2
ENVIRONMENT=$3

# Get the directory where this helper script is located
HELPER_SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Base path to workers directory relative to this script
WORKER_BASE_PATH="../../servers/workers"
WORKER_DIR_RELATIVE="$WORKER_BASE_PATH/$WORKER_NAME"
DEV_VARS_RELATIVE="$WORKER_DIR_RELATIVE/.dev.vars"

# Change to the helper script's directory to run copy-values.sh correctly
cd "$HELPER_SCRIPT_DIR"

echo "Running copy-values for $WORKER_NAME..."
sh ./copy-values.sh "$COPY_VALUES_KEY" "$DEV_VARS_RELATIVE" "$ENVIRONMENT"
if [ $? -ne 0 ]; then
    echo "copy-values.sh failed for $WORKER_NAME"
    exit 1
fi

# Change to the specific worker directory
# Construct the absolute path safely
cd "$HELPER_SCRIPT_DIR"
cd "$WORKER_DIR_RELATIVE"
if [ $? -ne 0 ]; then
    echo "Failed to change directory to $WORKER_DIR_RELATIVE from $HELPER_SCRIPT_DIR"
    exit 1
fi

# Handle environment mapping
ENV_COLUMN=$ENVIRONMENT
if [ "$ENV_COLUMN" = "gamma" ]; then
    ENV_COLUMN="test-beta"
fi

# Run the worker
echo "Starting $WORKER_NAME worker for environment $ENV_COLUMN..."
if [ "$ENV_COLUMN" = "localhost" ]; then
    yarn run dev:local
else
    yarn run dev:local --env "$ENV_COLUMN"
fi

# Ensure the helper script exits with the status of the yarn command
exit $? 