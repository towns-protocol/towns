#!/usr/bin/env bash

set -eo pipefail

ENVIRONMENT_OVERRIDE=development PAYMASTER_RPC_URL_OVERRIDE=http://localhost:43371 sh scripts/run-stackup-worker.sh "$@"