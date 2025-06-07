# Function: createEntitlementStruct()

```ts
function createEntitlementStruct(
   spaceIn, 
   users, 
ruleData): Promise<CreateEntitlementStruct[]>;
```

Defined in: [packages/web3/src/space/entitlements/ConvertersEntitlements.ts:219](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/ConvertersEntitlements.ts#L219)

## Parameters

### spaceIn

[`Space`](../classes/Space.md)

### users

`string`[]

### ruleData

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

## Returns

`Promise`\<[`CreateEntitlementStruct`](../namespaces/IRolesBase/type-aliases/CreateEntitlementStruct.md)[]\>
