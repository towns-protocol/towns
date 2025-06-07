# Class: Space

Defined in: [packages/web3/src/space/Space.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L48)

## Constructors

### Constructor

```ts
new Space(
   address, 
   spaceId, 
   config, 
   provider): Space;
```

Defined in: [packages/web3/src/space/Space.ts:69](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L69)

#### Parameters

##### address

`string`

##### spaceId

`string`

##### config

[`BaseChainConfig`](../interfaces/BaseChainConfig.md)

##### provider

`Provider`

#### Returns

`Space`

## Properties

### provider

```ts
readonly provider: Provider;
```

Defined in: [packages/web3/src/space/Space.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L52)

## Accessors

### Address

#### Get Signature

```ts
get Address(): string;
```

Defined in: [packages/web3/src/space/Space.ts:117](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L117)

##### Returns

`string`

***

### Banning

#### Get Signature

```ts
get Banning(): IBanningShim;
```

Defined in: [packages/web3/src/space/Space.ts:153](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L153)

##### Returns

[`IBanningShim`](IBanningShim.md)

***

### Channels

#### Get Signature

```ts
get Channels(): IChannelShim;
```

Defined in: [packages/web3/src/space/Space.ts:125](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L125)

##### Returns

[`IChannelShim`](IChannelShim.md)

***

### EntitlementDataQueryable

#### Get Signature

```ts
get EntitlementDataQueryable(): IEntitlementDataQueryableShim;
```

Defined in: [packages/web3/src/space/Space.ts:161](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L161)

##### Returns

[`IEntitlementDataQueryableShim`](IEntitlementDataQueryableShim.md)

***

### Entitlements

#### Get Signature

```ts
get Entitlements(): IEntitlementsShim;
```

Defined in: [packages/web3/src/space/Space.ts:145](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L145)

##### Returns

[`IEntitlementsShim`](IEntitlementsShim.md)

***

### ERC721A

#### Get Signature

```ts
get ERC721A(): IERC721AShim;
```

Defined in: [packages/web3/src/space/Space.ts:169](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L169)

##### Returns

[`IERC721AShim`](IERC721AShim.md)

***

### ERC721AQueryable

#### Get Signature

```ts
get ERC721AQueryable(): IERC721AQueryableShim;
```

Defined in: [packages/web3/src/space/Space.ts:157](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L157)

##### Returns

[`IERC721AQueryableShim`](IERC721AQueryableShim.md)

***

### Membership

#### Get Signature

```ts
get Membership(): IMembershipShim;
```

Defined in: [packages/web3/src/space/Space.ts:149](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L149)

##### Returns

[`IMembershipShim`](IMembershipShim.md)

***

### Multicall

#### Get Signature

```ts
get Multicall(): IMulticallShim;
```

Defined in: [packages/web3/src/space/Space.ts:129](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L129)

##### Returns

[`IMulticallShim`](IMulticallShim.md)

***

### Ownable

#### Get Signature

```ts
get Ownable(): OwnableFacetShim;
```

Defined in: [packages/web3/src/space/Space.ts:133](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L133)

##### Returns

[`OwnableFacetShim`](OwnableFacetShim.md)

***

### Pausable

#### Get Signature

```ts
get Pausable(): TokenPausableFacetShim;
```

Defined in: [packages/web3/src/space/Space.ts:137](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L137)

##### Returns

[`TokenPausableFacetShim`](TokenPausableFacetShim.md)

***

### Prepay

#### Get Signature

```ts
get Prepay(): IPrepayShim;
```

Defined in: [packages/web3/src/space/Space.ts:165](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L165)

##### Returns

[`IPrepayShim`](IPrepayShim.md)

***

### Review

#### Get Signature

```ts
get Review(): IReviewShim;
```

Defined in: [packages/web3/src/space/Space.ts:177](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L177)

##### Returns

[`IReviewShim`](IReviewShim.md)

***

### Roles

#### Get Signature

