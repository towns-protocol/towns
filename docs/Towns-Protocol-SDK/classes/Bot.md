# Class: Bot

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L7)

## Constructors

### Constructor

```ts
new Bot(rootWallet?, riverConfig?): Bot;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L13)

#### Parameters

##### rootWallet?

`Wallet`

##### riverConfig?

###### base

\{
  `chainConfig`: [`BaseChainConfig`](../../Towns-Protocol-Web3/interfaces/BaseChainConfig.md);
  `rpcUrl`: `string`;
\} = `...`

###### base.chainConfig

[`BaseChainConfig`](../../Towns-Protocol-Web3/interfaces/BaseChainConfig.md) = `env.base`

###### base.rpcUrl

`string` = `...`

###### environmentId

`string`

###### river

\{
  `chainConfig`: [`RiverChainConfig`](../../Towns-Protocol-Web3/interfaces/RiverChainConfig.md);
  `rpcUrl`: `string`;
\} = `...`

###### river.chainConfig

[`RiverChainConfig`](../../Towns-Protocol-Web3/interfaces/RiverChainConfig.md) = `env.river`

###### river.rpcUrl

`string` = `...`

#### Returns

`Bot`

## Properties

### delegateWallet

```ts
delegateWallet: Wallet;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L10)

***

### riverConfig

```ts
riverConfig: object;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L8)

#### base

```ts
base: object;
```

##### base.chainConfig

```ts
base.chainConfig: BaseChainConfig = env.base;
```

##### base.rpcUrl

```ts
base.rpcUrl: string;
```

#### environmentId

```ts
environmentId: string;
```

#### river

```ts
river: object;
```

##### river.chainConfig

```ts
river.chainConfig: RiverChainConfig = env.river;
```

##### river.rpcUrl

```ts
river.rpcUrl: string;
```

***

### rootWallet

```ts
rootWallet: Wallet;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L9)

***

### web3Provider

```ts
web3Provider: LocalhostWeb3Provider;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L11)

## Accessors

### signer

#### Get Signature

```ts
get signer(): Signer;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L24)

##### Returns

`Signer`

***

### userId

#### Get Signature

```ts
get userId(): string;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L20)

##### Returns

`string`

## Methods

### fundWallet()

```ts
fundWallet(): Promise<boolean>;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L28)

#### Returns

`Promise`\<`boolean`\>

***

### makeSyncAgent()

```ts
makeSyncAgent(opts?): Promise<SyncAgent>;
```

Defined in: [packages/sdk/src/sync-agent/utils/bot.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/bot.ts#L32)

#### Parameters

##### opts?

`Partial`\<[`SyncAgentConfig`](../interfaces/SyncAgentConfig.md)\>

#### Returns

`Promise`\<[`SyncAgent`](SyncAgent.md)\>
