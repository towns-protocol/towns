#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

echo "stress/scripts/stress_localhost_chat.sh"

#
# stress mode=chat requires the following environment variables
# SPACE_ID
# CHANNEL_IDS
# RIVER_ENV (default=local_single) 
# STRESS_MODE (default=chat)
# STRESS_DURATION (default=120)
#
# this script provides a MNEMONIC, this user should ether be a member of the space or be entitled to join
#


export SPACE_ID="${SPACE_ID}"
export CHANNEL_IDS="${CHANNEL_IDS}"

export RIVER_ENV="${RIVER_ENV:-local_single}"
export STRESS_MODE="${STRESS_MODE:-chat}"
export STRESS_DURATION="${STRESS_DURATION:-120}"
export SESSION_ID="${SESSION_ID:-$(uuidgen)}"

export CLIENTS_PER_PROCESS="${CLIENTS_PER_PROCESS:-5}"
export CLIENTS_COUNT="${CLIENTS_COUNT:-20}"

export MNEMONIC="toy alien remain valid print employ age multiply claim student story aware" 
export WALLET_ADDRESS="0x95D7701A0Faa5F514B4c5B49bf66580fCE9ffbf7"
export BASE_CHAIN_RPC_URL="http://localhost:8545"
export RIVER_CHAIN_RPC_URL="http://localhost:8546"
export NODE_TLS_REJECT_UNAUTHORIZED=0 # allow unsigned against localhost

# fund the root wallet
cast rpc -r $BASE_CHAIN_RPC_URL anvil_setBalance $WALLET_ADDRESS 10000000000000000000 > /dev/null

./scripts/start.sh $@