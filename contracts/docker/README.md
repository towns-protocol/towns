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

Runtime script for container execution with multiple modes:

**Usage:**

```bash
./run.sh [OPTIONS]

Options:
  --test    Run in test mode (kills anvil processes after running tests)
  --help    Show this help message
```

**Modes:**

- **Normal Mode**: Starts both blockchain networks and keeps them running
- **Test Mode**: Starts networks, runs node registry tests, then exits

## Usage

### Building the Docker Image

From the project root:

```bash
docker build -t towns-anvil -f ./contracts/docker/Dockerfile .
```

### Running the Container

**Start blockchain networks:**

```bash
docker run -it --rm -p 8545:8545 -p 8546:8546 towns-anvil ./contracts/docker/run.sh
```

**Run tests only:**

```bash
docker run -it --rm towns-anvil ./contracts/docker/run.sh --test
```

**Interactive shell:**

```bash
docker run -it --rm towns-anvil /bin/bash
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
