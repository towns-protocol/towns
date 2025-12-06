# Layer Integration

This document describes how the SDK layers communicate and shows complete end-to-end data flows.

## Layer Dependencies

```mermaid
flowchart TB
    subgraph Application
        App[Your Application]
    end

    subgraph SDK["SDK Layers"]
        Client[Client Layer]
        Auth[Authentication]
        RPC[RPC Layer]
        Encryption[Encryption]
        CryptoStore[Crypto Store]
        Streams[Stream Layer]
        Timeline[Timeline/Views]
        Persistence[Persistence]
        Decryption[Decryption Extensions]
    end

    App --> Client
    Client --> Auth
    Client --> RPC
    Client --> Encryption
    Client --> Streams
    Client --> Decryption

    Auth --> RPC

    Encryption --> CryptoStore
    Decryption --> Encryption

    Streams --> Timeline
    Streams --> Persistence

    Decryption --> Streams
```

## Complete Message Send Flow

Sending an encrypted message from user input to server confirmation:

```mermaid
sequenceDiagram
    participant App
    participant Client
    participant Crypto as GroupEncryptionCrypto
    participant RPC as StreamRpcClient
    participant River as River Node
    participant Stream
    participant Timeline as TimelinesView
    participant Store as PersistenceStore

    App->>Client: sendChannelMessage_Text(streamId, text)

    Note over Client: 1. Create local event
    Client->>Stream: appendLocalEvent(message, SENDING)
    Stream->>Timeline: Update with local event

    Note over Client: 2. Encrypt content
    Client->>Crypto: encryptGroupEvent(streamId, payload, algorithm)
    Crypto->>Crypto: ensureOutboundSession(streamId)
    Crypto-->>Client: EncryptedData

    Note over Client: 3. Create envelope
    Client->>Client: makeEvent(signerContext, payload, miniblockHash)

    Note over Client: 4. Send to network
    Client->>RPC: addEvent(streamId, envelope)
    RPC->>River: HTTP/2 POST
    River-->>RPC: Success
    RPC-->>Client: eventId, miniblockHash

    Note over Client: 5. Update local state
    Client->>Stream: updateLocalEvent(localId, eventId, SENT)
    Stream->>Timeline: Update event status

    Note over River: 6. Event included in miniblock
    River-->>RPC: Sync update (miniblockHeader)
    RPC-->>Client: Sync response

    Client->>Stream: appendEvents(miniblockHeader)
    Stream->>Stream: Confirm minipool events
    Stream->>Timeline: Mark event confirmed
    Stream->>Store: saveMiniblock()
    Stream->>Store: saveSyncedStream()
```

## Complete Message Receive Flow

Receiving and decrypting a message from another user:

```mermaid
sequenceDiagram
    participant River as River Node
    participant RPC as StreamRpcClient
    participant Client
    participant Stream
    participant Extensions as DecryptionExtensions
    participant Crypto as GroupEncryptionCrypto
    participant Store as PersistenceStore
    participant Timeline as TimelinesView
    participant App

    Note over River: New message in stream
    River-->>RPC: syncStreams update

    RPC-->>Client: Sync response (events)
    Client->>Stream: appendEvents(events)
    Stream->>Timeline: Add encrypted event

    Note over Stream: Event has encrypted content
    Stream->>Extensions: enqueueNewEncryptedContent(eventId, data)

    Note over Extensions: Process decryption queue
    Extensions->>Extensions: checkStartTicking()
    Extensions->>Crypto: decryptGroupEvent(streamId, data)

    alt Session exists
        Crypto->>Crypto: Decrypt with session
        Crypto-->>Extensions: cleartext
        Extensions->>Stream: updateDecryptedContent(eventId, content)
        Stream->>Store: saveCleartext(eventId, cleartext)
        Stream->>Timeline: Update with decrypted content
        Timeline-->>App: Observable update
    else Session missing
        Crypto-->>Extensions: DecryptionError
        Extensions->>Extensions: storeMissingKey(sessionId)
        Extensions->>Extensions: enqueueKeySolicitation()
        Note over Extensions: Key exchange starts
    end
```

