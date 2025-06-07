# Variable: TestERC20

```ts
const TestERC20: object;
```

Defined in: [packages/web3/src/test-helpers/TestGatingERC20.ts:174](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestGatingERC20.ts#L174)

## Type declaration

### balanceOf()

```ts
balanceOf: (contractName, address) => Promise<number>;
```

#### Parameters

##### contractName

`string`

##### address

`` `0x${string}` ``

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
publicMint: (tokenName, toAddress, amount) => Promise<void>;
```

#### Parameters

##### tokenName

`string`

##### toAddress

`` `0x${string}` ``

##### amount

`number`

#### Returns

`Promise`\<`void`\>

### totalSupply()

```ts
totalSupply: (contractName) => Promise<number>;
```

#### Parameters

##### contractName

`string`

#### Returns

`Promise`\<`number`\>

### transfer()

```ts
transfer: (contractName, to, privateKey, amount) => Promise<{
  transactionHash: string;
}>;
```

#### Parameters

##### contractName

`string`

##### to

`` `0x${string}` ``

##### privateKey

`` `0x${string}` ``

##### amount

`bigint`

#### Returns

`Promise`\<\{
  `transactionHash`: `string`;
\}\>
