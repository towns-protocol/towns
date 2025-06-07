# Function: createRole()

```ts
function createRole(
   spaceDapp, 
   provider, 
   spaceId, 
   roleName, 
   permissions, 
   users, 
   ruleData, 
signer): Promise<CreateRoleContext>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:1162](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L1162)

## Parameters

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

### provider

`Provider`

### spaceId

`string`

### roleName

`string`

### permissions

[`Permission`](../../Towns-Protocol-Web3/type-aliases/Permission.md)[]

### users

`string`[]

### ruleData

[`RuleDataStruct`](../../Towns-Protocol-Web3/namespaces/IRuleEntitlementBase/type-aliases/RuleDataStruct.md) | [`RuleDataV2Struct`](../../Towns-Protocol-Web3/namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

### signer

`Signer`

## Returns

`Promise`\<[`CreateRoleContext`](../interfaces/CreateRoleContext.md)\>
