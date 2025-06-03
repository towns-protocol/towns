# Variable: TestERC1155

```ts
const TestERC1155: object;
```

Defined in: [packages/web3/src/test-helpers/TestGatingERC1155.ts:120](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingERC1155.ts#L120)

## Type declaration

### balanceOf()

```ts
balanceOf: (tokenName, address, tokenId) => Promise<number>;
```

#### Parameters

##### tokenName

`string`

##### address

`` `0x${string}` ``

##### tokenId

[`TestTokenId`](../enumerations/TestTokenId.md)

#### Returns

`Promise`\<`number`\>

### getContractAddress()

```ts
getContractAddress: (tokenName) => Promise<`0x${string}`>;
```

#### Parameters

##### tokenName

`string`

#### Returns

`Promise`\<`` `0x${string}` ``\>

### publicMint()

```ts
publicMint: (tokenName, toAddress, tokenId) => Promise<void>;
```

#### Parameters

##### tokenName

`string`

##### toAddress

`` `0x${string}` ``

##### tokenId

[`TestTokenId`](../enumerations/TestTokenId.md)

#### Returns

`Promise`\<`void`\>

### TestTokenId

```ts
TestTokenId: typeof TestTokenId;
```
