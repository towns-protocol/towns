# Class: SpaceDapp

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:158](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L158)

## Constructors

### Constructor

```ts
new SpaceDapp(config, provider): SpaceDapp;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:178](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L178)

#### Parameters

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`SpaceDapp`

## Properties

### airdrop

```ts
readonly airdrop: RiverAirdropDapp;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:167](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L167)

***

### bannedTokenIdsCache

```ts
readonly bannedTokenIdsCache: SimpleCache<BannedTokenIdsRequest, BigNumber[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:174](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L174)

***

### baseRegistry

```ts
readonly baseRegistry: BaseRegistry;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:161](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L161)

***

### config

```ts
readonly config: BaseChainConfig;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:160](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L160)

***

### entitledWalletCache

```ts
readonly entitledWalletCache: EntitlementCache<EntitlementRequest, EntitledWallet>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:172](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L172)

***

### entitlementCache

```ts
readonly entitlementCache: EntitlementCache<EntitlementRequest, EntitlementData[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:171](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L171)

***

### entitlementEvaluationCache

```ts
readonly entitlementEvaluationCache: EntitlementCache<EntitlementRequest, boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:173](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L173)

***

### isBannedTokenCache

```ts
readonly isBannedTokenCache: SimpleCache<IsTokenBanned, boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:176](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L176)

***

### ownerOfTokenCache

```ts
readonly ownerOfTokenCache: SimpleCache<OwnerOfTokenRequest, string>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:175](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L175)

***

### platformRequirements

```ts
readonly platformRequirements: PlatformRequirements;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:166](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L166)

***

### pricingModules

```ts
readonly pricingModules: PricingModules;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:164](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L164)

***

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:162](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L162)

***

### spaceOwner

```ts
readonly spaceOwner: SpaceOwner;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:168](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L168)

***

### spaceRegistrar

```ts
readonly spaceRegistrar: SpaceRegistrar;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:163](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L163)

***

### townsToken?

```ts
readonly optional townsToken: TownsToken;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:169](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L169)

***

### walletLink

```ts
readonly walletLink: WalletLink;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:165](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L165)

## Methods

### addRoleToChannel()

```ts
addRoleToChannel(
   spaceId, 
   channelNetworkId, 
   roleId, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:242](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L242)

#### Parameters

##### spaceId

`string`

##### channelNetworkId

`string`

##### roleId

`number`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### addSpaceDelegation()

```ts
addSpaceDelegation<T>(args): Promise<T extends undefined ? ContractTransaction : T>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1966](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1966)

Delegate staking within a space to an operator

#### Type Parameters

##### T

`T` = `ContractTransaction`

#### Parameters

##### args

###### operatorAddress

`string`

The operator address

###### overrideExecution?

[`OverrideExecution`](../type-aliases/OverrideExecution.md)\<`T`\>

###### signer

`Signer`

###### spaceId

`string`

The space id

###### transactionOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`T` *extends* `undefined` ? `ContractTransaction` : `T`\>

The transaction

***

### bannedWalletAddresses()

```ts
bannedWalletAddresses(spaceId): Promise<string[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:341](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L341)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### banWalletAddress()

```ts
banWalletAddress(
   spaceId, 
   walletAddress, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:278](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L278)

#### Parameters

##### spaceId

`string`

##### walletAddress

`string`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### clearChannelPermissionOverrides()

```ts
clearChannelPermissionOverrides(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1346](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1346)

#### Parameters

##### params

[`ClearChannelPermissionOverridesParams`](../interfaces/ClearChannelPermissionOverridesParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createChannel()

```ts
createChannel(
   spaceId, 
   channelName, 
   channelDescription, 
   channelNetworkId, 
   roleIds, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:482](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L482)

#### Parameters

##### spaceId

`string`

##### channelName

`string`

##### channelDescription

`string`

##### channelNetworkId

`string`

##### roleIds

`number`[]

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createChannelWithPermissionOverrides()