## Complete Key Exchange Flow

Full key solicitation and fulfillment between two users:

```mermaid
sequenceDiagram
    participant Alice as Alice (Requestor)
    participant AliceExt as Alice's Extensions
    participant AliceCrypto as Alice's Crypto
    participant RPC
    participant River as River Node
    participant BobExt as Bob's Extensions
    participant BobCrypto as Bob's Crypto
    participant Bob as Bob (Provider)

    Note over Alice: Can't decrypt message from Bob

    AliceExt->>AliceExt: storeMissingKey(streamId, sessionId)
    AliceExt->>AliceExt: processMissingKeys()

    Note over AliceExt: Send solicitation to stream
    AliceExt->>RPC: addEvent(MemberPayload_KeySolicitation)
    RPC->>River: POST
    River-->>RPC: OK

    Note over River: Bob receives sync update
    River-->>BobExt: Sync (keySolicitation event)

    BobExt->>BobExt: enqueueKeySolicitation(Alice's request)
    BobExt->>BobExt: isValidEvent(sigBundle) ✓
    BobExt->>BobExt: isUserEntitledToKeyExchange() ✓

    Note over BobExt: Export and encrypt sessions
    BobExt->>BobCrypto: exportGroupSessions(streamId, sessionIds)
    BobCrypto-->>BobExt: sessions[]

    BobExt->>BobCrypto: encryptWithDeviceKeys(sessions, [Alice])
    BobCrypto-->>BobExt: encrypted sessions

    Note over BobExt: Send fulfillment + encrypted keys
    BobExt->>RPC: addEvent(MemberPayload_KeyFulfillment)
    BobExt->>RPC: addEvent(UserInbox, GroupEncryptionSessions)
    RPC->>River: POST both
    River-->>RPC: OK

    Note over River: Alice receives via UserInbox
    River-->>AliceExt: Sync (inbox event)

    AliceExt->>AliceExt: enqueueNewGroupSessions()
    AliceExt->>AliceCrypto: decryptWithDeviceKey(ciphertext)
    AliceCrypto-->>AliceExt: session keys
    AliceExt->>AliceCrypto: importSessionKeys(streamId, sessions)

    Note over AliceExt: Retry failed decryptions
    AliceExt->>AliceExt: retryDecryptionFailures(sessionId)
    AliceExt->>AliceCrypto: decryptGroupEvent()
    AliceCrypto-->>AliceExt: cleartext ✓
```

## Initialization Flow

Complete client startup sequence:

```mermaid
sequenceDiagram
    participant App
    participant Factory as createTownsClient
    participant Config
    participant Wallet
    participant Registry as RiverRegistry
    participant CryptoStore
    participant Crypto as GroupEncryptionCrypto
    participant Client
    participant RPC
    participant Streams as SyncedStreams
    participant Extensions as DecryptionExtensions

    App->>Factory: createTownsClient(params)

    Note over Factory: 1. Configuration
    Factory->>Config: townsEnv().makeTownsConfig(env)
    Config-->>Factory: TownsConfig

    Note over Factory: 2. Authentication
    Factory->>Wallet: Create from key/mnemonic/bearer
    Factory->>Wallet: Create delegate wallet
    Factory->>Factory: makeSignerContext()

    Note over Factory: 3. Network setup
    Factory->>Registry: getOperationalNodeUrls()
    Registry-->>Factory: [url1, url2, ...]
    Factory->>RPC: makeStreamRpcClient(urls)

    Note over Factory: 4. Encryption setup
    Factory->>CryptoStore: initialize()
    Factory->>Crypto: new GroupEncryptionCrypto()
    Factory->>Crypto: init(deviceOpts)

    Factory-->>App: ClientV2

    Note over App: For full client (optional)
    App->>Client: initializeUser()

    Note over Client: 5. User streams
    Client->>RPC: createStream (user, settings, metadata, inbox)
    Client->>Client: uploadDeviceKeys()

    Note over Client: 6. Start sync
    Client->>Streams: initUserJoinedStreams()
    Client->>Streams: startSyncStreams()
    Client->>Extensions: start()

    Note over Extensions: 7. Download missed messages
    Extensions->>Extensions: downloadNewMessages()
    Extensions->>Extensions: Start processing queues
```

