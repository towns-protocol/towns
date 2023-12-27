#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

if [ "${1-}" != "nobuild" ]; then
    make build
fi

make deploy-river-anvil-nb contract=DeployEntitlementChecker
make deploy-river-anvil-nb contract=DeployEntitlementGatedExample