```ts
createChannelWithPermissionOverrides(
   spaceId, 
   channelName, 
   channelDescription, 
   channelNetworkId, 
   roles, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:511](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L511)

#### Parameters

##### spaceId

`string`

##### channelName

`string`

##### channelDescription

`string`

##### channelNetworkId

`string`

##### roles

`object`[]

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createLegacySpace()

```ts
createLegacySpace(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:433](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L433)

#### Parameters

##### params

[`CreateLegacySpaceParams`](../interfaces/CreateLegacySpaceParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createLegacyUpdatedEntitlements()

```ts
createLegacyUpdatedEntitlements(space, params): Promise<CreateEntitlementStruct[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1799](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1799)

#### Parameters

##### space

[`Space`](Space.md)

##### params

[`LegacyUpdateRoleParams`](../interfaces/LegacyUpdateRoleParams.md)

#### Returns

`Promise`\<[`CreateEntitlementStruct`](../namespaces/IRolesBase/type-aliases/CreateEntitlementStruct.md)[]\>

***

### createRole()

```ts
createRole(
   spaceId, 
   roleName, 
   permissions, 
   users, 
   ruleData, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:560](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L560)

#### Parameters

##### spaceId

`string`

##### roleName

`string`

##### permissions

[`Permission`](../type-aliases/Permission.md)[]

##### users

`string`[]

##### ruleData

[`RuleDataV2Struct`](../namespaces/IRuleEntitlementV2Base/type-aliases/RuleDataV2Struct.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createSpace()

```ts
createSpace(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:454](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L454)

#### Parameters

##### params

[`CreateSpaceParams`](../interfaces/CreateSpaceParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### createUpdatedEntitlements()

```ts
createUpdatedEntitlements(space, params): Promise<CreateEntitlementStruct[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1806](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1806)

#### Parameters

##### space

[`Space`](Space.md)

##### params

[`UpdateRoleParams`](../interfaces/UpdateRoleParams.md)

#### Returns

`Promise`\<[`CreateEntitlementStruct`](../namespaces/IRolesBase/type-aliases/CreateEntitlementStruct.md)[]\>

***

### deleteRole()

```ts
deleteRole(
   spaceId, 
   roleId, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:580](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L580)

#### Parameters

##### spaceId

`string`

##### roleId

`number`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### encodedUpdateChannelData()

```ts
encodedUpdateChannelData(space, params): Promise<BytesLike[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1212](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1212)

#### Parameters

##### space

[`Space`](Space.md)

##### params

[`UpdateChannelParams`](../type-aliases/UpdateChannelParams.md)

#### Returns

`Promise`\<`BytesLike`[]\>

***

### getChannelDetails()

```ts
getChannelDetails(spaceId, channelNetworkId): Promise<null | ChannelDetails>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:618](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L618)

#### Parameters

##### spaceId

`string`

##### channelNetworkId

`string`

#### Returns

`Promise`\<`null` \| [`ChannelDetails`](../interfaces/ChannelDetails.md)\>

***

### getChannelPermissionOverrides()

```ts
getChannelPermissionOverrides(
   spaceId, 
   roleId, 
channelNetworkId): Promise<Permission[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1308](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1308)

#### Parameters

##### spaceId

`string`

##### roleId

`number`

##### channelNetworkId

`string`

#### Returns

`Promise`\<[`Permission`](../type-aliases/Permission.md)[]\>

***

### getChannels()

```ts
getChannels(spaceId): Promise<ChannelMetadata[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:593](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L593)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<[`ChannelMetadata`](../interfaces/ChannelMetadata.md)[]\>

***

### getEntitledWalletForJoiningSpace()

```ts
getEntitledWalletForJoiningSpace(
   spaceId, 
   rootKey, 
   xchainConfig, 
invalidateCache): Promise<EntitledWallet>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:942](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L942)

Checks if user has a wallet entitled to join a space based on the minter role rule entitlements

#### Parameters

##### spaceId

`string`

##### rootKey

`string`

##### xchainConfig

[`XchainConfig`](../type-aliases/XchainConfig.md)

##### invalidateCache

`boolean` = `false`

#### Returns

`Promise`\<`EntitledWallet`\>

***

### getJoinSpacePriceDetails()

```ts
getJoinSpacePriceDetails(spaceId): Promise<{
  prepaidSupply: BigNumber;
  price: BigNumber;
  remainingFreeSupply: BigNumber;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1507](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1507)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<\{
  `prepaidSupply`: `BigNumber`;
  `price`: `BigNumber`;
  `remainingFreeSupply`: `BigNumber`;
\}\>

***

### getLinkedWallets()

```ts
getLinkedWallets(wallet): Promise<string[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:823](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L823)

#### Parameters

##### wallet

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getLinkedWalletsWithDelegations()

```ts
getLinkedWalletsWithDelegations(wallet, config): Promise<string[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:852](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L852)

#### Parameters

##### wallet

`string`

##### config

[`XchainConfig`](../type-aliases/XchainConfig.md)

#### Returns

`Promise`\<`string`[]\>

***

### getMembershipFreeAllocation()

```ts
getMembershipFreeAllocation(spaceId): Promise<BigNumber>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1582](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1582)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`BigNumber`\>

