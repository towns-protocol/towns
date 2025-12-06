# Crypto Store Layer

The Crypto Store layer provides persistent storage for cryptographic keys and session data.

## CryptoStore Interface

```mermaid
classDiagram
    class CryptoStore {
        <<interface>>
        +userId: string
        +initialize(): Promise~void~
        +deleteAllData(): Promise~void~
        +getAccount(): Promise~string~
        +storeAccount(accountPickle: string): Promise~void~
        +storeEndToEndOutboundGroupSession(...): Promise~void~
        +getEndToEndOutboundGroupSession(streamId): Promise~string~
        +getAllEndToEndOutboundGroupSessions(): Promise~GroupSessionRecord[]~
        +getEndToEndInboundGroupSession(streamId, sessionId): Promise
        +storeEndToEndInboundGroupSession(...): Promise~void~
        +getAllEndToEndInboundGroupSessions(): Promise
        +getHybridGroupSession(streamId, sessionId): Promise
        +getHybridGroupSessionsForStream(streamId): Promise
        +storeHybridGroupSession(sessionData): Promise~void~
        +getAllHybridGroupSessions(): Promise
        +getInboundGroupSessionIds(streamId): Promise~string[]~
        +getHybridGroupSessionIds(streamId): Promise~string[]~
        +saveUserDevices(userId, devices, expiration?): Promise~void~
        +getUserDevices(userId): Promise~UserDevice[]~
        +withAccountTx(fn): Promise~T~
        +withGroupSessions(fn): Promise~T~
    }

    class CryptoStoreIndexedDb {
        +account: Table~AccountRecord~
        +outboundGroupSessions: Table~GroupSessionRecord~
        +inboundGroupSessions: Table~ExtendedInboundGroupSessionData~
        +hybridGroupSessions: Table~HybridGroupSessionRecord~
        +devices: Table~UserDeviceRecord~
    }

    class CryptoStoreInMemory {
        -accountPickle: string
        -outboundGroupSessions: Map
        -inboundGroupSessions: Map
        -hybridGroupSessions: Map
        -devices: LRUCache
    }

    CryptoStoreIndexedDb ..|> CryptoStore
    CryptoStoreInMemory ..|> CryptoStore
```

## Implementation Selection

```mermaid
flowchart TD
    Create[createCryptoStore] --> Check{isBrowser?}
    Check -->|Yes| IndexedDb[CryptoStoreIndexedDb]
    Check -->|No| InMemory[CryptoStoreInMemory]

    IndexedDb --> Dexie[Uses Dexie.js]
    Dexie --> IDB[(IndexedDB)]

    InMemory --> Maps[Uses Maps + LRU Cache]
    Maps --> Memory[(In-Memory)]
```

## Data Schema

### Account Record

Stores the pickled Olm account (device identity):

```mermaid
erDiagram
    ACCOUNT {
        string id PK "userId"
        string accountPickle "Pickled Olm Account"
    }
```

### Group Session Records

Stores Megolm session data:

```mermaid
erDiagram
    OUTBOUND_GROUP_SESSIONS {
        string streamId PK "Stream ID"
        string sessionId "Session ID"
        string session "Pickled session"
    }

    INBOUND_GROUP_SESSIONS {
        string streamId PK "Stream ID"
        string sessionId PK "Session ID"
        string session "Pickled session"
        string stream_id "Original stream"
        object keysClaimed "Key claims"
        boolean untrusted "Trust status"
    }
```

### Hybrid Group Session Records

Stores AES-GCM session keys:

```mermaid
erDiagram
    HYBRID_GROUP_SESSIONS {
        string streamId PK "Stream ID"
        string sessionId PK "Session ID"
        bytes sessionKey "AES-GCM key"
        bigint miniblockNum "Creation block number"
    }
```

### User Device Records

Caches other users' device keys:

```mermaid
erDiagram
    DEVICES {
        string userId PK "User ID"
        string deviceKey PK "Device public key"
        string fallbackKey "Fallback key"
        number expirationTimestamp "Expiry time"
    }
```

## IndexedDB Schema (Dexie)

```typescript
this.version(6).stores({
    account: 'id',                              // Primary key: id
    inboundGroupSessions: '[streamId+sessionId]', // Compound key
    outboundGroupSessions: 'streamId',          // Primary key: streamId
    hybridGroupSessions: '[streamId+sessionId],streamId', // Compound + index
    devices: '[userId+deviceKey],expirationTimestamp',    // Compound + index
})
```

## Storage Operations

### Account Management

