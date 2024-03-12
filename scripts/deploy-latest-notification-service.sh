#!/usr/bin/env bash

set -x
set -eo pipefail


# Validate the arguments
if [ -z "$ENVIRONMENT_NAME" ]; then
    echo "ERROR: The ENVIRONMENT_NAME env var is required"
    exit 1
fi

echo "ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}"

CLUSTER_NAME="${ENVIRONMENT_NAME}-river-ecs-cluster"
REGISTERED_TASK_DEFINITION_FILENAME="$( pwd )/registered-task-definition.json"
SERVICE_NAME="notifications-${ENVIRONMENT_NAME}-fargate-service"

# if CLUSTER_NAME contains transient, use the transient-global ecs cluster
if [[ $CLUSTER_NAME == *"transient"* ]]; then
    CLUSTER_NAME="transient-global-river-ecs-cluster"
fi

function deploy_and_wait() {
    # Update the service to use the new task definition
    aws ecs update-service \
        --service=${SERVICE_NAME} \
        --cluster=${CLUSTER_NAME} \
        --force-new-deployment \
        --enable-execute-command > /dev/null

   if ! ( timeout 600 aws ecs wait services-stable --cluster="${CLUSTER_NAME}" --services="${SERVICE_NAME}" ); then
        echo "Service failed to stabilize in time"
        exit 1
    fi
}

deploy_and_wait