***

### getMembershipInfo()

```ts
getMembershipInfo(spaceId): Promise<{
  currency: string;
  duration: number;
  feeRecipient: string;
  maxSupply: number;
  prepaidSupply: number;
  price: BigNumber;
  pricingModule: string;
  remainingFreeSupply: number;
  totalSupply: number;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1672](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1672)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<\{
  `currency`: `string`;
  `duration`: `number`;
  `feeRecipient`: `string`;
  `maxSupply`: `number`;
  `prepaidSupply`: `number`;
  `price`: `BigNumber`;
  `pricingModule`: `string`;
  `remainingFreeSupply`: `number`;
  `totalSupply`: `number`;
\}\>

***

### getMembershipStatus()

```ts
getMembershipStatus(spaceId, addresses): Promise<{
  expiredAt?: bigint;
  expiryTime?: bigint;
  isExpired?: boolean;
  isMember: boolean;
  tokenId?: string;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1654](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1654)

#### Parameters

##### spaceId

`string`

##### addresses

`string`[]

#### Returns

`Promise`\<\{
  `expiredAt?`: `bigint`;
  `expiryTime?`: `bigint`;
  `isExpired?`: `boolean`;
  `isMember`: `boolean`;
  `tokenId?`: `string`;
\}\>

***

### getMembershipSupply()

```ts
getMembershipSupply(spaceId): Promise<{
  totalSupply: number;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1662](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1662)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<\{
  `totalSupply`: `number`;
\}\>

***

### getPermissionsByRoleId()

```ts
getPermissionsByRoleId(spaceId, roleId): Promise<Permission[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:631](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L631)

#### Parameters

##### spaceId

`string`

##### roleId

`number`

#### Returns

`Promise`\<[`Permission`](../type-aliases/Permission.md)[]\>

***

### getPrepaidMembershipSupply()

```ts
getPrepaidMembershipSupply(spaceId): Promise<BigNumber>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1473](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1473)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`BigNumber`\>

***

### getRole()

```ts
getRole(spaceId, roleId): Promise<null | RoleDetails>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:639](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L639)

#### Parameters

##### spaceId

`string`

##### roleId

`number`

#### Returns

`Promise`\<`null` \| [`RoleDetails`](../interfaces/RoleDetails.md)\>

***

### getRoles()

```ts
getRoles(spaceId): Promise<BasicRoleInfo[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:647](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L647)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<[`BasicRoleInfo`](../interfaces/BasicRoleInfo.md)[]\>

***

### getSpace()

```ts
getSpace(spaceId): undefined | Space;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1713](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1713)

#### Parameters

##### spaceId

`string`

#### Returns

`undefined` \| [`Space`](Space.md)

***

### getSpaceAddress()

