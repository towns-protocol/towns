#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "stress/scripts/localhost_demo.sh"

#
# simple test that runs in ci to ensure that the stress test can run in node against local env
#

export RIVER_ENV="${RIVER_ENV:-local_single}"
export STRESS_MODE="${STRESS_MODE:-test}"
export SESSION_ID="${SESSION_ID:-$(uuidgen)}"

export MNEMONIC="toy alien remain valid print employ age multiply claim student story aware" 
export WALLET_ADDRESS="0x95D7701A0Faa5F514B4c5B49bf66580fCE9ffbf7"
export BASE_CHAIN_RPC_URL="http://localhost:8545"
export RIVER_CHAIN_RPC_URL="http://localhost:8546"
export NODE_TLS_REJECT_UNAUTHORIZED=0 # allow unsigned against localhost
export DEBUG="stress:*"

# fund the root wallet
cast rpc -r $BASE_CHAIN_RPC_URL anvil_setBalance $WALLET_ADDRESS 10000000000000000000 > /dev/null

yarn build
yarn demo

echo "stress/scripts/localhost_demo.sh done"