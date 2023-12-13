#!/bin/bash
set -euo pipefail

PORT=$1
NAME=$2
ITERATIONS=${3:-200} # Set ITERATIONS to the 3rd argument, or default to 200 to wait for 20 seconds

echo "Waiting for ${NAME} to launch on ${PORT} port..."

for ((i=0; i<$ITERATIONS; i++)); do
    if nc -z 127.0.0.1 ${PORT}; then
        echo "${NAME} on ${PORT} port launched"
        exit 0
    fi
    sleep 0.1
done

echo "Failed to detect launch ${NAME} on ${PORT} port."
exit 1
