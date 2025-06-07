# Type Alias: SyncEvents

```ts
type SyncEvents = object;
```

Defined in: [packages/sdk/src/syncEvents.ts:2](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L2)

## Properties

### syncCanceling()

```ts
syncCanceling: (syncId) => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:4](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L4)

#### Parameters

##### syncId

`string`

#### Returns

`void`

***

### syncError()

```ts
syncError: (syncId, error) => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:5](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L5)

#### Parameters

##### syncId

`string`

##### error

`unknown`

#### Returns

`void`

***

### syncing()

```ts
syncing: (syncId) => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:3](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L3)

#### Parameters

##### syncId

`string`

#### Returns

`void`

***

### syncRetrying()

```ts
syncRetrying: (retryDelay) => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L6)

#### Parameters

##### retryDelay

`number`

#### Returns

`void`

***

### syncStarting()

```ts
syncStarting: () => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L7)

#### Returns

`void`

***

### syncStopped()

```ts
syncStopped: () => void;
```

Defined in: [packages/sdk/src/syncEvents.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncEvents.ts#L8)

#### Returns

`void`
