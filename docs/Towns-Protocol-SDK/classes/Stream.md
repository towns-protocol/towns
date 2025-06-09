# Class: Stream

Defined in: [packages/sdk/src/stream.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L17)

## theme_extends

- `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md), `this`\>

## theme_extended_by

- [`SyncedStream`](SyncedStream.md)

## Constructors

### Constructor

```ts
new Stream(
   userId, 
   streamId, 
   clientEmitter, 
   logEmitFromStream): Stream;
```

Defined in: [packages/sdk/src/stream.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L27)

#### Parameters

##### userId

`string`

##### streamId

`string`

##### clientEmitter

`TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

##### logEmitFromStream

[`DLogger`](../../Towns-Protocol-Dlog/interfaces/DLogger.md)

#### Returns

`Stream`

#### Overrides

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).constructor
```

## Properties

### \_view

```ts
_view: StreamStateView;
```

Defined in: [packages/sdk/src/stream.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L21)

***

### clientEmitter

```ts
readonly clientEmitter: TypedEventEmitter<StreamEvents>;
```

Defined in: [packages/sdk/src/stream.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L18)

***

### logEmitFromStream

```ts
readonly logEmitFromStream: DLogger;
```

Defined in: [packages/sdk/src/stream.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L19)

***

### userId

```ts
readonly userId: string;
```

Defined in: [packages/sdk/src/stream.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L20)

## Accessors

### streamId

#### Get Signature

```ts
get streamId(): string;
```

Defined in: [packages/sdk/src/stream.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L40)

##### Returns

`string`

***

### syncCookie

#### Get Signature

```ts
get syncCookie(): undefined | SyncCookie;
```

Defined in: [packages/sdk/src/stream.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L44)

##### Returns

`undefined` \| `SyncCookie`

***

### view

#### Get Signature

```ts
get view(): StreamStateView;
```

Defined in: [packages/sdk/src/stream.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L22)

##### Returns

[`StreamStateView`](StreamStateView.md)

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).addListener
```

***

### appendEvents()

```ts
appendEvents(
   events, 
   nextSyncCookie, 
   snapshot, 
cleartexts): Promise<void>;
```

Defined in: [packages/sdk/src/stream.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L84)

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

#### Overrides

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).emit
```

***

### eventNames()

```ts
eventNames(): (string | symbol)[];
```

Defined in: node\_modules/typed-emitter/index.d.ts:34

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).eventNames
```

***

### getMaxListeners()

```ts
getMaxListeners(): number;
```

Defined in: node\_modules/typed-emitter/index.d.ts:39

#### Returns

`number`

#### Inherited from

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).getMaxListeners
```

***

### initialize()

```ts
initialize(
   nextSyncCookie, 
   minipoolEvents, 
   snapshot, 
   miniblocks, 
   prependedMiniblocks, 
   prevSnapshotMiniblockNum, 
   cleartexts): void;
```

Defined in: [packages/sdk/src/stream.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L52)

NOTE: Separating initial rollup from the constructor allows consumer to subscribe to events
on the new stream event and still access this object through Client.streams.

#### Parameters

##### nextSyncCookie

`SyncCookie`

##### minipoolEvents

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

`void`

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).listenerCount
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).listeners
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).off
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).on
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).once
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).prependListener
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).prependOnceListener
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).rawListeners
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).removeAllListeners
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).removeListener
```

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

```ts
(EventEmitter as new () => TypedEmitter<StreamEvents>).setMaxListeners
```

***

### stop()

```ts
stop(): void;
```

Defined in: [packages/sdk/src/stream.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/stream.ts#L79)

#### Returns

`void`

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
