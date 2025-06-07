# Interface: IPersistenceStore

Defined in: [packages/sdk/src/persistenceStore.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L86)

## Methods

### getCleartext()

```ts
getCleartext(eventId): Promise<undefined | string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L88)

#### Parameters

##### eventId

`string`

#### Returns

`Promise`\<`undefined` \| `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

***

### getCleartexts()

```ts
getCleartexts(eventIds): Promise<
  | undefined
| Record<string, string | Uint8Array<ArrayBufferLike>>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L89)

#### Parameters

##### eventIds

`string`[]

#### Returns

`Promise`\<
  \| `undefined`
  \| `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>\>

***

### getMiniblock()

```ts
getMiniblock(streamId, miniblockNum): Promise<undefined | ParsedMiniblock>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:103](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L103)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

#### Returns

`Promise`\<`undefined` \| [`ParsedMiniblock`](ParsedMiniblock.md)\>

***

### getMiniblocks()

```ts
getMiniblocks(
   streamId, 
   rangeStart, 
randeEnd): Promise<ParsedMiniblock[]>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:104](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L104)

#### Parameters

##### streamId

`string`

##### rangeStart

`bigint`

##### randeEnd

`bigint`

#### Returns

`Promise`\<[`ParsedMiniblock`](ParsedMiniblock.md)[]\>

***

### getSyncedStream()

```ts
getSyncedStream(streamId): Promise<
  | undefined
| ParsedPersistedSyncedStream>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:90](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L90)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`ParsedPersistedSyncedStream`](ParsedPersistedSyncedStream.md)\>

***

### loadStream()

```ts
loadStream(streamId, inPersistedSyncedStream?): Promise<undefined | LoadedStream>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:92](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L92)

#### Parameters

##### streamId

`string`

##### inPersistedSyncedStream?

[`ParsedPersistedSyncedStream`](ParsedPersistedSyncedStream.md)

#### Returns

`Promise`\<`undefined` \| [`LoadedStream`](LoadedStream.md)\>

***

### loadStreams()

```ts
loadStreams(streamIds): Promise<Record<string, undefined | LoadedStream>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:96](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L96)

#### Parameters

##### streamIds

`string`[]

#### Returns

`Promise`\<`Record`\<`string`, `undefined` \| [`LoadedStream`](LoadedStream.md)\>\>

***

### saveCleartext()

```ts
saveCleartext(eventId, cleartext): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L87)

#### Parameters

##### eventId

`string`

##### cleartext

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

***

### saveMiniblock()

```ts
saveMiniblock(streamId, miniblock): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:97](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L97)

#### Parameters

##### streamId

`string`

##### miniblock

[`ParsedMiniblock`](ParsedMiniblock.md)

#### Returns

`Promise`\<`void`\>

***

### saveMiniblocks()

```ts
saveMiniblocks(
   streamId, 
   miniblocks, 
direction): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:98](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L98)

#### Parameters

##### streamId

`string`

##### miniblocks

[`ParsedMiniblock`](ParsedMiniblock.md)[]

##### direction

`"forward"` | `"backward"`

#### Returns

`Promise`\<`void`\>

***

### saveSnapshot()

```ts
saveSnapshot(
   streamId, 
   miniblockNum, 
snapshot): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L109)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

##### snapshot

`Snapshot`

#### Returns

`Promise`\<`void`\>

***

### saveSyncedStream()

```ts
saveSyncedStream(streamId, syncedStream): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:91](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L91)

#### Parameters

##### streamId

`string`

##### syncedStream

`PersistedSyncedStream`

#### Returns

`Promise`\<`void`\>
