# Class: RuleEntitlementV2Shim

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L17)

## theme_extends

- [`BaseContractShim`](BaseContractShim.md)\<*typeof* `connect`\>

## Implements

- [`EntitlementModule`](../interfaces/EntitlementModule.md)

## Constructors

### Constructor

```ts
new RuleEntitlementV2Shim(address, provider): RuleEntitlementV2Shim;
```

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L21)

#### Parameters

##### address

`string`

##### provider

`Provider`

#### Returns

`RuleEntitlementV2Shim`

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
connect: Connect<IRuleEntitlementV2>;
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

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L25)

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
  \| `"encodeRuleData"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"getRuleDataV2"`

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
  \| `"encodeRuleData"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"getRuleDataV2"`

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

### decodeGetRuleData()

```ts
decodeGetRuleData(entitlementData): 
  | undefined
  | RuleDataV2Struct;
```

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L42)

#### Parameters

##### entitlementData

`string`

#### Returns

  \| `undefined`
  \| [`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

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
  \| `"encodeRuleData"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"getRuleDataV2"`

##### FnParams

`FnParams` *extends* 
  \| \[`CallOverrides`\]
  \| \[[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md), `CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `PromiseOrValue`\<`string`\>[], `PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `PromiseOrValue`\<`BytesLike`\>, `Overrides` & `object`\]

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
  \| `"encodeRuleData"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"getRuleDataV2"` = 
  \| `"description"`
  \| `"encodeRuleData"`
  \| `"getEntitlementDataByRoleId"`
  \| `"initialize"`
  \| `"isCrosschain"`
  \| `"isEntitled"`
  \| `"moduleType"`
  \| `"name"`
  \| `"removeEntitlement"`
  \| `"setEntitlement"`
  \| `"getRuleDataV2"`

##### Args

`Args` *extends* 
  \| \[`CallOverrides`\]
  \| \[[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md), `CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BytesLike`\>, `PromiseOrValue`\<`string`\>[], `PromiseOrValue`\<`BytesLike`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `PromiseOrValue`\<`BytesLike`\>, `Overrides` & `object`\] = `Parameters`\<`object`\[`FnName`\]\>

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
getRoleEntitlement(roleId): Promise<
  | null
| RuleDataV2Struct>;
```

Defined in: [packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/entitlements/RuleEntitlementV2Shim.ts#L29)

#### Parameters

##### roleId

`BigNumberish`

#### Returns

`Promise`\<
  \| `null`
  \| [`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)\>

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
write(signer): IRuleEntitlementV2;
```

Defined in: [packages/web3/src/BaseContractShim.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L60)

#### Parameters

##### signer

`Signer`

#### Returns

[`IRuleEntitlementV2`](../interfaces/IRuleEntitlementV2.md)

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`write`](BaseContractShim.md#write)
