# Using just to start local deployment

Local [CA](#setting-up-local-ca-for-tls) needs to be provisioned.
[Just](#installing-just) installed.

To list all available commands:

    just

There are two local environments available:

- multi_ne - no entitlements
- multi - entitlements are enabled

The environment name always needs to be provided through RUN_ENV variable.

Config, build and start in background:

    just RUN_ENV=multi config-and-start

Stop:

    just RUN_ENV=multi stop

See colored logs in realtime (Ctrl-C to exit):

    just RUN_ENV=multi tail-logs

Just build:

    just RUN_ENV=multi build

Just start with the existing config and binary:

    just RUN_ENV=multi start

Restart after rebuilding with current changes:

    just RUN_ENV=multi restart

# Building and running go tests

MLS lib needs to be built for some tests to run, there are just commands that build and configure lib and then run go tests:

    just test ./...  # Run go test
    just test-all # Run all go tests from module root
    just t # Run all tests from current dir
    just build-mls # Rebuild mls without running tests

    just t-debug -run TestMyName  # Run TestMyName with info logging and test printing
    just t-debug-debug -run TestMyName  # Run TestMyName with debug logging and test printing

# Running the archiver service locally against different environments

To run a local archiver service that downloads from various public networks, use the `run.sh` command
for that environment and pass in a specific configuration to store the data in the local database, which
is written in `core/env/local/archiver/config.yaml`.

## Example: Running against omega nodes

```
# Make sure postgres container is running
./scripts/launch_storage.sh

# Make sure to use an absolute path to refer to the archiver-local.yaml file
# populate RIVER_REPO_PATH with the absolute path to the root of your river repository
./env/omega/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml
```

## Example: Running against gamma nodes

```
./scripts/launch_storage.sh

./env/gamma/run.sh archive -c $RIVER_REPO_PATH/core/env/archiver/config.yaml
```

**Note:** some networks, such as omega, may have hundreds of gigabytes of stream data available. Be sure to increase the maximum storage, CPU and/or memory of your docker service / postgres container appropriately so it can handle the load.

# Installing just

    brew install just

# Installing protoc and Buf

    brew install protobuf@3
    brew link --overwrite protobuf@3
    go install github.com/bufbuild/buf/cmd/buf@latest

There are addition install steps for go tools in [./node/README.md](./node/README.md)

# Building protobufs

Protobufs are generated for go and typescript

    cd proto
    yarn buf:generate

    cd node
    go generate -v -x protocol/gen.go

# Setting up local CA for TLS

First create the CA and register it with Mac OS:

    scripts/register-ca.sh

Then generate the TLS certificates for the node:

    scripts/generate-ca.sh

# Running River Tests

Run client tests:

    yarn csb:turbo

Run node tests:

    cd node
    go test -v ./...

# Clean Build after Yarn Install or Branch Switching

Build is incremental, as such it may get confused when packages are updated or branches are switched.

Clean build artifacts and rebuild:

    yarn csb:clean
    yarn csb:build
