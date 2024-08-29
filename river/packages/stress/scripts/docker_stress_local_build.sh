#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../../..

docker build -t stress-local -f packages/stress/scripts/Dockerfile .
