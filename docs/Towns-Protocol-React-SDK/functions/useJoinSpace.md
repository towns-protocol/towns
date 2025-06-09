# Function: useJoinSpace()

```ts
function useJoinSpace(config?): object;
```

Defined in: [react-sdk/src/useJoinSpace.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useJoinSpace.ts#L12)

Hook to join a space.

## Parameters

### config?

`ActionConfig`\<(`spaceId`, ...`args`) => `Promise`\<`void`\>\>

Configuration options for the action.

## Returns

The joinSpace action and the status of the action.

### data

```ts
data: undefined | void;
```

The data returned by the action.

### error

```ts
error: undefined | Error;
```

The error that occurred while executing the action.

### isError

```ts
isError: boolean;
```

Whether the action is in error.

### isPending

```ts
isPending: boolean;
```

Whether the action is pending.

### isSuccess

```ts
isSuccess: boolean;
```

Whether the action is successful.

### joinSpace()

```ts
joinSpace: (...args) => Promise<void>;
```

Action to join a space.

#### Parameters

##### args

...\[`string`, `Signer`, `object`\]

#### Returns

`Promise`\<`void`\>
