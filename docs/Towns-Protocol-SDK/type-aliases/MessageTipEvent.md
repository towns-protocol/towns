# Type Alias: MessageTipEvent

```ts
type MessageTipEvent = Omit<TimelineEvent, "content"> & object;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:489](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L489)

## Type declaration

### content

```ts
content: TipEvent;
```
