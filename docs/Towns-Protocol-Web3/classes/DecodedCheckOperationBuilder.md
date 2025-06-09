# Class: DecodedCheckOperationBuilder

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:775](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L775)

## Constructors

### Constructor

```ts
new DecodedCheckOperationBuilder(): DecodedCheckOperationBuilder;
```

#### Returns

`DecodedCheckOperationBuilder`

## Methods

### build()

```ts
build(): DecodedCheckOperation;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:808](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L808)

#### Returns

[`DecodedCheckOperation`](../type-aliases/DecodedCheckOperation.md)

***

### setAddress()

```ts
setAddress(address): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:793](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L793)

#### Parameters

##### address

`` `0x${string}` ``

#### Returns

`this`

***

### setByteEncodedParams()

```ts
setByteEncodedParams(params): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:803](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L803)

#### Parameters

##### params

`` `0x${string}` ``

#### Returns

`this`

***

### setChainId()

```ts
setChainId(chainId): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:783](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L783)

#### Parameters

##### chainId

`bigint`

#### Returns

`this`

***

### setThreshold()

```ts
setThreshold(threshold): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:788](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L788)

#### Parameters

##### threshold

`bigint`

#### Returns

`this`

***

### setTokenId()

```ts
setTokenId(tokenId): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:798](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L798)

#### Parameters

##### tokenId

`bigint`

#### Returns

`this`

***

### setType()

```ts
setType(checkOpType): this;
```

Defined in: [packages/web3/src/space/entitlements/entitlement.ts:778](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/entitlement.ts#L778)

#### Parameters

##### checkOpType

[`CheckOperationType`](../enumerations/CheckOperationType.md)

#### Returns

`this`
