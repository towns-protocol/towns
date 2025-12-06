# Stream Layer

The Stream layer manages the state of individual streams, processing events and maintaining views of stream content.

## Stream Hierarchy

```mermaid
classDiagram
    class Stream {
        +userId: string
        +streamId: string
        +streamsView: StreamsView
        +view: StreamStateView
        +syncCookie: SyncCookie
        +initialize(...)
        +appendEvents(events, cookie, snapshot, cleartexts)
        +prependEvents(miniblocks, cleartexts, terminus)
        +appendLocalEvent(message, status)
        +updateDecryptedContent(eventId, content)
        +waitForMembership(op, userId?)
        +emit(event, ...args)
    }

    class SyncedStream {
        +isUpToDate: boolean
        +persistenceStore: IPersistenceStore
        +initializeFromPersistence(data?): Promise~boolean~
        +initializeFromResponse(response)
    }

    class StreamStateView {
        +streamId: string
        +userId: string
        +contentKind: SnapshotCaseType
        +minipoolEvents: Map
        +syncCookie: SyncCookie
        +membershipContent: StreamStateView_Members
        +timeline: TimelineEvent[]
        +isInitialized: boolean
        +spaceContent: StreamStateView_Space
        +channelContent: StreamStateView_Channel
        +dmChannelContent: StreamStateView_DMChannel
        +gdmChannelContent: StreamStateView_GDMChannel
        +userContent: StreamStateView_User
        +mediaContent: StreamStateView_Media
    }

    Stream <|-- SyncedStream
    Stream --> StreamStateView : contains
```

## Stream Types

Streams are identified by their ID prefix:

| Type | ID Prefix | Content Type | Description |
|------|-----------|--------------|-------------|
| **Space** | `10*` | `spaceContent` | Top-level community |
| **Channel** | `20*` | `channelContent` | Public channel in a space |
| **DM** | `77*` | `dmChannelContent` | Direct message (1:1) |
| **GDM** | `88*` | `gdmChannelContent` | Group direct message |
| **User** | `a1*` | `userContent` | User's stream memberships |
| **UserSettings** | `a2*` | `userSettingsContent` | User preferences |
| **UserMetadata** | `a3*` | `userMetadataContent` | Device keys |
| **UserInbox** | `a4*` | `userInboxContent` | Key exchange inbox |
| **Media** | `ff*` | `mediaContent` | Media storage |

## StreamStateView

`StreamStateView` is the core state container for a stream.

### Content Type Polymorphism

```mermaid
flowchart TD
    Constructor[new StreamStateView] --> Check{Stream ID prefix?}

    Check -->|10| Space[StreamStateView_Space]
    Check -->|20| Channel[StreamStateView_Channel]
    Check -->|77| DM[StreamStateView_DMChannel]
    Check -->|88| GDM[StreamStateView_GDMChannel]
    Check -->|a1| User[StreamStateView_User]
    Check -->|a2| Settings[StreamStateView_UserSettings]
    Check -->|a3| Metadata[StreamStateView_UserMetadata]
    Check -->|a4| Inbox[StreamStateView_UserInbox]
    Check -->|ff| Media[StreamStateView_Media]
```

### Key Properties

```mermaid
classDiagram
    class StreamStateView {
        +streamId: string
        +userId: string
        +contentKind: SnapshotCaseType
        +isInitialized: boolean

        +syncCookie: SyncCookie
        +prevMiniblockHash: Uint8Array
        +prevMiniblockNum: bigint
        +lastEventNum: bigint
        +prevSnapshotMiniblockNum: bigint

        +minipoolEvents: Map~string, StreamTimelineEvent~
        +miniblockInfo: MiniblockInfo

        +membershipContent: StreamStateView_Members
        +timeline: TimelineEvent[]
    }

    class MiniblockInfo {
        +max: bigint
        +min: bigint
        +terminusReached: boolean
    }
```

## Stream Lifecycle

### Initialization

```mermaid
sequenceDiagram
    participant Client
    participant Stream
    participant View as StreamStateView
    participant Store as PersistenceStore

    alt SyncedStream: From persistence
        Client->>Stream: initializeFromPersistence()
        Stream->>Store: loadStream(streamId)
        Store-->>Stream: LoadedStream
        Stream->>View: initialize(...)
    else SyncedStream: From network
        Client->>Stream: initializeFromResponse(response)
        Stream->>View: initialize(...)
        Stream->>Store: saveSyncedStream(...)
        Stream->>Store: saveMiniblocks(...)
        Stream->>Store: saveSnapshot(...)
    else Stream: Direct
        Client->>Stream: initialize(...)
        Stream->>View: initialize(...)
    end

    View->>View: Apply snapshot
    View->>View: Process miniblocks
    View->>View: Apply minipool events
    View->>View: Set isInitialized = true
```

### Event Processing

