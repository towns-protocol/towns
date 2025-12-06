# Modular Client Architecture

## Summary

Redesign the Towns SDK client following viem's modular architecture pattern to enable tree-shaking, explicit dependency injection, and better separation of concerns.

## Goals

1. **Tree-shakeable** - Only import what you use, reduce bundle size
2. **Environment-agnostic** - Works in Node.js, browser, WASM, React Native
3. **Explicit dependencies** - No magic auto-detection of crypto/persistence
4. **Extensible** - Easy to add custom functionality via `extend()` pattern

## Non-Goals

- Backwards compatibility with current API
- Migration path from v1

---

## Proposed API

### Base Client

```typescript
import { createTownsClient } from '@towns-protocol/sdk/client'
import { nodeCrypto } from '@towns-protocol/sdk/crypto/node'

const client = await createTownsClient({
  env: 'mainnet',
  auth: { privateKey: '0x...' },
  crypto: nodeCrypto(),
})

// Base client has: userId, rpc, signerContext, config, crypto
// Does NOT have: messaging, spaces, sync, etc.
```

### Actions Pattern (Tree-Shakeable)

```typescript
// Standalone functions - only what you import is bundled
import { sendMessage } from '@towns-protocol/sdk/actions/messaging'
import { getStream } from '@towns-protocol/sdk/actions/streams'

await sendMessage(client, {
  streamId: 'channel-123',
  text: 'Hello!',
})

const stream = await getStream(client, { streamId: 'channel-123' })
```

### Action Decorators (Optional Bundling)

```typescript
import { messagingActions } from '@towns-protocol/sdk/actions/messaging'
import { spaceActions } from '@towns-protocol/sdk/actions/spaces'

// Extend client with action groups
const extendedClient = client
  .extend(messagingActions)
  .extend(spaceActions)

// Methods now available on the client
await extendedClient.sendMessage({ streamId, text })
await extendedClient.createSpace({ name: 'My Space' })
```

### Explicit Crypto Injection

```typescript
// Node.js
import { nodeCrypto } from '@towns-protocol/sdk/crypto/node'
const client = await createTownsClient({
  crypto: nodeCrypto(),
  // ...
})

// Browser (WASM)
import { wasmCrypto } from '@towns-protocol/sdk/crypto/wasm'
const client = await createTownsClient({
  crypto: wasmCrypto(),
  // ...
})

// Testing
import { mockCrypto } from '@towns-protocol/sdk/crypto/mock'
const client = await createTownsClient({
  crypto: mockCrypto(),
  // ...
})
```

### Pluggable Persistence

```typescript
// No persistence (stateless - bot use case)
const client = await createTownsClient({
  env: 'mainnet',
  auth: { privateKey },
  crypto: nodeCrypto(),
})

// Browser persistence
import { indexedDBStore } from '@towns-protocol/sdk/persistence/indexeddb'
const client = await createTownsClient({
  crypto: wasmCrypto(),
  persistence: indexedDBStore('my-app'),
  // ...
})

// Custom persistence (e.g., SQLite for React Native)
import { createPersistence } from '@towns-protocol/sdk/persistence'
const client = await createTownsClient({
  crypto: wasmCrypto(),
  persistence: createPersistence({
    saveCleartext: async (eventId, data) => myDb.set(eventId, data),
    getCleartext: async (eventId) => myDb.get(eventId),
    // ...
  }),
  // ...
})
```

### Sync Extension (Browser Full-Sync)

```typescript
import { syncExtension } from '@towns-protocol/sdk/extensions/sync'
import { indexedDBStore } from '@towns-protocol/sdk/persistence/indexeddb'

const fullClient = client.extend(syncExtension({
  persistence: indexedDBStore('my-app'),
}))

// Sync capabilities
await fullClient.sync.subscribe(['space-123', 'channel-456'])
fullClient.sync.onUpdate((streamId, events) => { /* ... */ })
await fullClient.sync.stop()
```

---

## Package Exports Structure

```
@towns-protocol/sdk
├── /client              → createTownsClient
├── /crypto
│   ├── /node            → nodeCrypto()
│   ├── /wasm            → wasmCrypto()
│   └── /mock            → mockCrypto()
├── /persistence
│   ├── /indexeddb       → indexedDBStore()
│   ├── /memory          → memoryStore()
│   └── /index           → createPersistence()
├── /actions
│   ├── /messaging       → sendMessage, editMessage, deleteMessage
│   ├── /spaces          → createSpace, joinSpace, leaveSpace
│   ├── /channels        → createChannel, getChannel
│   ├── /dms             → createDM, sendDM
│   ├── /user            → getProfile, updateProfile
│   └── /streams         → getStream, getMiniblockInfo
├── /extensions
│   └── /sync            → syncExtension()
└── /types               → All type exports
```

**package.json exports:**
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/client.js",
    "./crypto/node": "./dist/crypto/node.js",
    "./crypto/wasm": "./dist/crypto/wasm.js",
    "./crypto/mock": "./dist/crypto/mock.js",
    "./persistence/indexeddb": "./dist/persistence/indexeddb.js",
    "./persistence/memory": "./dist/persistence/memory.js",
    "./actions/messaging": "./dist/actions/messaging.js",
    "./actions/spaces": "./dist/actions/spaces.js",
    "./actions/streams": "./dist/actions/streams.js",
    "./extensions/sync": "./dist/extensions/sync.js",
    "./types": "./dist/types.js"
  },
  "sideEffects": false
}
```

---

## Core Interfaces

### CryptoAdapter

```typescript
interface CryptoAdapter {
  init(opts?: EncryptionDeviceInitOpts): Promise<void>
  getUserDevice(): UserDevice

