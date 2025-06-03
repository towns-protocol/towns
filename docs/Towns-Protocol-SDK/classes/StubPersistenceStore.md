# Class: StubPersistenceStore

Defined in: [packages/sdk/src/persistenceStore.ts:501](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L501)

## Implements

- [`IPersistenceStore`](../interfaces/IPersistenceStore.md)

## Constructors

### Constructor

```ts
new StubPersistenceStore(): StubPersistenceStore;
```

#### Returns

`StubPersistenceStore`

## Methods

### getCleartext()

```ts
getCleartext(eventId): Promise<undefined>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:506](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L506)

#### Parameters

##### eventId

`string`

#### Returns

`Promise`\<`undefined`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getCleartext`](../interfaces/IPersistenceStore.md#getcleartext)

***

### getCleartexts()

```ts
getCleartexts(eventIds): Promise<undefined>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:510](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L510)

#### Parameters

##### eventIds

`string`[]

#### Returns

`Promise`\<`undefined`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getCleartexts`](../interfaces/IPersistenceStore.md#getcleartexts)

***

### getMiniblock()

```ts
getMiniblock(streamId, miniblockNum): Promise<undefined | ParsedMiniblock>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:542](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L542)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

#### Returns

`Promise`\<`undefined` \| [`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getMiniblock`](../interfaces/IPersistenceStore.md#getminiblock)

***

### getMiniblocks()

```ts
getMiniblocks(
   streamId, 
   rangeStart, 
rangeEnd): Promise<ParsedMiniblock[]>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:549](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L549)

#### Parameters

##### streamId

`string`

##### rangeStart

`bigint`

##### rangeEnd

`bigint`

#### Returns

`Promise`\<[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getMiniblocks`](../interfaces/IPersistenceStore.md#getminiblocks)

***

### getSyncedStream()

```ts
getSyncedStream(streamId): Promise<undefined>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:514](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L514)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`undefined`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getSyncedStream`](../interfaces/IPersistenceStore.md#getsyncedstream)

***

### loadStream()

```ts
loadStream(streamId, inPersistedSyncedStream?): Promise<undefined>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:518](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L518)

#### Parameters

##### streamId

`string`

##### inPersistedSyncedStream?

[`ParsedPersistedSyncedStream`](../interfaces/ParsedPersistedSyncedStream.md)

#### Returns

`Promise`\<`undefined`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`loadStream`](../interfaces/IPersistenceStore.md#loadstream)

***

### loadStreams()

```ts
loadStreams(streamIds): Promise<{
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:522](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L522)

#### Parameters

##### streamIds

`string`[]

#### Returns

`Promise`\<\{
\}\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`loadStreams`](../interfaces/IPersistenceStore.md#loadstreams)

***

### saveCleartext()

```ts
saveCleartext(eventId, cleartext): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:502](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L502)

#### Parameters

##### eventId

`string`

##### cleartext

`Uint8Array`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveCleartext`](../interfaces/IPersistenceStore.md#savecleartext)

***

### saveMiniblock()

```ts
saveMiniblock(streamId, miniblock): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:530](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L530)

#### Parameters

##### streamId

`string`

##### miniblock

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveMiniblock`](../interfaces/IPersistenceStore.md#saveminiblock)

***

### saveMiniblocks()

```ts
saveMiniblocks(
   streamId, 
   miniblocks, 
direction): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:534](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L534)

#### Parameters

##### streamId

`string`

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### direction

`"forward"` | `"backward"`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveMiniblocks`](../interfaces/IPersistenceStore.md#saveminiblocks)

***

### saveSnapshot()

```ts
saveSnapshot(
   streamId, 
   miniblockNum, 
snapshot): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:557](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L557)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

##### snapshot

`Snapshot`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveSnapshot`](../interfaces/IPersistenceStore.md#savesnapshot)

***

### saveSyncedStream()

```ts
saveSyncedStream(streamId, syncedStream): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:526](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L526)

#### Parameters

##### streamId

`string`

##### syncedStream

`PersistedSyncedStream`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveSyncedStream`](../interfaces/IPersistenceStore.md#savesyncedstream)
