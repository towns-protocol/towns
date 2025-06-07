# Function: makeSignerContext()

```ts
function makeSignerContext(
   primaryWallet, 
   delegateWallet, 
inExpiryEpochMs?): Promise<SignerContext>;
```

Defined in: [packages/sdk/src/signerContext.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L84)

## Parameters

### primaryWallet

`Signer`

### delegateWallet

`Wallet`

### inExpiryEpochMs?

`bigint` | \{
`days?`: `number`;
`hours?`: `number`;
`minutes?`: `number`;
`seconds?`: `number`;
\}

## Returns

`Promise`\<[`SignerContext`](../interfaces/SignerContext.md)\>
