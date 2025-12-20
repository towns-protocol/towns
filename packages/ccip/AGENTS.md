# AGENTS.md

This file provides guidance to ai tools when working with code in this repository.

## Project Overview

The `@towns-protocol/ccip` package implements a CCIP-Read (ERC-3668) gateway service for cross-chain ENS resolution. It provides a Hono-based HTTP API that:

1. **Processes CCIP-Read requests**: Receives ERC-3668 compatible function calls destined for an L2 ENS resolver
2. **Queries L2 resolvers**: Forwards resolver calls to the appropriate L2 chain (Arbitrum, Base, Optimism, Polygon, etc.)
3. **Signs responses**: Cryptographically signs results using ECDSA so the L1 resolver can validate them
4. **Returns formatted responses**: Returns ABI-encoded tuples of (result, expiration, signature)

The service acts as a bridge between L1 ENS lookups and L2 resolver contracts, enabling efficient cross-chain name resolution.

## Architecture

### High-Level Flow

```
L1 ENS Resolver Call
    ↓
CCIP-Read Gateway (this service)
    ├─ Decode request parameters
    ├─ Validate sender & request data
    ├─ Query appropriate L2 resolver
    └─ Sign response
    ↓
Signed Response (bytes, expiration, signature)
```

### Core Components

- **src/index.ts**: Hono application setup with routes and CORS handling
- **src/handlers/ccip.ts**: Main CCIP-Read request handler implementing ERC-3668 response format
  - Parses and validates incoming requests
  - Constructs message hash following `makeSignatureHash()` from L1ResolverFacet
  - Signs hash with signer's private key
  - Returns encoded response tuple
- **src/ccip-read/query.ts**: L2 resolver query logic
  - Maps chain IDs to viem chain objects
  - Creates public RPC clients using Alchemy
  - Calls IExtendedResolver.resolve() on L2 registry addresses
  - Supports 12+ EVM chains (Arbitrum, Base, Optimism, Polygon, Scroll, Worldchain, Linea, Celo, etc.)
- **src/ccip-read/utils.ts**: DNS name decoding utility
  - Converts DNS wire format to human-readable names (e.g., hex-encoded "vitalik.eth" → "vitalik.eth")
- **src/env.ts**: Environment variable management
  - Supports both Node.js and Cloudflare Workers environments
  - Required vars: ALCHEMY_API_KEY, SIGNER_PRIVATE_KEY

### Contract Integration

Generated TypeScript bindings come from smart contracts in `../contracts`:

- **IL1ResolverService.sol**: Defines the request format for CCIP-Read calls
- **IExtendedResolver.sol**: L2 resolver interface with `resolve(bytes, bytes)` function
- **IAddrResolver.sol**: Example resolver implementation (used in tests)

Bindings are auto-generated via `bun run typings` using wagmi CLI, reading contract artifacts from the contracts package.

## Commands

### Development

```bash
# Watch mode - automatically rebuild on file changes
bun run dev

# Build TypeScript to JavaScript (output in ./out)
bun run build

# Start the server (runs built code)
bun start

# Regenerate contract type bindings from artifacts
bun run typings
```

### Testing & Quality

From the root `towns-protocol` directory:

```bash
# Run all tests including this package
bun run test

# Run unit tests only
bun run test:unit

# Check code formatting with Prettier
bun run prettier:check

# Fix code formatting
bun run prettier:fix

# Lint all TypeScript
bun run lint
```

## Environment Setup

### Required Environment Variables

```bash
# Alchemy API key for RPC endpoints across supported chains
ALCHEMY_API_KEY=your_alchemy_key_here

# Private key (hex format) of signer account for responses
# This account signs all CCIP-Read responses
SIGNER_PRIVATE_KEY=0x...
```

### Local Development

For local development, create a `.env` file in the package root or set variables in your shell before running `bun run dev`.

For production/Cloudflare Workers deployment, use the Workers KV or environment configuration.

## Code Patterns

### Request Validation

The package uses Zod for runtime schema validation (see `src/handlers/ccip.ts`):

