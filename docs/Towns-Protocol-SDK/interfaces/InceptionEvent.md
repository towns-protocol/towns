# Interface: InceptionEvent

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:155](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L155)

## Properties

### creatorId

```ts
creatorId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:157](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L157)

***

### kind

```ts
kind: Inception;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:156](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L156)

***

### spaceId?

```ts
optional spaceId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:159](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L159)

***

### type?

```ts
optional type: 
  | "miniblockHeader"
  | "memberPayload"
  | "spacePayload"
  | "channelPayload"
  | "userPayload"
  | "userSettingsPayload"
  | "userMetadataPayload"
  | "userInboxPayload"
  | "mediaPayload"
  | "dmChannelPayload"
  | "gdmChannelPayload";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:158](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L158)
