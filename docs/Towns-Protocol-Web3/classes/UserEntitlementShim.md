# Class: UserEntitlementShim

Defined in: [packages/web3/src/space/entitlements/UserEntitlementShim.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/UserEntitlementShim.ts#L12)

## theme_extends

- [`BaseContractShim`](BaseContractShim.md)\<*typeof* `connect`\>

## Implements

- [`EntitlementModule`](../interfaces/EntitlementModule.md)

## Constructors

### Constructor

```ts
new UserEntitlementShim(address, provider): UserEntitlementShim;
```

Defined in: [packages/web3/src/space/entitlements/UserEntitlementShim.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/UserEntitlementShim.ts#L16)

#### Parameters

##### address

`string`

##### provider

`Provider`

#### Returns

`UserEntitlementShim`

#### Overrides

[`BaseContractShim`](BaseContractShim.md).[`constructor`](BaseContractShim.md#constructor)

## Properties

### abi

```ts
readonly abi: Abi;
```

Defined in: [packages/web3/src/BaseContractShim.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L26)

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`abi`](BaseContractShim.md#abi)

***

### address

```ts
readonly address: string;
```

Defined in: [packages/web3/src/BaseContractShim.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L23)

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`address`](BaseContractShim.md#address)

***

### connect

```ts
connect: Connect<UserEntitlement>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L20)

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`connect`](BaseContractShim.md#connect-1)

***

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/BaseContractShim.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L24)

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`provider`](BaseContractShim.md#provider)

## Accessors

### interface

#### Get Signature

```ts
get interface(): T_CONTRACT["interface"];
```

Defined in: [packages/web3/src/BaseContractShim.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L43)

##### Returns

`T_CONTRACT`\[`"interface"`\]

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`interface`](BaseContractShim.md#interface)

***

### moduleType

#### Get Signature

```ts
get moduleType(): EntitlementModuleType;
```

Defined in: [packages/web3/src/space/entitlements/UserEntitlementShim.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/UserEntitlementShim.ts#L20)

##### Returns

[`EntitlementModuleType`](../enumerations/EntitlementModuleType.md)

#### Implementation of

[`EntitlementModule`](../interfaces/EntitlementModule.md).[`moduleType`](../interfaces/EntitlementModule.md#moduletype)

***

### read

#### Get Signature

```ts
get read(): T_CONTRACT;
```

Defined in: [packages/web3/src/BaseContractShim.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L51)

##### Returns

`T_CONTRACT`

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`read`](BaseContractShim.md#read)

## Methods

### decodeFunctionData()

```ts
decodeFunctionData<FnName>(functionName, data): Result;
```

Defined in: [packages/web3/src/BaseContractShim.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L138)

#### Type Parameters

##### FnName

`FnName` *extends* 
  \| `"description"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"proxiableUUID"`
  \| `"supportsInterface"`
  \| `"upgradeToAndCall"`
  \| `"SPACE_ADDRESS"`
  \| `"UPGRADE_INTERFACE_VERSION"`

#### Parameters

##### functionName

`FnName`

##### data

`BytesLike`

#### Returns

`Result`

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`decodeFunctionData`](BaseContractShim.md#decodefunctiondata)

***

### decodeFunctionResult()

```ts
decodeFunctionResult<FnName>(functionName, data): Awaited<ReturnType<object[FnName]>>;
```

Defined in: [packages/web3/src/BaseContractShim.ts:123](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L123)

#### Type Parameters

##### FnName

`FnName` *extends* 
  \| `"description"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"proxiableUUID"`
  \| `"supportsInterface"`
  \| `"upgradeToAndCall"`
  \| `"SPACE_ADDRESS"`
  \| `"UPGRADE_INTERFACE_VERSION"`

#### Parameters

##### functionName

`FnName`

##### data

`BytesLike`

#### Returns

`Awaited`\<`ReturnType`\<`object`\[`FnName`\]\>\>

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`decodeFunctionResult`](BaseContractShim.md#decodefunctionresult)

***

### decodeGetAddresses()

```ts
decodeGetAddresses(entitlementData): undefined | string[];
```

Defined in: [packages/web3/src/space/entitlements/UserEntitlementShim.ts:38](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/UserEntitlementShim.ts#L38)

#### Parameters

##### entitlementData

`string`

#### Returns

`undefined` \| `string`[]

***

### encodeFunctionData()

```ts
encodeFunctionData<FnName, FnParams>(functionName, args): string;
```

Defined in: [packages/web3/src/BaseContractShim.ts:151](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L151)

#### Type Parameters

##### FnName

`FnName` *extends* 
  \| `"description"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"proxiableUUID"`
  \| `"supportsInterface"`
  \| `"upgradeToAndCall"`
  \| `"SPACE_ADDRESS"`
  \| `"UPGRADE_INTERFACE_VERSION"`

##### FnParams

`FnParams` *extends* 
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `PromiseOrValue`\<`string`\>[], `PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `PromiseOrValue`\<`BytesLike`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`BytesLike`\>, `PayableOverrides` & `object`\]

#### Parameters

##### functionName

`FnName`

##### args

`FnParams`

#### Returns

`string`

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`encodeFunctionData`](BaseContractShim.md#encodefunctiondata)

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

`FnName` *extends* 
  \| `"description"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"proxiableUUID"`
  \| `"supportsInterface"`
  \| `"upgradeToAndCall"`
  \| `"SPACE_ADDRESS"`
  \| `"UPGRADE_INTERFACE_VERSION"` = 
  \| `"description"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"proxiableUUID"`
  \| `"supportsInterface"`
  \| `"upgradeToAndCall"`
  \| `"SPACE_ADDRESS"`
  \| `"UPGRADE_INTERFACE_VERSION"`

##### Args

`Args` *extends* 
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `PromiseOrValue`\<`string`\>[], `PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `PromiseOrValue`\<`BytesLike`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`BytesLike`\>, `PayableOverrides` & `object`\] = `Parameters`\<`object`\[`FnName`\]\>

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

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`executeCall`](BaseContractShim.md#executecall)

***

### getRoleEntitlement()

```ts
getRoleEntitlement(roleId): Promise<string[]>;
```

Defined in: [packages/web3/src/space/entitlements/UserEntitlementShim.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/UserEntitlementShim.ts#L24)

#### Parameters

##### roleId

`BigNumberish`

#### Returns

`Promise`\<`string`[]\>

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

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`parseError`](BaseContractShim.md#parseerror)

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

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`parseLog`](BaseContractShim.md#parselog)

***

### write()

```ts
write(signer): UserEntitlement;
```

Defined in: [packages/web3/src/BaseContractShim.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L60)

#### Parameters

##### signer

`Signer`

#### Returns

`UserEntitlement`

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`write`](BaseContractShim.md#write)
