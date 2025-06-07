# Interface: IRuleEntitlementV2

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:197](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L197)

## theme_extends

- `BaseContract`

## Properties

### \_deployedPromise

```ts
_deployedPromise: Promise<Contract>;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:100

#### Inherited from

```ts
BaseContract._deployedPromise
```

***

### \_runningEvents

```ts
_runningEvents: object;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:101

#### Index Signature

```ts
[eventTag: string]: RunningEvent
```

#### Inherited from

```ts
BaseContract._runningEvents
```

***

### \_wrappedEmits

```ts
_wrappedEmits: object;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:104

#### Index Signature

```ts
[eventTag: string]: (...args) => void
```

#### Inherited from

```ts
BaseContract._wrappedEmits
```

***

### address

```ts
readonly address: string;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:79

#### Inherited from

```ts
BaseContract.address
```

***

### callStatic

```ts
callStatic: object;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:321](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L321)

#### description()

```ts
description(overrides?): Promise<string>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`string`\>

#### encodeRuleData()

```ts
encodeRuleData(data, overrides?): Promise<string>;
```

##### Parameters

###### data

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`string`\>

#### getEntitlementDataByRoleId()

```ts
getEntitlementDataByRoleId(roleId, overrides?): Promise<string>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`string`\>

#### getRuleDataV2()

```ts
getRuleDataV2(roleId, overrides?): Promise<RuleDataV2StructOutput>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<[`RuleDataV2StructOutput`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2StructOutput.md)\>

#### initialize()

```ts
initialize(space, overrides?): Promise<void>;
```

##### Parameters

###### space

`PromiseOrValue`\<`string`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`void`\>

#### isCrosschain()

```ts
isCrosschain(overrides?): Promise<boolean>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`boolean`\>

#### isEntitled()

```ts
isEntitled(
   channelId, 
   user, 
   permission, 
overrides?): Promise<boolean>;
```

##### Parameters

###### channelId

`PromiseOrValue`\<`BytesLike`\>

###### user

`PromiseOrValue`\<`string`\>[]

###### permission

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`boolean`\>

#### moduleType()

```ts
moduleType(overrides?): Promise<string>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`string`\>

#### name()

```ts
name(overrides?): Promise<string>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`string`\>

#### removeEntitlement()

```ts
removeEntitlement(roleId, overrides?): Promise<void>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`void`\>

#### setEntitlement()

```ts
setEntitlement(
   roleId, 
   entitlementData, 
overrides?): Promise<void>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### entitlementData

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`void`\>

#### Overrides

```ts
BaseContract.callStatic
```

***

### deployTransaction

```ts
readonly deployTransaction: TransactionResponse;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:99

#### Inherited from

```ts
BaseContract.deployTransaction
```

***

### estimateGas

```ts
estimateGas: object;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:371](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L371)

#### description()

```ts
description(overrides?): Promise<BigNumber>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### encodeRuleData()

```ts
encodeRuleData(data, overrides?): Promise<BigNumber>;
```

##### Parameters

###### data

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### getEntitlementDataByRoleId()

```ts
getEntitlementDataByRoleId(roleId, overrides?): Promise<BigNumber>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### getRuleDataV2()

```ts
getRuleDataV2(roleId, overrides?): Promise<BigNumber>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### initialize()

```ts
initialize(space, overrides?): Promise<BigNumber>;
```

##### Parameters

###### space

`PromiseOrValue`\<`string`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`BigNumber`\>

#### isCrosschain()

```ts
isCrosschain(overrides?): Promise<BigNumber>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### isEntitled()

```ts
isEntitled(
   channelId, 
   user, 
   permission, 
overrides?): Promise<BigNumber>;
```

##### Parameters

###### channelId

`PromiseOrValue`\<`BytesLike`\>

###### user

`PromiseOrValue`\<`string`\>[]

###### permission

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### moduleType()

```ts
moduleType(overrides?): Promise<BigNumber>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### name()

```ts
name(overrides?): Promise<BigNumber>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`BigNumber`\>

#### removeEntitlement()

```ts
removeEntitlement(roleId, overrides?): Promise<BigNumber>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`BigNumber`\>

