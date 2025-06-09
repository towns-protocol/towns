# Class: PersistenceStore

Defined in: [packages/sdk/src/persistenceStore.ts:112](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L112)

## theme_extends

- `Dexie`

## Implements

- [`IPersistenceStore`](../interfaces/IPersistenceStore.md)

## Constructors

### Constructor

```ts
new PersistenceStore(databaseName): PersistenceStore;
```

Defined in: [packages/sdk/src/persistenceStore.ts:118](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L118)

#### Parameters

##### databaseName

`string`

#### Returns

`PersistenceStore`

#### Overrides

```ts
Dexie.constructor
```

## Properties

### \_allTables

```ts
readonly _allTables: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:811

#### Index Signature

```ts
[name: string]: Table<any, IndexableType, any>
```

#### Inherited from

```ts
Dexie._allTables
```

***

### \_createTransaction()

```ts
_createTransaction: (this, mode, storeNames, dbschema, parentTransaction?) => Transaction;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:815

#### Parameters

##### this

`Dexie`

##### mode

`IDBTransactionMode`

##### storeNames

`ArrayLike`\<`string`\>

##### dbschema

`DbSchema`

##### parentTransaction?

`null` | `Transaction`

#### Returns

`Transaction`

#### Inherited from

```ts
Dexie._createTransaction
```

***

### \_dbSchema

```ts
_dbSchema: DbSchema;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:817

#### Inherited from

```ts
Dexie._dbSchema
```

***

### \_novip

```ts
readonly _novip: Dexie;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:816

#### Inherited from

```ts
Dexie._novip
```

***

### cleartexts

```ts
cleartexts: Table<{
  cleartext: string | Uint8Array<ArrayBufferLike>;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L113)

***

### Collection

```ts
Collection: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:862

#### prototype

```ts
prototype: Collection;
```

#### Inherited from

```ts
Dexie.Collection
```

***

### core

```ts
readonly core: DBCore;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:814

#### Inherited from

```ts
Dexie.core
```

***

### miniblocks

```ts
miniblocks: Table<{
  data: Uint8Array;
  miniblockNum: string;
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:115](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L115)

***

### name

```ts
readonly name: string;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:807

#### Inherited from

```ts
Dexie.name
```

***

### on

```ts
on: DbEvents;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:819

#### Inherited from

```ts
Dexie.on
```

***

### snapshots

```ts
snapshots: Table<{
  data: {
     miniblockNum: bigint;
     snapshot: Uint8Array;
  };
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:116](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L116)

***

### syncedStreams

```ts
syncedStreams: Table<{
  data: Uint8Array;
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:114](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L114)

***

### Table

```ts
Table: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:850

#### prototype

```ts
prototype: Table;
```

#### Inherited from

```ts
Dexie.Table
```

***

### tables

```ts
readonly tables: Table<any, any, any>[];
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:808

#### Inherited from

```ts
Dexie.tables
```

***

### Transaction

```ts
Transaction: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:859

#### prototype

```ts
prototype: Transaction;
```

#### Inherited from

```ts
Dexie.Transaction
```

***

### verno

```ts
readonly verno: number;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:809

#### Inherited from

```ts
Dexie.verno
```

***

### Version

```ts
Version: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:856

#### prototype

```ts
prototype: Version;
```

#### Inherited from

```ts
Dexie.Version
```

***

### vip

```ts
readonly vip: Dexie;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:810

#### Inherited from

```ts
Dexie.vip
```

***

### WhereClause

```ts
WhereClause: object;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:853

#### prototype

```ts
prototype: WhereClause;
```

#### Inherited from

```ts
Dexie.WhereClause
```

***

### AbortError

```ts
static AbortError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.AbortError
```

***

### addons

```ts
static addons: (db) => void[];
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1088

#### Parameters

##### db

`Dexie`

#### Returns

`void`

#### Inherited from

```ts
Dexie.addons
```

***

### BulkError

```ts
static BulkError: BulkErrorConstructor;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1000

#### Inherited from

```ts
Dexie.BulkError
```

***

### cache

```ts
static cache: GlobalQueryCache;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1113

#### Inherited from

```ts
Dexie.cache
```

***

### ConstraintError

```ts
static ConstraintError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.ConstraintError
```

***

### currentTransaction

```ts
static currentTransaction: Transaction;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1091

#### Inherited from

```ts
Dexie.currentTransaction
```

***

### DatabaseClosedError

```ts
static DatabaseClosedError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.DatabaseClosedError
```

***

### DataCloneError

```ts
static DataCloneError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.DataCloneError
```

***

### DataError

```ts
static DataError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.DataError
```

***

### debug

```ts
static debug: boolean | "dexie";
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1114

