# RPC Layer

The RPC layer handles communication with River nodes using gRPC-Web over HTTP/2.

## StreamRpcClient

`StreamRpcClient` is the typed RPC client for communicating with River's StreamService.

### Class Structure

```mermaid
classDiagram
    class StreamRpcClient {
        +url: string
        +opts: StreamRpcClientOptions
        +getStream(req): Promise
        +getStreamEx(req): Promise
        +createStream(req): Promise
        +addEvent(req): Promise
        +getLastMiniblockHash(req): Promise
        +getMiniblocks(req): Promise
        +syncStreams(req): AsyncIterable
        +info(req): Promise
    }

    class StreamRpcClientOptions {
        +retryParams: RetryParams
    }

    class RetryParams {
        +maxAttempts: number
        +initialRetryDelay: number
        +maxRetryDelay: number
        +defaultTimeoutMs: number
        +refreshNodeUrl?: () => Promise~string~
    }

    StreamRpcClient --> StreamRpcClientOptions
    StreamRpcClientOptions --> RetryParams
```

## Client Creation

```mermaid
sequenceDiagram
    participant App
    participant makeStreamRpcClient
    participant RiverRegistry
    participant Transport as HTTP/2 Transport

    App->>RiverRegistry: getOperationalNodeUrls()
    RiverRegistry-->>App: "url1,url2,url3"

    App->>makeStreamRpcClient: (urls, refreshFn, opts)
    makeStreamRpcClient->>makeStreamRpcClient: randomUrlSelector(urls)
    makeStreamRpcClient->>Transport: createHttp2ConnectTransport(options)

    Note over makeStreamRpcClient: Attach interceptors
    makeStreamRpcClient->>makeStreamRpcClient: loggingInterceptor
    makeStreamRpcClient->>makeStreamRpcClient: retryInterceptor

    makeStreamRpcClient-->>App: StreamRpcClient
```

## Interceptor Chain

Requests pass through interceptors before reaching the network:

```mermaid
flowchart LR
    Request --> Custom[Custom Interceptors]
    Custom --> Logging[loggingInterceptor]
    Logging --> Retry[retryInterceptor]
    Retry --> Network[HTTP/2 Transport]
    Network --> River[River Node]
```

### loggingInterceptor

Adds request tracking and metrics:

```mermaid
flowchart TB
    subgraph loggingInterceptor
        GenId[Generate request ID]
        SetHeader[Set x-river-request-id]
        LogRequest[Log request details]
        UpdateHistogram[Update call histogram]
    end

    Request --> GenId
    GenId --> SetHeader
    SetHeader --> LogRequest
    LogRequest --> Next[next interceptor]
    Next --> Response
    Response --> UpdateHistogram
```

### retryInterceptor

Handles transient failures with automatic retry:

```mermaid
flowchart TD
    Request --> Attempt{Make request}

    Attempt -->|Success| Return[Return response]
    Attempt -->|Error| CheckRetry{Should retry?}

    CheckRetry -->|No: original aborted| Throw[Throw error]
    CheckRetry -->|No: max attempts| Throw
    CheckRetry -->|No: non-retryable| Throw

    CheckRetry -->|Yes| CheckNode{Node still operational?}
    CheckNode -->|No| Throw
    CheckNode -->|Yes| Delay[Wait retryDelay]
    Delay --> Attempt
```

### Default Retry Parameters

```typescript
const DEFAULT_RETRY_PARAMS = {
    maxAttempts: 3,
    initialRetryDelay: 2000,   // 2 seconds
    maxRetryDelay: 6000,       // 6 seconds
    defaultTimeoutMs: 90000,   // 90 seconds
}
```

### Retry Delay Calculation

```mermaid
flowchart LR
    Attempt --> Calc[delay = initial * 2^attempt]
    Calc --> Jitter[Add random jitter]
    Jitter --> Cap[Cap at maxRetryDelay]
```

## Node Selection

When multiple nodes are available, the client selects randomly:

