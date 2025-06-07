# Type Alias: RemoteTimelineEvent

```ts
type RemoteTimelineEvent = Omit<StreamTimelineEvent, "remoteEvent"> & object;
```

Defined in: [packages/sdk/src/types.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/types.ts#L85)

## Type declaration

### remoteEvent

```ts
remoteEvent: ParsedEvent;
```
