#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

docker-compose -f jaeger-docker-compose.yml ${@:-up -d}