```ts
getSpaceAddress(receipt, senderAddress): undefined | string;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1834](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1834)

Get the space address from the receipt and sender address

#### Parameters

##### receipt

`ContractReceipt`

The receipt from the transaction

##### senderAddress

`string`

The address of the sender. Required for the case of a receipt containing multiple events of the same type.

#### Returns

`undefined` \| `string`

The space address or undefined if the receipt is not successful

***

### getSpaceInfo()

```ts
getSpaceInfo(spaceId): Promise<undefined | SpaceInfo>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:659](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L659)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`undefined` \| [`SpaceInfo`](../interfaces/SpaceInfo.md)\>

***

### getSpaceMembershipTokenAddress()

```ts
getSpaceMembershipTokenAddress(spaceId): Promise<string>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1499](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1499)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`string`\>

***

### getTipEvent()

```ts
getTipEvent(
   spaceId, 
   receipt, 
   senderAddress): undefined | TipEventObject;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1850](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1850)

#### Parameters

##### spaceId

`string`

##### receipt

`ContractReceipt`

##### senderAddress

`string`

#### Returns

`undefined` \| `TipEventObject`

***

### getTokenIdOfOwner()

```ts
getTokenIdOfOwner(
   spaceId, 
   owner, 
config): Promise<undefined | string>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1895](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1895)

Get the token id for the owner
Returns the first token id matched from the linked wallets of the owner

#### Parameters

##### spaceId

`string`

The space id

##### owner

`string`

The owner

##### config

[`XchainConfig`](../type-aliases/XchainConfig.md) = `EmptyXchainConfig`

#### Returns

`Promise`\<`undefined` \| `string`\>

The token id

***

### getWalletLink()

```ts
getWalletLink(): WalletLink;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1709](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1709)

#### Returns

[`WalletLink`](WalletLink.md)

***

### ~~hasSpaceMembership()~~

```ts
hasSpaceMembership(spaceId, addresses): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1645](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1645)

#### Parameters

##### spaceId

`string`

##### addresses

`string`[]

#### Returns

`Promise`\<`boolean`\>

#### Deprecated

use getMembershipStatus instead

***

### isEntitledToChannel()

```ts
isEntitledToChannel(
   spaceId, 
   channelNetworkId, 
   user, 
   permission, 
   xchainConfig, 
invalidateCache): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1046](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1046)

#### Parameters

##### spaceId

`string`

##### channelNetworkId

`string`

##### user

`string`

##### permission

[`Permission`](../type-aliases/Permission.md)

##### xchainConfig

[`XchainConfig`](../type-aliases/XchainConfig.md) = `EmptyXchainConfig`

##### invalidateCache

`boolean` = `false`

#### Returns

`Promise`\<`boolean`\>

***

### isEntitledToChannelUncached()

```ts
isEntitledToChannelUncached(
   spaceId, 
   channelNetworkId, 
   user, 
   permission, 
xchainConfig): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1079](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1079)

#### Parameters

##### spaceId

`string`

##### channelNetworkId

`string`

##### user

`string`

##### permission

[`Permission`](../type-aliases/Permission.md)

##### xchainConfig

[`XchainConfig`](../type-aliases/XchainConfig.md)

#### Returns

`Promise`\<`boolean`\>

***

### isEntitledToSpace()

```ts
isEntitledToSpace(
   spaceId, 
   user, 
   permission, 
invalidateCache): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1006](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1006)

#### Parameters

##### spaceId

`string`

##### user

`string`

##### permission

[`Permission`](../type-aliases/Permission.md)

##### invalidateCache

`boolean` = `false`

#### Returns

`Promise`\<`boolean`\>

***

### isEntitledToSpaceUncached()

```ts
isEntitledToSpaceUncached(
   spaceId, 
   user, 
permission): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1030](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1030)

#### Parameters

##### spaceId

`string`

##### user

`string`

##### permission

[`Permission`](../type-aliases/Permission.md)

#### Returns

`Promise`\<`boolean`\>

***

### isLegacySpace()

```ts
isLegacySpace(spaceId): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:224](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L224)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### joinSpace()