#### Inherited from

```ts
Dexie.debug
```

***

### default

```ts
static default: Dexie;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1112

#### Inherited from

```ts
Dexie.default
```

***

### dependencies

```ts
static dependencies: DexieDOMDependencies;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1111

#### Inherited from

```ts
Dexie.dependencies
```

***

### DexieError

```ts
static DexieError: DexieErrorConstructor;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:998

#### Inherited from

```ts
Dexie.DexieError
```

***

### disableBfCache?

```ts
static optional disableBfCache: boolean;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1097

#### Inherited from

```ts
Dexie.disableBfCache
```

***

### errnames

```ts
static errnames: DexieErrors;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1120

#### Inherited from

```ts
Dexie.errnames
```

***

### Events()

```ts
static Events: (ctx?) => DexieEventSet;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1118

#### Parameters

##### ctx?

`any`

#### Returns

`DexieEventSet`

#### Inherited from

```ts
Dexie.Events
```

***

### ForeignAwaitError

```ts
static ForeignAwaitError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.ForeignAwaitError
```

***

### InternalError

```ts
static InternalError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.InternalError
```

***

### InvalidAccessError

```ts
static InvalidAccessError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.InvalidAccessError
```

***

### InvalidArgumentError

```ts
static InvalidArgumentError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.InvalidArgumentError
```

***

### InvalidStateError

```ts
static InvalidStateError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.InvalidStateError
```

***

### InvalidTableError

```ts
static InvalidTableError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.InvalidTableError
```

***

### maxKey

```ts
static maxKey: string | void[][];
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1107

#### Inherited from

```ts
Dexie.maxKey
```

***

### minKey

```ts
static minKey: number;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1108

#### Inherited from

```ts
Dexie.minKey
```

***

### MissingAPIError

```ts
static MissingAPIError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.MissingAPIError
```

***

### ModifyError

```ts
static ModifyError: ModifyErrorConstructor;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:999

#### Inherited from

```ts
Dexie.ModifyError
```

***

### NoSuchDatabaseError

```ts
static NoSuchDatabaseError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.NoSuchDatabaseError
```

***

### NotFoundError

```ts
static NotFoundError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.NotFoundError
```

***

### on

```ts
static on: GlobalDexieEvents;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1119

#### Inherited from

```ts
Dexie.on
```

***

### OpenFailedError

```ts
static OpenFailedError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.OpenFailedError
```

***

### PrematureCommitError

```ts
static PrematureCommitError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.PrematureCommitError
```

***

### Promise

```ts
static Promise: PromiseExtendedConstructor;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1115

#### Inherited from

```ts
Dexie.Promise
```

***

### QuotaExceededError

```ts
static QuotaExceededError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.QuotaExceededError
```

***

### ReadOnlyError

```ts
static ReadOnlyError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.ReadOnlyError
```

***

### SchemaError

```ts
static SchemaError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.SchemaError
```

***

### semVer

```ts
static semVer: string;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1090

#### Inherited from

```ts
Dexie.semVer
```

***

### SubTransactionError

```ts
static SubTransactionError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.SubTransactionError
```

***

### TimeoutError

```ts
static TimeoutError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.TimeoutError
```

***

### TransactionInactiveError

```ts
static TransactionInactiveError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.TransactionInactiveError
```

***

### UnknownError

```ts
static UnknownError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.UnknownError
```

***

### UnsupportedError

```ts
static UnsupportedError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.UnsupportedError
```

***

### UpgradeError

```ts
static UpgradeError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.UpgradeError
```

***

### version

```ts
static version: number;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1089

#### Inherited from

```ts
Dexie.version
```

***

### VersionChangeError

```ts
static VersionChangeError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.VersionChangeError
```

***

### VersionError

```ts
static VersionError: DexieErrorConstructor;
```

#### Inherited from

```ts
Dexie.VersionError
```

## Methods

### backendDB()

```ts
backendDB(): IDBDatabase;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:838

#### Returns

`IDBDatabase`

#### Inherited from

```ts
Dexie.backendDB
```

***

### close()

```ts
close(closeOptions?): void;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:828

#### Parameters

##### closeOptions?

###### disableAutoOpen

`boolean`

#### Returns

`void`

#### Inherited from

```ts
Dexie.close
```

***

### delete()

```ts
delete(closeOptions?): PromiseExtended<void>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:831

