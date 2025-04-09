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

There are just commands to run go tests, `go test` works too:

    just test ./...  # Run go test
    just test-all # Run all go tests from module root
    just t # Run all tests from current dir

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

# Make sure to use an absolute path to refer to the archiver/config.yaml file
# populate RIVER_REPO_PATH with the absolute path to the root of your river repository
./env/omega/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml

# For formatted logs, try the following. pino-pretty should be installed with `yarn build`
./env/omega/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml | yarn exec pino-pretty
```

## Example: Running against gamma nodes

```
./scripts/launch_storage.sh

./env/gamma/run.sh archive -c $RIVER_REPO_PATH/core/env/local/archiver/config.yaml | yarn exec pino-pretty
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
./env/omega/run.sh app-registry -c $RIVER_REPO_PATH/core/env/local/app-registry/config.yaml | yarn exec pino-pretty
```

## Example: Running against gamma nodes

```
./scripts/launch_storage.sh

./env/gamma/run.sh app-registry -c $RIVER_REPO_PATH/core/env/local/app-registry/config.yaml | yarn exec pino-pretty
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

# Migrate stream from non-repl to replicated stream

Obtain a list of streams that have not been migrated and migration hasn't started. The `not-migrated`
command accepts an optional count that limits the number of streams written to file allowing migration
batches. In the example only 2 streams are migrated.

**_NOTE:_** all steps assume that the streams replication factor and node list haven't been altered in
between steps.

```sh
$ ./env/alpha/run.sh stream not-migrated /tmp/streams.not_migrated 2

$ cat /tmp/streams.not_migrated
{"stream_id":"10958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","replication_factor":1,"status":"not_migrated","node_addresses":["0x8d57ffc1a7ae49f845935756f54090465fca44bd"]}
{"stream_id":"20958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","replication_factor":1,"status":"not_migrated","node_addresses":["0x7cf83341f5b41345e23df4074c307b7642db9556"]}
```

The next step is to place the stream on multiple nodes. This is done by specifying the file with streams id's
generated in the previous step and providing the replication factor. If the streams node list already contains
the given replication factor the command panics before making any alterations. If the node list length equals
the given replication factor nothing is done for the stream. If the replication factor is smaller than the streams
node list random nodes from different operators are selected and added to the nodes list.

```sh
$ ./env/alpha/run.sh stream place initiate <full-path-to-wallet-file> /tmp/streams.not_migrated 3

$ cat /tmp/streams.not_migrated.initiated
{"stream_id":"10958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","status":"success","tx_hash":"0xc95af321282dd268221b4ae843d414482ce7dd57e1ebc4311427c0c83516091f","node_addresses":["0x8d57ffc1a7ae49f845935756f54090465fca44bd","0x4dc8baa00e26c4a15549321375f6173ad281b60a","0x49ea67dc4b5bb19624f0fd1843a7242f2df35cb2"]}
{"stream_id":"20958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","status":"success","tx_hash":"0xc95af321282dd268221b4ae843d414482ce7dd57e1ebc4311427c0c83516091f","node_addresses":["0x7cf83341f5b41345e23df4074c307b7642db9556","0xa0be273b3660171e24b315e0d95ef328e49d2860","0x4dc8baa00e26c4a15549321375f6173ad281b60a"]}
```
This will set the replication factor for all streams in `/tmp/streams.not_migrated` to 1 in the streams registry
and ensures that the node list contains 3 nodes. This is an indication for the nodes that are added to the streams
node list to sync the stream into their local state in anticipation of participating in the streams quorum.

To get an overview how far nodes have synced streams into their local state use the `status` subcommand.

```sh
$ ./env/alpha/run.sh stream place status /tmp/streams.not_migrated.initiated

$ cat /tmp/streams.not_migrated.initiated.status
{"stream_id":"20958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","Nodes":{"0x4dc8baa00e26c4a15549321375f6173ad281b60a":{"status":"failed","error":"unavailable: GetStream: (14:UNAVAILABLE) Forwarding disabled by request header\n    nodeAddress = 0x4dC8bAa00E26c4A15549321375f6173aD281b60A\n    nodeUrl = \n    handler = GetStream\n    elapsed = 186.078µs\n    streamId = 20958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000"},"0x7cf83341f5b41345e23df4074c307b7642db9556":{"status":"success","minipool_gen":4},"0xa0be273b3660171e24b315e0d95ef328e49d2860":{"status":"failed","error":"unavailable: GetStream: (14:UNAVAILABLE) Forwarding disabled by request header\n    nodeAddress = 0xA0BE273b3660171E24b315e0d95ef328E49D2860\n    nodeUrl = \n    handler = GetStream\n    elapsed = 68.767µs\n    streamId = 20958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000"}}}
{"stream_id":"10958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000","Nodes":{"0x49ea67dc4b5bb19624f0fd1843a7242f2df35cb2":{"status":"failed","error":"unavailable: GetStream: (14:UNAVAILABLE) Forwarding disabled by request header\n    nodeAddress = 0x49EA67dC4B5bB19624f0Fd1843a7242F2DF35cb2\n    nodeUrl = \n    handler = GetStream\n    elapsed = 61.718µs\n    streamId = 10958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000"},"0x4dc8baa00e26c4a15549321375f6173ad281b60a":{"status":"failed","error":"unavailable: GetStream: (14:UNAVAILABLE) Forwarding disabled by request header\n    nodeAddress = 0x4dC8bAa00E26c4A15549321375f6173aD281b60A\n    nodeUrl = \n    handler = GetStream\n    elapsed = 55.995µs\n    streamId = 10958f1b91c1092792d1cbf172a4cb400b7d7215070000000000000000000000"},"0x8d57ffc1a7ae49f845935756f54090465fca44bd":{"status":"success","minipool_gen":232}}}

```

If enough nodes have synced the stream into their local storage and are ready to join the streams quorum use
the `finilize` subcommand. This will set the stream replication factor in the streams registry to the nodes list
length. This is the signal for streams that all nodes in the node list will start participating in quorum.

```sh
$ ./env/delta/run.sh stream place finilize /tmp/non_replicated_streams_1.txt
```

