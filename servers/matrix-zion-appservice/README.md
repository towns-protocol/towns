# Deprecated - do not use

Archive. Appservice approach does not meet our needs. New approach for gating is
to have Dendrite call the Zion smart contract directly. Keeping sources in this directory
for future reference.

## Introduction

This is a bridge between Matrix server and the Web3 blockchains. The Matrix
server is configured to forward messages to the bridge. The bridge can then apply
app logic either through bot interactions, or respond to requests from the Matrix
server.

## Pre-requisites

Install cmake and Rust build tools.

Easiest way to install cmake on Mac is `brew install cmake`.

The Rust build tools are installed as part of `yarn install`. No need to install separately.

## Option 1: Build, deploy and start the servers from Terminal

On separate terminals:

```bash

# Terminal 1:
# Start the dendrite server with appservice config in dendrite.withappservice.yaml
scripts/start-local-dendrite.sh --with-appservice

# Terminal 2:
# Dendrite server must be started first.
scripts/start-local-appservice

# Terminal 3:
scripts/start-local-blockchain
```

### Option 2: Build and run the bridge from vscode

See launch.json. Choose between `Run server` and `Generate registeration file`.