#### Parameters

##### closeOptions?

###### disableAutoOpen

`boolean`

#### Returns

`PromiseExtended`\<`void`\>

#### Inherited from

```ts
Dexie.delete
```

***

### dynamicallyOpened()

```ts
dynamicallyOpened(): boolean;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:837

#### Returns

`boolean`

#### Inherited from

```ts
Dexie.dynamicallyOpened
```

***

### getCleartext()

```ts
getCleartext(eventId): Promise<undefined | string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:145](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L145)

#### Parameters

##### eventId

`string`

#### Returns

`Promise`\<`undefined` \| `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getCleartext`](../interfaces/IPersistenceStore.md#getcleartext)

***

### getCleartexts()

```ts
getCleartexts(eventIds): Promise<
  | undefined
| Record<string, string | Uint8Array<ArrayBufferLike>>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:150](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L150)

#### Parameters

##### eventIds

`string`[]

#### Returns

`Promise`\<
  \| `undefined`
  \| `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getCleartexts`](../interfaces/IPersistenceStore.md#getcleartexts)

***

### getMiniblock()

```ts
getMiniblock(streamId, miniblockNum): Promise<undefined | ParsedMiniblock>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:322](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L322)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

#### Returns

`Promise`\<`undefined` \| [`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getMiniblock`](../interfaces/IPersistenceStore.md#getminiblock)

***

### getMiniblocks()

```ts
getMiniblocks(
   streamId, 
   rangeStart, 
rangeEnd): Promise<ParsedMiniblock[]>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:334](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L334)

#### Parameters

##### streamId

`string`

##### rangeStart

`bigint`

##### rangeEnd

`bigint`

#### Returns

`Promise`\<[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getMiniblocks`](../interfaces/IPersistenceStore.md#getminiblocks)

***

### getSnapshot()

```ts
getSnapshot(streamId): Promise<
  | undefined
  | {
  miniblockNum: bigint;
  snapshot: Snapshot;
}>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:372](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L372)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| \{
  `miniblockNum`: `bigint`;
  `snapshot`: `Snapshot`;
\}\>

***

### getSyncedStream()

```ts
getSyncedStream(streamId): Promise<
  | undefined
| ParsedPersistedSyncedStream>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:167](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L167)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`ParsedPersistedSyncedStream`](../interfaces/ParsedPersistedSyncedStream.md)\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`getSyncedStream`](../interfaces/IPersistenceStore.md#getsyncedstream)

***

### hasBeenClosed()

```ts
hasBeenClosed(): boolean;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:835

#### Returns

`boolean`

#### Inherited from

```ts
Dexie.hasBeenClosed
```

***

### hasFailed()

```ts
hasFailed(): boolean;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:836

#### Returns

`boolean`

#### Inherited from

```ts
Dexie.hasFailed
```

***

### isOpen()

```ts
isOpen(): boolean;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:834

#### Returns

`boolean`

#### Inherited from

```ts
Dexie.isOpen
```

***

### loadStream()

```ts
loadStream(streamId, inPersistedSyncedStream?): Promise<undefined | LoadedStream>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:177](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L177)

#### Parameters

##### streamId

`string`

##### inPersistedSyncedStream?

[`ParsedPersistedSyncedStream`](../interfaces/ParsedPersistedSyncedStream.md)

#### Returns

