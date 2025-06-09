# Type Alias: DecryptedTimelineEvent

```ts
type DecryptedTimelineEvent = Omit<StreamTimelineEvent, "decryptedContent" | "remoteEvent"> & object;
```

Defined in: [packages/sdk/src/types.ts:102](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/types.ts#L102)

## Type declaration

### decryptedContent

```ts
decryptedContent: DecryptedContent;
```

### remoteEvent

```ts
remoteEvent: ParsedEvent;
```
