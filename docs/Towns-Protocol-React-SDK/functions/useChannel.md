# Function: useChannel()

```ts
function useChannel(
   spaceId, 
   channelId, 
config?): ObservableValue<ChannelModel>;
```

Defined in: [react-sdk/src/useChannel.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useChannel.ts#L16)

Hook to get data about a channel.
You can use this hook to get channel metadata and if the user has joined the channel.

## Parameters

### spaceId

`string`

The id of the space the channel belongs to.

### channelId

`string`

The id of the channel to get data about.

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

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`ChannelModel`](../../Towns-Protocol-SDK/interfaces/ChannelModel.md)\>

The ChannelModel data.
