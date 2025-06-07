# Function: createExternalTokenStruct()

```ts
function createExternalTokenStruct(addresses, options?): RuleDataV2Struct;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:736](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L736)

## Parameters

### addresses

`` `0x${string}` ``[]

### options?

#### checkOptions?

`Partial`\<`Omit`\<[`DecodedCheckOperation`](../type-aliases/DecodedCheckOperation.md), `"address"`\>\>

#### logicalOp?

  \| [`AND`](../enumerations/LogicalOperationType.md#and)
  \| [`OR`](../enumerations/LogicalOperationType.md#or)

## Returns

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)
