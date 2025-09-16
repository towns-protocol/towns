# Towns Anvil Docker Environment

This directory contains Docker configuration for running local blockchain networks with pre-deployed smart contracts for Towns Protocol development.

## Overview

The Docker environment provides:

- **Base Chain** (port 8545) and **River Chain** (port 8546) with Anvil
- **Pre-deployed smart contracts** in both chains during image build
- **Fast startup** by loading pre-deployed blockchain state
- **Contract address extraction** for local development integration

All just targets support both Docker and native modes - Docker is used when `USE_DOCKER_CHAINS=1`, native Anvil otherwise.

**Hash-based Versioning**: Docker images are automatically tagged with the git hash of contract source code. The system pulls from AWS ECR if available, or builds locally if the specific version doesn't exist remotely.

## Getting Started

### Using Pre-built Image (Recommended)

```bash
cd core
USE_DOCKER_CHAINS=1 just anvils        # Start chains with pre-deployed contracts (1s blocks)
RIVER_BLOCK_TIME=2 USE_DOCKER_CHAINS=1 just anvils  # Start with 2-second blocks
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

VSCode tasks automatically use Docker chains by default:

- **~Start Local Dev~** - Uses Docker chains with hash-based versioning
- **~Start Local Dev (Native Anvil)~** - Fallback option using native Anvil
- **Start Anvil Chains** - Starts both chains using Docker
- **Start Anvil Chains (Native)** - Starts both chains using native Anvil

## Files

### `Dockerfile`

Multi-stage build: installs dependencies, builds contracts, deploys via `setup.sh`, creates optimized runtime image.

### `setup.sh`

Build-time script: starts chains, deploys contracts, configures and registers nodes via `just config-docker`.

### `run.sh`

Runtime script: starts chains with pre-loaded state. Supports `CHAIN=base` or `CHAIN=river`.

### `test.sh`

Test runner for validating deployed contracts.

## Node Configuration Extraction

Docker image includes complete node setup (wallets, certificates, registrations). Extract with:

```bash
# Extracts complete node configurations including contracts
USE_DOCKER_CHAINS=1 just config
```

which runs `just-deploy-contracts`. Contract addresses are extracted to `packages/generated/deployments/local_dev/`.
This creates complete node configurations in `./run_files/local_dev/` including:

- Node wallets and certificates
- River chain registrations
- App registry configurations
- Contract addresses and deployment artifacts

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
- `RIVER_BLOCK_TIME` - Block time in seconds for Anvil chains (defaults to `1`)
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