```ts
get Roles(): IRolesShim;
```

Defined in: [packages/web3/src/space/Space.ts:141](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L141)

##### Returns

[`IRolesShim`](IRolesShim.md)

***

### SpaceId

#### Get Signature

```ts
get SpaceId(): string;
```

Defined in: [packages/web3/src/space/Space.ts:121](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L121)

##### Returns

`string`

***

### Tipping

#### Get Signature

```ts
get Tipping(): ITippingShim;
```

Defined in: [packages/web3/src/space/Space.ts:173](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L173)

##### Returns

[`ITippingShim`](ITippingShim.md)

***

### Treasury

#### Get Signature

```ts
get Treasury(): ITreasuryShim;
```

Defined in: [packages/web3/src/space/Space.ts:181](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L181)

##### Returns

[`ITreasuryShim`](ITreasuryShim.md)

## Methods

### \_\_expensivelyGetMembers()

```ts
__expensivelyGetMembers(untilTokenId?): Promise<string[]>;
```

Defined in: [packages/web3/src/space/Space.ts:618](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L618)

This function is potentially expensive and should be used with caution.
For example, a space with 1000 members will make 1000 + 1 calls to the blockchain.

#### Parameters

##### untilTokenId?

`BigNumberish`

The token id to stop at, if not provided, will get all members

#### Returns

`Promise`\<`string`[]\>

An array of member addresses

***

### findEntitlementByType()

```ts
findEntitlementByType(entitlementType): Promise<null | EntitlementShim>;
```

Defined in: [packages/web3/src/space/Space.ts:298](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L298)

#### Parameters

##### entitlementType

[`EntitlementModuleType`](../enumerations/EntitlementModuleType.md)

#### Returns

`Promise`\<`null` \| [`EntitlementShim`](../type-aliases/EntitlementShim.md)\>

***

### getChannel()

```ts
getChannel(channelNetworkId): Promise<null | ChannelDetails>;
```

Defined in: [packages/web3/src/space/Space.ts:221](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L221)

#### Parameters

##### channelNetworkId

`string`

#### Returns

`Promise`\<`null` \| [`ChannelDetails`](../interfaces/ChannelDetails.md)\>

***

### getChannelMetadata()

```ts
getChannelMetadata(channelNetworkId): Promise<null | ChannelMetadata>;
```

Defined in: [packages/web3/src/space/Space.ts:240](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L240)

#### Parameters

##### channelNetworkId

`string`

#### Returns

`Promise`\<`null` \| [`ChannelMetadata`](../interfaces/ChannelMetadata.md)\>

***

### getChannelRoles()

```ts
getChannelRoles(channelNetworkId): Promise<RoleStructOutput[]>;
```

Defined in: [packages/web3/src/space/Space.ts:269](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L269)

#### Parameters

##### channelNetworkId

`string`

#### Returns

`Promise`\<[`RoleStructOutput`](../namespaces/IRolesBase/type-aliases/RoleStructOutput.md)[]\>

***

### getChannels()

```ts
getChannels(): Promise<ChannelMetadata[]>;
```

Defined in: [packages/web3/src/space/Space.ts:254](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L254)

#### Returns

`Promise`\<[`ChannelMetadata`](../interfaces/ChannelMetadata.md)[]\>

***

### getEntitlementDetails()

```ts
getEntitlementDetails(entitlementShims, roleId): Promise<EntitlementDetails>;
```

Defined in: [packages/web3/src/space/Space.ts:391](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L391)

#### Parameters

##### entitlementShims

[`EntitlementShim`](../type-aliases/EntitlementShim.md)[]

##### roleId

`BigNumberish`

#### Returns

`Promise`\<[`EntitlementDetails`](../interfaces/EntitlementDetails.md)\>

***

### getEntitlementShims()

```ts
getEntitlementShims(): Promise<EntitlementShim[]>;
```

Defined in: [packages/web3/src/space/Space.ts:380](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L380)

#### Returns

