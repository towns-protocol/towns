#!/usr/bin/env bash

# If any command fails, stop executing this script and return its exit code
set -eo pipefail

if [ -z "$CLUSTER_NAME" ]; then
    echo "CLUSTER_NAME is not set"
    exit 1
fi

# Check for env var named $RESET_DB, and skip
# the database reset if it is not set to "true"
if [ "$RESET_DB" == "true" ]; then
    if [ -z "$DB_URL" ]; then
        echo "DB_URL is not set"
        exit 1
    fi

    echo "Resetting the database ..."

    # We drop the database and recreate it
    psql $DB_URL -c "DROP DATABASE river WITH (FORCE);"
    psql $DB_URL -c "CREATE DATABASE river;"
else 
    echo "Skipping database reset"
fi


echo "Resetting the ECS cluster $CLUSTER_NAME ..."

# We just signal the ECS tasks to stop, which will trigger the ECS service to restart them
for task in $(aws ecs list-tasks --cluster $CLUSTER_NAME --query "taskArns[]" --output text); do
    aws ecs stop-task --cluster $CLUSTER_NAME --task $task
done

echo "Done"