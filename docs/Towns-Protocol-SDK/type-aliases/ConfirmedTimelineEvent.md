# Type Alias: ConfirmedTimelineEvent

```ts
type ConfirmedTimelineEvent = Omit<StreamTimelineEvent, "remoteEvent" | "confirmedEventNum" | "miniblockNum"> & object;
```

Defined in: [packages/sdk/src/types.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/types.ts#L93)

## Type declaration

### confirmedEventNum

```ts
confirmedEventNum: bigint;
```

### miniblockNum

```ts
miniblockNum: bigint;
```

### remoteEvent

```ts
remoteEvent: ParsedEvent;
```
