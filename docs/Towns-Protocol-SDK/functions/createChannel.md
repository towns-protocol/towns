# Function: createChannel()

```ts
function createChannel(
   spaceDapp, 
   provider, 
   spaceId, 
   channelName, 
   roleIds, 
signer): Promise<CreateChannelContext>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:1249](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L1249)

## Parameters

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

### provider

`Provider`

### spaceId

`string`

### channelName

`string`

### roleIds

`number`[]

### signer

`Signer`

## Returns

`Promise`\<[`CreateChannelContext`](../interfaces/CreateChannelContext.md)\>
