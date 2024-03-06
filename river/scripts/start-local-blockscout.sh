#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

cd contracts/blockscout/docker-compose
docker-compose up --remove-orphans
