#!/usr/bin/env bash

set -x
set -eo pipefail

usage()
{
cat << EOF
usage: $0 PARAM [-e|--environment] [-h|--help] 

OPTIONS:
   PARAM                The param
   -h|--help            Show this message
   -e|--environment     The environment to deploy to
EOF
}

# Parse command line arguments
ENVIRONMENT=""

while [ "$1" != "" ]; do
    case $1 in
        -e | --environment )  
            shift
            ENVIRONMENT=$1
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

# Validate the arguments
if [ -z "$ENVIRONMENT" ]; then
    echo "ERROR: The environment argument is required"
    exit 1
fi

export CF_ENV=$ENVIRONMENT

GATEWAY_WORKER_PATH="servers/workers/gateway-worker"
TOKEN_WORKER_PATH="servers/workers/token-worker"
UNFURL_WORKER_PATH="servers/workers/unfurl-worker"
STACKUP_WORKER_PATH="servers/workers/stackup-worker"

declare -a WORKER_PATHS=(
    $TOKEN_WORKER_PATH
    $UNFURL_WORKER_PATH
    $GATEWAY_WORKER_PATH
    $STACKUP_WORKER_PATH
)

for WORKER_PATH in "${WORKER_PATHS[@]}"; do
  pushd $WORKER_PATH
    echo "Deploying $WORKER_PATH"
    yarn publish
  popd
done

