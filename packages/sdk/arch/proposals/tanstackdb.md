# Proposal: TanStack DB Integration for Reactive Data Management

## Problem Statement

### Current Challenges

The SDK currently uses a custom Observable pattern for reactive data management. While functional, this approach has several limitations:

#### 1. Manual Subscription Management

Consumers must manually subscribe and unsubscribe to avoid memory leaks:

```typescript
// Current pattern - manual cleanup required
const unsubscribe = client.streams.getStream(channelId)
  .timeline.subscribe((timeline) => {
    updateUI(timeline.events)
  })

// Must remember to call unsubscribe() on cleanup
```

#### 2. No Built-in Cross-Stream Queries

Joining data across streams requires manual orchestration:

```typescript
// Need to manually combine data from multiple streams
const spaceMembers = await client.getSpaceMembers(spaceId)
const userMetadata = await Promise.all(
  spaceMembers.map(m => client.getUserMetadata(m.userId))
)
// Manual merging, no reactivity
```

#### 3. Custom Persistence Logic

The `PersistenceStore` is tightly coupled to specific data shapes:

```typescript
// Persistence scattered across layers
await persistenceStore.saveCleartexts(streamId, [...])
await persistenceStore.saveMiniblocks(streamId, [...])
await persistenceStore.saveSyncedStream(streamId, {...})
```

#### 4. Framework Coupling

The Observable pattern requires framework-specific adapters for React, Vue, etc.

### Current Data Flow

```mermaid
flowchart LR
    subgraph Network
        RPC[StreamRpcClient]
    end

    subgraph Streams
        Sync[SyncedStream]
        SSV[StreamStateView]
    end

    subgraph Views
        Timeline[TimelinesView]
        Obs[Observable]
    end

    subgraph UI
        React[React Component]
    end

    RPC --> Sync
    Sync --> SSV
    SSV --> Timeline
    Timeline --> Obs
    Obs -->|subscribe/unsubscribe| React

    style Obs fill:#f96,stroke:#333
    style Timeline fill:#f96,stroke:#333
```

*Orange = layers affected by this proposal*

---

## Proposed Solution

### What is TanStack DB?

