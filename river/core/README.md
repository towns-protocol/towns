# Using just to start local deployment

Local [CA](#setting-up-local-ca-for-tls) needs to be provisioned.
[Just](#installing-just) installed.

To list all available commands:

    just

There are two local environments available:

- multi_ne - no entitlements
- multi - entitlements are enabled

Environment name always needs to be provided through RUN_ENV variable.

Config, build and start in background:

    just RUN_ENV=multi config-and-start

Stop:

    just RUN_ENV=multi stop

See colored logs in realtime (Ctrl-C to exit):

    just RUN_ENV=multi tail-logs

Just build:

    just RUN_ENV=multi build

Just start with existing config and binary:

    just RUN_ENV=multi start

Restart after rebuilding with current changes:

    just RUN_ENV=multi restart

# Building and running go tests

MLS lib needs to be built for some tests to run, there are just commands that build and configure lib and then run go tests:

    just test ./...  # Run go test
    just test-all # Run all go tests from module root
    just t # Run all tests from current dir
    just build-mls # Rebuild mls without running tests

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

Clean build artificats and rebuild:

    yarn csb:clean
    yarn csb:build