```ts
joinSpace(
   spaceId, 
   recipient, 
   signer, 
   txnOpts?): Promise<
  | {
  issued: true;
  tokenId: string;
}
  | {
  issued: false;
  tokenId: undefined;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1590](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1590)

#### Parameters

##### spaceId

`string`

##### recipient

`string`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<
  \| \{
  `issued`: `true`;
  `tokenId`: `string`;
\}
  \| \{
  `issued`: `false`;
  `tokenId`: `undefined`;
\}\>

***

### legacyCreateRole()

```ts
legacyCreateRole(
   spaceId, 
   roleName, 
   permissions, 
   users, 
   ruleData, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:540](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L540)

#### Parameters

##### spaceId

`string`

##### roleName

`string`

##### permissions

[`Permission`](../type-aliases/Permission.md)[]

##### users

`string`[]

##### ruleData

[`RuleDataStruct`](../namespaces/IRuleEntitlementBase/type-aliases/RuleDataStruct.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### legacyUpdateRole()

```ts
legacyUpdateRole(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1264](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1264)

#### Parameters

##### params

[`LegacyUpdateRoleParams`](../interfaces/LegacyUpdateRoleParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### listenForMembershipEvent()

```ts
listenForMembershipEvent(
   spaceId, 
   receiver, 
   abortController?): Promise<
  | {
  error?: Error;
  issued: true;
  tokenId: string;
}
  | {
  error?: Error;
  issued: false;
  tokenId: undefined;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1871](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1871)

#### Parameters

##### spaceId

`string`

##### receiver

`string`

##### abortController?

`AbortController`

#### Returns

`Promise`\<
  \| \{
  `error?`: `Error`;
  `issued`: `true`;
  `tokenId`: `string`;
\}
  \| \{
  `error?`: `Error`;
  `issued`: `false`;
  `tokenId`: `undefined`;
\}\>

***

### listPricingModules()

```ts
listPricingModules(): Promise<PricingModuleStruct[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1717](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1717)

#### Returns

`Promise`\<[`PricingModuleStruct`](../namespaces/IPricingModulesBase/type-aliases/PricingModuleStruct.md)[]\>

***

### memberTokenURI()

```ts
memberTokenURI(spaceId, tokenId): Promise<string>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:610](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L610)

#### Parameters

##### spaceId

`string`

##### tokenId

`string`

#### Returns

`Promise`\<`string`\>

***

### parseAllContractErrors()

```ts
parseAllContractErrors(args): Error;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1156](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1156)

Attempts to parse an error against all contracts
If you're error is not showing any data with this call, make sure the contract is listed either in parseSpaceError or nonSpaceContracts

#### Parameters

##### args

###### error

`unknown`

###### spaceId?

`string`

#### Returns

`Error`

***

### parseSpaceError()

```ts
parseSpaceError(spaceId, error): Error;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1140](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1140)

#### Parameters

##### spaceId

`string`

##### error

`unknown`

#### Returns

`Error`

***

### parseSpaceFactoryError()

```ts
parseSpaceFactoryError(error): Error;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1131](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1131)

#### Parameters

##### error

`unknown`

#### Returns

`Error`

***

### parseSpaceLogs()

```ts
parseSpaceLogs(spaceId, logs): Promise<(undefined | LogDescription)[]>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1178](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1178)

#### Parameters

##### spaceId

`string`

##### logs

`Log`[]

#### Returns

`Promise`\<(`undefined` \| `LogDescription`)[]\>

***

### prepayMembership()

```ts
prepayMembership(
   spaceId, 
   supply, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1452](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1452)

#### Parameters

##### spaceId

`string`

##### supply

`number`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### refreshMetadata()

```ts
refreshMetadata(
   spaceId, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1813](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1813)

#### Parameters

##### spaceId

`string`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### removeChannel()

```ts
removeChannel(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1249](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1249)

#### Parameters

##### params

[`RemoveChannelParams`](../interfaces/RemoveChannelParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setChannelAccess()

```ts
setChannelAccess(
   spaceId, 
   channelNetworkId, 
   disabled, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1481](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1481)

#### Parameters

##### spaceId

`string`

##### channelNetworkId

`string`

##### disabled

`boolean`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setChannelPermissionOverrides()

