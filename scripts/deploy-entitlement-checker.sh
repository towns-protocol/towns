#!/usr/bin/env bash
pushd contracts
# yarn clean
set -a
. .env.localhost
set +a

make deploy-base-anvil contract=DeployEntitlementChecker
make deploy-base-anvil contract=DeployEntitlementGatedExample

popd

cp packages/generated/localhost/addresses/entitlementChecker.json servers/xchain/common/localhost_entitlementChecker.json
cp packages/generated/localhost/addresses/entitlementGatedExample.json servers/xchain/common/localhost_entitlementGatedExample.json
