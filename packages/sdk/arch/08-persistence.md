# Persistence Layer

The Persistence layer provides offline-capable storage for stream data, enabling fast startup and reduced network usage.

## PersistenceStore Interface

```mermaid
classDiagram
    class IPersistenceStore {
        <<interface>>
        +setHighPriorityStreams(streamIds: string[])
        +saveCleartext(eventId, cleartext): Promise~void~
        +getCleartext(eventId): Promise~Uint8Array | string~
        +getCleartexts(eventIds): Promise~Record~
        +getSyncedStream(streamId): Promise~ParsedPersistedSyncedStream~
        +saveSyncedStream(streamId, syncedStream): Promise~void~
        +loadStream(streamId, persisted?): Promise~LoadedStream~
        +loadStreams(streamIds): Promise~Record + lastAccessedAt~
        +saveMiniblock(streamId, miniblock): Promise~void~
        +saveMiniblocks(streamId, miniblocks, direction): Promise~void~
        +getMiniblock(streamId, num): Promise~ParsedMiniblock~
        +getMiniblocks(streamId, start, end): Promise~ParsedMiniblock[]~
        +saveSnapshot(streamId, num, snapshot): Promise~void~
    }

    class PersistenceStore {
        -cleartexts: Table
        -syncedStreams: Table
        -miniblocks: Table
        -snapshots: Table
        -scratch: Table
    }

    class StubPersistenceStore {
        <<stub>>
    }

    PersistenceStore ..|> IPersistenceStore
    StubPersistenceStore ..|> IPersistenceStore
```

## Database Schema (IndexedDB via Dexie)

```mermaid
erDiagram
    CLEARTEXTS {
        string eventId PK
        bytes cleartext "Decrypted content"
    }

    SYNCED_STREAMS {
        string streamId PK
        bytes data "Serialized PersistedSyncedStream"
    }

    MINIBLOCKS {
        string streamId PK
        string miniblockNum PK
        bytes data "Serialized miniblock"
    }

    SNAPSHOTS {
        string streamId PK
        bigint miniblockNum
        bytes snapshot "Serialized snapshot"
    }

    SCRATCH {
        string id PK
        object data "ScratchData: lastAccessedAt"
    }
```

### Dexie Schema Definition

```typescript
this.version(9).stores({
    cleartexts: 'eventId',                    // Primary key
    syncedStreams: 'streamId',                // Primary key
    miniblocks: '[streamId+miniblockNum]',    // Compound key
    snapshots: 'streamId',                    // Primary key
    scratch: 'id',                            // Primary key
})
```

## Data Structures

### PersistedSyncedStream

Stores stream sync state:

```mermaid
classDiagram
    class PersistedSyncedStream {
        +syncCookie: SyncCookie
        +lastSnapshotMiniblockNum: bigint
        +minipoolEvents: ParsedEvent[]
        +lastMiniblockNum: bigint
    }

    class SyncCookie {
        +streamId: Uint8Array
        +miniblockNum: bigint
        +prevMiniblockHash: Uint8Array
    }
```

### LoadedStream

Result of loading a complete stream from persistence:

```mermaid
classDiagram
    class LoadedStream {
        +persistedSyncedStream: ParsedPersistedSyncedStream
        +miniblocks: ParsedMiniblock[]
        +cleartexts: Record~eventId, Uint8Array~
        +snapshot: Snapshot
        +prependedMiniblocks: ParsedMiniblock[]
        +prevSnapshotMiniblockNum: bigint
    }
```

## Load Stream Flow

```mermaid
sequenceDiagram
    participant Client
    participant Store as PersistenceStore
    participant IDB as IndexedDB

    Client->>Store: loadStream(streamId)

    Store->>IDB: getSyncedStream(streamId)
    IDB-->>Store: PersistedSyncedStream

    alt Not found
        Store-->>Client: undefined
    else Found
        Store->>Store: Validate miniblock consistency

        Store->>IDB: getMiniblocks(lastSnapshot → lastMiniblock)
        IDB-->>Store: miniblocks[]

        Store->>IDB: getSnapshot(streamId)
        IDB-->>Store: snapshot

        alt Channel stream
            Store->>Store: Cached scrollback (up to 3)
            Store->>IDB: getMiniblocks(backwards)
            IDB-->>Store: prependedMiniblocks[]
        end

        Store->>Store: Collect all eventIds
        Store->>IDB: getCleartexts(eventIds)
        IDB-->>Store: cleartexts

        Store-->>Client: LoadedStream
    end
```

