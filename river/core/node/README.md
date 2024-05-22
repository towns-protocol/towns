# Installing proto compiler

    brew install protobuf

# Installing Buf and other tools

Run

    ./scripts/install-protobuf-deps.sh

or manually:

    # Proto
    go install github.com/bufbuild/buf/cmd/buf@latest
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest

    # GRPC helper
    go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

    # Lint
    go install honnef.co/go/tools/cmd/staticcheck@latest

    # Format
    go install mvdan.cc/gofumpt@latest
    go install github.com/segmentio/golines@latest

Connect install docs: https://connect.build/docs/go/getting-started/#install-tools

# Generate proto definitions

    go generate -v -x protocol/gen.go

# Lint

    brew install golangci-lint
    ./lint.sh

# Creating a new migration

Install migrate cli tool with brew:

    brew install golang-migrate

To create new sql migration files, see the documentation [here](https://github.com/golang-migrate/migrate/blob/master/GETTING_STARTED.md). As an example:

`cd core/node && migrate create -ext sql -dir storage/migrations -seq create_miniblock_candidates_table`

As the docs describe, note the tool will create 2 migration files, one to apply the migration and one to undo it. Please use "IF EXISTS" to prevent errors for creation and deletion of objects.

To run migrations locally in the public schema for hand testing/experimentation, try:

`migrate -source file://./core/node/storage/migrations/ -database "postgres://postgres:postgres@localhost:5433/river?sslmode=disable" up`

[Postgres Examples](https://github.com/golang-migrate/migrate/blob/master/database/postgres/TUTORIAL.md)

# Tests & Docker

If you get Docker errors when running tests:

    sudo ln -s ~/Library/Containers/com.docker.docker/Data/docker.raw.sock /var/run/docker.sock

## Tests from source against geth node

- Start a local geth instance with the following command (this mines a new block every second):

```
geth --dev --http --dev.period 1
```

- Generate fund account from which accounts that are dynamically generated during the tests are funded.
- Because this account is only used for tests the easiest method is to generate it on `https://vanity-eth.tk` (bottom of page).
- Fund the account with the following script (replace `to` with the fund account address):

```
geth --dev attach -exec 'eth.sendTransaction({from: eth.accounts[0], to: "<fund account adress>", value: web3.toWei(10000000000000000, "ether")})'
```

- Run the tests with (replace `RIVER_REMOTE_NODE_FUND_PRIVATE_KEY` with the private key of the fund account)

```
RIVER_REMOTE_NODE_URL=http://127.0.0.1:8545 RIVER_REMOTE_NODE_FUND_PRIVATE_KEY=<fund account private hex as hex> \
go tests ./...
```

Block production is not on demand as with the simulator or anvil and therefore these tests take a long time.

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

# Checking on Gamma Status from Local Host

Run

    ./env/gamma/run.sh info

Browse to http://localhost:4040/debug/multi to see status and ping times as seen from the local machine.

Or, to get JSON on the console:

    ./env/gamma/run.sh ping
