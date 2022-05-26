# Introduction

This is a bridge between Matrix server and the Web3 blockchains. The Matrix
server is configured to forward messages to the bridge. The bridge can then apply
app logic either through bot interactions, or respond to requests from the Matrix
server.

## Pre-requisites

Install cmake and Rust build tools.

Easiest way to install cmake on Mac is `brew install cmake`.

The Rust build tools are installed as part of `yarn install`. No need to install separately.

## Build the server and generate the configurations files

```bash
# Install the dependencies
cd servers/matrix-zion-bridge
yarn install
source $HOME/.cargo/env

# Build the bridge
yarn build

# Make a copy of the config file
cp config.sample.yaml config.yaml

# Generate a common registration file to configure both the dendrite server and
# the bridge
node ./bin/app.js -r -f zz.yaml -c config.yaml -u http://localhost:6789
```

## Configure the Dendrite server

```bash
# Copy the registration file to the dendrite directory.
cp zion-registration.yaml ../dendrite
```

Change dendrite.yaml:

```yaml
# Appservice configuration files to load into this homeserver.
config_files: ["zion-registration.yaml"]
```

## Build and run the bridge

First, start the Dendrite server before running the bridge.

### Option 1: Build and run the bridge from commandline

```bash
# Run the service.
yarn dev

# Or generate the registration file
yarn register
```

### Option 2: Build and run the bridge from vscode

See launch.json. Choose between `Run server` and `Generate registeration file`.
