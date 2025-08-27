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
pnpm install && pnpm run build

# Get artifacts (auto-downloads or generates as needed)
pnpm run build
```

## Troubleshooting

```bash
# Missing artifacts error
pnpm run build

# Clean slate regeneration
rm -rf dev/ && pnpm run build
```
