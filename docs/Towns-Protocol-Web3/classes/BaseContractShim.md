# Class: BaseContractShim\<connect, T_CONTRACT\>

Defined in: [packages/web3/src/BaseContractShim.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L19)

## theme_extended_by

- [`IDropFacetShim`](IDropFacetShim.md)
- [`IRiverPointsShim`](IRiverPointsShim.md)
- [`IEntitlementCheckerShim`](IEntitlementCheckerShim.md)
- [`INodeOperatorShim`](INodeOperatorShim.md)
- [`ISpaceDelegationShim`](ISpaceDelegationShim.md)
- [`IERC721AQueryableShim`](IERC721AQueryableShim.md)
- [`IERC721AShim`](IERC721AShim.md)
- [`PlatformRequirements`](PlatformRequirements.md)
- [`IPricingShim`](IPricingShim.md)
- [`INodeRegistryShim`](INodeRegistryShim.md)
- [`IOperatorRegistryShim`](IOperatorRegistryShim.md)
- [`IStreamRegistryShim`](IStreamRegistryShim.md)
- [`SpaceOwner`](SpaceOwner.md)
- [`ICreateSpaceShim`](ICreateSpaceShim.md)
- [`ILegacySpaceArchitectShim`](ILegacySpaceArchitectShim.md)
- [`ISpaceArchitectShim`](ISpaceArchitectShim.md)
- [`RuleEntitlementShim`](RuleEntitlementShim.md)
- [`RuleEntitlementV2Shim`](RuleEntitlementV2Shim.md)
- [`UserEntitlementShim`](UserEntitlementShim.md)
- [`IBanningShim`](IBanningShim.md)
- [`IChannelShim`](IChannelShim.md)
- [`IEntitlementDataQueryableShim`](IEntitlementDataQueryableShim.md)
- [`IEntitlementsShim`](IEntitlementsShim.md)
- [`IMembershipMetadataShim`](IMembershipMetadataShim.md)
- [`IMembershipShim`](IMembershipShim.md)
- [`IMulticallShim`](IMulticallShim.md)
- [`IPrepayShim`](IPrepayShim.md)
- [`IReviewShim`](IReviewShim.md)
- [`IRolesShim`](IRolesShim.md)
- [`ITippingShim`](ITippingShim.md)
- [`ITreasuryShim`](ITreasuryShim.md)
- [`OwnableFacetShim`](OwnableFacetShim.md)
- [`TokenPausableFacetShim`](TokenPausableFacetShim.md)
- [`MockERC721AShim`](MockERC721AShim.md)
- [`IWalletLinkShim`](IWalletLinkShim.md)

## Type Parameters

### connect

`connect` *extends* `Connect`\<`ethers.Contract`\>

### T_CONTRACT

`T_CONTRACT` *extends* `ContractType`\<`connect`\> = `ContractType`\<`connect`\>

## Constructors

### Constructor

```ts
new BaseContractShim<connect, T_CONTRACT>(
   address, 
   provider, 
   connect, 
abi): BaseContractShim<connect, T_CONTRACT>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L31)

#### Parameters

##### address

`string`

##### provider

`Provider`

##### connect

`Connect`\<`T_CONTRACT`\>

##### abi

`Abi`

#### Returns

`BaseContractShim`\<`connect`, `T_CONTRACT`\>

## Properties

### abi

```ts
readonly abi: Abi;
```

Defined in: [packages/web3/src/BaseContractShim.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L26)

***

### address

```ts
readonly address: string;
```

Defined in: [packages/web3/src/BaseContractShim.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L23)

***

### connect

```ts
connect: Connect<T_CONTRACT>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L20)

***

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/BaseContractShim.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L24)

## Accessors

### interface

#### Get Signature

```ts
get interface(): T_CONTRACT["interface"];
```

Defined in: [packages/web3/src/BaseContractShim.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L43)

##### Returns

`T_CONTRACT`\[`"interface"`\]

***

### read

#### Get Signature

```ts
get read(): T_CONTRACT;
```

Defined in: [packages/web3/src/BaseContractShim.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L51)

##### Returns

`T_CONTRACT`

## Methods

### decodeFunctionData()

```ts
decodeFunctionData<FnName>(functionName, data): Result;
```

Defined in: [packages/web3/src/BaseContractShim.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L138)

#### Type Parameters

##### FnName

`FnName` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### functionName

`FnName`

##### data

`BytesLike`

#### Returns

`Result`

***

### decodeFunctionResult()

```ts
decodeFunctionResult<FnName>(functionName, data): Awaited<ReturnType<T_CONTRACT["functions"][FnName]>>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:123](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L123)

#### Type Parameters

##### FnName

`FnName` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### functionName

`FnName`

##### data

`BytesLike`

#### Returns

`Awaited`\<`ReturnType`\<`T_CONTRACT`\[`"functions"`\]\[`FnName`\]\>\>

***

### encodeFunctionData()

```ts
encodeFunctionData<FnName, FnParams>(functionName, args): string;
```

Defined in: [packages/web3/src/BaseContractShim.ts:151](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L151)

#### Type Parameters

##### FnName

`FnName` *extends* `string` \| `number` \| `symbol`

##### FnParams

`FnParams` *extends* `any`[]

#### Parameters

##### functionName

`FnName`

##### args

`FnParams`

#### Returns

`string`

***

### executeCall()

```ts
executeCall<T, FnName, Args>(params): Promise<T extends undefined ? ContractTransaction : T>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L86)

Executes a contract function call. If overrideExecution is provided, uses that instead of
the default blockchain transaction. This allows for custom handling of the call, such as
returning the raw calldata or implementing custom transaction logic.

#### Type Parameters

##### T

`T` = `ContractTransaction`

##### FnName

`FnName` *extends* `string` \| `number` \| `symbol` = keyof `T_CONTRACT`\[`"functions"`\]

##### Args

`Args` *extends* `any`[] = `Parameters`\<`T_CONTRACT`\[`"functions"`\]\[`FnName`\]\>

#### Parameters

##### params

###### args

`Args`

The arguments to pass to the function

###### functionName

`FnName`

The name of the contract function to call

###### overrideExecution?

[`OverrideExecution`](../type-aliases/OverrideExecution.md)\<`T`\>

Optional function to override the default execution

###### signer

`Signer`

The signer to use for the transaction

###### transactionOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

Optional transaction options

###### value?

`bigint`

#### Returns

`Promise`\<`T` *extends* `undefined` ? `ContractTransaction` : `T`\>

The result of the function call or the override execution

***

### parseError()

```ts
parseError(error): Error & object;
```

Defined in: [packages/web3/src/BaseContractShim.ts:164](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L164)

#### Parameters

##### error

`unknown`

#### Returns

`Error` & `object`

***

### parseLog()

```ts
parseLog(log): LogDescription;
```

Defined in: [packages/web3/src/BaseContractShim.ts:278](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L278)

#### Parameters

##### log

`Log`

#### Returns

`LogDescription`

***

### write()

```ts
write(signer): T_CONTRACT;
```

Defined in: [packages/web3/src/BaseContractShim.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L60)

#### Parameters

##### signer

`Signer`

#### Returns

`T_CONTRACT`
