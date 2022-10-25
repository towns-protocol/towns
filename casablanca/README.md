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

    yarn csb:test

# Clean Build after Yarn Install or Branch Switching

Build is incremental, as such it may get confused when packages are updated or branches are switched.

Clean build artificats and rebuild:

    yarn csb:clean
    yarn csb:build

Or in specific package:

    cs casablanca/packages/server
    yarn build --clean
    yarn build