```mermaid
flowchart TD
    subgraph appendEvents
        Receive[Receive events] --> Loop{For each event}
        Loop --> CheckType{Event type?}

        CheckType -->|miniblockHeader| ProcessBlock[Process miniblock]
        CheckType -->|other| AddMinipool[Add to minipoolEvents]

        ProcessBlock --> ConfirmEvents[Confirm minipool events]
        ConfirmEvents --> UpdateCookie[Update syncCookie]

        AddMinipool --> UpdateTimeline[Update timeline view]
    end

    subgraph prependEvents
        Prepend[Prepend miniblocks] --> Historical[Process historical events]
        Historical --> UpdateMin[Update miniblockInfo.min]
        Historical --> CheckTerminus{Reached terminus?}
        CheckTerminus -->|Yes| SetTerminus[terminusReached = true]
    end
```

### Event States

```mermaid
stateDiagram-v2
    [*] --> Local: appendLocalEvent()
    Local --> Sending: updateLocalEvent(SENDING)
    Sending --> Sent: updateLocalEvent(SENT)
    Sent --> Confirmed: miniblockHeader received

    [*] --> Remote: appendEvents()
    Remote --> InMinipool: Added to minipool
    InMinipool --> Confirmed: miniblockHeader received

    Confirmed --> [*]

    Local --> Cancelled: updateLocalEvent(CANCELLED)
    Sending --> Failed: Error
```

## Minipool and Miniblocks

Events go through two stages:

```mermaid
flowchart LR
    subgraph Minipool
        E1[Event 1]
        E2[Event 2]
        E3[Event 3]
    end

    subgraph Miniblock["Miniblock N"]
        C1[Confirmed Event 1]
        C2[Confirmed Event 2]
    end

    Minipool -->|MiniblockHeader| Miniblock
    E1 --> C1
    E2 --> C2

    Note1[Unconfirmed events waiting<br/>to be included in a block]
    Note2[Events confirmed by consensus]

    Minipool -.-> Note1
    Miniblock -.-> Note2
```

## Content Type Views

Each content type has its own view class:

### StreamStateView_Channel

```mermaid
classDiagram
    class StreamStateView_Channel {
        +streamId: string
        +properties: ChannelProperties
        +pins: Pin[]
        +encryptedProperties: EncryptedData
        +decryptedChannelProperties: DecryptedContent

        +applySnapshot(snapshot)
        +prependEvent(event, emitter)
        +appendEvent(event, emitter)
    }
```

### StreamStateView_Members

```mermaid
classDiagram
    class StreamStateView_Members {
        +joined: Map~userId, MembershipInfo~
        +userIdToEventNumOnChain: Map
        +usernameToUserId: Map
        +solicitations: Map~solicitationId, KeySolicitationContent~

        +isMember(op, userId): boolean
        +getMember(userId): MembershipInfo
        +getJoinedCount(): number
        +getUsersEntitledToKeyExchange(): Set~string~
    }
```

## Timeline Integration

StreamStateView connects to TimelinesView for reactive updates:

```mermaid
flowchart LR
    View[StreamStateView] --> Timeline[TimelinesView]
    Timeline --> Observable[Observable]

    View -->|appendEvent| Timeline
    View -->|prependEvent| Timeline
    View -->|confirmEvent| Timeline
    View -->|updateDecryptedContent| Timeline
```

## SyncedStream

`SyncedStream` extends `Stream` with persistence capabilities:

```mermaid
flowchart TB
    subgraph SyncedStream
        Init[Initialize]
        Append[Append Events]
        Prepend[Prepend Events]
    end

    subgraph PersistenceStore
        SaveSync[saveSyncedStream]
        SaveMB[saveMiniblocks]
        SaveSnap[saveSnapshot]
        SaveClear[saveCleartext]
    end

    Init --> SaveSync
    Init --> SaveMB
    Init --> SaveSnap

    Append -->|On miniblock header| SaveMB
    Append -->|On miniblock header| SaveSync

    Prepend --> SaveMB
```

## Stream Events

Streams emit events for state changes:

| Event | When | Payload |
|-------|------|---------|
| `streamNewUserJoined` | User joins | userId, streamId |
| `streamUserLeft` | User leaves | userId, streamId |
| `streamMembershipUpdated` | Membership changes | streamId |
| `streamInitialized` | Stream ready | streamId |
| `streamUpToDate` | Sync complete | streamId |
| `streamNewMessage` | New message | event |
| `streamEncryptedContentAdded` | Encrypted content | eventId, streamId |

## Source Files

| File | Description |
|------|-------------|
| `src/stream.ts` | Base Stream class |
| `src/syncedStream.ts` | Persisted SyncedStream |
| `src/streamStateView.ts` | Core state container |
| `src/streamStateView_*.ts` | Content type implementations |
| `src/syncedStreams.ts` | Stream collection manager |
| `src/streamEvents.ts` | Event type definitions |