#### setEntitlement()

```ts
setEntitlement(
   roleId, 
   entitlementData, 
overrides?): Promise<BigNumber>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### entitlementData

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`BigNumber`\>

#### Overrides

```ts
BaseContract.estimateGas
```

***

### filters

```ts
filters: object;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:369](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L369)

#### Overrides

```ts
BaseContract.filters
```

***

### functions

```ts
functions: object;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:223](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L223)

#### description()

```ts
description(overrides?): Promise<[string]>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`string`\]\>

#### encodeRuleData()

```ts
encodeRuleData(data, overrides?): Promise<[string]>;
```

##### Parameters

###### data

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`string`\]\>

#### getEntitlementDataByRoleId()

```ts
getEntitlementDataByRoleId(roleId, overrides?): Promise<[string]>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`string`\]\>

#### getRuleDataV2()

```ts
getRuleDataV2(roleId, overrides?): Promise<[RuleDataV2StructOutput] & object>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[[`RuleDataV2StructOutput`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2StructOutput.md)\] & `object`\>

#### initialize()

```ts
initialize(space, overrides?): Promise<ContractTransaction>;
```

##### Parameters

###### space

`PromiseOrValue`\<`string`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`ContractTransaction`\>

#### isCrosschain()

```ts
isCrosschain(overrides?): Promise<[boolean]>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`boolean`\]\>

#### isEntitled()

```ts
isEntitled(
   channelId, 
   user, 
   permission, 
overrides?): Promise<[boolean]>;
```

##### Parameters

###### channelId

`PromiseOrValue`\<`BytesLike`\>

###### user

`PromiseOrValue`\<`string`\>[]

###### permission

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`boolean`\]\>

#### moduleType()

```ts
moduleType(overrides?): Promise<[string]>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`string`\]\>

#### name()

```ts
name(overrides?): Promise<[string]>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<\[`string`\]\>

#### removeEntitlement()

```ts
removeEntitlement(roleId, overrides?): Promise<ContractTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`ContractTransaction`\>

#### setEntitlement()

```ts
setEntitlement(
   roleId, 
   entitlementData, 
overrides?): Promise<ContractTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### entitlementData

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`ContractTransaction`\>

#### Overrides

```ts
BaseContract.functions
```

***

### interface

```ts
interface: IRuleEntitlementV2Interface;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:202](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L202)

#### Overrides

```ts
BaseContract.interface
```

***

### off

```ts
off: OnEvent<IRuleEntitlementV2>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:218](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L218)

#### Overrides

```ts
BaseContract.off
```

***

### on

```ts
on: OnEvent<IRuleEntitlementV2>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:219](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L219)

#### Overrides

```ts
BaseContract.on
```

***

### once

```ts
once: OnEvent<IRuleEntitlementV2>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:220](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L220)

#### Overrides

```ts
BaseContract.once
```

***

### populateTransaction

```ts
populateTransaction: object;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:419](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L419)

#### description()

