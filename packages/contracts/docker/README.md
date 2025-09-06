# Towns Anvil Docker Environment

This directory contains Docker configuration for running local blockchain networks with pre-deployed smart contracts for Towns Protocol development.

## Overview

The Docker environment provides:

- **Base Chain** (port 8545) and **River Chain** (port 8546) with Anvil
- **Pre-deployed smart contracts** in both chains during image build
- **Fast startup** by loading pre-deployed blockchain state
- **Contract address extraction** for local development integration

## Files

### `Dockerfile`

Multi-stage Docker build that:

- Installs dependencies (Node.js, Foundry, build tools)
- Copies project files and builds contracts
- Runs `setup.sh` to deploy contracts and save state
- Creates final image with pre-deployed chains

### `setup.sh`

Build-time setup script that:

- Starts both blockchain networks with Anvil
- Deploys all smart contracts to both chains
- Creates persistent state files (`base-anvil-state.json`, `river-anvil-state.json`)
- Copies contract addresses to `/app/local_dev/` for extraction
- Validates node registry deployment

### `run.sh`

Runtime script that starts blockchain networks with pre-loaded state and supports:

- `CHAIN=base` - Start only Base chain
- `CHAIN=river` - Start only River chain

### `test.sh`

Test runner for validating deployed contracts.

## Usage

### Using Pre-built Image (Recommended)

The image is automatically built and published to AWS ECR when contract changes are pushed to main branch.

```bash
# From the core directory
cd core

# Start both chains with pre-deployed contracts
USE_DOCKER_CHAINS=1 just anvils

# Contract addresses are automatically available after anvils start
# Configuration will use Docker chains automatically
USE_DOCKER_CHAINS=1 just config

# Stop chains
just anvils-stop
```

### Building Image Locally

```bash
# From the core directory
cd core

# Build local image
just docker-build-local

# Use local image
USE_LOCAL_DOCKER=1 USE_DOCKER_CHAINS=1 just anvils
```

### VSCode Integration

VSCode tasks automatically use Docker chains when configured:

- **BaseChain** - Starts Base chain (Docker or native based on environment)
- **RiverChain** - Starts River chain (Docker or native based on environment)
- **Configure Nodes** - Configures nodes using Docker chains by default
- **AnvilsLocalDocker** - Uses local Docker image for development

## Contract Address Extraction

When using Docker chains, contract addresses are automatically extracted during the deployment process:

```bash
# Addresses are automatically extracted when using Docker chains
USE_DOCKER_CHAINS=1 just config
```

This creates:

- `./run_files/local_dev/contracts.env` with environment variables
- `../packages/generated/deployments/local_dev/` with full deployment artifacts

## Available Just Targets

### Unified targets (Docker or native):

- `anvils` - Start both chains (Docker when `USE_DOCKER_CHAINS=1`, native otherwise)
- `anvil-base` - Start Base chain (Docker when `USE_DOCKER_CHAINS=1`, native otherwise)
- `anvil-river` - Start River chain (Docker when `USE_DOCKER_CHAINS=1`, native otherwise)
- `anvils-stop` - Stop both chains
- `deploy-contracts` - Deploy/extract contracts (Docker when `USE_DOCKER_CHAINS=1`, native otherwise)
- `config-base-chain` - Configure base chain (uses Docker when `USE_DOCKER_CHAINS=1`)
- `config-river-chain` - Configure river chain (uses Docker when `USE_DOCKER_CHAINS=1`)

### Docker-specific targets:

- `docker-build-local` - Build Docker image locally

## Environment Variables

- `USE_DOCKER_CHAINS` - Set to `1` to use Docker chains instead of native Anvil
- `USE_LOCAL_DOCKER` - Set to `1` to use local Docker image instead of AWS ECR
- `DOCKER_IMAGE` - Override Docker image (default: AWS ECR image)
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
