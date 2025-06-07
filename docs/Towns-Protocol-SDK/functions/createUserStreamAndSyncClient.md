# Function: createUserStreamAndSyncClient()

```ts
function createUserStreamAndSyncClient(
   client, 
   spaceDapp, 
   name, 
   membershipInfo, 
wallet): Promise<void>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:654](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L654)

## Parameters

### client

[`Client`](../classes/Client.md)

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

### name

`string`

### membershipInfo

[`MembershipStruct`](../../Towns-Protocol-Web3/namespaces/IArchitectBase/type-aliases/MembershipStruct.md) | [`MembershipStruct`](../../Towns-Protocol-Web3/namespaces/ILegacyArchitectBase/type-aliases/MembershipStruct.md)

### wallet

`Wallet`

## Returns

`Promise`\<`void`\>