## Save Operations

### On Stream Initialize

```mermaid
flowchart TD
    Init[initializeFromResponse] --> SaveSync[saveSyncedStream]
    Init --> SaveMB[saveMiniblocks forward]
    Init --> SaveSnap[saveSnapshot]
```

### On Miniblock Header

```mermaid
flowchart TD
    Header[onMiniblockHeader] --> SaveMB[saveMiniblock]
    Header --> UpdateSync[saveSyncedStream]
```

### On Scrollback

```mermaid
flowchart TD
    Scroll[prependEvents] --> SaveMB[saveMiniblocks backward]
```

### On Decrypt

```mermaid
flowchart TD
    Decrypt[updateDecryptedContent] --> SaveClear[saveCleartext]
```

## Cleartext Storage

Decrypted message content is stored separately:

```mermaid
sequenceDiagram
    participant Extensions as DecryptionExtensions
    participant Stream
    participant Store as PersistenceStore

    Extensions->>Extensions: Decrypt event
    Extensions->>Stream: updateDecryptedContent(eventId, content)
    Stream->>Store: saveCleartext(eventId, cleartext)

    Note over Store: Cleartext persisted for offline access
```

## High Priority Streams

Tracks which streams were recently accessed:

```mermaid
flowchart TD
    subgraph "Priority Tracking"
        SetHigh[setHighPriorityStreams] --> Queue[Add to scratchQueue]
        Queue --> Timer{Wait 1s}
        Timer --> Process[processScratchQueue]
        Process --> Save[Save to scratch table]
    end

    subgraph "Usage"
        Load[loadStreams] --> Read[Read scratch.lastAccessedAt]
        Read --> Return[Return with lastAccessedAt]
    end
```

## Scrollback Caching

For channel streams, caches up to 3 backwards miniblocks:

```mermaid
flowchart LR
    subgraph "Cached Range"
        MB5["MB 5 (oldest cached)"]
        MB6[MB 6]
        MB7[MB 7]
        MB8["MB 8 (snapshot)"]
        MB9[MB 9]
        MB10["MB 10 (latest)"]
    end

    MB5 -.->|MAX_CACHED_SCROLLBACK_COUNT = 3| MB8
```

## Error Handling and Retry

```mermaid
flowchart TD
    Call[Database operation] --> Try{Try}
    Try -->|Success| Return[Return result]
    Try -->|Error| CheckType{Error type?}

    CheckType -->|AbortError| Retry{Retries left?}
    CheckType -->|Other| Throw[Throw error]

    Retry -->|Yes| Wait[Wait 100ms]
    Wait --> Try
    Retry -->|No| Throw
```

### Retry Policy

```typescript
const DEFAULT_RETRY_COUNT = 3

// Used for read operations
async function fnReadRetryer<T>(fn, retries) {
    // Retries on AbortError with 100ms delay
}
```

## Storage Management

### Request Persistent Storage

```typescript
private requestPersistentStorage() {
    navigator.storage?.persist?.().then((granted) => {
        log.info('Persistent storage:', granted)
    })
}
```

### Monitor Storage Usage

```typescript
private checkPersistenceStats() {
    navigator.storage?.estimate?.().then(({ usage, quota }) => {
        const percentUsed = (usage / quota * 100)
        log.info(`Storage: ${percentUsed}% used`)

        if (percentUsed > 95) {
            // Trigger cleanup
        }
    })
}
```

## StubPersistenceStore

A no-op implementation for when persistence is disabled:

```mermaid
classDiagram
    class StubPersistenceStore {
        +saveCleartext(): Promise~void~ "No-op"
        +getCleartext(): undefined
        +loadStream(): undefined
        +saveMiniblocks(): Promise~void~ "No-op"
    }
```

Used when `persistenceStoreName` is not provided to Client.

## Data Serialization

All data is serialized using Protocol Buffers:

```mermaid
flowchart LR
    subgraph Save
        Object --> toBinary[toBinary]
        toBinary --> Uint8Array
        Uint8Array --> Store[(IndexedDB)]
    end

    subgraph Load
        Store --> Load[Read]
        Load --> fromBinary[fromBinary]
        fromBinary --> Object2[Object]
    end
```

## Source Files

| File | Description |
|------|-------------|
| `src/persistenceStore.ts` | Main PersistenceStore implementation |
| `src/streamUtils.ts` | Serialization utilities |
| `@towns-protocol/proto` | Protobuf schemas |
