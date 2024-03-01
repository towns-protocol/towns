#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./wait-for-basechain.sh
# TODO debug why thi swas needed for CI
sleep 2
./deploy-contracts.sh
./deploy-wallet-link-contracts.sh
./../servers/skandha-bundler/run-bundler.sh
