#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

docker-compose -f zipkin-docker-compose.yml ${@:-up -d}
