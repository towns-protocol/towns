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

AMP_WORKER_PATH="servers/workers/amp-worker"
GATEWAY_WORKER_PATH="servers/workers/gateway-worker"
PUSH_NOTIFICATION_WORKER_PATH="servers/workers/push-notification-worker"
SIWE_WORKER_PATH="servers/workers/siwe-worker"
TOKEN_WORKER_PATH="servers/workers/token-worker"
UNFURL_WORKER_PATH="servers/workers/unfurl-worker"
JWT_WORKER_PATH="servers/workers/jwt-worker"
RPC_PROXY_WORKER_PATH="servers/workers/nexus-rpc-worker"

declare -a WORKER_PATHS=(
    $JWT_WORKER_PATH
    $AMP_WORKER_PATH
    $SIWE_WORKER_PATH
    $PUSH_NOTIFICATION_WORKER_PATH
    $TOKEN_WORKER_PATH
    $UNFURL_WORKER_PATH
    $GATEWAY_WORKER_PATH
    $RPC_PROXY_WORKER_PATH
)

for WORKER_PATH in "${WORKER_PATHS[@]}"; do
  pushd $WORKER_PATH
    echo "Deploying $WORKER_PATH"
    yarn publish
  popd
done

