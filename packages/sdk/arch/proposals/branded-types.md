# Branded Types Proposal for SDK

## Overview

This proposal introduces branded types to the `sdk-types` package to eliminate type confusion between different string-based identifiers (StreamId, Address, EventId, etc.).

## Problem Statement

The SDK currently uses `string` for 13+ semantically different ID types:

```typescript
// Current - all strings, easy to swap by mistake
async inviteUser(streamId: string, userId: string): Promise<void>
async pin(streamId: string, eventId: string): Promise<void>
async createChannel(spaceId: string, name: string, topic: string, channelId: string)
```

This leads to:

- **Runtime errors** from swapped parameters that compile fine
- **Unclear APIs** - is `spaceId` a StreamId or Address?
- **No IDE assistance** for distinguishing ID types

---

## Proposed Branded Types

### Type Branding Pattern

For types without a distinguishing prefix (EventId, SessionId, etc.), use the brand pattern:

```typescript
// Brand symbol (unique per type)
declare const __brand: unique symbol;

// Branded type factory
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Example branded type
type EventId = Brand<string, "EventId">;
```

### Template Literal Pattern (for Stream IDs)

Stream IDs have 2-char prefixes. Use **template literal types** for compile-time prefix validation:

```typescript
// Template literal type - TypeScript validates prefix at compile time
type SpaceId = `10${string}`;

const good: SpaceId = "10abc123..."; // ✅ OK
const bad: SpaceId = "20abc123..."; // ❌ Error: "20..." not assignable to "10..."
```

### Tier 1: Stream IDs (Highest Priority)

Stream IDs are 64-char hex strings with a 2-char prefix. Use template literals:

```typescript
// packages/sdk-types/src/ids/stream.ts

// Specific stream types with prefix validation
export type SpaceId = `10${string}`; // prefix: 10
export type ChannelId = `20${string}`; // prefix: 20
export type DMChannelId = `88${string}`; // prefix: 88
export type GDMChannelId = `77${string}`; // prefix: 77
export type UserId = `a8${string}`; // prefix: a8
export type UserSettingsId = `a5${string}`; // prefix: a5
export type UserMetadataId = `ad${string}`; // prefix: ad
export type UserInboxId = `a1${string}`; // prefix: a1
export type MediaId = `ff${string}`; // prefix: ff

// Union type for any stream ID
export type StreamId =
  | SpaceId
  | ChannelId
  | DMChannelId
  | GDMChannelId
  | UserId
  | UserSettingsId
  | UserMetadataId
  | UserInboxId
  | MediaId;

// Union of content-bearing streams
export type ContentStreamId = ChannelId | DMChannelId | GDMChannelId;
```

### Tier 2: Address Type

Use the `Address` from viem

**Note**: A single `Address` type is sufficient. Context is clear from parameter names (`userId`, `contractAddress`, `walletAddress`).

### Tier 3: Event IDs

```typescript
// packages/sdk-types/src/ids/event.ts

// Remote event ID (hash of event, hex string)
export type EventId = Brand<string, "EventId">;

// Local event ID (client-generated, starts with ~)
export type LocalEventId = Brand<string, "LocalEventId">;

// Hash string (generic hash, same format as EventId but different semantics)
export type HashStr = Brand<string, "HashStr">;
```

### Tier 4: Encryption IDs

```typescript
// packages/sdk-types/src/ids/encryption.ts

// Encryption session ID
export type SessionId = Brand<string, "SessionId">;

// Device public key (Curve25519)
export type DeviceKey = Brand<string, "DeviceKey">;

// Fallback key for prekey exchange
export type FallbackKey = Brand<string, "FallbackKey">;
```

### Tier 5: Miniblock Number

```typescript
// packages/sdk-types/src/ids/miniblock.ts

// Miniblock number (already bigint, brand for clarity)
export type MiniblockNum = Brand<bigint, "MiniblockNum">;
```

---

## Type Guards & Constructors

### For Template Literal Types (Stream IDs)

Template literals provide compile-time validation. For runtime validation:

