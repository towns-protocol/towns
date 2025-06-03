# Class: SyncedStream

Defined in: [packages/sdk/src/syncedStream.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L17)

## theme_extends

- [`Stream`](Stream.md)

## Implements

- [`ISyncedStream`](../interfaces/ISyncedStream.md)

## Constructors

### Constructor

```ts
new SyncedStream(
   userId, 
   streamId, 
   clientEmitter, 
   logEmitFromStream, 
   persistenceStore): SyncedStream;
```

Defined in: [packages/sdk/src/syncedStream.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L21)

#### Parameters

##### userId

`string`

##### streamId

`string`

##### clientEmitter

`TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

##### logEmitFromStream

[`DLogger`](../../Towns-Protocol-Dlog/interfaces/DLogger.md)

##### persistenceStore

[`IPersistenceStore`](../interfaces/IPersistenceStore.md)

#### Returns

`SyncedStream`

#### Overrides

[`Stream`](Stream.md).[`constructor`](Stream.md#constructor)

## Properties

### \_view

```ts
_view: StreamStateView;
```

Defined in: [packages/sdk/src/stream.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L21)

#### Inherited from

[`Stream`](Stream.md).[`_view`](Stream.md#_view)

***

### clientEmitter

```ts
readonly clientEmitter: TypedEventEmitter<StreamEvents>;
```

Defined in: [packages/sdk/src/stream.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L18)

#### Inherited from

[`Stream`](Stream.md).[`clientEmitter`](Stream.md#clientemitter)

***

### isUpToDate

```ts
isUpToDate: boolean = false;
```

Defined in: [packages/sdk/src/syncedStream.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L19)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/syncedStream.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L18)

***

### logEmitFromStream

```ts
readonly logEmitFromStream: DLogger;
```

Defined in: [packages/sdk/src/stream.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L19)

#### Inherited from

[`Stream`](Stream.md).[`logEmitFromStream`](Stream.md#logemitfromstream)

***

### persistenceStore

```ts
readonly persistenceStore: IPersistenceStore;
```

Defined in: [packages/sdk/src/syncedStream.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L20)

***

### userId

```ts
readonly userId: string;
```

Defined in: [packages/sdk/src/stream.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L20)

#### Inherited from

[`Stream`](Stream.md).[`userId`](Stream.md#userid)

## Accessors

### streamId

#### Get Signature

```ts
get streamId(): string;
```

Defined in: [packages/sdk/src/stream.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L40)

##### Returns

`string`

#### Inherited from

[`Stream`](Stream.md).[`streamId`](Stream.md#streamid)

***

### syncCookie

#### Get Signature

```ts
get syncCookie(): undefined | SyncCookie;
```

Defined in: [packages/sdk/src/stream.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L44)

##### Returns

`undefined` \| `SyncCookie`

#### Implementation of

[`ISyncedStream`](../interfaces/ISyncedStream.md).[`syncCookie`](../interfaces/ISyncedStream.md#synccookie)

#### Inherited from

[`Stream`](Stream.md).[`syncCookie`](Stream.md#synccookie)

***

### view

#### Get Signature

```ts
get view(): StreamStateView;
```

Defined in: [packages/sdk/src/stream.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L22)

##### Returns

[`StreamStateView`](StreamStateView.md)

#### Inherited from

[`Stream`](Stream.md).[`view`](Stream.md#view)

## Methods

### addListener()

```ts
addListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:22

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`addListener`](Stream.md#addlistener)

***

### appendEvents()

```ts
appendEvents(
   events, 
   nextSyncCookie, 
   snapshot, 
cleartexts): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStream.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L109)

#### Parameters

##### events

[`ParsedEvent`](../interfaces/ParsedEvent.md)[]

##### nextSyncCookie

`SyncCookie`

##### snapshot

`undefined` | [`ParsedSnapshot`](../interfaces/ParsedSnapshot.md)

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ISyncedStream`](../interfaces/ISyncedStream.md).[`appendEvents`](../interfaces/ISyncedStream.md#appendevents)

#### Overrides

[`Stream`](Stream.md).[`appendEvents`](Stream.md#appendevents)

***

### appendLocalEvent()

```ts
appendLocalEvent(channelMessage, status): string;
```

Defined in: [packages/sdk/src/stream.ts:101](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L101)

#### Parameters

##### channelMessage

`ChannelMessage`

##### status

[`LocalEventStatus`](../type-aliases/LocalEventStatus.md)

#### Returns

`string`

#### Inherited from

[`Stream`](Stream.md).[`appendLocalEvent`](Stream.md#appendlocalevent)

***

### emit()

```ts
emit<E>(event, ...args): boolean;
```

Defined in: [packages/sdk/src/stream.ts:117](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L117)

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### args

...`Parameters`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]\>

#### Returns

`boolean`

#### Inherited from

[`Stream`](Stream.md).[`emit`](Stream.md#emit)

***

### eventNames()

```ts
eventNames(): (string | symbol)[];
```

Defined in: node\_modules/typed-emitter/index.d.ts:34

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

[`Stream`](Stream.md).[`eventNames`](Stream.md#eventnames)

***

### getMaxListeners()

```ts
getMaxListeners(): number;
```

Defined in: node\_modules/typed-emitter/index.d.ts:39

#### Returns

`number`

#### Inherited from

[`Stream`](Stream.md).[`getMaxListeners`](Stream.md#getmaxlisteners)

***

### initialize()

```ts
initialize(
   nextSyncCookie, 
   events, 
   snapshot, 
   miniblocks, 
   prependedMiniblocks, 
   prevSnapshotMiniblockNum, 
cleartexts): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStream.ts:59](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L59)

NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
on the new stream event and still access this object through Client.streams.

#### Parameters

##### nextSyncCookie

`SyncCookie`

##### events

[`ParsedEvent`](../interfaces/ParsedEvent.md)[]

##### snapshot

`Snapshot`

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### prependedMiniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### prevSnapshotMiniblockNum

`bigint`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Returns

`Promise`\<`void`\>

#### Overrides

[`Stream`](Stream.md).[`initialize`](Stream.md#initialize)

***

### initializeFromPersistence()

```ts
initializeFromPersistence(persistedData?): Promise<boolean>;
```

Defined in: [packages/sdk/src/syncedStream.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L33)

#### Parameters

##### persistedData?

[`LoadedStream`](../interfaces/LoadedStream.md)

#### Returns

`Promise`\<`boolean`\>

***

### initializeFromResponse()

```ts
initializeFromResponse(response): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStream.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L94)

#### Parameters

##### response

[`ParsedStreamResponse`](../interfaces/ParsedStreamResponse.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ISyncedStream`](../interfaces/ISyncedStream.md).[`initializeFromResponse`](../interfaces/ISyncedStream.md#initializefromresponse)

***

### listenerCount()

```ts
listenerCount<E>(event): number;
```

Defined in: node\_modules/typed-emitter/index.d.ts:37

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

#### Returns

`number`

#### Inherited from

[`Stream`](Stream.md).[`listenerCount`](Stream.md#listenercount)

***

### listeners()

```ts
listeners<E>(event): StreamEvents[E][];
```

Defined in: node\_modules/typed-emitter/index.d.ts:36

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

#### Returns

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\][]

#### Inherited from

[`Stream`](Stream.md).[`listeners`](Stream.md#listeners)

***

### off()

```ts
off<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:28

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`off`](Stream.md#off)

***

### on()

```ts
on<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:23

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`on`](Stream.md#on)

***

### once()

```ts
once<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:24

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`once`](Stream.md#once)

***

### prependEvents()

```ts
prependEvents(
   miniblocks, 
   cleartexts, 
   terminus): void;
```

Defined in: [packages/sdk/src/stream.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L93)

#### Parameters

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### terminus

`boolean`

#### Returns

`void`

#### Inherited from

[`Stream`](Stream.md).[`prependEvents`](Stream.md#prependevents)

***

### prependListener()

```ts
prependListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:25

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`prependListener`](Stream.md#prependlistener)

***

### prependOnceListener()

```ts
prependOnceListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:26

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`prependOnceListener`](Stream.md#prependoncelistener)

***

### rawListeners()

```ts
rawListeners<E>(event): StreamEvents[E][];
```

Defined in: node\_modules/typed-emitter/index.d.ts:35

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

#### Returns

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\][]

#### Inherited from

[`Stream`](Stream.md).[`rawListeners`](Stream.md#rawlisteners)

***

### removeAllListeners()

```ts
removeAllListeners<E>(event?): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:29

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event?

`E`

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`removeAllListeners`](Stream.md#removealllisteners)

***

### removeListener()

```ts
removeListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:30

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### listener

[`StreamEvents`](../type-aliases/StreamEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`removeListener`](Stream.md#removelistener)

***

### resetUpToDate()

```ts
resetUpToDate(): void;
```

Defined in: [packages/sdk/src/syncedStream.ts:203](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStream.ts#L203)

#### Returns

`void`

#### Implementation of

[`ISyncedStream`](../interfaces/ISyncedStream.md).[`resetUpToDate`](../interfaces/ISyncedStream.md#resetuptodate)

***

### setMaxListeners()

```ts
setMaxListeners(maxListeners): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:40

#### Parameters

##### maxListeners

`number`

#### Returns

`this`

#### Inherited from

[`Stream`](Stream.md).[`setMaxListeners`](Stream.md#setmaxlisteners)

***

### stop()

```ts
stop(): void;
```

Defined in: [packages/sdk/src/stream.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L79)

#### Returns

`void`

#### Implementation of

[`ISyncedStream`](../interfaces/ISyncedStream.md).[`stop`](../interfaces/ISyncedStream.md#stop)

#### Inherited from

[`Stream`](Stream.md).[`stop`](Stream.md#stop)

***

### updateDecryptedContent()

```ts
updateDecryptedContent(eventId, content): void;
```

Defined in: [packages/sdk/src/stream.ts:105](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L105)

#### Parameters

##### eventId

`string`

##### content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

#### Returns

`void`

#### Inherited from

[`Stream`](Stream.md).[`updateDecryptedContent`](Stream.md#updatedecryptedcontent)

***

### updateDecryptedContentError()

```ts
updateDecryptedContentError(eventId, content): void;
```

Defined in: [packages/sdk/src/stream.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L109)

#### Parameters

##### eventId

`string`

##### content

[`DecryptionSessionError`](../../Towns-Protocol-Encryption/interfaces/DecryptionSessionError.md)

#### Returns

`void`

#### Inherited from

[`Stream`](Stream.md).[`updateDecryptedContentError`](Stream.md#updatedecryptedcontenterror)

***

### updateLocalEvent()

```ts
updateLocalEvent(
   localId, 
   parsedEventHash, 
   status): void;
```

Defined in: [packages/sdk/src/stream.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L113)

#### Parameters

##### localId

`string`

##### parsedEventHash

`string`

##### status

[`LocalEventStatus`](../type-aliases/LocalEventStatus.md)

#### Returns

`void`

#### Inherited from

[`Stream`](Stream.md).[`updateLocalEvent`](Stream.md#updatelocalevent)

***

### waitFor()

```ts
waitFor<E>(
   event, 
   condition, 
opts): Promise<void>;
```

Defined in: [packages/sdk/src/stream.ts:143](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L143)

Wait for a stream event to be emitted
optionally pass a condition function to check the event args

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents

#### Parameters

##### event

`E`

##### condition

() => `boolean`

##### opts

###### timeoutMs

`number`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Stream`](Stream.md).[`waitFor`](Stream.md#waitfor)

***

### waitForMembership()

```ts
waitForMembership(membership, inUserId?): Promise<void>;
```

Defined in: [packages/sdk/src/stream.ts:130](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L130)

Memberships are processed on block boundaries, so we need to wait for the next block to be processed
passing an undefined userId will wait for the membership to be updated for the current user

#### Parameters

##### membership

`MembershipOp`

##### inUserId?

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Stream`](Stream.md).[`waitForMembership`](Stream.md#waitformembership)
