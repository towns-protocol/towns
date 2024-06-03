#!/bin/bash
set -euo pipefail
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"
cd ..

: ${RUN_ENV:?}
RIVER_ENV="local_${RUN_ENV}"
RIVER_REGISTRY_ADDRESS=$(jq -r '.address' packages/generated/deployments/${RIVER_ENV}/river/addresses/riverRegistry.json)
SKIP_CHAIN_WAIT="${SKIP_CHAIN_WAIT:-false}"

. contracts/.env.localhost

# write key, activation block, value as uint256 to River Registry config facet
function set_config_uint() {
  local key="$(cast keccak "$(echo "$1" | tr "[:upper:]" "[:lower:]")")"
  local blockNum=$2
  local value="$(cast to-uint256 "$3")"

  echo "set on-chain config key: $1 value: $3 activation-block: ${blockNum}"

  cast send \
    --rpc-url http://127.0.0.1:8546 \
    --private-key "$LOCAL_PRIVATE_KEY" \
    "$RIVER_REGISTRY_ADDRESS" \
    "setConfiguration(bytes32,uint64,bytes)" \
    "${key}" "${blockNum}" "${value}" \
    2> /dev/null
}

# Wait for the river chain to be ready
if [ "${SKIP_CHAIN_WAIT}" != "true" ]; then
    ./scripts/wait-for-riverchain.sh
fi

echo "Set River on-chain configuration"

set_config_uint "stream.media.maxChunkCount" 0 10
set_config_uint "stream.media.maxChunkSize" 0 500000
set_config_uint "media.streamMembershipLimits.77" 0 6
set_config_uint "media.streamMembershipLimits.88" 0 2
set_config_uint "stream.recencyConstraints.ageSeconds" 0 11
set_config_uint "stream.recencyConstraints.generations" 0 5
set_config_uint "stream.replicationFactor" 0 1
set_config_uint "stream.defaultMinEventsPerSnapshot" 0 100
set_config_uint "stream.minEventsPerSnapshot.a1" 0 10
set_config_uint "stream.minEventsPerSnapshot.a5" 0 10
set_config_uint "stream.minEventsPerSnapshot.a8" 0 10
set_config_uint "stream.minEventsPerSnapshot.ad" 0 10
set_config_uint "stream.cacheExpirationMs" 0 300000            # 5m
set_config_uint "stream.cacheExpirationPollIntervalMs" 0 30000 # 30s

