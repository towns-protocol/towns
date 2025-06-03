# Class: BaseRegistry

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L16)

## Constructors

### Constructor

```ts
new BaseRegistry(config, provider): BaseRegistry;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L26)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`BaseRegistry`

## Properties

### config

```ts
readonly config: BaseChainConfig;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L17)

***

### entitlementChecker

```ts
readonly entitlementChecker: IEntitlementCheckerShim;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L20)

***

### erc721A

```ts
readonly erc721A: IERC721AShim;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L24)

***

### nodeOperator

```ts
readonly nodeOperator: INodeOperatorShim;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L19)

***

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L18)

***

### rewardsDistributionV2

```ts
readonly rewardsDistributionV2: RewardsDistributionV2Shim;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L22)

***

### spaceDelegation

```ts
readonly spaceDelegation: ISpaceDelegationShim;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L21)

## Methods

### getNodes()

```ts
getNodes(): Promise<string[]>;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:69](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L69)

#### Returns

`Promise`\<`string`[]\>

***

### getNodesWithOperators()

```ts
getNodesWithOperators(): Promise<BaseNodeWithOperator[]>;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L79)

#### Returns

`Promise`\<[`BaseNodeWithOperator`](../type-aliases/BaseNodeWithOperator.md)[]\>

***

### getOperators()

```ts
getOperators(): Promise<BaseOperator[]>;
```

Defined in: [packages/web3/src/base-registry/BaseRegistry.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/base-registry/BaseRegistry.ts#L47)

#### Returns

`Promise`\<[`BaseOperator`](../type-aliases/BaseOperator.md)[]\>