## Data Flow Through Layers

### Outbound (App → Network)

```mermaid
flowchart LR
    subgraph App
        UI[User Action]
    end

    subgraph Client
        Method[Client Method]
        Sign[Sign Event]
    end

    subgraph Encryption
        Encrypt[Encrypt Payload]
    end

    subgraph Network
        RPC[RPC Client]
        River[River Node]
    end

    UI --> Method
    Method --> Encrypt
    Encrypt --> Sign
    Sign --> RPC
    RPC --> River
```

### Inbound (Network → App)

```mermaid
flowchart RL
    subgraph Network
        River[River Node]
        RPC[RPC Client]
    end

    subgraph Streams
        Sync[Sync Handler]
        Stream[Stream]
    end

    subgraph Decryption
        Extensions[Decrypt Extensions]
        Crypto[Decrypt]
    end

    subgraph Views
        Timeline[TimelinesView]
        Observable[Observable]
    end

    subgraph App
        UI[UI Update]
    end

    River --> RPC
    RPC --> Sync
    Sync --> Stream
    Stream --> Extensions
    Extensions --> Crypto
    Crypto --> Stream
    Stream --> Timeline
    Timeline --> Observable
    Observable --> UI
```

## Cross-Layer Event Flow

How events propagate through the system:

```mermaid
flowchart TB
    subgraph "Event Sources"
        Network[Network Sync]
        Local[Local Action]
    end

    subgraph "Event Processing"
        Stream[Stream.appendEvents]
        SSV[StreamStateView]
    end

    subgraph "Side Effects"
        Decrypt[DecryptionExtensions]
        Persist[PersistenceStore]
        Emit[Event Emitter]
    end

    subgraph "State Updates"
        Timeline[TimelinesView]
        Views[StreamsView]
    end

    subgraph "Consumers"
        Observers[Observable Subscribers]
        Handlers[Event Handlers]
    end

    Network --> Stream
    Local --> Stream

    Stream --> SSV
    SSV --> Decrypt
    SSV --> Persist
    SSV --> Emit
    SSV --> Timeline

    Timeline --> Views
    Views --> Observers
    Emit --> Handlers
```

## Layer Communication Patterns

| From | To | Method | Data |
|------|-----|--------|------|
| Client | RPC | Method call | Protobuf request |
| RPC | Client | Promise/callback | Protobuf response |
| Client | Crypto | Method call | Payload + streamId |
| Crypto | CryptoStore | Method call | Session data |
| Client | Stream | Method call | Events |
| Stream | Timeline | Observable update | TimelineEvent |
| Timeline | App | Subscribe callback | Model data |
| Extensions | Crypto | Method call | Encrypted data |
| Extensions | Stream | Method call | Decrypted content |
| Stream | Persistence | Async save | Miniblocks, cleartexts |

## Error Propagation

```mermaid
flowchart TD
    Error[Error Occurs] --> Layer{Which layer?}

    Layer -->|RPC| RpcError[Retry Interceptor]
    Layer -->|Encryption| CryptoError[Missing Key Flow]
    Layer -->|Stream| StreamError[Event Emitter]

    RpcError -->|Retry exhausted| Throw[Throw to Client]
    CryptoError --> Solicitation[Key Solicitation]
    StreamError --> Emit[Emit error event]

    Throw --> App[App Error Handler]
    Emit --> App
```

## Summary

The SDK's layered architecture enables:

1. **Separation of concerns** - Each layer handles specific functionality
2. **Testability** - Layers can be tested in isolation
3. **Flexibility** - Layers can be replaced or extended
4. **Offline capability** - Persistence and crypto stores enable offline operation
5. **Reactive UI** - Observable pattern enables efficient UI updates
6. **End-to-end encryption** - Seamless key exchange and message encryption
