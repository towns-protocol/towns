# Function: makeBaseProvider()

```ts
function makeBaseProvider(config): StaticJsonRpcProvider;
```

Defined in: [packages/sdk/src/sync-agent/utils/providers.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/utils/providers.ts#L12)

## Parameters

### config

#### base

\{
  `chainConfig`: [`BaseChainConfig`](../../Towns-Protocol-Web3/interfaces/BaseChainConfig.md);
  `rpcUrl`: `string`;
\} = `...`

#### base.chainConfig

[`BaseChainConfig`](../../Towns-Protocol-Web3/interfaces/BaseChainConfig.md) = `env.base`

#### base.rpcUrl

`string` = `...`

#### environmentId

`string`

#### river

\{
  `chainConfig`: [`RiverChainConfig`](../../Towns-Protocol-Web3/interfaces/RiverChainConfig.md);
  `rpcUrl`: `string`;
\} = `...`

#### river.chainConfig

[`RiverChainConfig`](../../Towns-Protocol-Web3/interfaces/RiverChainConfig.md) = `env.river`

#### river.rpcUrl

`string` = `...`

## Returns

`StaticJsonRpcProvider`
