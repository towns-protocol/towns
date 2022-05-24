# Introduction

This is a bridge between Zion Matrix server and the Web3 blockchains.

## Pre-requisites

Install cmake and Rust build tools.

Easiest way to install cmake on Mac is `brew install cmake`.

The Rust build tools are installed as part of `yarn install`. No need to install separately.

## Build and run

```bash
# Install the dependencies
cd servers/matrix-zion-bridge
yarn install
source $HOME/.cargo/env

# Build and run the server
yarn dev
```
