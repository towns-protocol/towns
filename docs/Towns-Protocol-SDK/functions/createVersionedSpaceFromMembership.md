# Function: createVersionedSpaceFromMembership()

```ts
function createVersionedSpaceFromMembership(
   client, 
   spaceDapp, 
   wallet, 
   name, 
membership): Promise<ContractTransaction>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:534](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L534)

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

`Promise`\<`ContractTransaction`\>
