# Type Alias: MembershipInfo

```ts
type MembershipInfo = Pick<MembershipInfoStruct, 
  | "maxSupply"
  | "currency"
  | "feeRecipient"
  | "price"
  | "duration"
  | "pricingModule"> & TotalSupplyInfo & object;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:221](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L221)

## Type declaration

### prepaidSupply

```ts
prepaidSupply: number;
```

### remainingFreeSupply

```ts
remainingFreeSupply: number;
```
