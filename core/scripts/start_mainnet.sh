#!/bin/bash -ue
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

pkill -SIGINT -f "anvil --port 8545" || true
anvil --port 8545 &
PID_ANVIL=$!

cd ../..
./scripts/wait-for-basechain.sh && ./scripts/deploy-towns-contracts.sh

wait $PID_ANVIL