`Promise`\<[`EntitlementShim`](../type-aliases/EntitlementShim.md)[]\>

***

### getMembershipRenewalPrice()

```ts
getMembershipRenewalPrice(tokenId): Promise<bigint>;
```

Defined in: [packages/web3/src/space/Space.ts:590](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L590)

#### Parameters

##### tokenId

`string`

#### Returns

`Promise`\<`bigint`\>

***

### getMembershipStatus()

```ts
getMembershipStatus(wallets): Promise<{
  expiredAt?: bigint;
  expiryTime?: bigint;
  isExpired?: boolean;
  isMember: boolean;
  tokenId?: string;
}>;
```

Defined in: [packages/web3/src/space/Space.ts:503](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L503)

#### Parameters

##### wallets

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

### getPermissionsByRoleId()

```ts
getPermissionsByRoleId(roleId): Promise<Permission[]>;
```

Defined in: [packages/web3/src/space/Space.ts:279](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L279)

#### Parameters

##### roleId

`number`

#### Returns

`Promise`\<[`Permission`](../type-aliases/Permission.md)[]\>

***

### getProtocolFee()

```ts
getProtocolFee(): Promise<bigint>;
```

Defined in: [packages/web3/src/space/Space.ts:608](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L608)

#### Returns

`Promise`\<`bigint`\>

***

### getRole()

```ts
getRole(roleId): Promise<null | RoleDetails>;
```

Defined in: [packages/web3/src/space/Space.ts:199](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L199)

#### Parameters

##### roleId

`BigNumberish`

#### Returns

`Promise`\<`null` \| [`RoleDetails`](../interfaces/RoleDetails.md)\>

***

### getRoleEntitlements()

```ts
getRoleEntitlements(entitlementShims, roleId): Promise<null | RoleEntitlements>;
```

Defined in: [packages/web3/src/space/Space.ts:465](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L465)

#### Parameters

##### entitlementShims

[`EntitlementShim`](../type-aliases/EntitlementShim.md)[]

##### roleId

`BigNumberish`

#### Returns

`Promise`\<`null` \| [`RoleEntitlements`](../interfaces/RoleEntitlements.md)\>

***

### getTokenIdsOfOwner()

```ts
getTokenIdsOfOwner(wallets): Promise<string[]>;
```

Defined in: [packages/web3/src/space/Space.ts:486](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L486)

#### Parameters

##### wallets

`string`[]

#### Returns

`Promise`\<`string`[]\>

***

### parseError()

```ts
parseError(error): Error;
```

Defined in: [packages/web3/src/space/Space.ts:308](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L308)

#### Parameters

##### error

`unknown`

#### Returns

`Error`

***

### parseLog()

```ts
parseLog(log): LogDescription;
```

Defined in: [packages/web3/src/space/Space.ts:326](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L326)

#### Parameters

##### log

`Log`

#### Returns

`LogDescription`

***

### renewMembership()

```ts
renewMembership<T>(args): Promise<T extends undefined ? ContractTransaction : T>;
```

Defined in: [packages/web3/src/space/Space.ts:594](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L594)

#### Type Parameters

##### T

`T` = `ContractTransaction`

#### Parameters

##### args

###### overrideExecution?

[`OverrideExecution`](../type-aliases/OverrideExecution.md)\<`T`\>

###### signer

`Signer`

###### tokenId

`string`

###### transactionOpts?

[`TransactionOpts`](../interfaces/TransactionOpts.md)

#### Returns

`Promise`\<`T` *extends* `undefined` ? `ContractTransaction` : `T`\>

***

### totalTips()

```ts
totalTips(__namedParameters): Promise<{
  amount: bigint;
  count: bigint;
}>;
```

Defined in: [packages/web3/src/space/Space.ts:185](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/space/Space.ts#L185)

#### Parameters

##### \_\_namedParameters

###### currency

`string`

#### Returns

`Promise`\<\{
  `amount`: `bigint`;
  `count`: `bigint`;
\}\>
