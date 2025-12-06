# Timeline and Views Layer

The Timeline and Views layer provides reactive, observable state for UI consumption.

## Architecture Overview

```mermaid
classDiagram
    class StreamsView {
        +lastAccessedAt: Observable~Record~
        +streamStatus: StreamStatus
        +streamMemberIds: StreamMemberIdsView
        +spaceStreams: SpaceStreamsView
        +channelStreams: ChannelStreamsView
        +dmStreams: DmStreamsView
        +gdmStreams: GdmStreamsView
        +userStreams: UserStreamsView
        +timelinesView: TimelinesView
        +my: UserViews
    }

    class TimelinesView {
        +value: TimelinesViewModel
        +streamUpdated(...)
        +streamInitialized(...)
        +streamDecryptedContentUpdated(...)
    }

    class Observable~T~ {
        +value: T
        +subscribe(fn, opts): unsubscribe
        +setValue(newValue): boolean
        +map(fn): Observable~U~
        +throttle(ms): Observable~T~
        +when(condition, opts): Promise~T~
    }

    StreamsView --> TimelinesView
    StreamsView --> Observable
    TimelinesView --|> Observable
```

## Observable Pattern

The SDK uses a custom Observable implementation for reactive state:

### Observable Class

```mermaid
classDiagram
    class Observable~T~ {
        -_value: T
        -subscribers: Subscription[]
        -_dispose: () => void
        +value: T
        +setValue(newValue): boolean
        +set(fn): boolean
        +subscribe(fn, opts): () => void
        +unsubscribe(fn): void
        +map(fn): Observable~U~
        +throttle(ms): Observable~T~
        +when(condition, opts): Promise~T~
    }

    class Subscription~T~ {
        +id: number
        +fn: (value, prevValue) => void
        +condition: (value) => boolean
        +once: boolean
    }
```

### Subscribe Options

```typescript
observable.subscribe(
    (newValue, prevValue) => { /* handler */ },
    {
        fireImediately?: boolean,  // Call immediately with current value
        once?: boolean,            // Auto-unsubscribe after first call
        condition?: (value) => boolean  // Only fire when condition is true
    }
)
```

### Transforms

```mermaid
flowchart LR
    subgraph "Observable Transforms"
        Source[Observable A] --> Map[".map(fn)"]
        Map --> Mapped[Observable B]

        Source2[Observable A] --> Throttle[".throttle(ms)"]
        Throttle --> Throttled[Observable A (throttled)]

        Source3[Observable A] --> When[".when(condition)"]
        When --> Promise[Promise A]
    end
```

## StreamsView

`StreamsView` aggregates all stream-related observables:

### Structure

```mermaid
flowchart TB
    subgraph StreamsView
        subgraph "Stream Type Views"
            Space[SpaceStreamsView]
            Channel[ChannelStreamsView]
            DM[DmStreamsView]
            GDM[GdmStreamsView]
            User[UserStreamsView]
        end

        subgraph "Aggregate Views"
            Timeline[TimelinesView]
            Status[StreamStatus]
            Members[StreamMemberIdsView]
        end

        subgraph "My Views"
            MyUser[userStream]
            MySettings[userSettingsStream]
            MyUnread[unreadMarkers]
            MyMemberships[memberships]
            MySpaces[spaceIds]
            MyDmsGdms[dmsAndGdms]
        end
    end
```

### User Views (`my`)

Convenient access to current user's data:

```mermaid
classDiagram
    class MyViews {
        +userId: Constant~string~
        +userStream: Observable~UserStreamModel~
        +userInboxStream: Observable~UserInboxStreamModel~
        +userMetadataStream: Observable~UserMetadataStreamModel~
        +userSettingsStream: Observable~UserSettingsStreamModel~
        +unreadMarkers: Observable~UnreadMarkersModel~
        +spaceMentions: Observable~MentionsModel~
        +memberships: Observable~Record~string, Membership~~
        +spaceIds: Observable~string[]~
        +dmsAndGdms: Observable~DmAndGdmModel[]~
        +dmsAndGdmsUnreadIds: Observable~Set~string~~
        +blockedUserIds: Observable~Set~string~~
        +spaceUnreads: Observable~SpaceUnreadsModel~
    }
```

## TimelinesView

`TimelinesView` manages the timeline state for all streams:

### TimelinesViewModel

```mermaid
classDiagram
    class TimelinesViewModel {
        +timelines: Record~streamId, TimelineEvent[]~
        +replacedEvents: Record~streamId, Record~eventId, Replacement~~
        +pendingReplacedEvents: Record~streamId, Record~eventId, Replacement~~
        +threadsStats: Record~streamId, Record~eventId, ThreadStatsData~~
        +threads: Record~streamId, Record~eventId, TimelineEvent[]~~
        +reactions: Record~streamId, Record~eventId, MessageReactions~~
        +tips: Record~streamId, Record~eventId, Tips~~
        +lastestEventByUser: Record~userId, TimelineEvent~
    }
```

### TimelineEvent

