# Interface: SpaceModel

Defined in: [packages/sdk/src/sync-agent/spaces/models/space.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/space.ts#L18)

## theme_extends

- [`Identifiable`](Identifiable.md)

## Properties

### channelIds

```ts
channelIds: string[];
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/space.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/space.ts#L24)

The ids of the channels in the space.

***

### id

```ts
id: string;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/space.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/space.ts#L20)

The River `spaceId` of the space.

#### Overrides

[`Identifiable`](Identifiable.md).[`id`](Identifiable.md#id)

***

### initialized

```ts
initialized: boolean;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/space.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/space.ts#L22)

Whether the SyncAgent has loaded this space data.

***

### metadata?

```ts
optional metadata: SpaceInfo;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/space.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/space.ts#L26)

The space metadata [SpaceInfo](../../Towns-Protocol-Web3/interfaces/SpaceInfo.md).
