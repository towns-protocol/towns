# Smart Account Package

## Overview

This package provides an ERC-4337 modular smart account SDK for Towns Protocol, built on [viem](https://viem.sh) for type-safe Ethereum interactions. The primary focus is on **Modular Accounts** (EntryPoint v0.7), which offer extensible validation and execution through a plugin/hook architecture.

All account creation functions return standard viem `SmartAccount` instances that work seamlessly with viem's bundler client and other viem utilities.

For legacy compatibility, the package also supports Simple Accounts (EntryPoint v0.6), but modular accounts are recommended for all new development.

## Essential Commands

### From package root (/packages/smart-account):

- `bun run build` - Compile TypeScript to dist/
- `bun run test` - Run integration tests with vitest
- `bun run test:watch` - Watch mode for development

### From root directory:

- `bun run build` - Build this package via turbo
- `bun run lint` - Run linting
- `bun run prettier:fix` - Format code

## Architecture Overview

### Modular Accounts (Primary)

Modular accounts use EntryPoint v0.7 and provide:
- Extensible validation and execution
- Validation modules and hooks
- ReplaySafeHash signature protection
- Plugin architecture for custom logic

### Factory Pattern

Accounts are deployed using CREATE2 factories, providing deterministic addresses:
- Same owner = same address across chains
- Address is predictable before deployment
- Factory handles proxy deployment and initialization

### Subpath Exports

The package uses subpath exports for tree-shaking:
- `@towns-protocol/smart-account/create2` - Account creation functions
- `@towns-protocol/smart-account/id` - Account detection utilities
- `@towns-protocol/smart-account/abis` - Contract ABIs

### Key Constants

From `src/constants.ts`:

- **EntryPoint v0.7**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **Modular Account Factory**: `0x00000000000017c61b5bEe81050EC8eFc9c6fecd`
- **Modular Account Implementation**: `0x000000000000c5A9089039570Dd36455b5C07383`
- **Modular Account Storage**: `0x0000000000006E2f9d80CaEc0Da6500f005EB25A`

## Key Components

### Primary API - Modular Accounts

**Account Creation** (`src/create2/toModularSmartAccount.ts`):
- `toModularSmartAccount({ client, owner, address? })` - Creates a modular smart account instance
- Returns a viem `SmartAccount` ready for use with bundlers
- Handles account initialization and signature configuration

**Account Detection** (`src/id/detectAccountType.ts`):
- `detectAccountType(client, address)` - Identifies if an address is a modular or simple account
- Returns `'modular' | 'simple' | null`
- Checks EIP-1967 implementation slot to determine account type

**Signature Utilities** (`src/create2/nativeSMASigner.ts`):
- `nativeSMASigner(signer, chainId, accountAddress)` - Creates signer with ReplaySafeHash protection
- `packUOSignature(signature)` - Packs user operation signatures
- `pack1271Signature(signature, entityId)` - Packs EIP-1271 signatures

### Legacy Support

For backwards compatibility only:
- `toSimpleSmartAccount()` - Creates EntryPoint v0.6 accounts (legacy)
- `toTownsSmartAccount()` - Auto-discovery factory that supports both types

## Viem Integration

This package is built on viem and returns standard viem `SmartAccount` instances. This ensures compatibility with the entire viem ecosystem.

### Key Integration Points

**Returns viem SmartAccount**:
All account creation functions (`toModularSmartAccount`, `toSimpleSmartAccount`) return viem's `SmartAccount` type, which includes:
- Standard account interface (address, signMessage, signTypedData, signUserOperationHash)
- Compatible with viem's bundler client
- Works with viem's contract interaction utilities

**Uses viem Clients**:
- `PublicClient` - For reading blockchain state and account discovery
- `LocalAccount` - For account owner/signer
- `BundlerClient` - For sending user operations

**Example**:
```typescript
import { createPublicClient, createBundlerClient, http } from 'viem'
import { toModularSmartAccount } from '@towns-protocol/smart-account/create2'

// Standard viem setup
const publicClient = createPublicClient({ chain, transport: http() })
const bundlerClient = createBundlerClient({ client: publicClient, transport: http(bundlerUrl) })

// Create account - returns viem SmartAccount
const account = await toModularSmartAccount({ client: publicClient, owner })

// Use with viem's bundler
await bundlerClient.sendUserOperation({ account, calls: [...] })
```

## Development Patterns

### Client Setup

Use viem's `PublicClient` for all account operations:

```typescript
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http()
})
```

### Account Owner

The `owner` parameter uses viem's `LocalAccount` type:

```typescript
import { privateKeyToAccount } from 'viem/accounts'

const owner = privateKeyToAccount('0x...')
```

### Async/Await

All account operations are asynchronous:

```typescript
const account = await toModularSmartAccount({
  client: publicClient,
  owner,
})
```

### Type-Safe ABIs

Contract ABIs are exported for use with viem:

```typescript
import { modularAccountAbi } from '@towns-protocol/smart-account/abis'

// Use with viem's contract functions
```

## Testing Strategy

### Integration Tests

Location: `test/userop.test.ts`

Tests cover:
- **Bundler Integration**: Full user operation flow with Alto bundler
- **Batch Operations**: Multiple calls in a single user operation
- **WalletLink Integration**: Linking smart accounts to root keys
- **Account Discovery**: Address computation and deployment detection

### Test Environment

- **Anvil**: Local blockchain for testing
- **Alto Bundler**: ERC-4337 bundler implementation
- **Test Pattern**: Fund accounts → send user operations → verify results

### Key Test Patterns

1. **Fund accounts before operations**:
```typescript
const fundTx = await walletClient.sendTransaction({
  to: smartAccount.address,
  value: parseEther('1')
})
await publicClient.waitForTransactionReceipt({ hash: fundTx })
```

2. **Use bundler client for user operations**:
```typescript
const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(bundlerUrl)
})

const userOpHash = await bundlerClient.sendUserOperation({
  account: smartAccount,
  calls: [{ to: recipient, value: parseEther('0.1') }]
})
```

3. **Verify receipts and balances**:
```typescript
const receipt = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash
})
expect(receipt.success).toBe(true)
```

## Common Tasks

### 1. Creating Modular Accounts

```typescript
import { toModularSmartAccount } from '@towns-protocol/smart-account/create2'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const publicClient = createPublicClient({
  chain: yourChain,
  transport: http()
})

const owner = privateKeyToAccount('0x...')
const account = await toModularSmartAccount({
  client: publicClient,
  owner,
})
```

### 2. Detecting Account Type

```typescript
import { detectAccountType } from '@towns-protocol/smart-account/id'

const type = await detectAccountType(publicClient, accountAddress)
if (type === 'modular') {
  // It's a modular account
} else if (type === 'simple') {
  // It's a legacy simple account
}
```

### 3. Signing with Replay Protection

The `toModularSmartAccount` function automatically configures ReplaySafeHash protection for signatures. No additional setup is required.

### 4. Batch Operations

```typescript
const userOpHash = await bundlerClient.sendUserOperation({
  account,
  calls: [
    { to: recipient1, value: parseEther('0.1') },
    { to: recipient2, value: parseEther('0.2') },
    { to: recipient3, value: parseEther('0.3') }
  ]
})
```

### 5. Linking Accounts via WalletLink

See `test/userop.test.ts` for a complete example of linking smart accounts to root keys using EIP-712 signatures and the SpaceFactory contract.

## File Structure

```
/packages/smart-account/
├── src/
│   ├── index.ts                        # Main exports and re-exports
│   ├── types.ts                        # Type definitions
│   ├── constants.ts                    # Contract addresses
│   ├── create2/
│   │   ├── toModularSmartAccount.ts   # Modular account factory (primary)
│   │   ├── toSimpleSmartAccount.ts    # Simple account factory (legacy)
│   │   ├── toTownsSmartAccount.ts     # Auto-discovery factory (legacy)
│   │   └── nativeSMASigner.ts         # Signature utilities
│   ├── id/
│   │   └── detectAccountType.ts       # Type detection
│   └── abis/
│       ├── modularAccountAbi.ts       # Modular account ABI
│       ├── modularFactoryAbi.ts       # Modular factory ABI
│       └── ...                         # Other ABIs
├── test/
│   └── userop.test.ts                  # Integration tests
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Technology Stack

- **viem** - Blockchain interaction library
- **TypeScript** - Type-safe development
- **Vitest** - Testing framework
- **permissionless** - ERC-4337 utilities (dev)
- **@pimlico/alto** - Bundler for tests (dev)
