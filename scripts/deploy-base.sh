#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

./scripts/wait-for-basechain.sh
./scripts/deploy-river-contracts.sh $@
./scripts/deploy-wallet-link-contracts.sh $@
./scripts/deploy-entitlement-checker.sh $@
