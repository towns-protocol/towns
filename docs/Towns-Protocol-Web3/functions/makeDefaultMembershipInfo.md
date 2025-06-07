# Function: makeDefaultMembershipInfo()

```ts
function makeDefaultMembershipInfo(
   spaceDapp, 
   feeRecipient, 
   pricing, 
   price, 
   freeAllocation): Promise<{
  permissions: ("Read" | "Write")[];
  requirements: {
     everyone: true;
     ruleData: `0x${string}`;
     syncEntitlements: false;
     users: never[];
  };
  settings: {
     currency: string;
     duration: number;
     feeRecipient: string;
     freeAllocation: number;
     maxSupply: number;
     name: string;
     price: bigint;
     pricingModule: PromiseOrValue<string>;
     symbol: string;
  };
}>;
```

Defined in: [packages/web3/src/test-helpers/utils.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/utils.ts#L7)

## Parameters

### spaceDapp

[`SpaceDapp`](../classes/SpaceDapp.md)

### feeRecipient

`string`

### pricing

`"fixed"` | `"dynamic"`

### price

`bigint` = `0n`

### freeAllocation

`number` = `1000`

## Returns

`Promise`\<\{
  `permissions`: (`"Read"` \| `"Write"`)[];
  `requirements`: \{
     `everyone`: `true`;
     `ruleData`: `` `0x${string}` ``;
     `syncEntitlements`: `false`;
     `users`: `never`[];
  \};
  `settings`: \{
     `currency`: `string`;
     `duration`: `number`;
     `feeRecipient`: `string`;
     `freeAllocation`: `number`;
     `maxSupply`: `number`;
     `name`: `string`;
     `price`: `bigint`;
     `pricingModule`: `PromiseOrValue`\<`string`\>;
     `symbol`: `string`;
  \};
\}\>