```mermaid
classDiagram
    class TimelineEvent {
        +eventId: string
        +localEventId?: string
        +eventNum: bigint
        +latestEventId: string
        +status: EventStatus
        +createdAtEpochMs: number
        +updatedAtEpochMs?: number
        +content: TimelineEvent_OneOf
        +fallbackContent: string
        +isEncrypting: boolean
        +isLocalPending: boolean
        +isSendFailed: boolean
        +confirmedEventNum?: bigint
        +confirmedInBlockNum?: bigint
        +confirmedAtEpochMs?: number
        +threadParentId?: string
        +replyParentId?: string
        +reactionParentId?: string
        +isMentioned: boolean
        +isRedacted: boolean
        +sender: Sender
        +sessionId?: string
    }
```

### Event Status

```mermaid
stateDiagram-v2
    [*] --> QUEUED: Local event created
    QUEUED --> SENDING: Send started
    SENDING --> SENT: Send successful
    SENT --> RECEIVED: In minipool
    RECEIVED --> CONFIRMED: In miniblock

    SENDING --> CANCELLED: Send failed
    QUEUED --> CANCELLED: Cancelled

    CONFIRMED --> [*]
    CANCELLED --> [*]
```

## Data Flow

### From Stream to Observable

```mermaid
sequenceDiagram
    participant Stream
    participant SSV as StreamStateView
    participant TV as TimelinesView
    participant Obs as Observable
    participant UI

    Stream->>SSV: appendEvents()
    SSV->>TV: streamUpdated(streamId, events)
    TV->>TV: Process events
    TV->>TV: Update timelines model
    TV->>Obs: setValue(newModel)
    Obs->>Obs: Notify subscribers
    Obs-->>UI: (newValue, prevValue)
```

### Transform Pipeline

```mermaid
flowchart LR
    subgraph "Raw Data"
        Timeline[timelinesView]
        Settings[userSettingsStream]
    end

    subgraph "Transforms"
        Combine[combine]
        Throttle[throttle 250ms]
        Map[map transform]
    end

    subgraph "Derived State"
        Unread[unreadMarkers]
        Mentions[spaceMentions]
    end

    Timeline --> Combine
    Settings --> Combine
    Combine --> Throttle
    Throttle --> Map
    Map --> Unread
    Map --> Mentions
```

## Transform Functions

The SDK includes many transform functions for derived state:

| Transform | Input | Output |
|-----------|-------|--------|
| `unreadMarkersTransform` | timelines + fullyReadMarkers | UnreadMarkersModel |
| `spaceMentionsTransform` | timelines + unreadMarkers | MentionsModel |
| `membershipsTransform` | userStream | Record<streamId, Membership> |
| `spaceIdsTransform` | memberships | string[] |
| `dmsAndGdmsTransform` | memberships + streams | DmAndGdmModel[] |
| `blockedUserIdsTransform` | userSettings | Set<string> |
| `spaceUnreadsTransform` | spaces + unread | SpaceUnreadsModel |

## Combine Observable

Combines multiple observables into one:

```mermaid
flowchart TD
    A[Observable A] --> Combine[combine]
    B[Observable B] --> Combine
    C[Observable C] --> Combine

    Combine --> Combined["Observable { a, b, c }"]

    Note["Fires when any input changes"]
```

```typescript
const combined = combine({
    userId: myUserId,
    timelinesView: timelinesView,
    fullyReadMarkers: fullyReadMarkers,
})
```

## Throttling

Prevents excessive updates to downstream subscribers:

```mermaid
flowchart LR
    subgraph "Without Throttle"
        E1[Event 1] --> S1[Subscriber]
        E2[Event 2] --> S1
        E3[Event 3] --> S1
        E4[Event 4] --> S1
    end

    subgraph "With Throttle (250ms)"
        E5[Event 1] --> T1[Throttle]
        E6[Event 2] --> T1
        E7[Event 3] --> T1
        E8[Event 4] --> T1
        T1 -->|"After 250ms"| S2[Subscriber]
    end
```

## Typical Usage

```typescript
// Subscribe to unread markers
const unsubscribe = client.streamsView.my.unreadMarkers.subscribe(
    (unreadMarkers, prevMarkers) => {
        // Update UI with new unread state
        updateBadgeCounts(unreadMarkers)
    },
    { fireImediately: true }
)

// Wait for a condition
await client.streamsView.my.memberships.when(
    (memberships) => memberships[spaceId]?.isMember === true,
    { timeoutMs: 10000 }
)

// Map to derived value
const channelNames = client.streamsView.channelStreams.map(
    (channels) => Object.values(channels).map(c => c.name)
)
```

## Source Files

| File | Description |
|------|-------------|
| `src/views/streamsView.ts` | Main StreamsView aggregator |
| `src/views/streams/timelines.ts` | TimelinesView implementation |
| `src/views/streams/timelinesModel.ts` | Timeline state machine |
| `src/views/models/timelineTypes.ts` | TimelineEvent and related types |
| `src/observable/observable.ts` | Observable base class |
| `src/observable/combine.ts` | Combine utility |
| `src/observable/constant.ts` | Constant observable |
| `src/views/transforms/*.ts` | Transform functions |
