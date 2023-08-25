#!/usr/bin/env bash

usage()
{
cat << EOF
usage: $0 PARAM [-e|--environment] [-d|--docker-image-tag] [-h|--help] 

OPTIONS:
   PARAM        The param
   -h|--help    Show this message
   -e|--environment   The environment to deploy to
   -d|--docker-image-tag   The docker image tag to deploy
EOF
}

# Parse command line arguments
ENVIRONMENT=""
DOCKER_IMAGE_TAG=""

while [ "$1" != "" ]; do
    case $1 in
        -e | --environment )  
            shift
            ENVIRONMENT=$1
            ;;
        -d | --docker-image-tag )  
            shift
            DOCKER_IMAGE_TAG=$1
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
echo "DOCKER_IMAGE_TAG: ${DOCKER_IMAGE_TAG}"

# Validate the arguments
if [ -z "$ENVIRONMENT" ]; then
    echo "ERROR: The environment argument is required"
    exit 1
fi

if [ -z "$DOCKER_IMAGE_TAG" ]; then
    echo "ERROR: The docker image tag argument is required"
    exit 1
fi

TASK_DEFINITION_FAMILY="${ENVIRONMENT}-river-fargate"
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