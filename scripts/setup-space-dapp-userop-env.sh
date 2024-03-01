#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

./wait-for-basechain.sh
./deploy-contracts.sh
./deploy-wallet-link-contracts.sh
./../servers/skandha-bundler/run-bundler.sh
