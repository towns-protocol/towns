# Function: toTypedDataHash()

```ts
function toTypedDataHash(domain, structHash): string;
```

Defined in: [packages/web3/src/eip-712/EIP-712.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/eip-712/EIP-712.ts#L94)

## Parameters

### domain

`TypedDataDomain`

### structHash

`string`

## Returns

`string`

## Dev

Returns the keccak256 digest of an EIP-712 typed data (EIP-191 version `0x01`).

The digest is calculated from a `domainSeparator` and a `structHash`, by prefixing them with
`0x1901` and hashing the result. It corresponds to the hash signed by the
https://eips.ethereum.org/EIPS/eip-712[`eth_signTypedData`] JSON-RPC method as part of EIP-712.

See {ECDSA-recover}.
