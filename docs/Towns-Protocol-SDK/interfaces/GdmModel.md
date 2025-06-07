# Interface: GdmModel

Defined in: [packages/sdk/src/sync-agent/gdms/models/gdm.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/gdms/models/gdm.ts#L15)

## theme_extends

- [`Identifiable`](Identifiable.md)

## Properties

### id

```ts
id: string;
```

Defined in: [packages/sdk/src/sync-agent/gdms/models/gdm.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/gdms/models/gdm.ts#L17)

The id of the DM.

#### Overrides

[`Identifiable`](Identifiable.md).[`id`](Identifiable.md#id)

***

### initialized

```ts
initialized: boolean;
```

Defined in: [packages/sdk/src/sync-agent/gdms/models/gdm.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/gdms/models/gdm.ts#L19)

Whether the SyncAgent has loaded this data.

***

### isJoined

```ts
isJoined: boolean;
```

Defined in: [packages/sdk/src/sync-agent/gdms/models/gdm.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/gdms/models/gdm.ts#L21)

Whether the current user has joined the DM.

***

### metadata?

```ts
optional metadata: ChannelProperties;
```

Defined in: [packages/sdk/src/sync-agent/gdms/models/gdm.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/gdms/models/gdm.ts#L23)

The metadata of the DM.

#### See

ChannelProperties
