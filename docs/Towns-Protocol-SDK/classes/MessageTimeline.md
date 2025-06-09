# Class: MessageTimeline

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L21)

## Constructors

### Constructor

```ts
new MessageTimeline(
   streamId, 
   userId, 
   riverConnection): MessageTimeline;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:36](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L36)

#### Parameters

##### streamId

`string`

##### userId

`string`

##### riverConnection

[`RiverConnection`](RiverConnection.md)

#### Returns

`MessageTimeline`

## Properties

### events

```ts
events: TimelineEvents;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L22)

***

### filterFn()

```ts
filterFn: (event, kind) => boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L33)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

##### kind

`undefined` | `"spaceContent"` | `"channelContent"` | `"userContent"` | `"userSettingsContent"` | `"userMetadataContent"` | `"mediaContent"` | `"dmChannelContent"` | `"gdmChannelContent"` | `"userInboxContent"`

#### Returns

`boolean`

***

### pendingReplacedEvents

```ts
pendingReplacedEvents: PendingReplacedEvents;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L24)

***

### reactions

```ts
reactions: Reactions;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L27)

***

### replacedEvents

```ts
replacedEvents: ReplacedEvents;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L23)

***

### threads

```ts
threads: Threads;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L26)

***

### threadsStats

```ts
threadsStats: ThreadStats;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L25)

## Methods

### initialize()

```ts
initialize(stream): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L44)

#### Parameters

##### stream

[`Stream`](Stream.md)

#### Returns

`void`

***

### scrollback()

```ts
scrollback(): Promise<{
  fromInclusiveMiniblockNum: bigint;
  terminus: boolean;
}>;
```

Defined in: [packages/sdk/src/sync-agent/timeline/timeline.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/timeline.ts#L56)

#### Returns

`Promise`\<\{
  `fromInclusiveMiniblockNum`: `bigint`;
  `terminus`: `boolean`;
\}\>
