# Reads Module

This module provides read-only access to on-chain data using viem. It's designed as a composable foundation for separating read operations from write operations in SpaceDapp.

## Architecture

The reads module is organized into independent, composable primitives:

- **`clients/readClient.ts`** - Creates viem PublicClients for different chains
- **`cache/cache-manager.ts`** - Centralized cache management for read operations
- **`contracts/space.ts`** - Space contract wrappers
- **`contracts/space-factory.ts`** - SpaceFactory contract wrappers
- **`aggregators/`** - Higher-level read operations that compose contracts and caches
- **`app/index.ts`** - Domain-organized API that bundles primitives into a cohesive interface

## Usage

### Option 1: Using `createReadApp` (Recommended)

The simplest approach - provides a domain-organized API:

```typescript
import { createReadApp } from "@towns-protocol/web3";

const readApp = createReadApp({
  chainId: 8453,
  url: "https://base.publicrpc.com",
  spaceFactoryAddress: "0x...",
});

// Domain-organized methods
const banned = await readApp.wallets.bannedWallets({ spaceId: "0x..." });
const linked = await readApp.wallets.getLinkedWallets({
  walletAddress: "0x...",
});
const modules = await readApp.pricingModules.read.listPricingModules();

// Access to primitives
const client = readApp.readClient;
const caches = readApp.cacheManager;
```

### Option 2: Using with SpaceDapp (Current Integration)

SpaceDapp now uses `createReadApp` internally:

```typescript
import { createReadApp, SpaceDapp } from "@towns-protocol/web3";

const readApp = createReadApp({
  chainId: 8453,
  url: "https://base.publicrpc.com",
  spaceFactoryAddress: "0x...",
});

const spaceDapp = new SpaceDapp(config, provider, readApp);
```

### Option 3: Composing Primitives (Advanced)

For maximum control, compose the primitives directly:

```typescript
import {
  createReadClient,
  CacheManager,
  makeSpaceFactoryReads,
  createSpaceContracts,
} from "@towns-protocol/web3";

const readClient = createReadClient({
  chainId: 8453,
  url: "https://base.publicrpc.com",
});

const cacheManager = new CacheManager();

const spaceFactoryReads = makeSpaceFactoryReads({
  spaceFactoryAddress: "0x...",
  publicClient: readClient,
});

const spaceContracts = createSpaceContracts(readClient);

// Use primitives directly or compose into your own abstraction
```

## API Structure

### Primitives Access

```typescript
readApp.readClient; // viem PublicClient
readApp.cacheManager; // CacheManager instance
```

## Migration Path

This module is the foundation for eventually separating reads and writes into distinct layers:

1. **Phase 1 (complete)**: Extract read primitives into `reads/` module
2. **Phase 2**: Add more domains (spaces, channels, etc.), expand coverage
3. **Phase 3**: Deprecate SpaceDapp read methods, guide migration to `createReadApp`
4. **Phase 4**: Remove SpaceDapp read methods, making it write-only
