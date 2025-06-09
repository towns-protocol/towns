# Interface: ChannelModel

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L17)

## theme_extends

- [`Identifiable`](Identifiable.md)

## Properties

### id

```ts
id: string;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L19)

The River `channelId` of the channel.

#### Overrides

[`Identifiable`](Identifiable.md).[`id`](Identifiable.md#id)

***

### isJoined

```ts
isJoined: boolean;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L23)

Whether the SyncAgent has joined this channel.

***

### metadata?

```ts
optional metadata: ChannelDetails;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L25)

The channel metadata [ChannelDetails](../../Towns-Protocol-Web3/interfaces/ChannelDetails.md).

***

### spaceId

```ts
spaceId: string;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L21)

The River `spaceId` which this channel belongs.
