# Function: useSetUsername()

```ts
function useSetUsername(streamId, config?): object;
```

Defined in: [react-sdk/src/useMyMember.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useMyMember.ts#L48)

Hook to set the username of the current user in a stream.

## Parameters

### streamId

`string`

The id of the stream to set the username of.

### config?

`ActionConfig`\<(`username`) => `Promise`\<`void`\>\>

Configuration options for the action.

## Returns

The `setUsername` action and its loading state.

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

### setUsername()

```ts
setUsername: (...args) => Promise<void>;
```

#### Parameters

##### args

...\[`string`\]

#### Returns

`Promise`\<`void`\>
