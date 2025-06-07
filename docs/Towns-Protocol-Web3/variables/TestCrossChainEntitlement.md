# Variable: TestCrossChainEntitlement

```ts
const TestCrossChainEntitlement: object;
```

Defined in: [packages/web3/src/test-helpers/TestCrossChainEntitlement.ts:132](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/test-helpers/TestCrossChainEntitlement.ts#L132)

## Type declaration

### encodeIdParameter()

```ts
encodeIdParameter: (id) => `0x${string}`;
```

#### Parameters

##### id

`bigint`

#### Returns

`` `0x${string}` ``

### getContractAddress()

```ts
getContractAddress: (tokenName) => Promise<`0x${string}`>;
```

#### Parameters

##### tokenName

`string`

#### Returns

`Promise`\<`` `0x${string}` ``\>

### isEntitled()

```ts
isEntitled: (customEntitlementContractName, userAddresses, id) => Promise<boolean>;
```

#### Parameters

##### customEntitlementContractName

`string`

##### userAddresses

`` `0x${string}` ``[]

##### id

`bigint`

#### Returns

`Promise`\<`boolean`\>

### setIsEntitled()

```ts
setIsEntitled: (contractName, userAddress, id, entitled) => Promise<void>;
```

#### Parameters

##### contractName

`string`

##### userAddress

`` `0x${string}` ``

##### id

`bigint`

##### entitled

`boolean`

#### Returns

`Promise`\<`void`\>
