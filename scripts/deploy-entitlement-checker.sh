#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ../contracts

set -a
. .env.localhost
set +a

if [ "$1" != "nobuild" ]; then
    make build
fi

make deploy-base-anvil-nb contract=DeployEntitlementChecker
make deploy-base-anvil-nb contract=DeployEntitlementGatedExample

cd ..
cp packages/generated/localhost/addresses/entitlementChecker.json servers/xchain/common/localhost_entitlementChecker.json
cp packages/generated/localhost/addresses/entitlementGatedExample.json servers/xchain/common/localhost_entitlementGatedExample.json