```ts
setChannelPermissionOverrides(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1324](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1324)

#### Parameters

##### params

[`SetChannelPermissionOverridesParams`](../interfaces/SetChannelPermissionOverridesParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setMembershipFreeAllocation()

```ts
setMembershipFreeAllocation(
   spaceId, 
   freeAllocation, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1436](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1436)

#### Parameters

##### spaceId

`string`

##### freeAllocation

`number`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setMembershipLimit()

```ts
setMembershipLimit(
   spaceId, 
   limit, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1420](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1420)

#### Parameters

##### spaceId

`string`

##### limit

`number`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setMembershipPrice()

```ts
setMembershipPrice(
   spaceId, 
   priceInWei, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1388](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1388)

#### Parameters

##### spaceId

`string`

##### priceInWei

`BigNumberish`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setMembershipPricingModule()

```ts
setMembershipPricingModule(
   spaceId, 
   pricingModule, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1404](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1404)

#### Parameters

##### spaceId

`string`

##### pricingModule

`string`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### setSpaceAccess()

```ts
setSpaceAccess(
   spaceId, 
   disabled, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1364](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1364)

#### Parameters

##### spaceId

`string`

##### disabled

`boolean`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### tip()

```ts
tip(
   args, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1921](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1921)

Tip a user

#### Parameters

##### args

###### amount

`bigint`

The amount to tip

###### channelId

`string`

The channel id - needs to be hex encoded to 64 characters

###### currency

`string`

The currency to tip - address or 0xEeeeeeeeee... for native currency

###### messageId

`string`

The message id - needs to be hex encoded to 64 characters

###### receiver

`string`

###### spaceId

`string`

The space id

###### tokenId

`string`

The token id to tip. Obtainable from getTokenIdOfOwner

##### signer

`Signer`

The signer to use for the tip

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

The transaction

***

### tokenURI()

```ts
tokenURI(spaceId): Promise<string>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:601](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L601)

#### Parameters

##### spaceId

`string`

#### Returns

`Promise`\<`string`\>

***

### unbanWalletAddress()

```ts
unbanWalletAddress(
   spaceId, 
   walletAddress, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:298](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L298)

#### Parameters

##### spaceId

`string`

##### walletAddress

`string`

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### updateCacheAfterBanOrUnBan()

```ts
updateCacheAfterBanOrUnBan(spaceId, tokenId): void;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:318](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L318)

#### Parameters

##### spaceId

`string`

##### tokenId

`BigNumber`

#### Returns

`void`

***

### updateChannel()

```ts
updateChannel(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1196](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1196)

#### Parameters

##### params

[`UpdateChannelParams`](../type-aliases/UpdateChannelParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### updateRole()

```ts
updateRole(
   params, 
   signer, 
txnOpts?): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1286](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1286)

#### Parameters

##### params

[`UpdateRoleParams`](../interfaces/UpdateRoleParams.md)

##### signer

`Signer`

##### txnOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`ContractTransaction`\>

***

### waitForRoleCreated()

```ts
waitForRoleCreated(spaceId, txn): Promise<{
  error: undefined | Error;
  roleId: undefined | number;
}>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:260](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L260)

#### Parameters

##### spaceId

`string`

##### txn

`ContractTransaction`

#### Returns

`Promise`\<\{
  `error`: `undefined` \| `Error`;
  `roleId`: `undefined` \| `number`;
\}\>

***

### walletAddressIsBanned()

```ts
walletAddressIsBanned(spaceId, walletAddress): Promise<boolean>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:324](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L324)

#### Parameters

##### spaceId

`string`

##### walletAddress

`string`

#### Returns

`Promise`\<`boolean`\>

***

### withdrawSpaceFunds()

```ts
withdrawSpaceFunds(
   spaceId, 
   recipient, 
signer): Promise<ContractTransaction>;
```

Defined in: [packages/web3/src/space-dapp/SpaceDapp.ts:1862](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space-dapp/SpaceDapp.ts#L1862)

#### Parameters

##### spaceId

`string`

##### recipient

`string`

##### signer

`Signer`

#### Returns

`Promise`\<`ContractTransaction`\>
