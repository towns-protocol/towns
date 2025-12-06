# Client Layer

The Client layer provides entry points for SDK consumers to interact with the Towns Protocol network.

## Entry Points

There are two main client types:

| Client | Use Case | File |
|--------|----------|------|
| `ClientV2` | Lightweight, extensible client | `src/client-v2.ts` |
| `Client` | Full-featured client with sync | `src/client.ts` |

## ClientV2 (Lightweight)

`ClientV2` is created via `createTownsClient()` and provides a minimal, extensible interface.

### Class Structure

```mermaid
classDiagram
    class ClientV2 {
        +userId: Address
        +signerContext: SignerContext
        +wallet: ethers.Wallet
        +rpc: StreamRpcClient
        +config: TownsConfig
        +keychain: CryptoStore
        +crypto: GroupEncryptionCrypto
        +defaultGroupEncryptionAlgorithm: GroupEncryptionAlgorithmId
        +getStream(streamId): Promise~StreamStateView~
        +getMiniblockInfo(streamId): Promise~MiniblockInfoResponse~
        +sendEvent(streamId, payload, tags?, ephemeral?): Promise
        +importGroupEncryptionSessions(payload): Promise~void~
        +unpackEnvelope(envelope): Promise~ParsedEvent~
        +appServiceClient(): Promise~AppRegistryRpcClient~
        +extend(fn): ClientV2
    }
```

### Initialization Sequence

```mermaid
sequenceDiagram
    participant App
    participant createTownsClient
    participant Config as TownsConfig
    participant Wallet as ethers.Wallet
    participant SignerContext
    participant RiverRegistry
    participant RPC as StreamRpcClient
    participant CryptoStore
    participant Crypto as GroupEncryptionCrypto

    App->>createTownsClient: params (privateKey | mnemonic | bearerToken)
    createTownsClient->>Config: townsEnv().makeTownsConfig(env)

    alt privateKey or mnemonic
        createTownsClient->>Wallet: new Wallet(key)
        createTownsClient->>Wallet: createRandom() [delegate]
        createTownsClient->>SignerContext: makeSignerContext(wallet, delegate)
    else bearerToken
        createTownsClient->>SignerContext: makeSignerContextFromBearerToken(token)
        createTownsClient->>Wallet: new Wallet(signerPrivateKey)
    end

    createTownsClient->>RiverRegistry: getOperationalNodeUrls()
    RiverRegistry-->>createTownsClient: urls[]
    createTownsClient->>RPC: makeStreamRpcClient(urls)

    createTownsClient->>CryptoStore: RiverDbManager.getCryptoDb(userId)
    createTownsClient->>CryptoStore: initialize()
    createTownsClient->>Crypto: new GroupEncryptionCrypto(client, store)
    createTownsClient->>Crypto: init(deviceOpts)

    createTownsClient-->>App: ClientV2 instance
```

### Extension Pattern

`ClientV2` uses a chainable `extend()` pattern for adding functionality:

```mermaid
flowchart LR
    Base[ClientV2 Base] --> Extend1[extend fn1]
    Extend1 --> Extended1[ClientV2 + fn1]
    Extended1 --> Extend2[extend fn2]
    Extend2 --> Extended2[ClientV2 + fn1 + fn2]
```

```typescript
const client = await createTownsClient({ privateKey, env: 'gamma' })

const extended = client.extend((base) => ({
    customMethod: async () => {
        return base.getStream(streamId)
    }
}))

// extended.customMethod() is now available
```

## Client (Full-Featured)

The `Client` class provides full stream synchronization, persistence, and reactive views.

### Class Structure

