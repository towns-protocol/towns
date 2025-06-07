# Class: SyncedStreamsLoop

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:92](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L92)

## Constructors

### Constructor

```ts
new SyncedStreamsLoop(
   clientEmitter, 
   rpcClient, 
   streams, 
   logNamespace, 
   unpackEnvelopeOpts, 
   highPriorityIds, 
   streamOpts): SyncedStreamsLoop;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:144](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L144)

#### Parameters

##### clientEmitter

`TypedEventEmitter`\<[`SyncedStreamEvents`](../type-aliases/SyncedStreamEvents.md)\>

##### rpcClient

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)

##### streams

`object`[]

##### logNamespace

`string`

##### unpackEnvelopeOpts

`undefined` | [`UnpackEnvelopeOpts`](../interfaces/UnpackEnvelopeOpts.md)

##### highPriorityIds

`Set`\<`string`\>

##### streamOpts

`undefined` | \{
`useModifySync?`: `boolean`;
\}

#### Returns

`SyncedStreamsLoop`

## Properties

### pingInfo

```ts
pingInfo: PingInfo;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:139](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L139)

***

### unpackEnvelopeOpts

```ts
readonly unpackEnvelopeOpts: undefined | UnpackEnvelopeOpts;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:149](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L149)

## Accessors

### syncState

#### Get Signature

```ts
get syncState(): SyncState;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:166](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L166)

##### Returns

[`SyncState`](../enumerations/SyncState.md)

## Methods

### addStreamToSync()

```ts
addStreamToSync(
   streamId, 
   syncCookie, 
   stream): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:232](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L232)

#### Parameters

##### streamId

`string`

##### syncCookie

`SyncCookie`

##### stream

[`ISyncedStream`](../interfaces/ISyncedStream.md)

#### Returns

`void`

***

### getSyncId()

```ts
getSyncId(): undefined | string;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:179](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L179)

#### Returns

`undefined` \| `string`

***

### onNetworkStatusChanged()

```ts
onNetworkStatusChanged(isOnline): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:293](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L293)

#### Parameters

##### isOnline

`boolean`

#### Returns

`void`

***

### removeStreamFromSync()

```ts
removeStreamFromSync(inStreamId): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:251](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L251)

#### Parameters

##### inStreamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

***

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:289](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L289)

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

***

### start()

```ts
start(): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:183](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L183)

#### Returns

`void`

***

### stats()

```ts
stats(): object;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:170](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L170)

#### Returns

`object`

##### queuedResponses

```ts
queuedResponses: number;
```

##### streams

```ts
streams: number;
```

##### syncId

```ts
syncId: undefined | string;
```

##### syncState

```ts
syncState: SyncState;
```

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:191](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L191)

#### Returns

`Promise`\<`void`\>