```ts
description(overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### encodeRuleData()

```ts
encodeRuleData(data, overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### data

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### getEntitlementDataByRoleId()

```ts
getEntitlementDataByRoleId(roleId, overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### getRuleDataV2()

```ts
getRuleDataV2(roleId, overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### initialize()

```ts
initialize(space, overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### space

`PromiseOrValue`\<`string`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### isCrosschain()

```ts
isCrosschain(overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### isEntitled()

```ts
isEntitled(
   channelId, 
   user, 
   permission, 
overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### channelId

`PromiseOrValue`\<`BytesLike`\>

###### user

`PromiseOrValue`\<`string`\>[]

###### permission

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### moduleType()

```ts
moduleType(overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### name()

```ts
name(overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### overrides?

`CallOverrides`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### removeEntitlement()

```ts
removeEntitlement(roleId, overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### setEntitlement()

```ts
setEntitlement(
   roleId, 
   entitlementData, 
overrides?): Promise<PopulatedTransaction>;
```

##### Parameters

###### roleId

`PromiseOrValue`\<`BigNumberish`\>

###### entitlementData

`PromiseOrValue`\<`BytesLike`\>

###### overrides?

`Overrides` & `object`

##### Returns

`Promise`\<`PopulatedTransaction`\>

#### Overrides

```ts
BaseContract.populateTransaction
```

***

### provider

```ts
readonly provider: Provider;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:82

#### Inherited from

```ts
BaseContract.provider
```

***

### removeListener

```ts
removeListener: OnEvent<IRuleEntitlementV2>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:221](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L221)

#### Overrides

```ts
BaseContract.removeListener
```

***

### resolvedAddress

```ts
readonly resolvedAddress: Promise<string>;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:98

#### Inherited from

```ts
BaseContract.resolvedAddress
```

***

### signer

```ts
readonly signer: Signer;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:81

#### Inherited from

```ts
BaseContract.signer
```

## Methods

### \_checkRunningEvents()

```ts
_checkRunningEvents(runningEvent): void;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:121

#### Parameters

##### runningEvent

`RunningEvent`

#### Returns

`void`

#### Inherited from

```ts
BaseContract._checkRunningEvents
```

***

### \_deployed()

```ts
_deployed(blockTag?): Promise<Contract>;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:114

#### Parameters

##### blockTag?

`BlockTag`

#### Returns

`Promise`\<`Contract`\>

#### Inherited from

```ts
BaseContract._deployed
```

***

### \_wrapEvent()

```ts
_wrapEvent(
   runningEvent, 
   log, 
   listener): Event;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:122

#### Parameters

##### runningEvent

`RunningEvent`

##### log

`Log`

##### listener

`Listener`

#### Returns

`Event`

#### Inherited from

```ts
BaseContract._wrapEvent
```

***

### attach()

```ts
attach(addressOrName): this;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:199](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L199)

#### Parameters

##### addressOrName

`string`

#### Returns

`this`

#### Overrides

```ts
BaseContract.attach
```

***

### connect()

```ts
connect(signerOrProvider): this;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:198](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L198)

#### Parameters

##### signerOrProvider

`string` | `Signer` | `Provider`

#### Returns

`this`

#### Overrides

```ts
BaseContract.connect
```

***

### deployed()

```ts
deployed(): Promise<IRuleEntitlementV2>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:200](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L200)

#### Returns

`Promise`\<`IRuleEntitlementV2`\>

#### Overrides

```ts
BaseContract.deployed
```

***

### description()

```ts
description(overrides?): Promise<string>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:275](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L275)

#### Parameters

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`string`\>

***

### emit()

```ts
emit(eventName, ...args): boolean;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:127

#### Parameters

##### eventName

`string` | `EventFilter`

##### args

...`any`[]

#### Returns

`boolean`

#### Inherited from

```ts
BaseContract.emit
```

***

### encodeRuleData()

```ts
encodeRuleData(data, overrides?): Promise<string>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:277](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L277)

#### Parameters

##### data

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`string`\>

***

### fallback()

```ts
fallback(overrides?): Promise<TransactionResponse>;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:115

#### Parameters

##### overrides?

`TransactionRequest`

#### Returns

`Promise`\<`TransactionResponse`\>

#### Inherited from

```ts
BaseContract.fallback
```

***

### getEntitlementDataByRoleId()

```ts
getEntitlementDataByRoleId(roleId, overrides?): Promise<string>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:282](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L282)

#### Parameters

##### roleId

`PromiseOrValue`\<`BigNumberish`\>

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`string`\>

***

### getRuleDataV2()

```ts
getRuleDataV2(roleId, overrides?): Promise<RuleDataV2StructOutput>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:287](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L287)

#### Parameters

##### roleId

`PromiseOrValue`\<`BigNumberish`\>

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<[`RuleDataV2StructOutput`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2StructOutput.md)\>

***

### initialize()

```ts
initialize(space, overrides?): Promise<ContractTransaction>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:292](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L292)

#### Parameters

##### space

`PromiseOrValue`\<`string`\>

##### overrides?

`Overrides` & `object`

#### Returns

`Promise`\<`ContractTransaction`\>

***

### isCrosschain()

```ts
isCrosschain(overrides?): Promise<boolean>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:297](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L297)

