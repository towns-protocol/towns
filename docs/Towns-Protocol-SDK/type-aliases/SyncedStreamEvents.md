# Type Alias: SyncedStreamEvents

```ts
type SyncedStreamEvents = object;
```

Defined in: [packages/sdk/src/streamEvents.ts:69](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L69)

## Properties

### streamRemovedFromSync()

```ts
streamRemovedFromSync: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:71](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L71)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### streamSyncActive()

```ts
streamSyncActive: (active) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:72](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L72)

#### Parameters

##### active

`boolean`

#### Returns

`void`

***

### streamSyncStateChange()

```ts
streamSyncStateChange: (newState) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L70)

#### Parameters

##### newState

[`SyncState`](../enumerations/SyncState.md)

#### Returns

`void`
