# @towns-protocol/smart-account

ERC-4337 modular smart account SDK for Towns Protocol. Built on [viem](https://viem.sh) for type-safe Ethereum interactions.

## Features

- Modular smart accounts (EntryPoint v0.7)
- Seamless viem integration - returns viem `SmartAccount` instances
- Account type detection
- Batch operations support via viem's bundler client
- ReplaySafeHash signature protection
- Tree-shakeable subpath exports

## Installation

```bash
bun add @towns-protocol/smart-account
```

## Quick Start

```typescript
import { toModularSmartAccount } from "@towns-protocol/smart-account/create2";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const owner = privateKeyToAccount("0x...");

const account = await toModularSmartAccount({
  client: publicClient,
  owner,
});
```

## Viem Integration

This package is built on viem and returns standard viem `SmartAccount` instances. This means you can use the account with any viem-compatible bundler client:

```typescript
import { createBundlerClient } from "viem/account-abstraction";
import { toModularSmartAccount } from "@towns-protocol/smart-account/create2";

// Create the smart account
const account = await toModularSmartAccount({
  client: publicClient,
  owner: localAccount,
});

// Use with viem's bundler client
const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http("https://your-bundler-url.com"),
});

// Send user operations using viem's API
const userOpHash = await bundlerClient.sendUserOperation({
  account, // Standard viem SmartAccount
  calls: [{ to: recipient, value: parseEther("0.1") }],
});
```

The account works seamlessly with viem's:

- `createBundlerClient` - For sending user operations
- `createPublicClient` - For reading blockchain state
- Contract interaction utilities - `readContract`, `writeContract`, etc.

## API Reference

### `@towns-protocol/smart-account/create2`

#### `toModularSmartAccount({ client, owner, address? })`

Creates a modular smart account (EntryPoint v0.7).

**Parameters:**

- `client: PublicClient` - Viem public client for blockchain interaction
- `owner: LocalAccount` - Account owner (signer)
- `address?: Address` - Optional: specify address for existing account

**Returns:** `SmartAccount` instance ready for use with bundlers

**Example:**

```typescript
import { toModularSmartAccount } from "@towns-protocol/smart-account/create2";

const account = await toModularSmartAccount({
  client: publicClient,
  owner: localAccount,
});
```

### `@towns-protocol/smart-account/id`

#### `detectAccountType(client, address)`

Detects if an address is a modular or simple account.

**Parameters:**

- `client: PublicClient` - Viem public client
- `address: Address` - Address to check

**Returns:** `'modular' | 'simple' | null`

**Example:**

```typescript
import { detectAccountType } from "@towns-protocol/smart-account/id";

const type = await detectAccountType(publicClient, accountAddress);
if (type === "modular") {
  // It's a modular account
}
```

### `@towns-protocol/smart-account/abis`

Exports contract ABIs for modular accounts:

- `modularAccountAbi` - Modular account contract ABI
- `modularFactoryAbi` - Modular account factory ABI

## Usage Examples

### 1. Creating a Modular Account

```typescript
import { toModularSmartAccount } from "@towns-protocol/smart-account/create2";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const owner = privateKeyToAccount("0x...");
const account = await toModularSmartAccount({
  client: publicClient,
  owner,
});

console.log("Account address:", account.address);
```

### 2. Detecting Account Type

```typescript
import { detectAccountType } from "@towns-protocol/smart-account/id";

const type = await detectAccountType(publicClient, "0x...");
console.log("Account type:", type); // 'modular', 'simple', or null
```

### 3. Sending User Operations

```typescript
import { createBundlerClient } from "viem/account-abstraction";
import { parseEther } from "viem";

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(bundlerUrl),
});

// Single call
const userOpHash = await bundlerClient.sendUserOperation({
  account,
  calls: [{ to: recipient, value: parseEther("0.1") }],
});

const receipt = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash,
});

console.log("Success:", receipt.success);
```

### 4. Batch Operations

```typescript
const userOpHash = await bundlerClient.sendUserOperation({
  account,
  calls: [
    { to: recipient1, value: parseEther("0.1") },
    { to: recipient2, value: parseEther("0.2") },
    { to: recipient3, value: parseEther("0.3") },
  ],
});
```

## Legacy Support

This package also supports **Simple Accounts** (EntryPoint v0.6) for backwards compatibility:

```typescript
import { toSimpleSmartAccount } from "@towns-protocol/smart-account/create2";

// Create a simple account (legacy)
const simpleAccount = await toSimpleSmartAccount({
  client: publicClient,
  owner: localAccount,
});
```

Simple accounts are supported for existing deployments but **modular accounts are recommended for new projects**.

## Development

### Running Tests

```bash
bun run test
```

### Building

```bash
bun run build
```

## Related Packages

- [viem](https://viem.sh) - Blockchain interaction library
- `@towns-protocol/generated` - Contract ABIs and generated types
