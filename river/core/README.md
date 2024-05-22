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

# Running River node

Start storage backend, build node and start:

    scripts/launch.sh

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
