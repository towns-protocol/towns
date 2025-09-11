# Towns Anvil Docker Environment

This directory contains Docker configuration for running local blockchain networks with pre-deployed smart contracts for Towns Protocol development.

## Overview

The Docker environment provides:

- **Base Chain** (port 8545) and **River Chain** (port 8546) with Anvil
- **Pre-deployed smart contracts** in both chains during image build
- **Fast startup** by loading pre-deployed blockchain state
- **Contract address extraction** for local development integration

All just targets support both Docker and native modes - Docker is used when `USE_DOCKER_CHAINS=1`, native Anvil otherwise.

## Getting Started

### Using Pre-built Image (Recommended)

```bash
cd core
USE_DOCKER_CHAINS=1 just anvils        # Start chains with pre-deployed contracts
USE_DOCKER_CHAINS=1 just config        # Configure nodes
just anvils-stop                       # Stop chains
```

### Building Image Locally

```bash
cd core
just build-anvil-docker
USE_DOCKER_CHAINS=1 just anvils
```

### VSCode Integration

VSCode tasks automatically use Docker chains when configured:

- **BaseChain** - Starts Base chain (Docker or native based on environment)
- **RiverChain** - Starts River chain (Docker or native based on environment)
- **Configure Nodes** - Configures nodes using Docker chains by default

## Files

### `Dockerfile`

Multi-stage build: installs dependencies, builds contracts, deploys via `setup.sh`, creates optimized runtime image.

### `setup.sh`

Build-time script: starts chains, deploys contracts, saves state files, copies addresses to `/app/local_dev/`.

### `run.sh`

Runtime script: starts chains with pre-loaded state. Supports `CHAIN=base` or `CHAIN=river`.

### `test.sh`

Test runner for validating deployed contracts.

## Contract Address Extraction

When using Docker chains, contract addresses are automatically extracted during the deployment process:

```bash
# Addresses are automatically extracted when using Docker chains
USE_DOCKER_CHAINS=1 just config
```

which runs `just-deploy-contracts`. Contract addresses are extracted to `packages/generated/deployments/local_dev/`.

## Available Just Targets

### Unified targets (Docker or native):

- `anvils` - Start both chains
- `anvil-base` - Start Base chain
- `anvil-river` - Start River chain
- `anvils-stop` - Stop both chains
- `deploy-contracts` - Deploy contracts and create configs (calls `just-deploy-contracts` + creates `contracts.env`)
- `just-deploy-contracts` - Deploy contracts only (used internally by Docker, no config creation)

### Docker-specific targets:

- `build-anvil-docker` - Build Anvil Docker image locally

## Environment Variables

- `USE_DOCKER_CHAINS` - Set to `1` to use Docker chains instead of native Anvil
- `RUN_ENV` - Environment (defaults to `local_dev`)

## CI/CD Integration

The Docker image is automatically built when changes are made to:

- `packages/contracts/**`
- `scripts/deploy-*.sh`
- `scripts/start-local-*.sh`
- `.github/workflows/Towns_anvil_docker.yml`

This prevents unnecessary rebuilds when only Go/TypeScript code changes.

## Network Configuration

- **Base Chain**: Port 8545, Chain ID 31337, RPC: `http://localhost:8545`
- **River Chain**: Port 8546, Chain ID 31338, RPC: `http://localhost:8546`

Both chains include pre-deployed contracts:

- Space Factory, Base Registry, App Registry
- River Registry, Multicall3, Permit2
- Test contracts and utilities
