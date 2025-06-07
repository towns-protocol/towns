# Function: useReactions()

```ts
function useReactions(streamId, config?): ObservableValue<ReactionsMapModel>;
```

Defined in: [react-sdk/src/useReactions.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useReactions.ts#L12)

Hook to get the reactions of a specific stream.

## Parameters

### streamId

`string`

The id of the stream to get the reactions of.

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

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`ReactionsMapModel`](../../Towns-Protocol-SDK/type-aliases/ReactionsMapModel.md)\>

The reactions of the stream as a map from the message eventId to the reaction.
