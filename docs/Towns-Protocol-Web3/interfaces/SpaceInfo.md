# Interface: SpaceInfo

Defined in: [packages/web3/src/types/types.ts:1](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L1)

## Properties

### address

```ts
address: string;
```

Defined in: [packages/web3/src/types/types.ts:3](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L3)

The on-chain address of the space.

***

### createdAt

```ts
createdAt: string;
```

Defined in: [packages/web3/src/types/types.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L8)

The timestamp of when the space was created.
It is a [ethers.BigNumber](https://docs.ethers.org/v5/api/utils/bignumber/) serialized as a `string`.

***

### disabled

```ts
disabled: boolean;
```

Defined in: [packages/web3/src/types/types.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L16)

Whether the space is disabled.

***

### longDescription

```ts
longDescription: string;
```

Defined in: [packages/web3/src/types/types.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L20)

The long description of the space.

***

### name

```ts
name: string;
```

Defined in: [packages/web3/src/types/types.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L12)

The name of the space.

***

### networkId

```ts
networkId: string;
```

Defined in: [packages/web3/src/types/types.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L10)

The River `spaceId` of the space.

***

### owner

```ts
owner: string;
```

Defined in: [packages/web3/src/types/types.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L14)

The on-chain address of the space creator.

***

### shortDescription

```ts
shortDescription: string;
```

Defined in: [packages/web3/src/types/types.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L18)

A short description of the space.

***

### tokenId

```ts
tokenId: string;
```

Defined in: [packages/web3/src/types/types.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L25)

The on-chain token id of the space. All spaces are indexed by their token id in the SpaceOwner collection.
It is a [ethers.BigNumber](https://docs.ethers.org/v5/api/utils/bignumber/) serialized as a `string`.

***

### uri

```ts
uri: string;
```

Defined in: [packages/web3/src/types/types.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/types.ts#L27)

The URI of the space.
