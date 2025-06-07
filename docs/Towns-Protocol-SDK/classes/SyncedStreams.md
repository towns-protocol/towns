# Class: SyncedStreams

Defined in: [packages/sdk/src/syncedStreams.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L12)

## Constructors

### Constructor

```ts
new SyncedStreams(
   userId, 
   rpcClient, 
   clientEmitter, 
   unpackEnvelopeOpts, 
   logId, 
   streamOpts?): SyncedStreams;
```

Defined in: [packages/sdk/src/syncedStreams.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L27)

#### Parameters

##### userId

`string`

##### rpcClient

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)

##### clientEmitter

`TypedEventEmitter`\<[`SyncedStreamEvents`](../type-aliases/SyncedStreamEvents.md)\>

##### unpackEnvelopeOpts

`undefined` | [`UnpackEnvelopeOpts`](../interfaces/UnpackEnvelopeOpts.md)

##### logId

`string`

##### streamOpts?

###### useModifySync?

`boolean`

#### Returns

`SyncedStreams`

## Accessors

### pingInfo

#### Get Signature

```ts
get pingInfo(): undefined | PingInfo;
```

Defined in: [packages/sdk/src/syncedStreams.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L46)

##### Returns

`undefined` \| [`PingInfo`](../interfaces/PingInfo.md)

***

### syncState

#### Get Signature

```ts
get syncState(): SyncState;
```

Defined in: [packages/sdk/src/syncedStreams.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L42)

##### Returns

[`SyncState`](../enumerations/SyncState.md)

## Methods

### addStreamToSync()

```ts
addStreamToSync(streamId, syncCookie): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:124](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L124)

#### Parameters

##### streamId

`string`

##### syncCookie

`SyncCookie`

#### Returns

`void`

***

### delete()

```ts
delete(inStreamId): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:74](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L74)

#### Parameters

##### inStreamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`void`

***

### get()

```ts
get(streamId): undefined | SyncedStream;
```

Defined in: [packages/sdk/src/syncedStreams.ts:58](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L58)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`undefined` \| [`SyncedStream`](SyncedStream.md)

***

### getStreamIds()

```ts
getStreamIds(): string[];
```

Defined in: [packages/sdk/src/syncedStreams.ts:92](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L92)

#### Returns

`string`[]

***

### getStreams()

```ts
getStreams(): SyncedStream[];
```

Defined in: [packages/sdk/src/syncedStreams.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L88)

#### Returns

[`SyncedStream`](SyncedStream.md)[]

***

### getSyncId()

```ts
getSyncId(): undefined | string;
```

Defined in: [packages/sdk/src/syncedStreams.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L84)

#### Returns

`undefined` \| `string`

***

### has()

```ts
has(streamId): boolean;
```

Defined in: [packages/sdk/src/syncedStreams.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L54)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`boolean`

***

### onNetworkStatusChanged()

```ts
onNetworkStatusChanged(isOnline): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:96](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L96)

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

Defined in: [packages/sdk/src/syncedStreams.ts:139](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L139)

#### Parameters

##### inStreamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

***

### set()

```ts
set(streamId, stream): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:62](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L62)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### stream

[`SyncedStream`](SyncedStream.md)

#### Returns

`void`

***

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:69](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L69)

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

***

### size()

```ts
size(): number;
```

Defined in: [packages/sdk/src/syncedStreams.ts:80](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L80)

#### Returns

`number`

***

### startSyncStreams()

```ts
startSyncStreams(): void;
```

Defined in: [packages/sdk/src/syncedStreams.ts:101](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L101)

#### Returns

`void`

***

### stats()

```ts
stats(): 
  | undefined
  | {
  queuedResponses: number;
  streams: number;
  syncId: undefined | string;
  syncState: SyncState;
};
```

Defined in: [packages/sdk/src/syncedStreams.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L50)

#### Returns

  \| `undefined`
  \| \{
  `queuedResponses`: `number`;
  `streams`: `number`;
  `syncId`: `undefined` \| `string`;
  `syncState`: [`SyncState`](../enumerations/SyncState.md);
\}

***

### stopSync()

```ts
stopSync(): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreams.ts:118](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreams.ts#L118)

#### Returns

`Promise`\<`void`\>
