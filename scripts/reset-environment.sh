#!/usr/bin/env bash

# If any command fails, stop executing this script and return its exit code
set -eo pipefail

if [ -z "$DB_URL" ]; then
    echo "DB_URL is not set"
    exit 1
fi

if [ -z "$CLUSTER_NAME" ]; then
    echo "CLUSTER_NAME is not set"
    exit 1
fi

# We first reset the database, then the ECS cluster
echo "Resetting the database ..."

# We drop the database and recreate it
psql $DB_URL -c "DROP DATABASE river WITH (FORCE);"
psql $DB_URL -c "CREATE DATABASE river;"

echo "Resetting the ECS cluster $CLUSTER_NAME ..."

# We just signal the ECS tasks to stop, which will trigger the ECS service to restart them
for task in $(aws ecs list-tasks --cluster $CLUSTER_NAME --query "taskArns[]" --output text); do
    aws ecs stop-task --cluster $CLUSTER_NAME --task $task
done

echo "Done"