# Running Zion node

Build node and start:

    yarn workspace @zion/server run build
    casablanca/scripts/launch.sh

Run tests on the running node:

    yarn workspace @zion/server run test-remote

# Running Casablanca Tests

Start Redis:

    casablanca/scripts/launch_redis.sh

Run all Casablanca tests:

    yarn workspace harmony run test-csb
