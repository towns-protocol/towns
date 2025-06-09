# Function: makeSignerDelegate()

```ts
function makeSignerDelegate(signer, expiry?): Promise<{
  delegateWallet: Wallet;
  signerContext: SignerContext;
}>;
```

Defined in: [packages/sdk/src/signerContext.ts:152](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L152)

## Parameters

### signer

`Signer`

### expiry?

`bigint` | \{
`days?`: `number`;
`hours?`: `number`;
`minutes?`: `number`;
`seconds?`: `number`;
\}

## Returns

`Promise`\<\{
  `delegateWallet`: `Wallet`;
  `signerContext`: [`SignerContext`](../interfaces/SignerContext.md);
\}\>
