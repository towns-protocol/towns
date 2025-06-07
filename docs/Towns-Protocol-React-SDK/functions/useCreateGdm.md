# Function: useCreateGdm()

```ts
function useCreateGdm(config?): object;
```

Defined in: [react-sdk/src/useCreateGdm.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useCreateGdm.ts#L12)

A hook that allows you to create a new group direct message (GDM).

## Parameters

### config?

`ActionConfig`\<(...`args`) => `Promise`\<\{
  `streamId`: `string`;
\}\>\>

The action config.

## Returns

An object containing the `createGDM` action and the rest of the action result.

### createGDM()

```ts
createGDM: (...args) => Promise<{
  streamId: string;
}>;
```

Creates a new GDM.

#### Parameters

##### args

...\[`string`[], `EncryptedData`, `object`\]

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