#### Parameters

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`boolean`\>

***

### isEntitled()

```ts
isEntitled(
   channelId, 
   user, 
   permission, 
overrides?): Promise<boolean>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:299](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L299)

#### Parameters

##### channelId

`PromiseOrValue`\<`BytesLike`\>

##### user

`PromiseOrValue`\<`string`\>[]

##### permission

`PromiseOrValue`\<`BytesLike`\>

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`boolean`\>

***

### listenerCount()

```ts
listenerCount(eventName?): number;
```

Defined in: node\_modules/@ethersproject/contracts/lib/index.d.ts:128

#### Parameters

##### eventName?

`string` | `EventFilter`

#### Returns

`number`

#### Inherited from

```ts
BaseContract.listenerCount
```

***

### listeners()

#### Call Signature

```ts
listeners<TEvent>(eventFilter?): TypedListener<TEvent>[];
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:210](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L210)

##### Type Parameters

###### TEvent

`TEvent` *extends* `TypedEvent`\<`any`, `any`\>

##### Parameters

###### eventFilter?

`TypedEventFilter`\<`TEvent`\>

##### Returns

`TypedListener`\<`TEvent`\>[]

##### Overrides

```ts
BaseContract.listeners
```

#### Call Signature

```ts
listeners(eventName?): Listener[];
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:213](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L213)

##### Parameters

###### eventName?

`string`

##### Returns

`Listener`[]

##### Overrides

```ts
BaseContract.listeners
```

***

### moduleType()

```ts
moduleType(overrides?): Promise<string>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:306](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L306)

#### Parameters

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`string`\>

***

### name()

```ts
name(overrides?): Promise<string>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:308](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L308)

#### Parameters

##### overrides?

`CallOverrides`

#### Returns

`Promise`\<`string`\>

***

### queryFilter()

```ts
queryFilter<TEvent>(
   event, 
   fromBlockOrBlockhash?, 
toBlock?): Promise<TEvent[]>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:204](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L204)

#### Type Parameters

##### TEvent

`TEvent` *extends* `TypedEvent`\<`any`, `any`\>

#### Parameters

##### event

`TypedEventFilter`\<`TEvent`\>

##### fromBlockOrBlockhash?

`string` | `number`

##### toBlock?

`string` | `number`

#### Returns

`Promise`\<`TEvent`[]\>

#### Overrides

```ts
BaseContract.queryFilter
```

***

### removeAllListeners()

#### Call Signature

```ts
removeAllListeners<TEvent>(eventFilter): this;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:214](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L214)

##### Type Parameters

###### TEvent

`TEvent` *extends* `TypedEvent`\<`any`, `any`\>

##### Parameters

###### eventFilter

`TypedEventFilter`\<`TEvent`\>

##### Returns

`this`

##### Overrides

```ts
BaseContract.removeAllListeners
```

#### Call Signature

```ts
removeAllListeners(eventName?): this;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:217](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L217)

##### Parameters

###### eventName?

`string`

##### Returns

`this`

##### Overrides

```ts
BaseContract.removeAllListeners
```

***

### removeEntitlement()

```ts
removeEntitlement(roleId, overrides?): Promise<ContractTransaction>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:310](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L310)

#### Parameters

##### roleId

`PromiseOrValue`\<`BigNumberish`\>

##### overrides?

`Overrides` & `object`

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setEntitlement()

```ts
setEntitlement(
   roleId, 
   entitlementData, 
overrides?): Promise<ContractTransaction>;
```

Defined in: [packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts:315](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IRuleEntitlement.sol/IRuleEntitlementV2.ts#L315)

#### Parameters

##### roleId

`PromiseOrValue`\<`BigNumberish`\>

##### entitlementData

`PromiseOrValue`\<`BytesLike`\>

##### overrides?

`Overrides` & `object`

#### Returns

`Promise`\<`ContractTransaction`\>
