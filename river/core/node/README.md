# Installing proto compiler

    brew install protobuf

# Installing Buf and other tools

https://connect.build/docs/go/getting-started/#install-tools:

    go install github.com/bufbuild/buf/cmd/buf@latest
    go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
    go install honnef.co/go/tools/cmd/staticcheck@latest
    go install mvdan.cc/gofumpt@latest

# Generate proto definitions

    go generate -v -x protocol/gen.go

# Lint

    brew install golangci-lint
    golangci-lint run

# Creating a new migration

Install migrate cli tool with brew:

    brew install golang-migrate

To create new sql migration files, see the documentation [here](https://github.com/golang-migrate/migrate/blob/master/GETTING_STARTED.md). As an example:

cd core/node && migrate create -ext sql -dir migrations -seq create_miniblock_candidates_table

As the docs describe, note the tool will create 2 migration files, one to apply the migration and one to undo it. Please use "IF EXISTS" to prevent errors for creation and deletion of objects.

[Postgres Examples](https://github.com/golang-migrate/migrate/blob/master/database/postgres/TUTORIAL.md)

# Tests & Docker

If you get Docker errors when running tests:

    sudo ln -s ~/Library/Containers/com.docker.docker/Data/docker.raw.sock /var/run/docker.sock

# Code Conventions

See [conventions](conventions.md)

# Other Tools

You need jq to run the run_multi.sh script

    brew install jq

# Debugging Tests

Logs are turned off by default in tests. To enable set `RIVER_TEST_LOG` variable to the desired logging level:

    # Run all test in rpc with info logging level
    RIVER_TEST_LOG=info go test ./rpc -v

    # Run single test by name with debug logging on
    RIVER_TEST_LOG=debug go test ./rpc -v -run TestSingleAndMulti/multi/testMethods
