# Installing proto compiler

    brew install protobuf

# Installing Buf tools

https://connect.build/docs/go/getting-started/#install-tools:

    go install github.com/bufbuild/buf/cmd/buf@latest
    go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    go install github.com/bufbuild/connect-go/cmd/protoc-gen-connect-go@latest

# Generate proto definitions

    go generate -v -x protocol/gen.go

# Lint

    brew install golangci-lint
    golangci-lint run

# Tests & Docker

If you get Docker errors when running tests:

    sudo ln -s ~/Library/Containers/com.docker.docker/Data/docker.raw.sock /var/run/docker.sock

# Code Conventions

See [conventions](conventions.md)

# Other Tools

You need jq to run the run_multi.sh script

    brew install jq
