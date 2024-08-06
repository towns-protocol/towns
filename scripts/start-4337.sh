#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

cd ../servers/4337

# Set the default platform if not provided
# You can try setting this to linux/arm64 on mac, but I'm not having luck with it
DOCKER_PLATFORM=${DOCKER_PLATFORM:-linux/amd64}

docker compose up