# Class: SyncAgent

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L44)

## Constructors

### Constructor

```ts
new SyncAgent(config): SyncAgent;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:71](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L71)

#### Parameters

##### config

[`SyncAgentConfig`](../interfaces/SyncAgentConfig.md)

#### Returns

`SyncAgent`

## Properties

### config

```ts
config: SyncAgentConfig;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L47)

***

### dms

```ts
dms: Dms;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:53](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L53)

***

### gdms

```ts
gdms: Gdms;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L52)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L45)

***

### observables

```ts
observables: object;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L57)

#### dms

```ts
dms: PersistedObservable<DmsModel>;
```

#### gdms

```ts
gdms: PersistedObservable<GdmsModel>;
```

#### riverAuthStatus

```ts
riverAuthStatus: Observable<AuthStatus>;
```

#### riverChain

```ts
riverChain: PersistedObservable<RiverChainModel>;
```

#### riverConnection

```ts
riverConnection: PersistedObservable<RiverConnectionModel>;
```

#### spaces

```ts
spaces: PersistedObservable<SpacesModel>;
```

#### user

```ts
user: PersistedObservable<UserModel>;
```

#### userInbox

```ts
userInbox: PersistedObservable<UserInboxModel>;
```

#### userMemberships

```ts
userMemberships: PersistedObservable<UserMembershipsModel>;
```

#### userMetadata

```ts
userMetadata: PersistedObservable<UserMetadataModel>;
```

#### userSettings

```ts
userSettings: PersistedObservable<UserSettingsModel>;
```

***

### riverConnection

```ts
riverConnection: RiverConnection;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L48)

***

### spaces

```ts
spaces: Spaces;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L51)

***

### store

```ts
store: Store;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L49)

***

### user

```ts
user: User;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L50)

***

### userId

```ts
userId: string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L46)

## Methods

### cryptoDbName()

```ts
cryptoDbName(): string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:147](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L147)

#### Returns

`string`

***

### dbName()

```ts
dbName(db): string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:151](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L151)

#### Parameters

##### db

`string`

#### Returns

`string`

***

### persistenceDbName()

```ts
persistenceDbName(): string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:143](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L143)

#### Returns

`string`

***

### start()

```ts
start(): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:121](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L121)

#### Returns

`Promise`\<`void`\>

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:134](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L134)

#### Returns

`Promise`\<`void`\>

***

### syncAgentDbName()

```ts
syncAgentDbName(): string;
```

Defined in: [packages/sdk/src/sync-agent/syncAgent.ts:139](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/syncAgent.ts#L139)

#### Returns

`string`