```mermaid
classDiagram
    class Client {
        +signerContext: SignerContext
        +rpcClient: StreamRpcClient
        +userId: string
        +streams: SyncedStreams
        +streamsView: StreamsView
        +cryptoBackend: GroupEncryptionCrypto
        +cryptoStore: CryptoStore
        +notifications: NotificationsClient

        +initializeUser(opts): Promise~void~
        +stop(): Promise~void~
        +stream(streamId): SyncedStream
        +createSpace(metadata): Promise
        +createChannel(spaceId, name, topic): Promise
        +joinSpace(spaceId): Promise
        +leaveSpace(spaceId): Promise
        +sendChannelMessage(streamId, message): Promise
        +sendChannelMessage_Text(streamId, text): Promise
        +sendDirectMessage(userId, message): Promise
        +createDM(userId): Promise
        +createGDM(userIds): Promise
        +scrollback(streamId): Promise
        +uploadMedia(spaceId, data): Promise
    }

    class SyncedStreams {
        +get(streamId): SyncedStream
        +set(streamId, stream): void
        +has(streamId): boolean
        +startSyncStreams(): void
        +stopSyncStreams(): void
    }

    class StreamsView {
        +timelinesView: TimelinesView
        +spaceStreams: Map
        +channelStreams: Map
        +my: UserViews
    }

    Client --> SyncedStreams
    Client --> StreamsView
```

### Constructor Dependencies

```mermaid
flowchart TB
    subgraph Required
        SC[SignerContext]
        RPC[StreamRpcClient]
        CS[CryptoStore]
        ED[EntitlementsDelegate]
    end

    subgraph Optional
        Opts[ClientOptions]
    end

    subgraph ClientOptions
        PSN[persistenceStoreName]
        HPSI[highPriorityStreamIds]
        UEO[unpackEnvelopeOpts]
        DGEA[defaultGroupEncryptionAlgorithm]
        NOT[notifications]
        SM[syncMode]
    end

    SC --> Client
    RPC --> Client
    CS --> Client
    ED --> Client
    Opts --> Client
    Opts --> ClientOptions
```

### Sync Modes

```mermaid
flowchart TD
    subgraph Full["SyncMode.Full"]
        F1[Load all joined streams]
        F2[Sync all channels]
        F3[Keep all streams updated]
    end

    subgraph Lite["SyncMode.Lite"]
        L1[Load high priority streams]
        L2[Load DM/GDM streams]
        L3[Load one channel at a time]
    end

    Full --> UseCase1[Desktop apps]
    Lite --> UseCase2[Mobile apps / Lower memory]
```

## Initialization Flow

```mermaid
sequenceDiagram
    participant App
    participant Client
    participant Crypto as GroupEncryptionCrypto
    participant RPC as StreamRpcClient
    participant Streams as SyncedStreams
    participant Extensions as DecryptionExtensions

    App->>Client: initializeUser(opts)
    Client->>Crypto: initCrypto(opts)
    Crypto-->>Client: ready

    Client->>RPC: createStream (userStream)
    Client->>RPC: createStream (userSettingsStream)
    Client->>RPC: createStream (userMetadataStream)
    Client->>RPC: createStream (userInboxStream)

    Client->>Client: uploadDeviceKeys()
    Client->>Streams: initUserJoinedStreams()

    alt !skipSync
        Client->>Streams: startSyncStreams()
        Client->>Extensions: start()
    end

    Client-->>App: initialized
```

## Key Methods

### Sending Events

All events go through `makeEventAndAddToStream()` which handles:
1. Getting the latest miniblock hash
2. Creating the event envelope
3. Signing with SignerContext
4. Retrying on transient errors
5. Adding to local stream state

### Retry Policy

```mermaid
flowchart TD
    Send[sendEvent] --> Try{Try operation}
    Try -->|Success| Done[Return result]
    Try -->|Error| Check{Error type?}

    Check -->|MINIBLOCK_TOO_NEW| Wait1[Wait 1s, max 5 retries]
    Check -->|BAD_PREV_MINIBLOCK_HASH| Extract[Extract expected hash]
    Check -->|PERMISSION_DENIED + unconfirmed tx| Wait2[Wait 200-1100ms, max 4 retries]
    Check -->|Other| Throw[Throw error]

    Wait1 --> Try
    Extract --> Try
    Wait2 --> Try
```

## Source Files

| File | Description |
|------|-------------|
| `src/client-v2.ts` | ClientV2 factory and lightweight client |
| `src/client.ts` | Full Client class (3,372 lines) |
| `src/signerContext.ts` | SignerContext interface and factories |
| `src/syncedStreams.ts` | SyncedStreams collection |
| `src/syncedStream.ts` | Individual synced stream |
