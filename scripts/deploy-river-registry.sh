#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

: ${SAVE_DEPLOYMENTS_PATH:?"Error: SAVE_DEPLOYMENTS_PATH must be set"}

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    make build
fi

make deploy-river-anvil-explicit contract=DeployRiverRegistry
