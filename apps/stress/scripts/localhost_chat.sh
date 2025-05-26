#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

# run scripts/localhost_chat_setup.sh to set up the environment variables

# List of environment files to source
ENV_FILES=(
    "./scripts/.env.localhost_chat"
    "./scripts/.env.storage"
)

# Loop through each file in the list
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        source "$file"
        echo "Sourced: $file"
    else
        echo "Skipped: $file file does not exist."
    fi
done

echo "stress/scripts/localhost_chat.sh"

#
# stress mode=chat requires the following environment variables
# SPACE_ID
# CHANNEL_IDS
# RIVER_ENV (default=local_multi) 
# STRESS_MODE (default=chat)
# STRESS_DURATION (default=120)
#
# this script provides a MNEMONIC, this user should ether be a member of the space or be entitled to join
#


export SPACE_ID="${SPACE_ID}"
export CHANNEL_IDS="${CHANNEL_IDS}"
export ANNOUNCE_CHANNEL_ID="${ANNOUNCE_CHANNEL_ID:-}"
export REDIS_HOST="${REDIS_HOST:-}"

export RIVER_ENV="${RIVER_ENV:-local_multi}"
export STRESS_MODE="${STRESS_MODE:-chat}"
export STRESS_DURATION="${STRESS_DURATION:-180}"
export SESSION_ID="${SESSION_ID:-$(uuidgen)}"

export PROCESSES_PER_CONTAINER="${PROCESSES_PER_CONTAINER:-4}"
export CLIENTS_COUNT="${CLIENTS_COUNT:-100}"
export RANDOM_CLIENTS_COUNT="${RANDOM_CLIENTS_COUNT:-5}"

export MNEMONIC="toy alien remain valid print employ age multiply claim student story aware" 
export WALLET_ADDRESS="0x95D7701A0Faa5F514B4c5B49bf66580fCE9ffbf7"
export BASE_CHAIN_RPC_URL="http://localhost:8545"
export RIVER_CHAIN_RPC_URL="http://localhost:8546"
export NODE_TLS_REJECT_UNAUTHORIZED=0 # allow unsigned against localhost
export NODE_ENV=development

# fund the root wallet
cast rpc -r $BASE_CHAIN_RPC_URL anvil_setBalance $WALLET_ADDRESS 10000000000000000000 > /dev/null

./scripts/start.sh "$@"