```mermaid
sequenceDiagram
    participant Device as EncryptionDevice
    participant Store as CryptoStore
    participant DB as Storage

    Note over Device: First initialization
    Device->>Store: getAccount()
    Store->>DB: Query account table
    DB-->>Store: Not found
    Store-->>Device: Error

    Device->>Device: Create new Olm Account
    Device->>Store: storeAccount(accountPickle)
    Store->>DB: Put account record
    DB-->>Store: Success

    Note over Device: Subsequent initialization
    Device->>Store: getAccount()
    Store->>DB: Query account table
    DB-->>Store: accountPickle
    Store-->>Device: accountPickle
```

### Session Storage

```mermaid
sequenceDiagram
    participant Crypto as GroupEncryptionCrypto
    participant Device as EncryptionDevice
    participant Store as CryptoStore

    Note over Crypto: Creating outbound session
    Crypto->>Device: createOutboundGroupSession(streamId)
    Device->>Device: Generate Megolm session
    Device->>Store: storeEndToEndOutboundGroupSession(...)
    Store-->>Device: Success
    Device-->>Crypto: sessionId

    Note over Crypto: Encrypting message
    Crypto->>Device: encryptGroupMessage(payload, streamId)
    Device->>Store: getEndToEndOutboundGroupSession(streamId)
    Store-->>Device: pickled session
    Device->>Device: Unpickle and encrypt
    Device-->>Crypto: ciphertext
```

### Device Key Caching

```mermaid
sequenceDiagram
    participant Client
    participant Store as CryptoStore
    participant RPC

    Note over Client: Need to encrypt to user
    Client->>Store: getUserDevices(userId)
    Store->>Store: Query with expiration check

    alt Found and not expired
        Store-->>Client: [UserDevice, ...]
    else Not found or expired
        Store-->>Client: []
        Client->>RPC: Fetch from user metadata stream
        RPC-->>Client: device keys
        Client->>Store: saveUserDevices(userId, devices, expiration)
    end
```

## CryptoStoreInMemory

For Node.js environments, uses in-memory storage with LRU caching:

```mermaid
flowchart TB
    subgraph CryptoStoreInMemory
        Account[accountPickle: string]
        Outbound[outboundGroupSessions: Map]
        Inbound[inboundGroupSessions: Map]
        Hybrid[hybridGroupSessions: Map]
        Devices[devices: LRUCache]
    end

    Devices --> Config[maxEntries: 5000 default]
```

### LRU Eviction

To prevent unbounded memory growth in long-running bots:

```typescript
const maxEntries = opts?.maxCryptoStoreEntries ?? 5000

// LRU cache automatically evicts oldest entries
// when maxEntries is exceeded
```

## Transaction Support

Both implementations support transactions for atomic operations:

```mermaid
flowchart TD
    WithTx[withAccountTx / withGroupSessions]

    subgraph IndexedDb
        DexieTx[Dexie transaction]
        DexieTx --> Rollback[Automatic rollback on error]
    end

    subgraph InMemory
        Direct[Direct execution]
        Direct --> NoRollback[No transaction support]
    end
```

## Device Expiration

User device keys expire after 5 days by default:

```typescript
const DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS = 5 * ONE_DAY_MS
```

```mermaid
flowchart TD
    Save[saveUserDevices] --> SetExpiry[Set expirationTimestamp]
    SetExpiry --> Store[Store in DB]

    Init[initialize] --> Cleanup[Delete expired devices]
    Cleanup --> Check{expirationTimestamp < now?}
    Check -->|Yes| Delete[Delete record]
    Check -->|No| Keep[Keep record]

    Get[getUserDevices] --> Query[Query by userId]
    Query --> FilterExp[Filter by expiration]
```

## Error Handling

| Operation | Error Condition | Behavior |
|-----------|-----------------|----------|
| `getAccount()` | Account not found | Throw error |
| `getEndToEndOutboundGroupSession()` | Session not found | Throw error |
| `getEndToEndInboundGroupSession()` | Session not found | Return undefined |
| `getHybridGroupSession()` | Session not found | Return undefined |
| `getUserDevices()` | Devices expired | Return empty array |

## Source Files

| File | Description |
|------|-------------|
| `packages/encryption/src/cryptoStore.ts` | Interface definition and factory |
| `packages/encryption/src/CryptoStoreIndexedDb.ts` | Browser implementation |
| `packages/encryption/src/CryptoStoreInMemory.ts` | Node.js implementation |
| `packages/encryption/src/storeTypes.ts` | Record type definitions |