```mermaid
flowchart TB
    URLs["urls: url1,url2,url3"]
    URLs --> Split[Split by comma]
    Split --> Random[Random selection]
    Random --> Connect[Connect to selected node]

    subgraph Failover
        Connect -->|Connection fails| Refresh[refreshNodeUrl]
        Refresh --> Check{Node still operational?}
        Check -->|No| Error[Throw error]
        Check -->|Yes| Retry[Retry request]
    end
```

## Request/Response Flow

### Unary Requests (getStream, addEvent, etc.)

```mermaid
sequenceDiagram
    participant Client
    participant Interceptors
    participant Transport
    participant River as River Node

    Client->>Interceptors: request
    Interceptors->>Interceptors: Add request ID
    Interceptors->>Transport: HTTP/2 POST
    Transport->>River: Protobuf request

    River-->>Transport: Protobuf response
    Transport-->>Interceptors: response
    Interceptors->>Interceptors: Log metrics
    Interceptors-->>Client: typed response
```

### Streaming Requests (syncStreams)

```mermaid
sequenceDiagram
    participant Client
    participant Transport
    participant River as River Node

    Client->>Transport: syncStreams(streamIds)
    Transport->>River: Open stream

    loop For each update
        River-->>Transport: StreamUpdate
        Transport-->>Client: yield update
    end

    River-->>Transport: Stream complete
    Transport-->>Client: done
```

## Key RPC Methods

| Method | Purpose | Response |
|--------|---------|----------|
| `getStream` | Fetch stream state | Snapshot + recent miniblocks |
| `getStreamEx` | Fetch with creation cookie | Same + creation info |
| `createStream` | Create new stream | Creation confirmation |
| `addEvent` | Add event to stream | Event confirmation |
| `getLastMiniblockHash` | Get latest miniblock | Hash + number |
| `getMiniblocks` | Fetch miniblock range | Miniblocks + snapshots |
| `syncStreams` | Real-time sync | Stream of updates |
| `info` | Node information | Node metadata |

## getMiniblocks Pagination

Large miniblock ranges are fetched in chunks:

```mermaid
flowchart TD
    Start[getMiniblocks from=0, to=100]
    Start --> Fetch1[Fetch batch 1]
    Fetch1 --> Check1{More remaining?}
    Check1 -->|Yes| Update1[nextFromInclusive = last + 1]
    Update1 --> Fetch2[Fetch batch 2]
    Fetch2 --> Check2{More remaining?}
    Check2 -->|Yes| Continue[...]
    Check2 -->|No| Done[Return all miniblocks]
    Check1 -->|No| Done
```

## Error Handling

### Retryable Errors

| Error | Behavior |
|-------|----------|
| Connection timeout | Retry with delay |
| Network failure | Retry with delay |
| Node temporarily unavailable | Retry with delay |

### Non-Retryable Errors

| Error | Behavior |
|-------|----------|
| `PERMISSION_DENIED` | Throw immediately |
| `NOT_FOUND` | Throw immediately |
| Request aborted | Throw immediately |
| Node no longer operational | Throw immediately |

## Configuration

### Transport Options

```typescript
const options: ConnectTransportOptions = {
    baseUrl: selectedUrl,
    interceptors: [...],
    defaultTimeoutMs: undefined,  // Handled by retryInterceptor
    useBinaryFormat: true,        // Protobuf binary
}
```

### Debug Mode

Set `RIVER_DEBUG_TRANSPORT=true` to use JSON format for debugging:

```mermaid
flowchart TD
    Check{RIVER_DEBUG_TRANSPORT?}
    Check -->|true| JSON[Use JSON format]
    Check -->|false| Binary[Use binary Protobuf]
```

## Source Files

| File | Description |
|------|-------------|
| `src/makeStreamRpcClient.ts` | Client factory and getMiniblocks helper |
| `src/rpcInterceptors.ts` | All interceptor implementations |
| `src/rpcCommon.ts` | Common RPC types |
| `@towns-protocol/proto` | StreamService protobuf definition |
