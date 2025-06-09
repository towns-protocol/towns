# Function: createEip712LinkedWalletdData()

```ts
function createEip712LinkedWalletdData(__namedParameters): object;
```

Defined in: [packages/web3/src/eip-712/EIP-712.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/eip-712/EIP-712.ts#L21)

## Parameters

### \_\_namedParameters

`Eip712LinkedWalletArgs`

## Returns

`object`

### domain

```ts
domain: TypedDataDomain;
```

### types

```ts
types: Record<string, TypedDataField[]>;
```

### value

```ts
value: LinkedWalletValue;
```