[TanStack DB](https://github.com/TanStack/db) is a reactive client store that provides:

| Feature | Description |
|---------|-------------|
| **Collections** | Typed, normalized data containers with multiple sync backends |
| **Live Queries** | Differential dataflow (d2ts) with sub-millisecond reactivity |
| **Optimistic Mutations** | Instant local updates with automatic rollback on failure |
| **Cross-Collection Joins** | Denormalize data without backend API changes |
| **Framework Adapters** | First-class React support with `useLiveQuery` hooks |

### Architecture Comparison

```mermaid
flowchart TB
    subgraph Current["Current Architecture"]
        direction TB
        C_RPC[RPC] --> C_Stream[Stream]
        C_Stream --> C_SSV[StreamStateView]
        C_SSV --> C_Obs[Observable]
        C_Obs --> C_Timeline[TimelinesView]
        C_Timeline --> C_UI[React + subscribe]
        C_SSV --> C_Persist[PersistenceStore]
    end

    subgraph Proposed["Proposed Architecture"]
        direction TB
        P_RPC[RPC] --> P_Stream[Stream]
        P_Stream --> P_Coll[RiverCollection]
        P_Coll --> P_Query[Live Query]
        P_Query --> P_UI[React + useLiveQuery]
        P_Coll --> P_Persist[IndexedDB Adapter]
    end

    style C_Obs fill:#f96
    style C_Timeline fill:#f96
    style P_Coll fill:#6f6
    style P_Query fill:#6f6
```

---

## Integration Design

### RiverCollection: Custom Collection Adapter

Create a custom TanStack DB collection that bridges the River protocol with TanStack DB's collection interface:

```mermaid
classDiagram
    class Collection {
        <<interface>>
        +id: string
        +state: CollectionState
        +insert(item): void
        +update(id, item): void
        +delete(id): void
        +subscribe(listener): Unsubscribe
    }

    class RiverCollection {
        -syncedStream: SyncedStream
        -decryptionExt: DecryptionExtensions
        -persistenceStore: PersistenceStore
        +streamId: string
        +insert(event): void
        +update(eventId, data): void
        +delete(eventId): void
        +onStreamEvent(event): void
        +onDecrypted(eventId, content): void
    }

    class MessagesCollection {
        +streamId: string
        +getTimeline(): LiveQuery
        +getThreads(): LiveQuery
    }

    class MembersCollection {
        +spaceId: string
        +getMembers(): LiveQuery
        +getMemberByUserId(userId): LiveQuery
    }

    Collection <|-- RiverCollection
    RiverCollection <|-- MessagesCollection
    RiverCollection <|-- MembersCollection
```

### Data Flow with RiverCollection

```mermaid
sequenceDiagram
    participant RPC as StreamRpcClient
    participant Stream as SyncedStream
    participant Ext as DecryptionExtensions
    participant Coll as RiverCollection
    participant Query as Live Query
    participant UI as React Component

    Note over RPC,UI: Receiving a new message

    RPC->>Stream: syncStreams update
    Stream->>Stream: appendEvents(events)
    Stream->>Coll: onStreamEvent(event)
    Coll->>Coll: insert(event) [encrypted]

    Note over Ext: Async decryption
    Stream->>Ext: enqueueNewEncryptedContent()
    Ext->>Ext: decryptGroupEvent()
    Ext->>Coll: onDecrypted(eventId, content)
    Coll->>Coll: update(eventId, {content})

    Note over Query: Differential update
    Coll-->>Query: Collection changed
    Query->>Query: Incremental recompute (~0.7ms)
    Query-->>UI: useLiveQuery returns new data
    UI->>UI: Re-render with new message
```

### Collection Types for SDK

```mermaid
flowchart TB
    subgraph Collections["TanStack DB Collections"]
        Messages[MessagesCollection]
        Members[MembersCollection]
        Spaces[SpacesCollection]
        Channels[ChannelsCollection]
        Users[UsersCollection]
        Reactions[ReactionsCollection]
    end

    subgraph Queries["Live Query Examples"]
        Q1["Timeline: Messages + Reactions + Threads"]
        Q2["Space Overview: Channels + Members"]
        Q3["User Profile: User + Spaces + DMs"]
    end

    Messages --> Q1
    Reactions --> Q1
    Members --> Q2
    Channels --> Q2
    Users --> Q3
    Spaces --> Q3

    style Q1 fill:#6f6
    style Q2 fill:#6f6
    style Q3 fill:#6f6
```

---

## React Integration

### Current Pattern

```typescript
// Current: Manual subscription
function ChannelMessages({ channelId }: Props) {
  const [messages, setMessages] = useState<TimelineEvent[]>([])
  const client = useTownsClient()

  useEffect(() => {
    const stream = client.streams.getStream(channelId)
    const unsubscribe = stream.timeline.subscribe((timeline) => {
      setMessages(timeline.events)
    })
    return () => unsubscribe()
  }, [channelId, client])

  return <MessageList messages={messages} />
}
```

### Proposed Pattern

```typescript
// Proposed: Declarative with useLiveQuery
function ChannelMessages({ channelId }: Props) {
  const { data: messages } = useLiveQuery(
    (q) => q
      .from(messagesCollection)
      .where('streamId', '=', channelId)
      .orderBy('createdAt', 'asc')
      .join(reactionsCollection, 'messageId')
      .join(threadsCollection, 'parentId'),
    [channelId]
  )

  return <MessageList messages={messages} />
}
```

### Benefits

| Aspect | Current | Proposed |
|--------|---------|----------|
| Subscription management | Manual | Automatic |
| Cross-stream joins | Manual Promise.all | Built-in `.join()` |
| Re-render triggers | Any data change | Only relevant changes |
| Type inference | Partial | Full from schema |
| Suspense support | No | Yes |

---

## What Gets Replaced

### Layers Affected

```mermaid
flowchart TB
    subgraph Unchanged["Unchanged Layers"]
        RPC[RPC Layer]
        Auth[Authentication]
        Encryption[Encryption]
        Streams[Stream Layer]
        Decrypt[DecryptionExtensions]
    end

    subgraph Replaced["Replaced/Augmented"]
        Observable[Observable Pattern]
        Timeline[TimelinesView]
        Persist[PersistenceStore]
    end

    subgraph New["New Components"]
        Collections[RiverCollections]
        LiveQuery[Live Queries]
        Adapters[React Adapters]
    end

    Streams --> Collections
    Collections --> LiveQuery
    LiveQuery --> Adapters

    Replaced -.->|replaced by| New

    style Observable fill:#f66
    style Timeline fill:#f96
    style Persist fill:#ff6
    style Collections fill:#6f6
    style LiveQuery fill:#6f6
    style Adapters fill:#6f6
```

### Detailed Mapping

| Current Component | Action | Replacement |
|-------------------|--------|-------------|
| `Observable<T>` | **Replace** | `Collection<T>` + Live Query |
| `TimelinesView` | **Replace** | Live Query with joins |
| `StreamsView` | **Replace** | `SpacesCollection` + queries |
| `PersistenceStore` | **Adapt** | IndexedDB collection adapter |
| `observable/` utilities | **Remove** | TanStack DB utilities |

### What Stays the Same

| Component | Reason |
|-----------|--------|
| **RPC Layer** | Network transport unchanged |
| **Authentication** | SignerContext, delegation unchanged |
| **Encryption** | GroupEncryptionCrypto, key exchange unchanged |
| **Stream Layer** | Stream, SyncedStream core logic unchanged |
| **DecryptionExtensions** | Key solicitation/fulfillment unchanged |

---

## Migration Strategy

### Phase Diagram

```mermaid
flowchart LR
    subgraph Phase1["Phase 1: Parallel"]
        P1_Add[Add TanStack DB]
        P1_Create[Create RiverCollection]
        P1_Test[Test with new components]
    end

    subgraph Phase2["Phase 2: Adapt"]
        P2_Persist[Adapt PersistenceStore]
        P2_Bridge[Bridge Stream → Collection]
        P2_React[Add React adapters]
    end

    subgraph Phase3["Phase 3: Migrate"]
        P3_Timeline[Migrate TimelinesView]
        P3_Streams[Migrate StreamsView]
        P3_Apps[Update app code]
    end

    subgraph Phase4["Phase 4: Cleanup"]
        P4_Remove[Remove Observable]
        P4_Docs[Update documentation]
        P4_Types[Simplify types]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4
```

### Phase 1: Add Infrastructure (Non-Breaking)

1. Add `@tanstack/db` and `@tanstack/react-db` dependencies
2. Create base `RiverCollection` class
3. Create collection schemas using Zod
4. Add parallel collection population from streams

```typescript
// New file: packages/sdk/src/collections/riverCollection.ts
import { Collection } from '@tanstack/db'

export class RiverCollection<T> implements Collection<T> {
  constructor(
    private syncedStream: SyncedStream,
    private schema: z.ZodSchema<T>
  ) {
    // Bridge stream events to collection
    syncedStream.on('event', this.handleStreamEvent)
  }
}
```

### Phase 2: Adapt Persistence

1. Create IndexedDB collection adapter wrapping existing Dexie store
2. Enable collection persistence without changing storage schema
3. Test offline/online sync scenarios

```typescript
// Adapter for existing PersistenceStore
export class DexieCollectionAdapter<T> implements CollectionPersistence<T> {
  constructor(private store: PersistenceStore, private tableName: string) {}

  async load(): Promise<T[]> {
    return this.store.db.table(this.tableName).toArray()
  }

  async save(items: T[]): Promise<void> {
    await this.store.db.table(this.tableName).bulkPut(items)
  }
}
```

### Phase 3: Migrate Views

1. Replace `TimelinesView` with Live Query
2. Replace `StreamsView` with collection queries
3. Update application code to use `useLiveQuery`
4. Maintain backward compatibility during transition

### Phase 4: Cleanup

1. Deprecate and remove `Observable` pattern
2. Remove `TimelinesView`, `StreamsView` classes
3. Update all documentation
4. Simplify type definitions

---

## Trade-offs and Risks

### Advantages

| Benefit | Description |
|---------|-------------|
| **Simpler React code** | `useLiveQuery` vs manual subscription |
| **Better performance** | Differential dataflow, ~0.7ms updates |
| **Cross-stream queries** | Built-in joins, no manual merging |
| **Type safety** | Schema-driven TypeScript inference |
| **Suspense support** | Modern React patterns |
| **Active ecosystem** | TanStack team maintenance |

### Risks

| Risk | Mitigation |
|------|------------|
| **Beta status** | Monitor releases, pin versions |
| **Custom sync protocol** | RiverCollection abstracts differences |
| **Bundle size** | Tree-shaking, lazy loading |
| **Learning curve** | Gradual migration, documentation |
| **Breaking changes** | Phased migration, deprecation period |

### Bundle Size Comparison

| Library | Size (gzipped) |
|---------|----------------|
| Current Observable | ~5KB |
| TanStack DB | ~15KB |
| TanStack React-DB | ~5KB |
| **Net increase** | ~15KB |

---

## Alternative Considered

### Keep Current Observable + Enhance

Instead of TanStack DB, enhance the current Observable pattern:

```typescript
// Enhanced Observable with joins
const timeline = observable.join(
  streams.getStream(channelId).events,
  reactions.getByStreamId(channelId),
  (events, reactions) => mergeReactions(events, reactions)
)
```

**Pros**: No new dependencies, no migration
**Cons**: Still manual subscriptions, custom maintenance burden

### Use Electric SQL Directly

Use Electric SQL for full PostgreSQL sync instead of TanStack DB:

**Pros**: Full database sync, SQL queries
**Cons**: Requires PostgreSQL backend changes, doesn't fit River protocol

---

## Recommendation

**Proceed with TanStack DB integration** using the phased approach:

1. **Start Phase 1** immediately - add infrastructure alongside existing code
2. **Validate** with a pilot feature (e.g., reactions timeline)
3. **Measure** performance improvement and developer experience
4. **Proceed** with migration if validation succeeds

### Success Criteria

- [ ] React code 40% simpler (fewer useEffect, manual subscriptions)
- [ ] Query performance < 1ms for 10k messages
- [ ] No regression in offline functionality
- [ ] Bundle size increase < 20KB

---

## References

- [TanStack DB GitHub](https://github.com/TanStack/db)
- [TanStack DB Documentation](https://tanstack.com/db/latest)
- [d2ts Differential Dataflow](https://github.com/electric-sql/d2ts)
- [Current SDK Architecture](../07-timeline.md)
- [Current Persistence Layer](../08-persistence.md)
