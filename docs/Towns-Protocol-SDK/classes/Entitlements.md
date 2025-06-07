# Class: Entitlements

Defined in: [packages/sdk/src/sync-agent/entitlements/entitlements.ts:5](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/entitlements/entitlements.ts#L5)

## Implements

- [`EntitlementsDelegate`](../../Towns-Protocol-Encryption/interfaces/EntitlementsDelegate.md)

## Constructors

### Constructor

```ts
new Entitlements(config, spaceDapp): Entitlements;
```

Defined in: [packages/sdk/src/sync-agent/entitlements/entitlements.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/entitlements/entitlements.ts#L6)

#### Parameters

##### config

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

##### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

#### Returns

`Entitlements`

## Methods

### isEntitled()

```ts
isEntitled(
   spaceId, 
   channelId, 
   user, 
permission): Promise<boolean>;
```

Defined in: [packages/sdk/src/sync-agent/entitlements/entitlements.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/entitlements/entitlements.ts#L11)

#### Parameters

##### spaceId

`undefined` | `string`

##### channelId

`undefined` | `string`

##### user

`string`

##### permission

[`Permission`](../../Towns-Protocol-Web3/type-aliases/Permission.md)

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`EntitlementsDelegate`](../../Towns-Protocol-Encryption/interfaces/EntitlementsDelegate.md).[`isEntitled`](../../Towns-Protocol-Encryption/interfaces/EntitlementsDelegate.md#isentitled)
