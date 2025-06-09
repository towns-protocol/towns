# Function: makeDefaultMembershipInfo()

```ts
function makeDefaultMembershipInfo(
   spaceDapp, 
   feeRecipient, 
   pricing): Promise<{
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
     price: number;
     pricingModule: PromiseOrValue<string>;
     symbol: string;
  };
}>;
```

Defined in: [packages/sdk/src/sync-agent/utils/spaceUtils.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/spaceUtils.ts#L11)

## Parameters

### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

### feeRecipient

`string`

### pricing

`"fixed"` | `"dynamic"`

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
     `price`: `number`;
     `pricingModule`: `PromiseOrValue`\<`string`\>;
     `symbol`: `string`;
  \};
\}\>
