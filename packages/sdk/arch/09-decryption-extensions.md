# Decryption Extensions Layer

The Decryption Extensions layer orchestrates key exchange, handling key solicitation and fulfillment for end-to-end encryption.

## Responsibilities

1. **Download new to-device messages** (keys received while offline)
2. **Decrypt encrypted content** (messages, properties, etc.)
3. **Retry decryption failures** (request missing keys)
4. **Respond to key solicitations** (share keys with other users)

## Architecture

```mermaid
classDiagram
    class BaseDecryptionExtensions {
        <<abstract>>
        -_status: DecryptionStatus
        -mainQueues: MainQueues
        -streamQueues: StreamQueues
        -mainQueueRunners: QueueRunner[]
        -streamQueueRunners: QueueRunner[]
        +crypto: GroupEncryptionCrypto
        +entitlementDelegate: EntitlementsDelegate
        +userDevice: UserDevice
        +userId: string
        +start()
        +stop()
        +enqueueNewGroupSessions(sessions)
        +enqueueNewEncryptedContent(streamId, eventId, kind, data)
        +enqueueKeySolicitation(streamId, userId, solicitation)
    }

    class ClientDecryptionExtensions {
        -client: Client
        +ackNewGroupSession(session)
        +decryptGroupEvent(streamId, eventId, kind, data)
        +downloadNewMessages()
        +sendKeySolicitation(args)
        +sendKeyFulfillment(args)
        +encryptAndShareGroupSessions(args)
    }

    ClientDecryptionExtensions --|> BaseDecryptionExtensions
```

## Queue System

### Main Queues

```mermaid
flowchart TB
    subgraph MainQueues["Main Queues (Global)"]
        Priority[priorityTasks]
        NewSessions[newGroupSession]
        OwnSolicitations[ownKeySolicitations]
        EphemeralSolicitations[ephemeralKeySolicitations]
    end

    subgraph MainRunners["Queue Runners"]
        R1[priority runner]
        R2[newGroupSessions runner]
        R3[ownKeySolicitations runner]
        R4[ephemeralKeySolicitations runner]
    end

    Priority --> R1
    NewSessions --> R2
    OwnSolicitations --> R3
    EphemeralSolicitations --> R4
```

### Stream Queues

```mermaid
flowchart TB
    subgraph StreamQueues["Stream Queues (Per-Stream)"]
        S1["Stream A"]
        S2["Stream B"]
        S3["Stream C"]
    end

    subgraph S1
        EC1[encryptedContent]
        KS1[keySolicitations]
    end

    subgraph StreamRunners["Stream Queue Runners (3 parallel)"]
        SR1[stream1 runner]
        SR2[stream2 runner]
        SR3[stream3 runner]
    end

    S1 --> SR1
    S2 --> SR2
    S3 --> SR3
```

## Status States

```mermaid
stateDiagram-v2
    [*] --> initializing: Created
    initializing --> updating: downloadNewMessages()
    updating --> working: Process queues
    working --> idle: Queues empty
    idle --> working: New items enqueued
    idle --> done: stop()
    working --> done: stop()
```

## Key Solicitation Flow

When a message can't be decrypted due to missing session keys:

```mermaid
sequenceDiagram
    participant A as Alice (needs keys)
    participant Stream as Stream
    participant B as Bob (has keys)

    Note over A: Can't decrypt message
    A->>A: storeMissingKey(streamId, sessionId)
    A->>A: enqueueKeySolicitation()

    A->>Stream: MemberPayload_KeySolicitation
    Note right of A: Contains deviceKey, fallbackKey, isNewDevice, sessionIds

    B->>B: enqueueKeySolicitation(from Alice)
    B->>B: isUserEntitledToKeyExchange()
    B->>B: exportGroupSessions()
    B->>B: encryptAndShareGroupSessions()

    B->>Stream: MemberPayload_KeyFulfillment
    B-->>A: Sessions via UserInbox

    A->>A: importSessionKeys()
    A->>A: retryDecryption()
```

## Key Fulfillment Flow

When responding to a key solicitation:

```mermaid
sequenceDiagram
    participant Extensions as DecryptionExtensions
    participant Crypto as GroupEncryptionCrypto
    participant Stream
    participant Inbox as UserInbox

    Extensions->>Extensions: dequeueKeySolicitation()
    Extensions->>Extensions: isValidEvent(solicitation)

    alt Invalid signature
        Extensions-->>Extensions: Skip
    else Valid
        Extensions->>Extensions: isUserEntitledToKeyExchange()

        alt Not entitled
            Extensions-->>Extensions: Skip
        else Entitled
            Extensions->>Crypto: exportGroupSessions(streamId, sessionIds)
            Crypto-->>Extensions: sessions[]

            Extensions->>Stream: MemberPayload_KeyFulfillment
            Extensions->>Inbox: GroupEncryptionSessions (encrypted)
        end
    end
```

