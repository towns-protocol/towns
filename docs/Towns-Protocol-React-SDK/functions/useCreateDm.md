# Function: useCreateDm()

```ts
function useCreateDm(config?): object;
```

Defined in: [react-sdk/src/useCreateDm.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useCreateDm.ts#L12)

A hook that allows you to create a new direct message (DM).

## Parameters

### config?

`ActionConfig`\<(...`args`) => `Promise`\<\{
  `streamId`: `string`;
\}\>\>

The action config.

## Returns

An object containing the `createDM` action and the rest of the action result.

### createDM()

```ts
createDM: (...args) => Promise<{
  streamId: string;
}>;
```

Creates a new DM.

#### Parameters

##### args

...\[`string`, `object`\]

#### Returns

`Promise`\<\{
  `streamId`: `string`;
\}\>

A promise that resolves to the result of the create operation.

### data

```ts
data: 
  | undefined
  | {
  streamId: string;
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
