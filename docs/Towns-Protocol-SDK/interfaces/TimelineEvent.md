# Interface: TimelineEvent

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L39)

## Properties

### confirmedEventNum?

```ts
optional confirmedEventNum: bigint;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:53](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L53)

***

### confirmedInBlockNum?

```ts
optional confirmedInBlockNum: bigint;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L54)

***

### content

```ts
content: 
  | undefined
  | TimelineEvent_OneOf;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L48)

***

### createdAtEpochMs

```ts
createdAtEpochMs: number;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L46)

***

### eventId

```ts
eventId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L40)

***

### eventNum

```ts
eventNum: bigint;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L42)

***

### fallbackContent

```ts
fallbackContent: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L49)

***

### isEncrypting

```ts
isEncrypting: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L50)

***

### isLocalPending

```ts
isLocalPending: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L51)

***

### isMentioned

```ts
isMentioned: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:58](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L58)

***

### isRedacted

```ts
isRedacted: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:59](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L59)

***

### isSendFailed

```ts
isSendFailed: boolean;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L52)

***

### latestEventId

```ts
latestEventId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L43)

***

### latestEventNum

```ts
latestEventNum: bigint;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L44)

***

### localEventId?

```ts
optional localEventId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L41)

***

### reactionParentId?

```ts
optional reactionParentId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L57)

***

### replyParentId?

```ts
optional replyParentId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L56)

***

### sender

```ts
sender: object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L60)

#### id

```ts
id: string;
```

***

### sessionId?

```ts
optional sessionId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L63)

***

### status

```ts
status: EventStatus;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L45)

***

### threadParentId?

```ts
optional threadParentId: string;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:55](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L55)

***

### updatedAtEpochMs?

```ts
optional updatedAtEpochMs: number;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L47)
