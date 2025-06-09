# Class: RiverRegistry

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L17)

## Constructors

### Constructor

```ts
new RiverRegistry(config, provider): RiverRegistry;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L25)

#### Parameters

##### config

[`RiverChainConfig`](../interfaces/RiverChainConfig.md)

##### provider

`Provider`

#### Returns

`RiverRegistry`

## Properties

### config

```ts
readonly config: RiverChainConfig;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L18)

***

### nodeRegistry

```ts
readonly nodeRegistry: INodeRegistryShim;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L20)

***

### operatorRegistry

```ts
readonly operatorRegistry: IOperatorRegistryShim;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L22)

***

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L19)

***

### riverNodesMap

```ts
readonly riverNodesMap: RiverNodesMap = {};
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L23)

***

### streamRegistry

```ts
readonly streamRegistry: IStreamRegistryShim;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L21)

## Methods

### getAllNodes()

```ts
getAllNodes(nodeStatus?): Promise<undefined | RiverNodesMap>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L33)

#### Parameters

##### nodeStatus?

`number`

#### Returns

`Promise`\<`undefined` \| `RiverNodesMap`\>

***

### getAllNodeUrls()

```ts
getAllNodeUrls(nodeStatus?): Promise<undefined | NodeUrls[]>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L56)

#### Parameters

##### nodeStatus?

`number`

#### Returns

`Promise`\<`undefined` \| `NodeUrls`[]\>

***

### getOperationalNodeUrls()

```ts
getOperationalNodeUrls(): Promise<string>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:74](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L74)

#### Returns

`Promise`\<`string`\>

***

### getStream()

```ts
getStream(streamAddress): Promise<StreamStructOutput>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:90](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L90)

#### Parameters

##### streamAddress

`Uint8Array`

#### Returns

`Promise`\<`StreamStructOutput`\>

***

### getStreamCount()

```ts
getStreamCount(): Promise<BigNumber>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L86)

#### Returns

`Promise`\<`BigNumber`\>

***

### getStreamCountsOnNodes()

```ts
getStreamCountsOnNodes(nodeAddresses): Promise<BigNumber[]>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:111](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L111)

#### Parameters

##### nodeAddresses

`string`[]

#### Returns

`Promise`\<`BigNumber`[]\>

***

### streamExists()

```ts
streamExists(streamAddress): Promise<boolean>;
```

Defined in: [packages/web3/src/river-registry/RiverRegistry.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/river-registry/RiverRegistry.ts#L94)

#### Parameters

##### streamAddress

`Uint8Array`

#### Returns

`Promise`\<`boolean`\>
