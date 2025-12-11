# Using just to start local deployment

Local [CA](#setting-up-local-ca-for-tls) needs to be provisioned.
[Just](#installing-just) installed.

To list all available commands:

    just

Default local development environment is `multi`.
RUN_ENV parameter for just commands is set by default to `multi`.

The environment name always needs to be provided through RUN_ENV variable.

Config, build and start in background:

    just config-and-start

Stop:

    just stop

See colored logs in realtime (Ctrl-C to exit):

    just tail-logs

Just build:

    just build

Just start with the existing config and binary:

    just start

Restart after rebuilding with current changes:

    just restart

# Building and running go tests

There are just commands to run go tests, `go test` works too:

    just test ./...  # Run go test
    just test-all # Run all go tests from module root
    just test-all-report # Run all go tests from module root and print report at the end
    just t # Run all tests from current dir

    just t-debug -run TestMyName  # Run TestMyName with info logging and test printing
    just t-debug-debug -run TestMyName  # Run TestMyName with debug logging and test printing

# Getting logs from tests

To get logs from tests, set `RIVER_TEST_LOG_DIR` to a directory where you want to store the logs.

    RIVER_TEST_LOG_DIR=$(pwd)/run_files/test_logs RIVER_TEST_LOG=debug go test -v ./...

Use `RIVER_TEST_LOG` to set the log level. If level is set and directory is not set, logs will be printed to console (use `-v` test flag).

    RIVER_TEST_LOG=debug go test -v

# Running the archiver service locally against different environments

To run a local archiver service that downloads from various public networks, use the `run.sh` command
for that environment and pass in a specific configuration to store the data in the local database, which
is written in `core/env/local/archiver/config.yaml`.

## Example: Running against omega nodes

```
# Make sure postgres container is running
./scripts/launch_storage.sh

# Make sure to use an absolute path to refer to the archiver/config.yaml file
# populate RIVER_REPO_PATH with the absolute path to the root of your river repository
./env/omega/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml

# For formatted logs, try the following. pino-pretty should be installed with `bun install`
./env/omega/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml | bun run pino-pretty
```

## Example: Running against beta nodes

```
./scripts/launch_storage.sh

./env/beta/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml | bun run pino-pretty
```

**Note:** some networks, such as omega, may have hundreds of gigabytes of stream data available. Be sure to increase the maximum storage, CPU and/or memory of your docker service / postgres container appropriately so it can handle the load.

# Running the app registry service locally against different environments

To run a local app registry service that checks against the streams and contracts from various public networks, use the `run.sh` command for that environment and pass in a specific configuration to encrypt shared secrets stored on disk, sign authentication tokens, and store app data in the local database, which is written in `core/env/local/app-registry/config.yaml`.

## Example: Running against omega nodes

```
# Make sure postgres container is running
./scripts/launch_storage.sh

# Make sure to use an absolute path to refer to the app-registry/config.yaml file
# populate RIVER_REPO_PATH with the absolute path to the root of your river repository
./env/omega/run.sh app-registry -c $RIVER_REPO_PATH/core/env/local/app-registry/config.yaml | bun run pino-pretty
```

## Example: Running against beta nodes

```
./scripts/launch_storage.sh

./env/beta/run.sh app-registry -c $RIVER_REPO_PATH/core/env/local/app-registry/config.yaml | bun run pino-pretty
```

# Installing Dependencies

## just

    brew install just

## protoc and Buf

    brew install protobuf@3
    brew link --overwrite protobuf@3
    go install github.com/bufbuild/buf/cmd/buf@latest

There are addition install steps for go tools in [./node/README.md](./node/README.md)

# Building protobufs

Protobufs are generated for go and typescript

    cd proto
    bun run buf:generate

    cd node
    go generate -v -x protocol/gen.go

# Setting up local CA for TLS

First create the CA and register it with Mac OS:

    scripts/register-ca.sh

Then generate the TLS certificates for the node:

    scripts/generate-ca.sh

# Run node tests:

    cd node
    go test -v ./...

# Clean Build after Bun Install or Branch Switching

Build is incremental, as such it may get confused when packages are updated or branches are switched.

Clean build artifacts and rebuild:

    bun run csb:clean
    bun run csb:build
