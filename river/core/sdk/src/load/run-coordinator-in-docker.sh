#!/usr/bin/env bash

set -eo pipefail

docker ps -q --filter "name=leader" | grep -q . && docker stop leader
docker run \
--name leader \
-e MODE=leader \
-e NUM_TOWNS=2 \
-e NUM_CHANNELS_PER_TOWN=3 \
-e NUM_FOLLOWERS=50 \
-e RIVER_NODE_URL='http://host.docker.internal:5157' \
-e BASE_CHAIN_RPC_URL='http://host.docker.internal:8545' \
-e CHANNEL_SAMPLING_RATE=100 \
-e LOAD_TEST_DURATION_MS=600000 \
-e REDIS_HOST='host.docker.internal' \
-e DEBUG='csb:test:stress*' \
stress-test:v0.9