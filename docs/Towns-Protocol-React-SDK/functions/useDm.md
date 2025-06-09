# Function: useDm()

```ts
function useDm(streamId, config?): ObservableValue<DmModel>;
```

Defined in: [react-sdk/src/useDm.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useDm.ts#L13)

Hook to get the data of a DM.
You can use this hook to get DM metadata and if the user has joined the DM.

## Parameters

### streamId

`string`

The id of the DM to get the data of.

### config?

Configuration options for the observable.

#### fireImmediately?

`boolean`

Trigger the update immediately, without waiting for the first update.

**Default Value**

```ts
true
```

#### onError?

(`error`) => `void`

Callback function to be called when an error occurs.

#### onUpdate?

(`data`) => `void`

Callback function to be called when the data is updated.

## Returns

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`DmModel`](../../Towns-Protocol-SDK/interfaces/DmModel.md)\>

The DmModel of the DM.
