#!/usr/bin/env bash

set -eo pipefail

ENVIRONMENT=development LOCAL_PAYMASTER_RPC_URL=http://localhost:43371 sh scripts/run-stackup-worker.sh "$@"