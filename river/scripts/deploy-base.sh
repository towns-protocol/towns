#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./scripts/wait-for-basechain.sh
# TODO debug why this sleep was here for sleep
sleep 2
./scripts/deploy-contracts.sh $@
./scripts/deploy-wallet-link-contracts.sh $@
./scripts/deploy-entitlement-checker.sh $@
