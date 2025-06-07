# Function: getFreeSpacePricingSetup()

```ts
function getFreeSpacePricingSetup(spaceDapp): Promise<{
  fixedPricingModuleAddress: string;
  freeAllocation: number;
  price: number;
}>;
```

Defined in: [packages/sdk/src/tests/testUtils.ts:849](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tests/testUtils.ts#L849)

## Parameters

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

## Returns

`Promise`\<\{
  `fixedPricingModuleAddress`: `string`;
  `freeAllocation`: `number`;
  `price`: `number`;
\}\>
