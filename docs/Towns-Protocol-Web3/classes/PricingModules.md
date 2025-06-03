# Class: PricingModules

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L6)

## Constructors

### Constructor

```ts
new PricingModules(config, provider): PricingModules;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L9)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`PricingModules`

## Methods

### addPricingModule()

```ts
addPricingModule(moduleAddress, signer): Promise<void>;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L21)

#### Parameters

##### moduleAddress

`string`

##### signer

`Signer`

#### Returns

`Promise`\<`void`\>

***

### isPricingModule()

```ts
isPricingModule(moduleAddress): Promise<boolean>;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L29)

#### Parameters

##### moduleAddress

`string`

#### Returns

`Promise`\<`boolean`\>

***

### listPricingModules()

```ts
listPricingModules(): Promise<PricingModuleStruct[]>;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L17)

#### Returns

`Promise`\<[`PricingModuleStruct`](../namespaces/IPricingModulesBase/type-aliases/PricingModuleStruct.md)[]\>

***

### parseError()

```ts
parseError(error): Error;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L13)

#### Parameters

##### error

`unknown`

#### Returns

`Error`

***

### removePricingModule()

```ts
removePricingModule(moduleAddress, signer): Promise<void>;
```

Defined in: [packages/web3/src/pricing-modules/PricingModules.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/pricing-modules/PricingModules.ts#L25)

#### Parameters

##### moduleAddress

`string`

##### signer

`Signer`

#### Returns

`Promise`\<`void`\>
