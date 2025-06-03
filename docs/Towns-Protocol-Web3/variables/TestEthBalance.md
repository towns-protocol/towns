# Variable: TestEthBalance

```ts
const TestEthBalance: object;
```

Defined in: [packages/web3/src/test-helpers/TestEthBalance.ts:100](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestEthBalance.ts#L100)

## Type declaration

### getBaseBalance()

```ts
getBaseBalance: (walletAddress) => Promise<bigint>;
```

#### Parameters

##### walletAddress

`` `0x${string}` ``

#### Returns

`Promise`\<`bigint`\>

### getRiverBalance()

```ts
getRiverBalance: (walletAddress) => Promise<bigint>;
```

#### Parameters

##### walletAddress

`` `0x${string}` ``

#### Returns

`Promise`\<`bigint`\>

### setBaseBalance()

```ts
setBaseBalance: (walletAddress, balance) => Promise<void>;
```

#### Parameters

##### walletAddress

`` `0x${string}` ``

##### balance

`bigint`

#### Returns

`Promise`\<`void`\>

### setRiverBalance()

```ts
setRiverBalance: (walletAddress, balance) => Promise<void>;
```

#### Parameters

##### walletAddress

`` `0x${string}` ``

##### balance

`bigint`

#### Returns

`Promise`\<`void`\>
