# Interface: ChannelDetails

Defined in: [packages/web3/src/types/ContractTypes.ts:137](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L137)

Channel details from multiple contract sources

## Properties

### channelNetworkId

```ts
channelNetworkId: string;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:141](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L141)

The River `channelId` of the channel.

***

### description?

```ts
optional description: string;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:149](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L149)

The description of the channel.

***

### disabled

```ts
disabled: boolean;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:145](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L145)

Whether the channel is disabled.

***

### name

```ts
name: string;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:143](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L143)

The name of the channel.

***

### roles

```ts
roles: RoleEntitlements[];
```

Defined in: [packages/web3/src/types/ContractTypes.ts:147](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L147)

The roles defined for the channel [RoleEntitlements](RoleEntitlements.md).

***

### spaceNetworkId

```ts
spaceNetworkId: string;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:139](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L139)

The River `spaceId` which this channel belongs.
