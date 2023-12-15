#!/usr/bin/env bash

set -x
set -eo pipefail


# Validate the arguments
if [ -z "$ENVIRONMENT_NAME" ]; then
    echo "ERROR: The ENVIRONMENT_NAME env var is required"
    exit 1
fi

if [ -z "$DOCKER_IMAGE_TAG" ]; then
    echo "ERROR: The docker image tag env var is required"
    exit 1
fi

if [ -z "$NODE_NUMBER" ]; then
    echo "ERROR: The NODE_NUMBER env var is required"
    exit 1
fi

echo "ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}"
echo "DOCKER_IMAGE_TAG: ${DOCKER_IMAGE_TAG}"
echo "NODE_NUMBER: ${NODE_NUMBER}"

NODE_NAME="river${NODE_NUMBER}"

TASK_DEFINITION_FAMILY="${NODE_NAME}-${ENVIRONMENT_NAME}-fargate"
CURRENT_TASK_DEFINITION_FILENAME="$( pwd )/current-task-definition.json"
NEW_TASK_DEFINITION_FILENAME="$( pwd )/new-task-definition.json"
REGISTERED_TASK_DEFINITION_FILENAME="$( pwd )/registered-task-definition.json"

# Download the currently active task definition
aws ecs describe-task-definition --task-definition ${TASK_DEFINITION_FAMILY} > $CURRENT_TASK_DEFINITION_FILENAME

# Get the task definition field
TASK_DEF="$( jq '.taskDefinition' ${CURRENT_TASK_DEFINITION_FILENAME} )"

# Remove all the unwanted keys
TASK_DEF_WITHOUT_UNWANTED_KEYS="$( jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' <<< ${TASK_DEF} )"

# Update the image in the task definition using the DOCKER_IMAGE_TAG variable

TASK_DEF_WITH_UPDATED_IMAGE="$( jq '.containerDefinitions[0].image = "docker.io/herenotthere/river-node:'${DOCKER_IMAGE_TAG}'"' <<< ${TASK_DEF_WITHOUT_UNWANTED_KEYS} )"

# Save the updated task definition
echo $TASK_DEF_WITH_UPDATED_IMAGE > $NEW_TASK_DEFINITION_FILENAME

# Register the new task definition
aws ecs register-task-definition \
    --cli-input-json "file://$NEW_TASK_DEFINITION_FILENAME" > $REGISTERED_TASK_DEFINITION_FILENAME