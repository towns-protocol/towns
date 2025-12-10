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
bun install && bun run build

# Get artifacts (auto-downloads or generates as needed)
bun run build
```

## Troubleshooting

```bash
# Missing artifacts error
bun run build

# Clean slate regeneration
rm -rf dev/ && bun run build
```
