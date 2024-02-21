#!/usr/bin/env bash

set -eo pipefail

#docker ps -q --filter "name=follower3" | grep -q . && docker stop follower3
docker run \
--name follower \
-e MODE=follower \
-e NUM_TOWNS=2 \
-e NUM_CHANNELS_PER_TOWN=3 \
-e NUM_CLIENTS_PER_PROCESS=10 \
-e NUM_FOLLOWERS=50 \
-e RIVER_NODE_URL='http://host.docker.internal:5157' \
-e BASE_CHAIN_RPC_URL='http://host.docker.internal:8545' \
-e CHANNEL_SAMPLING_RATE=100 \
-e LOAD_TEST_DURATION_MS=600000 \
-e MAX_MSG_DELAY_MS=10000 \
-e JOIN_FACTOR=2 \
-e PROCESSES_PER_CONTAINER=1 \
-e REDIS_HOST='host.docker.internal' \
-e DEBUG='csb:test:stress*' \
-e MOCK_PERSISTENCE_STORE=true \
stress-test:v0.9
