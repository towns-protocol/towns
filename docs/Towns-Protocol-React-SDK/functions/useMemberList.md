# Function: useMemberList()

```ts
function useMemberList(streamId, config?): ObservableValue<MembersModel>;
```

Defined in: [react-sdk/src/useMemberList.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useMemberList.ts#L14)

Hook to get the members userIds of a Space, GDM, Channel, or DM.
Used with useMember to get data from a specific member.

## Parameters

### streamId

`string`

The id of the stream to get the members of.

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

[`ObservableValue`](../type-aliases/ObservableValue.md)\<[`MembersModel`](../../Towns-Protocol-SDK/type-aliases/MembersModel.md)\>

The MembersModel of the stream, containing the userIds of the members.
