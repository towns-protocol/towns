# Interface: ISyncedStream

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:62](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L62)

## Properties

### syncCookie?

```ts
optional syncCookie: SyncCookie;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L63)

## Methods

### appendEvents()

```ts
appendEvents(
   events, 
   nextSyncCookie, 
   snapshot, 
cleartexts): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:66](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L66)

#### Parameters

##### events

[`ParsedEvent`](ParsedEvent.md)[]

##### nextSyncCookie

`SyncCookie`

##### snapshot

`undefined` | [`ParsedSnapshot`](ParsedSnapshot.md)

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Returns

`Promise`\<`void`\>

***

### initializeFromResponse()

```ts
initializeFromResponse(response): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L65)

#### Parameters

##### response

[`ParsedStreamResponse`](ParsedStreamResponse.md)

#### Returns

`Promise`\<`void`\>

***

### resetUpToDate()

```ts
resetUpToDate(): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:72](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L72)

#### Returns

`void`

***

### stop()

```ts
stop(): void;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:64](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L64)

#### Returns

`void`
