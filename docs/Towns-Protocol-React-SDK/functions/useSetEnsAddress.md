# Function: useSetEnsAddress()

```ts
function useSetEnsAddress(streamId, config?): object;
```

Defined in: [react-sdk/src/useMyMember.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useMyMember.ts#L32)

Hook to set the ENS address of the current user in a stream.
You should be validating if the ENS address belongs to the user before setting it.

## Parameters

### streamId

`string`

The id of the stream to set the ENS address of.

### config?

`ActionConfig`\<(`ensAddress`) => `Promise`\<`void`\>\>

Configuration options for the action.

## Returns

The `setEnsAddress` action and its loading state.

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

### setEnsAddress()

```ts
setEnsAddress: (...args) => Promise<void>;
```

#### Parameters

##### args

...\[`` `0x${string}` ``\]

#### Returns

`Promise`\<`void`\>
