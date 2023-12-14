#!/usr/bin/env bash

set -x
set -eo pipefail


# Validate the arguments
if [ -z "$ENVIRONMENT_NAME" ]; then
    echo "ERROR: The ENVIRONMENT_NAME env var is required"
    exit 1
fi

echo "ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}"
NODE_NAME="river1"

CODE_DEPLOY_APP_NAME="${NODE_NAME}-${ENVIRONMENT_NAME}"
CODE_DEPLOY_GROUP_NAME="${NODE_NAME}-${ENVIRONMENT_NAME}"

CLUSTER_NAME="${ENVIRONMENT_NAME}-river-ecs-cluster"
REGISTERED_TASK_DEFINITION_FILENAME="$( pwd )/registered-task-definition.json"
SERVICE_NAME="${NODE_NAME}-${ENVIRONMENT_NAME}-fargate-service"

# Get the ARN of the registered task definition
TASK_DEFINITION_ARN="$( jq -r '.taskDefinition.taskDefinitionArn' ${REGISTERED_TASK_DEFINITION_FILENAME} )"

echo "Updating service ${SERVICE_NAME} to use task definition ${TASK_DEFINITION_ARN}"

DEPLOYMENT_ID_FILENAME="$( pwd )/deploy-id.json"

aws deploy create-deployment \
    --application-name ${CODE_DEPLOY_APP_NAME} \
    --deployment-group-name ${CODE_DEPLOY_GROUP_NAME} \
    --revision '{"revisionType": "AppSpecContent", "appSpecContent": {"content": "{\"Resources\":[{\"TargetService\":{\"Properties\":{\"TaskDefinition\":\"'${TASK_DEFINITION_ARN}'\",\"LoadBalancerInfo\": {\"ContainerName\": \"river-node\", \"ContainerPort\": 5157} }, \"Type\":\"AWS::ECS::Service\"}}],\"version\":1}"}}' > ${DEPLOYMENT_ID_FILENAME}

# Get the deploy id
DEPLOYMENT_ID="$( jq -r '.deploymentId' ${DEPLOYMENT_ID_FILENAME} )"

echo "Deploy id: ${DEPLOYMENT_ID}"

echo "Waiting for successful deploy on Deployment Id: ${DEPLOYMENT_ID} for ${SERVICE_NAME}..."

# Wait for the deploy to succeed with a timeout of 5 minutes (300 seconds)
TIMEOUT_SECONDS=300

if ! timeout $TIMEOUT_SECONDS aws deploy wait deployment-successful --deployment-id ${DEPLOYMENT_ID}; then
    echo "Deployment was not successful in ${TIMEOUT_SECONDS} seconds. Stopping deployment..."
    aws deploy stop-deployment --deployment-id ${DEPLOYMENT_ID}
    exit 1
else
    echo "Deployment successful"
fi

echo "Exiting"