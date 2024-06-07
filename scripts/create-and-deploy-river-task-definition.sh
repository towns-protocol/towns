#!/usr/bin/env bash

set -x
set -eo pipefail

DEPLOYMENT_TIMEOUT=720 # 12 minutes

function check_env() {
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

    if [ -z "$RUN_MODE" ]; then
        echo "ERROR: The RUN_MODE env var is required"
        exit 1
    fi
}

function set_env() {
    # Set the environment variables
    if [ "$RUN_MODE" == "archive" ]; then
        export NODE_NAME="archive${NODE_NUMBER}"
    else
        export NODE_NAME="river${NODE_NUMBER}"
    fi

    export TASK_DEFINITION_FAMILY="${NODE_NAME}-${ENVIRONMENT_NAME}-fargate"
    export CURRENT_TASK_DEFINITION_FILENAME="$( pwd )/current-task-definition.json"
    export NEW_TASK_DEFINITION_FILENAME="$( pwd )/new-task-definition.json"
    export REGISTERED_TASK_DEFINITION_FILENAME="$( pwd )/registered-task-definition.json"
    export CLUSTER_NAME="${ENVIRONMENT_NAME}-river-ecs-cluster"
    export SERVICE_NAME="${NODE_NAME}-${ENVIRONMENT_NAME}-fargate-service"

    # if public ECR URL is not set, use the default
    if [ -z "$PUBLIC_ECR_URL" ]; then
        export PUBLIC_ECR_URL=public.ecr.aws/h5v6m2x1/river
    fi

    echo "ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}"
    echo "DOCKER_IMAGE_TAG: ${DOCKER_IMAGE_TAG}"
    echo "NODE_NUMBER: ${NODE_NUMBER}"
    echo "NODE_NAME: ${NODE_NAME}"
    echo "TASK_DEFINITION_FAMILY: ${TASK_DEFINITION_FAMILY}"
    echo "CLUSTER_NAME: ${CLUSTER_NAME}"
    echo "SERVICE_NAME: ${SERVICE_NAME}"
    echo "PUBLIC_ECR_URL: ${PUBLIC_ECR_URL}"
}

function create_river_task_definition() {
    # Download the currently active task definition
    aws ecs describe-task-definition --task-definition ${TASK_DEFINITION_FAMILY} > $CURRENT_TASK_DEFINITION_FILENAME

    # Get the task definition field
    TASK_DEF="$( jq '.taskDefinition' ${CURRENT_TASK_DEFINITION_FILENAME} )"

    # Remove all the unwanted keys
    TASK_DEF_WITHOUT_UNWANTED_KEYS="$( jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' <<< ${TASK_DEF} )"

    # Update the image in the task definition using the DOCKER_IMAGE_TAG variable
    TASK_DEF_WITH_UPDATED_IMAGE="$( jq '.containerDefinitions[0].image = "'${PUBLIC_ECR_URL}':'${DOCKER_IMAGE_TAG}'"' <<< ${TASK_DEF_WITHOUT_UNWANTED_KEYS} )"

    # Save the updated task definition
    echo $TASK_DEF_WITH_UPDATED_IMAGE > $NEW_TASK_DEFINITION_FILENAME

    # Register the new task definition
    aws ecs register-task-definition \
        --cli-input-json "file://$NEW_TASK_DEFINITION_FILENAME" > $REGISTERED_TASK_DEFINITION_FILENAME
}


function deploy_river_task_definition() {

    # if CLUSTER_NAME contains transient, use the transient-global ecs cluster
    if [[ $CLUSTER_NAME == *"transient"* ]]; then
        CLUSTER_NAME="transient-global-river-ecs-cluster"
    fi

    # Get the ARN of the registered task definition
    TASK_DEFINITION_ARN="$( jq -r '.taskDefinition.taskDefinitionArn' ${REGISTERED_TASK_DEFINITION_FILENAME} )"

    echo "Updating service ${SERVICE_NAME} to use task definition ${TASK_DEFINITION_ARN}"

    DEPLOYMENT_ID_FILENAME="$( pwd )/deploy-id.json"

    aws ecs update-service \
        --service=${SERVICE_NAME} \
        --cluster=${CLUSTER_NAME} \
        --task-definition=${TASK_DEFINITION_ARN} > /dev/null \
        --enable-execute-command

    if ! ( timeout $DEPLOYMENT_TIMEOUT bash -c wait_services_stable ); then
        echo "Service failed to stabilize in time"
        exit 1
    fi        
}

function wait_services_stable() {
    # this function times out after 10 minutes regardless of the status of the service.
    # so we should keep running "aws ecs wait services-stable" until the service is stable:

    while ! ( aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} ); do
        echo "Waiting for service to stabilize..."
        
    done
}
export -f wait_services_stable

function main() {
    check_env
    set_env
    create_river_task_definition
    deploy_river_task_definition
}

main
