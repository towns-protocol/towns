#!/usr/bin/env bash

usage()
{
cat << EOF
usage: $0 PARAM [-e|--environment] [-n|--node-name] [-h|--help]

OPTIONS:
   PARAM        The param
   -h|--help    Show this message
   -e|--environment   The environment to deploy to
   -n|--node-name   The name of the dendrite node to deploy
EOF
}

# Parse command line arguments
ENVIRONMENT=""
DENDRITE_NODE_NAME=""

while [ "$1" != "" ]; do
    case $1 in
        -e | --environment )  
            shift
            ENVIRONMENT=$1
            ;;
        -n | --node-name )  
            shift
            DENDRITE_NODE_NAME=$1
            ;;
        -h | --help )
            usage
            exit
            ;;
        * )                     
            usage
            exit 1
            ;;
    esac
    shift
done

echo "ENVIRONMENT: ${ENVIRONMENT}"
echo "DENDRITE_NODE_NAME: ${DENDRITE_NODE_NAME}"

# Validate the arguments
if [ -z "$ENVIRONMENT" ]; then
    echo "ERROR: The environment argument is required"
    exit 1
fi

if [ -z "$DENDRITE_NODE_NAME" ]; then
    echo "ERROR: The dendrite node name argument is required"
    exit 1
fi

CODE_DEPLOY_APP_NAME="${ENVIRONMENT}-dendrite-${DENDRITE_NODE_NAME}-codedeploy-app"
CODE_DEPLOY_GROUP_NAME="${ENVIRONMENT}-dendrite-${DENDRITE_NODE_NAME}-codedeploy-deployment-group"

CLUSTER_NAME="${ENVIRONMENT}-dendrite-ecs-cluster"
REGISTERED_TASK_DEFINITION_FILENAME="$( pwd )/registered-task-definition.json"
SERVICE_NAME="${ENVIRONMENT}-dendrite-${DENDRITE_NODE_NAME}-fargate-service"

# Get the ARN of the registered task definition
TASK_DEFINITION_ARN="$( jq -r '.taskDefinition.taskDefinitionArn' ${REGISTERED_TASK_DEFINITION_FILENAME} )"

echo "Updating service ${SERVICE_NAME} to use task definition ${TASK_DEFINITION_ARN}"

DEPLOYMENT_ID_FILENAME="$( pwd )/deploy-id.json"

aws deploy create-deployment \
    --application-name ${CODE_DEPLOY_APP_NAME} \
    --deployment-group-name ${CODE_DEPLOY_GROUP_NAME} \
    --revision '{"revisionType": "AppSpecContent", "appSpecContent": {"content": "{\"Resources\":[{\"TargetService\":{\"Properties\":{\"TaskDefinition\":\"'${TASK_DEFINITION_ARN}'\",\"LoadBalancerInfo\": {\"ContainerName\": \"dendrite\", \"ContainerPort\": 8008} }, \"Type\":\"AWS::ECS::Service\"}}],\"version\":1}"}}' > ${DEPLOYMENT_ID_FILENAME}

# Get the deploy id
DEPLOYMENT_ID="$( jq -r '.deploymentId' ${DEPLOYMENT_ID_FILENAME} )"

echo "Deploy id: ${DEPLOYMENT_ID}"

echo "Waiting for successful deploy on Deployment Id: ${DEPLOYMENT_ID} for ${SERVICE_NAME}..."

# Wait for the deploy to succeed
aws deploy wait deployment-successful --deployment-id ${DEPLOYMENT_ID}

echo "Deploy successful"