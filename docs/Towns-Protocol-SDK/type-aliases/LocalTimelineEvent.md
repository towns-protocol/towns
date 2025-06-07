# Type Alias: LocalTimelineEvent

```ts
type LocalTimelineEvent = Omit<StreamTimelineEvent, "localEvent"> & object;
```

Defined in: [packages/sdk/src/types.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/types.ts#L89)

## Type declaration

### localEvent

```ts
localEvent: LocalEvent;
```
