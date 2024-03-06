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

make deploy-base-anvil-nb contract=DeployEntitlementChecker
make deploy-base-anvil-nb contract=DeployEntitlementGatedExample

cp ./deployments/base_anvil/entitlementChecker.json ../packages/generated/addresses/base_anvil/entitlementChecker.json
cp ./deployments/base_anvil/entitlementGatedExample.json ../packages/generated/addresses/base_anvil/entitlementGatedExample.json