```typescript
// packages/sdk-types/src/ids/stream.ts

// Type guard with narrowing - runtime prefix check
export function isSpaceId(value: string): value is SpaceId {
  return value.length === 64 && value.startsWith("10");
}

// Constructor (validates and casts)
export function spaceId(value: string): SpaceId {
  if (!isSpaceId(value)) {
    throw new TypeError(`Invalid SpaceId: ${value}`);
  }
  return value as SpaceId; // Safe cast after validation
}

// Same pattern for all stream types...
export function isChannelId(value: string): value is ChannelId {
  return value.length === 64 && value.startsWith("20");
}

export function channelId(value: string): ChannelId {
  if (!isChannelId(value)) {
    throw new TypeError(`Invalid ChannelId: ${value}`);
  }
  return value as ChannelId;
}

// Generic stream ID (any valid prefix)
export function isStreamId(value: string): value is StreamId {
  return value.length === 64 && /^(10|20|88|77|a8|a5|ad|a1|ff)/.test(value);
}
```

### For Branded Types (EventId, SessionId, etc.)

Branded types need explicit casting:

```typescript
// packages/sdk-types/src/ids/event.ts

// Type guard (runtime check - hex string)
export function isEventId(value: string): value is EventId {
  return /^[a-fA-F0-9]{64}$/.test(value);
}

// Constructor
export function eventId(value: string): EventId {
  if (!isEventId(value)) {
    throw new TypeError(`Invalid EventId: ${value}`);
  }
  return value as EventId;
}
```

---

## Conversion Functions

Existing conversion functions should return branded types:

```typescript
// packages/sdk-types/src/ids/conversions.ts

// Stream ID creation (returns specific branded type)
export function makeSpaceStreamId(contractAddress: Address): SpaceId;
export function makeChannelStreamId(spaceId: SpaceId): ChannelId;
export function makeUserStreamId(userAddress: Address): UserId;
export function makeDMStreamId(userA: Address, userB: Address): DMChannelId;
export function makeGDMStreamId(): GDMChannelId;

// Derivations
export function spaceIdFromChannelId(channelId: ChannelId): SpaceId;
export function addressFromUserId(userId: UserId): Address;
export function addressFromSpaceId(spaceId: SpaceId): Address;

// Byte conversions
export function streamIdToBytes(id: StreamId): Uint8Array;
export function streamIdFromBytes(bytes: Uint8Array): StreamId;
```

---

## API Impact

### Before (Current)

```typescript
// Unclear what types are expected
class Client {
  async createChannel(
    spaceId: string, // StreamId? Address?
    name: string,
    topic: string,
    channelId: string, // Required or generated?
  ): Promise<void>;

  async inviteUser(
    streamId: string, // Which stream types valid?
    userId: string, // Address? UserId stream?
  ): Promise<void>;

  async pin(
    streamId: string, // Any stream?
    eventId: string, // Or localEventId?
  ): Promise<void>;
}
```

### After (With Branded Types)

```typescript
// Clear, type-safe API
class Client {
  async createChannel(
    spaceId: SpaceId,
    name: string,
    topic: string,
    channelId?: ChannelId, // Optional, generated if not provided
  ): Promise<ChannelId>;

  async inviteUser(
    streamId: SpaceId | ChannelId, // Only these accept invites
    userId: Address,
  ): Promise<void>;

  async pin(
    streamId: ContentStreamId, // ChannelId | DMChannelId | GDMChannelId
    eventId: EventId, // Must be confirmed event, not local
  ): Promise<void>;
}
```

### Usage Examples

```typescript
// Compile-time safety
const space = spaceId("10abc..."); // SpaceId
const channel = channelId("20xyz..."); // ChannelId
const user = address("0x123..."); // Address

// ✅ Correct usage
await client.inviteUser(space, user);
await client.inviteUser(channel, user);

// ❌ Compile error - wrong types
await client.inviteUser(user, space); // Error: Address not assignable to SpaceId
await client.inviteUser(channel, space); // Error: SpaceId not assignable to Address

// Type narrowing with guards
function handleStream(id: StreamId) {
  if (isSpaceId(id)) {
    // id is SpaceId here
    const contractAddr = addressFromSpaceId(id);
  } else if (isChannelId(id)) {
    // id is ChannelId here
    const space = spaceIdFromChannelId(id);
  }
}
```

---

## Package Structure

```typescript
// packages/sdk-types/src/ids/index.ts

// Re-export all ID types
export * from "./brand"; // Brand utility type
export * from "./stream"; // StreamId, SpaceId, ChannelId, etc.
export * from "./address"; // Address
export * from "./event"; // EventId, LocalEventId, HashStr
export * from "./encryption"; // SessionId, DeviceKey
export * from "./miniblock"; // MiniblockNum
export * from "./conversions"; // makeSpaceStreamId, etc.
export * from "./constants"; // StreamPrefix enum
```

