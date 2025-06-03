# Function: createSpaceAndDefaultChannel()

```ts
function createSpaceAndDefaultChannel(
   client, 
   spaceDapp, 
   wallet, 
   name, 
   membership): Promise<{
  defaultChannelId: string;
  spaceId: string;
  userStreamView: StreamStateView;
}>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:475](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L475)

## Parameters

### client

[`Client`](../classes/Client.md)

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

### wallet

`Wallet`

### name

`string`

### membership

[`MembershipStruct`](../../Towns-Protocol-Web3/namespaces/IArchitectBase/type-aliases/MembershipStruct.md) | [`MembershipStruct`](../../Towns-Protocol-Web3/namespaces/ILegacyArchitectBase/type-aliases/MembershipStruct.md)

## Returns

`Promise`\<\{
  `defaultChannelId`: `string`;
  `spaceId`: `string`;
  `userStreamView`: [`StreamStateView`](../classes/StreamStateView.md);
\}\>
