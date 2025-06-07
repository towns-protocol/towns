# Class: INodeOperatorShim

Defined in: [packages/web3/src/base-registry/INodeOperatorShim.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/INodeOperatorShim.ts#L7)

## theme_extends

- [`BaseContractShim`](BaseContractShim.md)\<*typeof* `connect`\>

## Constructors

### Constructor

```ts
new INodeOperatorShim(address, provider): INodeOperatorShim;
```

Defined in: [packages/web3/src/base-registry/INodeOperatorShim.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/INodeOperatorShim.ts#L8)

#### Parameters

##### address

`string`

##### provider

`Provider`

#### Returns

`INodeOperatorShim`

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
connect: Connect<INodeOperator>;
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
  \| `"getClaimAddressForOperator"`
  \| `"getCommissionRate"`
  \| `"getOperatorStatus"`
  \| `"getOperators"`
  \| `"isOperator"`
  \| `"registerOperator"`
  \| `"setClaimAddressForOperator"`
  \| `"setCommissionRate"`
  \| `"setOperatorStatus"`

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
  \| `"getClaimAddressForOperator"`
  \| `"getCommissionRate"`
  \| `"getOperatorStatus"`
  \| `"getOperators"`
  \| `"isOperator"`
  \| `"registerOperator"`
  \| `"setClaimAddressForOperator"`
  \| `"setCommissionRate"`
  \| `"setOperatorStatus"`

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

### encodeFunctionData()

```ts
encodeFunctionData<FnName, FnParams>(functionName, args): string;
```

Defined in: [packages/web3/src/BaseContractShim.ts:151](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L151)

#### Type Parameters

##### FnName

`FnName` *extends* 
  \| `"getClaimAddressForOperator"`
  \| `"getCommissionRate"`
  \| `"getOperatorStatus"`
  \| `"getOperators"`
  \| `"isOperator"`
  \| `"registerOperator"`
  \| `"setClaimAddressForOperator"`
  \| `"setCommissionRate"`
  \| `"setOperatorStatus"`

##### FnParams

`FnParams` *extends* 
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]

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
  \| `"getClaimAddressForOperator"`
  \| `"getCommissionRate"`
  \| `"getOperatorStatus"`
  \| `"getOperators"`
  \| `"isOperator"`
  \| `"registerOperator"`
  \| `"setClaimAddressForOperator"`
  \| `"setCommissionRate"`
  \| `"setOperatorStatus"` = 
  \| `"getClaimAddressForOperator"`
  \| `"getCommissionRate"`
  \| `"getOperatorStatus"`
  \| `"getOperators"`
  \| `"isOperator"`
  \| `"registerOperator"`
  \| `"setClaimAddressForOperator"`
  \| `"setCommissionRate"`
  \| `"setOperatorStatus"`

##### Args

`Args` *extends* 
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `CallOverrides`\]
  \| \[`PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`string`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\]
  \| \[`PromiseOrValue`\<`string`\>, `PromiseOrValue`\<`BigNumberish`\>, `Overrides` & `object`\] = `Parameters`\<`object`\[`FnName`\]\>

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
write(signer): INodeOperator;
```

Defined in: [packages/web3/src/BaseContractShim.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/BaseContractShim.ts#L60)

#### Parameters

##### signer

`Signer`

#### Returns

`INodeOperator`

#### Inherited from

[`BaseContractShim`](BaseContractShim.md).[`write`](BaseContractShim.md#write)