```typescript
// packages/sdk-types/src/ids/brand.ts

declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Utility to extract base type
export type Unbranded<T> = T extends Brand<infer U, string> ? U : T;
```

---

## Migration Strategy

### Phase 1: Add Types (Non-breaking)

1. Add branded types to `sdk-types` package
2. Export alongside existing types
3. Add type guards and constructors
4. No changes to existing function signatures

### Phase 2: Internal Adoption

1. Update internal SDK code to use branded types
2. Add `@internal` unsafe casts at boundaries
3. Validate inputs at public API boundaries
4. Update tests to use branded constructors

### Phase 3: Public API Migration

1. Update public function signatures to use branded types
2. Provide migration guide
3. Mark old signatures as deprecated
4. Major version bump (breaking change)

---

## Compatibility Notes

### Interop with Plain Strings

```typescript
// Branded types are assignable TO string (widening)
const spaceId: SpaceId = makeSpaceStreamId(contractAddress);
const str: string = spaceId; // ✅ OK - widening

// Strings are NOT assignable to branded types (narrowing requires validation)
const str: string = "10abc...";
const spaceId: SpaceId = str; // ❌ Error

// Use constructor or type guard
const spaceId: SpaceId = spaceId(str); // ✅ OK - validated
```

### JSON Serialization

Branded types serialize as their base type:

```typescript
const id: SpaceId = spaceId("10abc...");
JSON.stringify({ id }); // {"id":"10abc..."} - no brand in output
```

### Proto Integration

Protobuf messages use plain strings. Branding happens at SDK boundary:

```typescript
// Internal: proto uses string
const proto: StreamEvent = { streamId: "10abc..." };

// Public API: branded
function getStream(id: SpaceId): Promise<Stream> {
  return rpc.getStream({ streamId: id }); // SpaceId assignable to string
}
```

---

## Recommended Types Summary

| Type             | Pattern          | Prefix | Example                         |
| ---------------- | ---------------- | ------ | ------------------------------- |
| `SpaceId`        | template literal | 10     | `` `10${string}` ``             |
| `ChannelId`      | template literal | 20     | `` `20${string}` ``             |
| `DMChannelId`    | template literal | 88     | `` `88${string}` ``             |
| `GDMChannelId`   | template literal | 77     | `` `77${string}` ``             |
| `UserId`         | template literal | a8     | `` `a8${string}` ``             |
| `UserSettingsId` | template literal | a5     | `` `a5${string}` ``             |
| `UserMetadataId` | template literal | ad     | `` `ad${string}` ``             |
| `UserInboxId`    | template literal | a1     | `` `a1${string}` ``             |
| `MediaId`        | template literal | ff     | `` `ff${string}` ``             |
| `StreamId`       | union            | any    | Union of above                  |
| `Address`        | template literal | 0x     | `` `0x${string}` ``             |
| `EventId`        | branded          | -      | `Brand<string, 'EventId'>`      |
| `LocalEventId`   | branded          | ~      | `Brand<string, 'LocalEventId'>` |
| `SessionId`      | branded          | -      | `Brand<string, 'SessionId'>`    |
| `DeviceKey`      | branded          | -      | `Brand<string, 'DeviceKey'>`    |
| `MiniblockNum`   | branded          | -      | `Brand<bigint, 'MiniblockNum'>` |

---

## Critical Files to Update

| File                                       | Changes                                       |
| ------------------------------------------ | --------------------------------------------- |
| `packages/sdk/src/id.ts`                   | Update return types, add branded constructors |
| `packages/sdk/src/client.ts`               | Update method signatures                      |
| `packages/sdk/src/client-v2.ts`            | Update method signatures                      |
| `packages/sdk/src/types.ts`                | Use branded types in interfaces               |
| `packages/encryption/src/cryptoStore.ts`   | Use SessionId, DeviceKey                      |
| `packages/web3/src/types/ContractTypes.ts` | Address type already exists here              |

---

## Open Questions

1. **Granularity**: Should we have `DMChannelId` vs just `ChannelId`? More types = more safety but more complexity.

2. **EventId variants**: Do we need `LocalEventId` separate from `EventId`, or just one type with runtime check?

3. **StreamId union**: Should `StreamId` be a union of all specific types, or a separate branded type that's a supertype?
