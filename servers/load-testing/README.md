## Introduction

This Dockerfile contains the river load testing leader and follower nodes.

## Environment variables
    - MODE: `leader` or `follower`
    - FOLLOWER_ID: a unique identifier for the follower node. required for follower nodes.
    - COORDINATION_SPACE_ID: required for follower and leader nodes.
    - COORDINATION_CHANNEL_ID: required for follower and leader nodes.
    - RIVER_NODE_URL: required for follower and leader nodes.
    - BASE_CHAIN_RPC_URL: required for follower and leader nodes.
    - NUM_TOWNS: number of towns to create. required for leader node.
    - NUM_CHANNELS_PER_TOWN: number of channels to create for every town. required for leader node.
    - NUM_FOLLOWERS: used for verification. required for leader node.
    - JOIN_FACTOR: seed range for channel numbers. required for follower nodes.
    - MAX_MSG_DELAY_MS: (milliseconds) maximum delay between 2 messages. required for follower nodes.
    - LOAD_TEST_DURATION_MS: (milliseconds) required for both leader and follower nodes
    - CHANNEL_SAMPLING_RATE: [0-100] required for leader nodes. Optional - default value is 100
    - REDIS_HOST: redis host. required for both leader and follower nodes
    - REDIS_PORT: redis port. required for both leader and follower nodes
    - COORDINATOR_LEAVE_CHANNELS: true/false. Defines if coordinator will leave created channels. required for leader node.

## Local development

From the root of the load-testing directory (/harmony/servers/load-testing), run `docker compose up --build`. This should bring up all the necessary components and run the load tests for you. If you ever make a change, you should run `docker compose` with the `--build` option. Otherwise it will use the cached version, which will exclude your recent changes.