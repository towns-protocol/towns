# Function: useCreateSpace()

```ts
function useCreateSpace(config): object;
```

Defined in: [react-sdk/src/useCreateSpace.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useCreateSpace.ts#L12)

Hook to create a space.

## Parameters

### config

`ActionConfig`\<(`params`, `signer`) => `Promise`\<\{
  `defaultChannelId`: `string`;
  `spaceId`: `string`;
\}\>\> = `{}`

Configuration options for the action.

## Returns

The `createSpace` action and its loading state.

### createSpace()

```ts
createSpace: (...args) => Promise<{
  defaultChannelId: string;
  spaceId: string;
}>;
```

Action to create a space.

#### Parameters

##### args

...\[`Partial`\<`Omit`\<[`CreateSpaceParams`](../../Towns-Protocol-Web3/interfaces/CreateSpaceParams.md), `"spaceName"`\>\> & `object`, `Signer`\]

#### Returns

`Promise`\<\{
  `defaultChannelId`: `string`;
  `spaceId`: `string`;
\}\>

### data

```ts
data: 
  | undefined
  | {
  defaultChannelId: string;
  spaceId: string;
};
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