`Promise`\<`undefined` \| [`LoadedStream`](../interfaces/LoadedStream.md)\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`loadStream`](../interfaces/IPersistenceStore.md#loadstream)

***

### loadStreams()

```ts
loadStreams(streamIds): Promise<Record<string, undefined | LoadedStream>>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:250](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L250)

#### Parameters

##### streamIds

`string`[]

#### Returns

`Promise`\<`Record`\<`string`, `undefined` \| [`LoadedStream`](../interfaces/LoadedStream.md)\>\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`loadStreams`](../interfaces/IPersistenceStore.md#loadstreams)

***

### open()

```ts
open(): PromiseExtended<Dexie>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:820

#### Returns

`PromiseExtended`\<`Dexie`\>

#### Inherited from

```ts
Dexie.open
```

***

### saveCleartext()

```ts
saveCleartext(eventId, cleartext): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:141](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L141)

#### Parameters

##### eventId

`string`

##### cleartext

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveCleartext`](../interfaces/IPersistenceStore.md#savecleartext)

***

### saveMiniblock()

```ts
saveMiniblock(streamId, miniblock): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:293](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L293)

#### Parameters

##### streamId

`string`

##### miniblock

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveMiniblock`](../interfaces/IPersistenceStore.md#saveminiblock)

***

### saveMiniblocks()

```ts
saveMiniblocks(
   streamId, 
   miniblocks, 
direction): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:303](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L303)

#### Parameters

##### streamId

`string`

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### direction

`"forward"` | `"backward"`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveMiniblocks`](../interfaces/IPersistenceStore.md#saveminiblocks)

***

### saveSnapshot()

```ts
saveSnapshot(
   streamId, 
   miniblockNum, 
snapshot): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:357](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L357)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

##### snapshot

`Snapshot`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveSnapshot`](../interfaces/IPersistenceStore.md#savesnapshot)

***

### saveSyncedStream()

```ts
saveSyncedStream(streamId, syncedStream): Promise<void>;
```

Defined in: [packages/sdk/src/persistenceStore.ts:285](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/persistenceStore.ts#L285)

#### Parameters

##### streamId

`string`

##### syncedStream

`PersistedSyncedStream`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPersistenceStore`](../interfaces/IPersistenceStore.md).[`saveSyncedStream`](../interfaces/IPersistenceStore.md#savesyncedstream)

***

### table()

```ts
table<T, TKey, TInsertType>(tableName): Table<T, TKey, TInsertType>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:821

#### Type Parameters

##### T

`T` = `any`

##### TKey

`TKey` = `IndexableType`

##### TInsertType

`TInsertType` = `T`

#### Parameters

##### tableName

`string`

#### Returns

`Table`\<`T`, `TKey`, `TInsertType`\>

#### Inherited from

```ts
Dexie.table
```

***

### transaction()

#### Call Signature

```ts
transaction<U>(
   mode, 
   tables, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:822

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### tables

readonly (`string` \| `Table`\<`any`, `any`, `any`\>)[]

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

#### Call Signature

```ts
transaction<U>(
   mode, 
   table, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:823

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### table

`string` | `Table`\<`any`, `any`, `any`\>

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

#### Call Signature

```ts
transaction<U>(
   mode, 
   table, 
   table2, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:824

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### table

`string` | `Table`\<`any`, `any`, `any`\>

###### table2

`string` | `Table`\<`any`, `any`, `any`\>

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

#### Call Signature

```ts
transaction<U>(
   mode, 
   table, 
   table2, 
   table3, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:825

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### table

`string` | `Table`\<`any`, `any`, `any`\>

###### table2

`string` | `Table`\<`any`, `any`, `any`\>

###### table3

`string` | `Table`\<`any`, `any`, `any`\>

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

#### Call Signature

```ts
transaction<U>(
   mode, 
   table, 
   table2, 
   table3, 
   table4, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:826

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### table

`string` | `Table`\<`any`, `any`, `any`\>

###### table2

`string` | `Table`\<`any`, `any`, `any`\>

###### table3

`string` | `Table`\<`any`, `any`, `any`\>

###### table4

`string` | `Table`\<`any`, `any`, `any`\>

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

#### Call Signature

```ts
transaction<U>(
   mode, 
   table, 
   table2, 
   table3, 
   table5, 
scope): PromiseExtended<U>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:827

##### Type Parameters

###### U

`U`

##### Parameters

###### mode

`TransactionMode`

###### table

`string` | `Table`\<`any`, `any`, `any`\>

###### table2

`string` | `Table`\<`any`, `any`, `any`\>

###### table3

`string` | `Table`\<`any`, `any`, `any`\>

###### table5

`string` | `Table`\<`any`, `any`, `any`\>

###### scope

(`trans`) => `U` \| `PromiseLike`\<`U`\>

##### Returns

`PromiseExtended`\<`U`\>

##### Inherited from

```ts
Dexie.transaction
```

***

### unuse()

#### Call Signature

```ts
unuse(__namedParameters): this;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:841

##### Parameters

###### \_\_namedParameters

`Middleware`\<\{
  `stack`: `"dbcore"`;
\}\>

##### Returns

`this`

##### Inherited from

```ts
Dexie.unuse
```

#### Call Signature

```ts
unuse(__namedParameters): this;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:844

##### Parameters

###### \_\_namedParameters

###### name

`string`

###### stack

`"dbcore"`

##### Returns

`this`

##### Inherited from

```ts
Dexie.unuse
```

***

### use()

```ts
use(middleware): this;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:839

#### Parameters

##### middleware

`Middleware`\<`DBCore`\>

#### Returns

`this`

#### Inherited from

```ts
Dexie.use
```

***

### version()

```ts
version(versionNumber): Version;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:818

#### Parameters

##### versionNumber

`number`

#### Returns

`Version`

#### Inherited from

```ts
Dexie.version
```

***

### asap()

```ts
static asap(fn): void;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1106

#### Parameters

##### fn

`Function`

#### Returns

`void`

#### Inherited from

```ts
Dexie.asap
```

***

### deepClone()

```ts
static deepClone<T>(obj): T;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1105

#### Type Parameters

##### T

`T`

#### Parameters

##### obj

`T`

#### Returns

`T`

#### Inherited from

```ts
Dexie.deepClone
```

***

### delByKeyPath()

```ts
static delByKeyPath(obj, keyPath): void;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1103

#### Parameters

##### obj

`Object`

##### keyPath

`string` | `string`[]

#### Returns

`void`

#### Inherited from

```ts
Dexie.delByKeyPath
```

***

### delete()

```ts
static delete(dbName): Promise<void>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1110

#### Parameters

##### dbName

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

```ts
Dexie.delete
```

***

### exists()

```ts
static exists(dbName): Promise<boolean>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1109

#### Parameters

##### dbName

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

```ts
Dexie.exists
```

***

### extendObservabilitySet()

```ts
static extendObservabilitySet(target, newSet): ObservabilitySet;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1099

#### Parameters

##### target

`ObservabilitySet`

##### newSet

`ObservabilitySet`

#### Returns

`ObservabilitySet`

#### Inherited from

```ts
Dexie.extendObservabilitySet
```

***

### getByKeyPath()

```ts
static getByKeyPath(obj, keyPath): any;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1101

#### Parameters

##### obj

`Object`

##### keyPath

`string` | `string`[]

#### Returns

`any`

#### Inherited from

```ts
Dexie.getByKeyPath
```

***

### getDatabaseNames()

#### Call Signature

```ts
static getDatabaseNames(): Promise<string[]>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1093

##### Returns

`Promise`\<`string`[]\>

##### Inherited from

```ts
Dexie.getDatabaseNames
```

#### Call Signature

```ts
static getDatabaseNames<R>(thenShortcut): Promise<R>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1094

##### Type Parameters

###### R

`R`

##### Parameters

###### thenShortcut

`ThenShortcut`\<`string`[], `R`\>

##### Returns

`Promise`\<`R`\>

##### Inherited from

```ts
Dexie.getDatabaseNames
```

***

### ignoreTransaction()

```ts
static ignoreTransaction<U>(fn): U;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1096

#### Type Parameters

##### U

`U`

#### Parameters

##### fn

() => `U`

#### Returns

`U`

#### Inherited from

```ts
Dexie.ignoreTransaction
```

***

### liveQuery()

```ts
static liveQuery<T>(fn): Observable<T>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1098

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `T` \| `Promise`\<`T`\>

#### Returns

`Observable`\<`T`\>

#### Inherited from

```ts
Dexie.liveQuery
```

***

### override()

```ts
static override<F>(origFunc, overridedFactory): F;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1100

#### Type Parameters

##### F

`F`

#### Parameters

##### origFunc

`F`

##### overridedFactory

(`fn`) => `any`

#### Returns

`F`

#### Inherited from

```ts
Dexie.override
```

***

### setByKeyPath()

```ts
static setByKeyPath(
   obj, 
   keyPath, 
   value): void;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1102

#### Parameters

##### obj

`Object`

##### keyPath

`string` | `string`[]

##### value

`any`

#### Returns

`void`

#### Inherited from

```ts
Dexie.setByKeyPath
```

***

### shallowClone()

```ts
static shallowClone<T>(obj): T;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1104

#### Type Parameters

##### T

`T`

#### Parameters

##### obj

`T`

#### Returns

`T`

#### Inherited from

```ts
Dexie.shallowClone
```

***

### vip()

```ts
static vip<U>(scopeFunction): U;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1095

#### Type Parameters

##### U

`U`

#### Parameters

##### scopeFunction

() => `U`

#### Returns

`U`

#### Inherited from

```ts
Dexie.vip
```

***

### waitFor()

```ts
static waitFor<T>(promise, timeoutMilliseconds?): Promise<T>;
```

Defined in: node\_modules/dexie/dist/dexie.d.ts:1092

#### Type Parameters

##### T

`T`

#### Parameters

##### promise

`T` | `PromiseLike`\<`T`\>

##### timeoutMilliseconds?

`number`

#### Returns

`Promise`\<`T`\>

#### Inherited from

```ts
Dexie.waitFor
```
