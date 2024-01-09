## Introduction

Use this docker service to fork a given blockchain and spin up an rpc server against it.

## Features

- Environment variables: although anvil natively supports forking chains, it requires the configs to be set as command line arguments as opposed to environment variables. This does not work for our deployment pipeline, which requires us to use environment variables to configure anvil and the fork-network-url secret.
- Fork Latest: anvil requires setting an integer block number when forking a chain. If you want to fork the latest state, you first need to get the latest block number, and then pass it down to anvil as a config option. This Docker image allows you to seamlessly automate that process.

## Configuration

This Docker image is fully configurable via environment variables:

- **FORK_URL**: The blockchain provider url, such as `https://base-sepolia.g.alchemy.com/v2/XXXXX`
- **CHAIN_ID**: The id of the chain you want to fork from, such as `85432`. The same chain id will be assigned to the forked chain.
- **FORK_BLOCK_NUMBER**: The block number from which you want to fork from. Normally, anvil only accepts integers for this config. However, we expand on this and further allow `latest` to be passed in, which will fork the latest available block number.
- **BLOCK_TIME**: The block time in seconds. We'll almost always set this to `2` to match base chain block times.