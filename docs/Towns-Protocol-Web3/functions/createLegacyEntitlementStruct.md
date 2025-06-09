# Function: createLegacyEntitlementStruct()

```ts
function createLegacyEntitlementStruct(
   spaceIn, 
   users, 
ruleData): Promise<CreateEntitlementStruct[]>;
```

Defined in: [packages/web3/src/space/entitlements/ConvertersEntitlements.ts:170](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/ConvertersEntitlements.ts#L170)

## Parameters

### spaceIn

[`Space`](../classes/Space.md)

### users

`string`[]

### ruleData

[`RuleDataStruct`](../namespaces/IRuleEntitlementBase/type-aliases/RuleDataStruct.md)

## Returns

`Promise`\<[`CreateEntitlementStruct`](../namespaces/IRolesBase/type-aliases/CreateEntitlementStruct.md)[]\>
