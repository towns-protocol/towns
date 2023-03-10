# Installing protoc and Buf

    brew install protobuf@3
    brew link --overwrite protobuf@3
    brew install bufbuild/buf/buf

There are addition install steps for go tools in [./node/README.md](./node/README.md)

# Running Zion node

Build node and start:

    yarn workspace @zion/server run build
    casablanca/scripts/launch.sh

Run tests on the running node:

    yarn workspace @zion/server run test-remote

# Running Casablanca Tests

Start Redis & Postgres:

    casablanca/scripts/launch_storage.sh

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
