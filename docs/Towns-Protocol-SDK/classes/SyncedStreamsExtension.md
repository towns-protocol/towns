# Class: SyncedStreamsExtension

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L37)

## Constructors

### Constructor

```ts
new SyncedStreamsExtension(
   highPriorityStreamIds, 
   delegate, 
   persistenceStore, 
   logId): SyncedStreamsExtension;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:68](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L68)

#### Parameters

##### highPriorityStreamIds

`undefined` | `string`[]

##### delegate

`SyncedStreamsExtensionDelegate`

##### persistenceStore

[`IPersistenceStore`](../interfaces/IPersistenceStore.md)

##### logId

`string`

#### Returns

`SyncedStreamsExtension`

## Properties

### initStatus

```ts
initStatus: ClientInitStatus;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L61)

## Methods

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L89)

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

***

### setStartSyncRequested()

```ts
setStartSyncRequested(startSyncRequested): void;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L93)

#### Parameters

##### startSyncRequested

`boolean`

#### Returns

`void`

***

### setStreamIds()

```ts
setStreamIds(streamIds): void;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L83)

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

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:100](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L100)

#### Returns

`void`

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/sdk/src/syncedStreamsExtension.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsExtension.ts#L113)

#### Returns

`Promise`\<`void`\>
