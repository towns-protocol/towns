# Function: useSyncAgent()

```ts
function useSyncAgent(): SyncAgent;
```

Defined in: [react-sdk/src/useSyncAgent.tsx:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/react-sdk/src/useSyncAgent.tsx#L14)

Hook to get the sync agent from the TownsSyncProvider.

You can use it to interact with the sync agent for more advanced usage.

Throws an error if no sync agent is set in the TownsSyncProvider.

## Returns

[`SyncAgent`](../../Towns-Protocol-SDK/classes/SyncAgent.md)

The sync agent in use, set in TownsSyncProvider.

## Throws

If no sync agent is set, use TownsSyncProvider to set one or use useAgentConnection to check if connected.
