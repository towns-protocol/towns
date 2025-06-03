# Variable: stateConstraints

```ts
const stateConstraints: Record<SyncState, Set<SyncState>>;
```

Defined in: [packages/sdk/src/syncedStreamsLoop.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/syncedStreamsLoop.ts#L49)

Valid state transitions:
- [*] -\> NotSyncing
- NotSyncing -\> Starting
- Starting -\> Syncing
- Starting -\> Canceling: failed / stop sync
- Starting -\> Retrying: connection error
- Syncing -\> Canceling: connection aborted / stop sync
- Syncing -\> Retrying: connection error
- Syncing -\> Syncing: resync
- Retrying -\> Canceling: stop sync
- Retrying -\> Syncing: resume
- Retrying -\> Retrying: still retrying
- Canceling -\> NotSyncing

## See

https://www.notion.so/herenottherelabs/RFC-Sync-hardening-e0552a4ed68a4d07b42ae34c69ee1bec?pvs=4#861081756f86423ea668c62b9eb76f4b
