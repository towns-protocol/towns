# Variable: TestERC721

```ts
const TestERC721: object;
```

Defined in: [packages/web3/src/test-helpers/TestGatingNFT.ts:163](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingNFT.ts#L163)

## Type declaration

### balanceOf()

```ts
balanceOf: (nftName, address) => Promise<number>;
```

#### Parameters

##### nftName

`string`

##### address

`` `0x${string}` ``

#### Returns

`Promise`\<`number`\>

### burn()

```ts
burn: (nftName, tokenId) => Promise<void>;
```

#### Parameters

##### nftName

`string`

##### tokenId

`number`

#### Returns

`Promise`\<`void`\>

### getContractAddress()

```ts
getContractAddress: (nftName) => Promise<`0x${string}`>;
```

#### Parameters

##### nftName

`string`

#### Returns

`Promise`\<`` `0x${string}` ``\>

### publicMint()

```ts
publicMint: (nftName, toAddress) => Promise<number>;
```

#### Parameters

##### nftName

`string`

##### toAddress

`` `0x${string}` ``

#### Returns

`Promise`\<`number`\>