## Encrypted Content Processing

```mermaid
flowchart TD
    Enqueue[enqueueNewEncryptedContent] --> Queue[Add to stream queue]
    Queue --> Tick[Process tick]

    Tick --> CheckSession{Have session?}
    CheckSession -->|Yes| Decrypt[decryptGroupEvent]
    CheckSession -->|No| MissingKey[Store as missing key]

    Decrypt --> Success{Success?}
    Success -->|Yes| Update[updateDecryptedContent]
    Success -->|No| Error[onDecryptionError]

    MissingKey --> Solicit[enqueueKeySolicitation]
    Error --> Solicit
```

## Processing Priority

Stream queues are processed in priority order:

```mermaid
flowchart LR
    subgraph Priority["Priority Levels"]
        P0["0: High priority streams"]
        P1["1: Recent streams (last 5)"]
        P2["2: Other streams"]
    end

    P0 --> Process
    P1 --> Process
    P2 --> Process
```

## Data Types

### EncryptedContentItem

```typescript
interface EncryptedContentItem {
    streamId: string
    eventId: string
    kind: string          // 'text', 'channelMessage', 'channelProperties', etc.
    encryptedData: EncryptedData
}
```

### KeySolicitationContent

```typescript
interface KeySolicitationContent {
    deviceKey: string     // Requestor's device public key
    fallbackKey: string   // Requestor's fallback key
    isNewDevice: boolean  // First-time key request
    sessionIds: string[]  // Sessions being requested
}
```

### KeySolicitationItem

```typescript
interface KeySolicitationItem {
    streamId: string
    fromUserId: string
    solicitation: KeySolicitationContent
    respondAfter: number  // ms since epoch (for rate limiting)
    sigBundle: EventSignatureBundle
    hashStr: string
    ephemeral?: boolean
}
```

## Ephemeral vs Persistent Solicitations

| Type | Storage | Use Case |
|------|---------|----------|
| **Persistent** | On-chain in stream | New device joining, long-term key requests |
| **Ephemeral** | Temporary, 30s timeout | Quick key exchange during active session |

```mermaid
flowchart TD
    Request[Key Request] --> Type{Type?}

    Type -->|Persistent| Persist[Store in stream]
    Type -->|Ephemeral| Temp[30s timeout]

    Persist --> Response[Wait for fulfillment]
    Temp --> Response
    Temp -->|Timeout| Fallback[Fall back to persistent]
```

## Entitlement Checking

Before sharing keys, the system validates entitlements:

```mermaid
sequenceDiagram
    participant Ext as DecryptionExtensions
    participant Delegate as EntitlementsDelegate
    participant Chain as Blockchain

    Ext->>Delegate: isUserEntitledToKeyExchange(streamId, userId)
    Delegate->>Chain: Check permissions

    alt Space/Channel stream
        Chain->>Chain: Check space membership
        Chain->>Chain: Check channel access
    else DM/GDM stream
        Chain->>Chain: Check if member
    end

    Chain-->>Delegate: entitled: boolean
    Delegate-->>Ext: entitled
```

## Rate Limiting

Key solicitations include `respondAfter` to prevent spam:

```mermaid
flowchart TD
    Receive[Receive solicitation] --> Check{respondAfter < now?}
    Check -->|Yes| Process[Process immediately]
    Check -->|No| Delay[Schedule for later]

    Delay --> Timer[Wait until respondAfter]
    Timer --> Process
```

## Decryption Failure Tracking

```typescript
// Tracks failed decryptions for retry
decryptionFailures: Record<
    string,                    // streamId
    Record<
        string,                // sessionId
        EncryptedContentItem[] // Failed items
    >
>
```

When a session key is received, all failed items for that session are retried.

## Queue Runner

Each queue has a dedicated runner:

```mermaid
classDiagram
    class QueueRunner {
        +kind: string
        +timeoutId: NodeJS.Timeout
        +inProgress: Promise~void~
        +streamId: string
        +run(promise, streamId?, tag?)
        +stop()
    }
```

Runners:
- Process one item at a time
- Auto-restart on completion
- Can be stopped gracefully

## Source Files

| File | Description |
|------|-------------|
| `src/decryptionExtensions.ts` | BaseDecryptionExtensions abstract class (~47KB) |
| `src/clientDecryptionExtensions.ts` | Client implementation |
| `src/encryptedContentTypes.ts` | Content type definitions |
