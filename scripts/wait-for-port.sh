#!/bin/bash
set -euo pipefail

PORT=$1
NAME=$2
TIMEOUT_SEC=${3:-20} # Set TIMEOUT_SEC to the 3rd argument, or default to 20 seconds if not provided

echo "Waiting for ${NAME} to launch on ${PORT} port..."

if ! timeout "${TIMEOUT_SEC}" bash -c -- "while ! nc -z 127.0.0.1 ${PORT}; do sleep 0.1; done"
then
    echo "Failed to launch ${NAME} on ${PORT} port within ${TIMEOUT_SEC} seconds."
    exit 1
else
    echo "${NAME} on ${PORT} port launched"
fi
