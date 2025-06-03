# Function: makeBearerToken()

```ts
function makeBearerToken(signer, expiry): Promise<string>;
```

Defined in: [packages/sdk/src/signerContext.ts:114](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/signerContext.ts#L114)

## Parameters

### signer

`Signer`

### expiry

`bigint` | \{
`days?`: `number`;
`hours?`: `number`;
`minutes?`: `number`;
`seconds?`: `number`;
\}

## Returns

`Promise`\<`string`\>
