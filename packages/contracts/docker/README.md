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
- Copies contract addresses to `/app/contract-addresses/` for extraction
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
just anvils-docker

# Extract contract addresses for local development
just extract-contract-addresses

# Stop chains
just anvils-docker-stop
```

### Building Image Locally

```bash
# From the core directory
cd core

# Build local image
just docker-build-local

# Use local image
DOCKER_IMAGE=towns-anvil:local just anvils-docker
```

### VSCode Integration

The default VSCode tasks now use Docker chains:

- **BaseChain** - Starts Base chain from Docker
- **RiverChain** - Starts River chain from Docker
- **CasablancaConfigureNodes** - Configures nodes using Docker chains

Legacy local anvil tasks are available as:

- **BaseChain-Local**
- **RiverChain-Local**
- **CasablancaConfigureNodes-Local**

## Contract Address Extraction

When using Docker chains, contract addresses are extracted from the container:

```bash
# Extract addresses and create contracts.env
just RUN_ENV=multi extract-contract-addresses
just RUN_ENV=multi_ne extract-contract-addresses
```

This creates:

- `./run_files/{multi,multi_ne}/contracts.env` with environment variables
- `../packages/generated/deployments/local_{multi,multi_ne}/` with full deployment artifacts

## Available Just Targets

### Docker-based targets:

- `anvils-docker` - Start both chains from Docker
- `anvil-base-docker` - Start only Base chain from Docker
- `anvil-river-docker` - Start only River chain from Docker
- `anvils-docker-stop` - Stop Docker chains
- `extract-contract-addresses` - Extract contract addresses from Docker
- `config-base-chain-docker` - Configure base chain using Docker
- `docker-build-local` - Build Docker image locally

### Legacy local targets (still available):

- `anvils` - Start local Anvil instances
- `deploy-contracts` - Deploy contracts to local Anvil
- `config-base-chain` - Configure base chain using local Anvil

## Environment Variables

- `DOCKER_IMAGE` - Override Docker image (default: AWS ECR image)
- `RUN_ENV` - Environment (multi/multi_ne)

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
