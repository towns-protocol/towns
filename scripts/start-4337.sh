#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if lsof -i :8545 > /dev/null 2>&1; then
        echo "Port 8545 is available, continuing..."
        break
    fi
    
    echo "Waiting for port 8545 to be ready... (attempt $attempt/$max_attempts)"
    sleep 1
    attempt=$((attempt + 1))
done

cd ../servers/4337

# Set the default platform if not provided
# You can try setting this to linux/arm64 on mac, but I'm not having luck with it
DOCKER_PLATFORM=${DOCKER_PLATFORM:-linux/amd64}

docker compose up