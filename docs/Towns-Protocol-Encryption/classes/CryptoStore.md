# Class: CryptoStore

Defined in: [packages/encryption/src/cryptoStore.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L17)

## theme_extends

- `Dexie`

## Constructors

### Constructor

```ts
new CryptoStore(databaseName, userId): CryptoStore;
```

Defined in: [packages/encryption/src/cryptoStore.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L25)

#### Parameters

##### databaseName

`string`

##### userId

`string`

#### Returns

`CryptoStore`

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

### account

```ts
account: Table<AccountRecord>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L18)

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

### devices

```ts
devices: Table<UserDeviceRecord>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L22)

***

### hybridGroupSessions

```ts
hybridGroupSessions: Table<HybridGroupSessionRecord>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L21)

***

### inboundGroupSessions

```ts
inboundGroupSessions: Table<ExtendedInboundGroupSessionData>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L20)

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

### outboundGroupSessions

```ts
outboundGroupSessions: Table<GroupSessionRecord>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L19)

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

### userId

```ts
userId: string;
```

Defined in: [packages/encryption/src/cryptoStore.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L23)

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

### deleteAccount()

```ts
deleteAccount(userId): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L49)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

***

### deleteAllData()

```ts
deleteAllData(): void;
```

Defined in: [packages/encryption/src/cryptoStore.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L41)

#### Returns

`void`

***

### deleteInboundGroupSessions()

```ts
deleteInboundGroupSessions(streamId, sessionId): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L45)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

***

### deviceRecordCount()

```ts
deviceRecordCount(): Promise<number>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:152](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L152)

Only used for testing

#### Returns

`Promise`\<`number`\>

total number of devices in the store

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

### getAccount()

```ts
getAccount(): Promise<string>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:53](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L53)

#### Returns

`Promise`\<`string`\>

***

### getAllEndToEndInboundGroupSessions()

```ts
getAllEndToEndInboundGroupSessions(): Promise<ExtendedInboundGroupSessionData[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:104](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L104)

#### Returns

`Promise`\<[`ExtendedInboundGroupSessionData`](../interfaces/ExtendedInboundGroupSessionData.md)[]\>

***

### getAllEndToEndOutboundGroupSessions()

```ts
getAllEndToEndOutboundGroupSessions(): Promise<GroupSessionRecord[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:81](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L81)

#### Returns

`Promise`\<[`GroupSessionRecord`](../interfaces/GroupSessionRecord.md)[]\>

***

### getAllHybridGroupSessions()

```ts
getAllHybridGroupSessions(): Promise<HybridGroupSessionRecord[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:108](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L108)

#### Returns

`Promise`\<[`HybridGroupSessionRecord`](../interfaces/HybridGroupSessionRecord.md)[]\>

***

### getEndToEndInboundGroupSession()

```ts
getEndToEndInboundGroupSession(streamId, sessionId): Promise<
  | undefined
| InboundGroupSessionData>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L85)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`InboundGroupSessionData`](../interfaces/InboundGroupSessionData.md)\>

***

### getEndToEndOutboundGroupSession()

```ts
getEndToEndOutboundGroupSession(streamId): Promise<string>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:73](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L73)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`\>

***

### getHybridGroupSession()

```ts
getHybridGroupSession(streamId, sessionId): Promise<
  | undefined
| HybridGroupSessionRecord>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:92](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L92)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`HybridGroupSessionRecord`](../interfaces/HybridGroupSessionRecord.md)\>

***

### getHybridGroupSessionIds()

```ts
getHybridGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:129](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L129)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getHybridGroupSessionsForStream()

```ts
getHybridGroupSessionsForStream(streamId): Promise<HybridGroupSessionRecord[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:99](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L99)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<[`HybridGroupSessionRecord`](../interfaces/HybridGroupSessionRecord.md)[]\>

***

### getInboundGroupSessionIds()

```ts
getInboundGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:124](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L124)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getUserDevices()

```ts
getUserDevices(userId): Promise<UserDevice[]>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:178](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L178)

Get all stored devices for a given userId

#### Parameters

##### userId

`string`

string

#### Returns

`Promise`\<[`UserDevice`](../interfaces/UserDevice.md)[]\>

UserDevice[], a list of devices

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

### initialize()

```ts
initialize(): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L37)

#### Returns

`Promise`\<`void`\>

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

### saveUserDevices()

```ts
saveUserDevices(
   userId, 
   devices, 
expirationMs): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:162](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L162)

Store a list of devices for a given userId

#### Parameters

##### userId

`string`

string

##### devices

[`UserDevice`](../interfaces/UserDevice.md)[]

UserDeviceInfo[]

##### expirationMs

`number` = `DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS`

Expiration time in milliseconds

#### Returns

`Promise`\<`void`\>

***

### storeAccount()

```ts
storeAccount(accountPickle): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L61)

#### Parameters

##### accountPickle

`string`

#### Returns

`Promise`\<`void`\>

***

### storeEndToEndInboundGroupSession()

```ts
storeEndToEndInboundGroupSession(
   streamId, 
   sessionId, 
sessionData): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:112](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L112)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

##### sessionData

[`InboundGroupSessionData`](../interfaces/InboundGroupSessionData.md)

#### Returns

`Promise`\<`void`\>

***

### storeEndToEndOutboundGroupSession()

```ts
storeEndToEndOutboundGroupSession(
   sessionId, 
   sessionData, 
streamId): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L65)

#### Parameters

##### sessionId

`string`

##### sessionData

`string`

##### streamId

`string`

#### Returns

`Promise`\<`void`\>

***

### storeHybridGroupSession()

```ts
storeHybridGroupSession(sessionData): Promise<void>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:120](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L120)

#### Parameters

##### sessionData

[`HybridGroupSessionRecord`](../interfaces/HybridGroupSessionRecord.md)

#### Returns

`Promise`\<`void`\>

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

### withAccountTx()

```ts
withAccountTx<T>(fn): Promise<T>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:134](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L134)

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### withGroupSessions()

```ts
withGroupSessions<T>(fn): Promise<T>;
```

Defined in: [packages/encryption/src/cryptoStore.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoStore.ts#L138)

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

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
