# 4337 Infrastructure

This directory contains the infrastructure for running an ERC-4337 (Account Abstraction) stack, including an Anvil node, bundler, contracts, and mock paymaster.

## Overview

The infrastructure consists of several Docker services that work together to provide a complete ERC-4337 environment:

- **Anvil**: A local Ethereum node for development and testing
- **Contracts**: Deploys the necessary smart contracts to the Anvil node
- **Bundler**: Processes and bundles user operations
- **Mock Paymaster**: Provides paymaster services for gas sponsorship

This setup draws heavily from [Pimlico's example](https://github.com/pimlicolabs/mock-aa-environment/tree/main).

## Directory Structure

```/servers/4337/
├── bundler/ # Bundler service configuration and code
├── contracts/ # Smart contract deployment scripts
├── docker-compose.yml # Base Docker Compose configuration
├── docker-compose.CI.yml # CI-specific Docker Compose overrides
├── mock-paymaster/ # Mock paymaster service
├── wait.sh # Script to wait for services to be ready
└── makefile # Utility commands
```


## Services

### Anvil Node

A local Ethereum node powered by Foundry's Anvil. In local development, this runs on your host machine. You need to have anvil running on port 8545.
 
 In CI, it runs as a Docker container.

Configuration:
- Port: 8545
- Block time: Configurable via environment variable (default: 2 seconds)

### Contracts

Deploys the necessary ERC-4337 contracts to the Anvil node.

- Connects to the Anvil node via RPC
- Deploys EntryPoint and other required contracts
- Runs once and exits after successful deployment

### Bundler

Processes and bundles user operations according to the ERC-4337 specification.

- Port: 43370
- Connects to the Anvil node for transaction submission
- Implements the Bundler RPC methods

Known issues:
- estimating callGasLimit with anvil + bundler for our base contracts is not accurate. It's too low. So clients should at least double this value.

### Mock Paymaster

Provides paymaster services for gas sponsorship.

- Port: 43371
- Connects to the bundler for user operation submission
- Connects to the Anvil node for verification

Known issues:
- this server has been modified to return a high callGasLimit value, for the same reason as the bundler.
- calling `alchemy_requestPaymasterAndData` is a WIP. For now call `pm_sponsorUserOperation` when developing locally against this server.

## Configuration

### Local Development

For local development, the services connect to an Anvil node running on your host machine via `host.docker.internal:8545`.

```bash
# Start the services
cd servers/4337
docker-compose up
```

### CI Environment

For CI, we use a different configuration that includes an Anvil node as a Docker service and adjusts the connections accordingly.

```bash
# Start the services in CI
cd servers/4337
docker-compose -f docker-compose.yml -f docker-compose.CI.yml up -d
```

Key differences in CI:
- Anvil runs as a Docker service instead of on the host
- Services connect to the Anvil container via `http://anvil:8545`
- Block time can be configured via the `RIVER_BLOCK_TIME` environment variable

## Environment Variables

- `ANVIL_RPC`: RPC URL for the Anvil node (default: http://host.docker.internal:8545)
- `RIVER_BLOCK_TIME`: Block time in seconds for the Anvil node in CI (default: 2)

## Usage

### Starting the Services

```bash
# Local development
docker-compose up

# CI environment
docker-compose -f docker-compose.yml -f docker-compose.CI.yml up -d
```

### Waiting for Services

The `wait.sh` script can be used to wait for all services to be ready:

```bash
./wait.sh
```

### Stopping the Services

```bash
docker-compose down
```
