# Function: useThreads()

```ts
function useThreads(streamId, config?): ObservableValue<ThreadsMap>;
```

Defined in: [react-sdk/src/useThreads.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useThreads.ts#L14)

Hook to get the threads from a stream.

## Parameters

### streamId

`string`

The id of the stream to get the threads from.

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

[`ObservableValue`](../type-aliases/ObservableValue.md)\<`ThreadsMap`\>

The threads of the stream as a map from the message eventId to a thread.
