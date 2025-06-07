# Interface: LoadedStream

Defined in: [packages/sdk/src/persistenceStore.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L28)

## Properties

### cleartexts

```ts
cleartexts: 
  | undefined
| Record<string, string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L31)

***

### miniblocks

```ts
miniblocks: ParsedMiniblock[];
```

Defined in: [packages/sdk/src/persistenceStore.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L30)

***

### persistedSyncedStream

```ts
persistedSyncedStream: ParsedPersistedSyncedStream;
```

Defined in: [packages/sdk/src/persistenceStore.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L29)

***

### prependedMiniblocks

```ts
prependedMiniblocks: ParsedMiniblock[];
```

Defined in: [packages/sdk/src/persistenceStore.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L33)

***

### prevSnapshotMiniblockNum

```ts
prevSnapshotMiniblockNum: bigint;
```

Defined in: [packages/sdk/src/persistenceStore.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L34)

***

### snapshot

```ts
snapshot: Snapshot;
```

Defined in: [packages/sdk/src/persistenceStore.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L32)