  // Group encryption
  encryptGroupEvent(streamId: string, payload: Uint8Array, algorithm: GroupEncryptionAlgorithmId): Promise<EncryptedData>
  decryptGroupEvent(streamId: string, content: EncryptedData): Promise<Uint8Array>
  ensureOutboundSession(streamId: string, algorithm: GroupEncryptionAlgorithmId): Promise<string>
  hasOutboundSession(streamId: string, algorithm: GroupEncryptionAlgorithmId): Promise<boolean>

  // Device-to-device encryption
  encryptWithDeviceKeys(payload: string, deviceKeys: UserDevice[]): Promise<Record<string, string>>
  decryptWithDeviceKey(ciphertext: string, senderDeviceKey: string): Promise<string>

  // Session management
  hasSessionKey(streamId: string, sessionId: string, algorithm: GroupEncryptionAlgorithmId): Promise<boolean>
  exportGroupSession(streamId: string, sessionId: string): Promise<GroupEncryptionSession | undefined>
  importSessionKeys(streamId: string, keys: GroupEncryptionSession[]): Promise<void>

  // Device export/import
  exportDevice(): Promise<ExportedDevice>
}
```

### PersistenceAdapter

```typescript
interface PersistenceAdapter {
  // Cleartexts (decrypted message content)
  saveCleartext(eventId: string, cleartext: Uint8Array | string): Promise<void>
  getCleartext(eventId: string): Promise<Uint8Array | string | undefined>
  getCleartexts(eventIds: string[]): Promise<Record<string, Uint8Array | string> | undefined>

  // Stream state
  getSyncedStream(streamId: string): Promise<ParsedPersistedSyncedStream | undefined>
  saveSyncedStream(streamId: string, syncedStream: PersistedSyncedStream): Promise<void>
  loadStream(streamId: string): Promise<LoadedStream | undefined>
  loadStreams(streamIds: string[]): Promise<{ streams: Record<string, LoadedStream | undefined>, lastAccessedAt: Record<string, number> }>

  // Miniblocks
  saveMiniblock(streamId: string, miniblock: ParsedMiniblock): Promise<void>
  saveMiniblocks(streamId: string, miniblocks: ParsedMiniblock[], direction: 'forward' | 'backward'): Promise<void>
  getMiniblock(streamId: string, miniblockNum: bigint): Promise<ParsedMiniblock | undefined>
  getMiniblocks(streamId: string, rangeStart: bigint, rangeEnd: bigint): Promise<ParsedMiniblock[]>

  // Snapshots
  saveSnapshot(streamId: string, miniblockNum: bigint, snapshot: Snapshot): Promise<void>

  // Priority
  setHighPriorityStreams(streamIds: string[]): void
}
```

### TownsClient (Base)

```typescript
interface TownsClient {
  readonly userId: string
  readonly signerContext: SignerContext
  readonly rpc: StreamRpcClient
  readonly config: TownsConfig
  readonly crypto: CryptoAdapter
  readonly persistence?: PersistenceAdapter

  extend<T extends Record<string, unknown>>(
    fn: (client: TownsClient) => T
  ): TownsClient & T
}
```

---

## What's Required vs Opt-In

| Component | Required | Opt-In Via |
|-----------|----------|------------|
| SignerContext | Yes | - |
| StreamRpcClient | Yes | - |
| TownsConfig | Yes | - |
| CryptoAdapter | Yes | `crypto: nodeCrypto()` or `wasmCrypto()` |
| PersistenceAdapter | No | `persistence: indexedDBStore()` |
| Actions | No | Import individually or via `extend()` |
| Sync Extension | No | `extend(syncExtension())` |

---

## Comparison with Current API

### Current (client-v2.ts)

```typescript
const client = await createTownsClient({
  env: 'mainnet',
  privateKey: '0x...',
})

// All methods on client
await client.sendEvent(streamId, payload)
const stream = await client.getStream(streamId)
```

**Problems:**
- Crypto auto-detected (magic)
- All methods bundled even if unused
- Persistence tightly coupled to Dexie
- Hard to test (can't mock crypto)

### Proposed

```typescript
import { createTownsClient } from '@towns-protocol/sdk/client'
import { nodeCrypto } from '@towns-protocol/sdk/crypto/node'
import { sendMessage } from '@towns-protocol/sdk/actions/messaging'
import { getStream } from '@towns-protocol/sdk/actions/streams'

const client = await createTownsClient({
  env: 'mainnet',
  auth: { privateKey: '0x...' },
  crypto: nodeCrypto(),
})

// Standalone functions - tree-shakeable
await sendMessage(client, { streamId, text: 'Hello!' })
const stream = await getStream(client, { streamId })
```

**Benefits:**
- Explicit crypto injection (testable)
- Only imported actions are bundled
- Persistence is optional
- Clear dependency graph

---

## Implementation Approach

1. **Phase 1**: Define interfaces (`CryptoAdapter`, `PersistenceAdapter`, `TownsClient`)
2. **Phase 2**: Create crypto adapters wrapping existing `GroupEncryptionCrypto`
3. **Phase 3**: Create base client factory
4. **Phase 4**: Extract actions from existing client methods
5. **Phase 5**: Create persistence adapters wrapping existing `PersistenceStore`
6. **Phase 6**: Configure package exports for tree-shaking
7. **Phase 7**: Create sync extension
8. **Phase 8**: Update bot package to use new API

---

## Related Proposals

- `neverthrow.md` - Type-safe error handling (can be applied to action return types)
- `tanstackdb.md` - Reactive data management (can be implemented as an extension)

---

## Open Questions

1. Should `sendEvent` be exposed as a low-level action, or only high-level actions like `sendMessage`?
2. Should the crypto store be part of `CryptoAdapter` or separate?
3. How should decryption extensions work with the new architecture?