```typescript
const schema = z.object({
  sender: z.string().refine(isAddress, { message: "Invalid address" }),
  data: z.string().refine(isHex, { message: "Invalid hex data" }),
});

const safeParse = schema.safeParse(req.param());
```

Always validate inputs with `.safeParse()` and return structured error responses.

### Signature Generation

Response signatures follow the L1ResolverFacet contract's `makeSignatureHash()` format:

1. Pack parameters: `0x1900` (EIP-191 prefix), sender address, expiration timestamp, keccak256 hashes of request and result
2. Hash the packed data with keccak256
3. Sign with private key using `sign()` from viem/accounts
4. Serialize signature to 65-byte format

See `src/handlers/ccip.ts` for exact implementation.

### Chain Support

Supported chains are defined in `src/ccip-read/query.ts`. To add a new chain:

1. Import the chain definition from viem/chains
2. Add to the `supportedChains` array
3. Ensure Alchemy supports the chain

Current supported chains: Arbitrum, Arbitrum Sepolia, Base, Base Sepolia, Celo, Celo Sepolia, Linea, Linea Sepolia, Optimism, Optimism Sepolia, Polygon, Polygon Amoy, Scroll, Scroll Sepolia, Worldchain, Worldchain Sepolia.

## Dependencies

### Core Runtime

- **hono**: Lightweight web framework for HTTP routing
- **viem**: Ethereum utility library for encoding, decoding, signing, RPC calls
- **evm-providers**: Provider factory for various EVM chains (Alchemy integration)
- **zod**: TypeScript-first schema validation

### Development

- **typescript**: Type checking
- **@types/bun**: Bun runtime type definitions
- **@wagmi/cli**: Code generator for contract bindings
- **prettier**: Code formatter (uses shared config from @towns-protocol/prettier-config)

### Build & Test

Uses parent workspace's turbo, vitest, and testing infrastructure.

## Testing

Test files follow the pattern `src/**/*.test.ts`. Run with:

```bash
bun run test          # from root workspace
```

Tests should cover:

- Request validation (valid/invalid addresses, hex data)
- Chain resolution (supported/unsupported chain IDs)
- Signature generation (proper EIP-191 format)
- DNS name decoding (various label formats)

## Integration with Parent Monorepo

This package is part of the Towns Protocol monorepo. Key integration points:

- **Shared Prettier Config**: Uses `@towns-protocol/prettier-config` for formatting consistency
- **Turbo Build System**: Builds are coordinated via root turbo.json
- **Contract Artifacts**: Depends on compiled contracts from `../contracts` package
- **Workspace Commands**: Root-level test/lint commands execute in this package

When making changes:

1. Run `bun run prettier:fix` from the package or root to format code
2. Run `bun run lint` from root to check TypeScript
3. Regenerate bindings with `bun run typings` if contracts change
4. Ensure tests pass with `bun run test` from root

## Common Tasks

### Add Support for a New Chain

1. Import chain from viem/chains in `src/ccip-read/query.ts`
2. Add to `supportedChains` array
3. Verify Alchemy has an endpoint for the chain

### Update Contract Bindings

```bash
bun run typings
```

This reads artifact files from `../contracts/out/` and generates TypeScript bindings in `src/generated.ts`.

### Debug a CCIP-Read Request

1. Check sender address validation in request logs
2. Verify chain ID maps to a supported chain
3. Ensure signer private key environment variable is set
4. Inspect the encoded resolve call parameters
5. Look for Alchemy API rate limits or provider errors

### Local Testing

Create a test script in `scripts/test-ccip.ts` (not committed by default) to manually test endpoints:

```typescript
// Example: POST to /v1/ccip-read/{sender}/{encodedData}
```

## Notes

- The service currently returns `'0x'` (empty bytes) for unsupported chains rather than throwing an error
- Response TTL is hardcoded to 1000 seconds
- DNS name decoding is derived from ENS.js implementation
- No persistent state; service is stateless and can scale horizontally
