# Interface: ThreadResult

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:403](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L403)

## Properties

### channel

```ts
channel: object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:409](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L409)

#### id

```ts
id: string;
```

#### label

```ts
label: string;
```

***

### fullyReadMarker?

```ts
optional fullyReadMarker: object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:407](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L407)

#### beginUnreadWindow

```ts
beginUnreadWindow: bigint;
```

begining of the unread window, on marking as read, number is set to end+1

##### Generated

from field: int64 begin_unread_window = 5;

#### channelId

```ts
channelId: string;
```

##### Generated

from field: string channel_id = 1;

#### endUnreadWindow

```ts
endUnreadWindow: bigint;
```

latest event seen by the code

##### Generated

from field: int64 end_unread_window = 6;

#### eventId

```ts
eventId: string;
```

id of the first unread event in the stream

##### Generated

from field: string event_id = 3;

#### eventNum

```ts
eventNum: bigint;
```

event number of the first unread event in the stream

##### Generated

from field: int64 event_num = 4;

#### isUnread

```ts
isUnread: boolean;
```

##### Generated

from field: bool is_unread = 7;

#### markedReadAtTs

```ts
markedReadAtTs: bigint;
```

timestamp when the event was marked as read

##### Generated

from field: int64 markedReadAtTs = 8;

#### mentions

```ts
mentions: number;
```

##### Generated

from field: int32 mentions = 9;

#### threadParentId?

```ts
optional threadParentId: string;
```

##### Generated

from field: optional string thread_parent_id = 2;

***

### isNew

```ts
isNew: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:405](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L405)

***

### isUnread

```ts
isUnread: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:406](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L406)

***

### thread

```ts
thread: ThreadStatsData;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:408](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L408)

***

### timestamp

```ts
timestamp: number;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:410](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L410)

***

### type

```ts
type: "thread";
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:404](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L404)
