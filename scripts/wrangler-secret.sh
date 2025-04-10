#!/bin/bash

# Check if required arguments are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <worker_name> <environment> <secret_name>"
    echo "Example: $0 gateway alpha API_KEY"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Parse arguments
WORKER_NAME="$1"
ENV="$2"
SECRET_NAME="$3"

# Map worker name to full worker name and database ID
case "$WORKER_NAME" in
    "gateway"|"gateway-worker")
        WORKER_DIR="gateway-worker"
        DB_ID="1ca3562b1f4e8001b7d5ec2cfc1b2cd5"
        ;;
    "stackup"|"stackup-worker")
        WORKER_DIR="stackup-worker"
        DB_ID="1cb3562b1f4e80c39c00e9494f76a835"
        ;;
    "unfurl"|"unfurl-worker")
        WORKER_DIR="unfurl-worker"
        DB_ID="1cb3562b1f4e80c4951ae6a9416ce0aa"
        ;;
    "token"|"token-worker")
        WORKER_DIR="token-worker"
        DB_ID="1cb3562b1f4e80598c94cd6d3eecd4b1"
        ;;
    *)
        echo "Error: Invalid worker name '$WORKER_NAME'"
        echo "Valid worker names: gateway, gateway-worker, stackup, stackup-worker, unfurl, unfurl-worker, token, token-worker"
        exit 1
        ;;
esac

# Map environment if needed
if [ "$ENV" = "gamma" ]; then
    ENV="test-beta"
fi

# Validate environment
case "$ENV" in
    "alpha"|"omega"|"test-beta")
        ;;
    *)
        echo "Error: Invalid environment '$ENV'"
        echo "Valid environments: alpha, omega, gamma (maps to test-beta), test-beta"
        exit 1
        ;;
esac




# Query the Notion database for the secret
echo "Querying Notion database for secret: $SECRET_NAME"
NOTION_VALUES=$("$SCRIPT_DIR/run-harmony/query-db.sh" "$DB_ID" "$ENV" 2>&1)

# Change to the worker directory
WORKER_PATH="$SCRIPT_DIR/../servers/workers/$WORKER_DIR"
if [ ! -d "$WORKER_PATH" ]; then
    echo "Error: Worker directory not found at $WORKER_PATH"
    exit 1
fi
cd "$WORKER_PATH"
echo "Changed to directory: $(pwd)"

# Check if the query was successful
if [ $? -ne 0 ]; then
    echo "Failed to query Notion database"
    echo "Error output: $NOTION_VALUES"
    exit 1
fi

# Extract the secret value
SECRET_VALUE=$(echo "$NOTION_VALUES" | grep "^$SECRET_NAME=" | cut -d'=' -f2)


# Check if the secret exists and has a value
if [ -z "$SECRET_VALUE" ]; then
    echo "Error: Secret '$SECRET_NAME' does not exist in $WORKER_NAME:$ENV or has no value"
    exit 1
fi

# Prompt the user for confirmation
echo "Secret '$SECRET_NAME' for $WORKER_NAME:$ENV contains the value: $SECRET_VALUE"
read -p "Are you sure you want to publish this secret? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Operation cancelled"
    exit 0
fi

# Publish the secret using wrangler
echo "Publishing secret '$SECRET_NAME' to environment '$ENV'..."
echo "$SECRET_VALUE" | yarn secret put "$SECRET_NAME" --env "$ENV"

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "Secret '$SECRET_NAME' successfully published to environment '$ENV'"
else
    echo "Failed to publish secret '$SECRET_NAME' to environment '$ENV'"
    exit 1
fi
