#!/usr/bin/env bash
cd contracts/
# yarn clean
set -a
. .env.localhost
set +a

make deploy-anvil contract=DeployEntitlementChecker
make deploy-anvil contract=DeployEntitlementGatedExample
