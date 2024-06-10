#!/bin/bash
set -euo pipefail

# write data to stdout that is required to set on-chain configuration through the SetConfig function on the config facet.
# dump_config_uint256_payload <key:string> <blockNum-effective:uint64> <value:uint256>
function dump_config_uint256_payload() {
  local key="$(cast keccak "$(echo "$1" | tr "[:upper:]" "[:lower:]")")"
  local value="$(cast to-uint256 "$3")"
  printf "%s   %-9d   %s   %s\n" "${key}" "$2" "${value}" "$1"
}

printf "%-66s   %-9s   %-66s   %s\n" "normalized key" "blockNum" "value" "key"
dump_config_uint256_payload "stream.media.maxChunkCount" 0 10
dump_config_uint256_payload "stream.media.maxChunkSize" 0 500000
dump_config_uint256_payload "stream.recencyConstraints.ageSeconds" 0 11
dump_config_uint256_payload "stream.recencyConstraints.generations" 0 5
dump_config_uint256_payload "stream.replicationFactor" 0 1
dump_config_uint256_payload "stream.defaultMinEventsPerSnapshot" 0 10
dump_config_uint256_payload "stream.minEventsPerSnapshot.a1" 0 10
dump_config_uint256_payload "stream.minEventsPerSnapshot.a5" 0 10
dump_config_uint256_payload "stream.minEventsPerSnapshot.a8" 0 10
dump_config_uint256_payload "stream.minEventsPerSnapshot.ad" 0 10
dump_config_uint256_payload "stream.cacheExpirationMs" 0 300000            # 5m
dump_config_uint256_payload "stream.cacheExpirationPollIntervalMs" 0 30000 # 30s
dump_config_uint256_payload "media.streamMembershipLimits.77" 0 48
dump_config_uint256_payload "media.streamMembershipLimits.88" 0 2
