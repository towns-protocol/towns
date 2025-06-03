# Function: getRoom()

```ts
function getRoom(sync, streamId): 
  | Gdm
  | Channel
  | Dm
  | Space;
```

Defined in: [react-sdk/src/utils.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/utils.ts#L14)

## Parameters

### sync

[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)

### streamId

`string`

## Returns

  \| [`Gdm`](../../Towns-Protocol-SDK/classes/Gdm.md)
  \| [`Channel`](../../Towns-Protocol-SDK/classes/Channel.md)
  \| [`Dm`](../../Towns-Protocol-SDK/classes/Dm.md)
  \| [`Space`](../../Towns-Protocol-SDK/classes/Space.md)
