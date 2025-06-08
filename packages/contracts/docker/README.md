# Docker Development Environment

This directory contains Docker configuration and scripts for running the River blockchain development environment in a containerized setup.

## Overview

The Docker environment provides a complete development setup for the River blockchain project, including:

- Local blockchain networks (Base chain and River chain)
- Smart contract deployment and testing capabilities
- All necessary build tools and dependencies

## Files

### `setup.sh`

Build-time setup script that:

- Starts both Base chain (port 8545) and River chain (port 8546) with Anvil
- Deploys all smart contracts to both chains
- Creates persistent blockchain state files (`base-anvil-state.json`, `river-anvil-state.json`)
- Validates node registry deployment
- Runs during Docker image build process

### `run.sh`

Runtime script that starts both blockchain networks and keeps them running for development.

### `test.sh`

Test runner script that:

- Starts both blockchain networks
- Runs node registry tests
- Kills anvil processes and exits after tests complete

## Usage

### Building the Docker Image

From the project root:

```bash
docker build -t towns-anvil:latest -f ./packages/contracts/docker/Dockerfile .
```

### Running the Container

**Start blockchain networks:**

```bash
docker run -it --rm -p 8545:8545 -e CHAIN=base towns-anvil:latest
docker run -it --rm -p 8546:8546 -e CHAIN=river towns-anvil:latest
```

**Interactive shell:**

```bash
docker run -it --rm towns-anvil:latest /bin/bash
```

## Network Configuration

- **Base Chain**:

  - Port: 8545
  - RPC URL: `http://localhost:8545`
  - State file: `base-anvil-state.json`

- **River Chain**:
  - Port: 8546
  - RPC URL: `http://localhost:8546`
  - State file: `river-anvil-state.json`
