# Class: SpaceRegistrar

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L16)

A class to manage the creation of space stubs
converts a space network id to space address and
creates a space object with relevant addresses and data

## Constructors

### Constructor

```ts
new SpaceRegistrar(config, provider): SpaceRegistrar;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L24)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`SpaceRegistrar`

## Properties

### config

```ts
readonly config: BaseChainConfig;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L17)

## Accessors

### CreateSpace

#### Get Signature

```ts
get CreateSpace(): ICreateSpaceShim;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:38](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L38)

##### Returns

[`ICreateSpaceShim`](ICreateSpaceShim.md)

***

### LegacySpaceArchitect

#### Get Signature

```ts
get LegacySpaceArchitect(): ILegacySpaceArchitectShim;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L46)

##### Returns

[`ILegacySpaceArchitectShim`](ILegacySpaceArchitectShim.md)

***

### SpaceArchitect

#### Get Signature

```ts
get SpaceArchitect(): ISpaceArchitectShim;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L42)

##### Returns

[`ISpaceArchitectShim`](ISpaceArchitectShim.md)

## Methods

### getSpace()

```ts
getSpace(spaceId): undefined | Space;
```

Defined in: [packages/web3/src/space-registrar/SpaceRegistrar.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-registrar/SpaceRegistrar.ts#L50)

#### Parameters

##### spaceId

`string`

#### Returns

`undefined` \| [`Space`](Space.md)
