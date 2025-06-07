# Class: RiverAirdropDapp

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L7)

## Constructors

### Constructor

```ts
new RiverAirdropDapp(config, provider): RiverAirdropDapp;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L13)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`RiverAirdropDapp`

## Properties

### drop?

```ts
readonly optional drop: IDropFacetShim;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L9)

***

### erc721A?

```ts
readonly optional erc721A: IERC721AShim;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L11)

***

### riverPoints?

```ts
readonly optional riverPoints: IRiverPointsShim;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L10)

## Methods

### balanceOf()

```ts
balanceOf(walletAddress): Promise<BigNumber>;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L33)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`BigNumber`\>

***

### checkIn()

```ts
checkIn(signer): Promise<undefined | ContractTransaction>;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L29)

#### Parameters

##### signer

`Signer`

#### Returns

`Promise`\<`undefined` \| `ContractTransaction`\>

***

### getCurrentStreak()

```ts
getCurrentStreak(walletAddress): Promise<BigNumber>;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L21)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`BigNumber`\>

***

### getLastCheckIn()

```ts
getLastCheckIn(walletAddress): Promise<BigNumber>;
```

Defined in: [packages/web3/src/airdrop/RiverAirdropDapp.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/airdrop/RiverAirdropDapp.ts#L25)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`BigNumber`\>
