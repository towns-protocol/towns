# @towns-protocol/generated

## Description

Contract ABIs and TypeScript types for the Towns Protocol smart contracts. This package provides compiled artifacts and
type definitions for interacting with Towns Protocol contracts on Base and Towns chains.

## Overview

This package contains:

- **[`dev/abis/`](dev/abis/)** - Contract ABI JSON files and TypeScript exports
- **[`dev/typings/`](dev/typings/)** - TypeScript type definitions and factory contracts
- **[`deployments/`](deployments/)** - Contract addresses by network and environment
- **[`config/`](config/)** - Deployment configuration files

## Quick Start

```bash
# After fresh clone
yarn install && yarn build

# Get artifacts (auto-downloads or generates as needed)
yarn build
```

## Troubleshooting

```bash
# Missing artifacts error
yarn build

# Clean slate regeneration
rm -rf dev/ && yarn build
```
