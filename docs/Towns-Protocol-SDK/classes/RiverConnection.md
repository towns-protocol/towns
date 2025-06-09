# Class: RiverConnection

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L46)

## theme_extends

- [`PersistedObservable`](PersistedObservable.md)\<[`RiverConnectionModel`](../interfaces/RiverConnectionModel.md)\>

## Constructors

### Constructor

```ts
new RiverConnection(
   store, 
   spaceDapp, 
   riverRegistryDapp, 
   clientParams): RiverConnection;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:58](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L58)

#### Parameters

##### store

[`Store`](Store.md)

##### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

##### riverRegistryDapp

[`RiverRegistry`](../../Towns-Protocol-Web3/classes/RiverRegistry.md)

##### clientParams

[`ClientParams`](../interfaces/ClientParams.md)

#### Returns

`RiverConnection`

#### Overrides

[`PersistedObservable`](PersistedObservable.md).[`constructor`](PersistedObservable.md#constructor)

## Properties

### \_value

```ts
protected _value: PersistedModel;
```

Defined in: [packages/sdk/src/observable/observable.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L11)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`_value`](PersistedObservable.md#_value)

***

### authStatus

```ts
authStatus: Observable<AuthStatus>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L49)

***

### client?

```ts
optional client: TransactionalClient;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L47)

***

### clientParams

```ts
clientParams: ClientParams;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:62](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L62)

***

### loadPriority

```ts
protected readonly loadPriority: LoadPriority;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L48)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`loadPriority`](PersistedObservable.md#loadpriority)

***

### loginError?

```ts
optional loginError: Error;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L50)

***

### newUserMetadata?

```ts
optional newUserMetadata: object;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:55](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L55)

#### spaceId

```ts
spaceId: string | Uint8Array<ArrayBufferLike>;
```

***

### riverChain

```ts
riverChain: RiverChain;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L48)

***

### riverRegistryDapp

```ts
riverRegistryDapp: RiverRegistry;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L61)

***

### spaceDapp

```ts
spaceDapp: SpaceDapp;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:60](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L60)

***

### store

```ts
protected readonly store: Store;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L47)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`store`](PersistedObservable.md#store)

***

### subscribers

```ts
protected subscribers: Subscription<PersistedModel<RiverConnectionModel>>[] = [];
```

Defined in: [packages/sdk/src/observable/observable.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L10)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`subscribers`](PersistedObservable.md#subscribers)

***

### tableName

```ts
protected tableName: string = '';
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L46)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`tableName`](PersistedObservable.md#tablename)

## Accessors

### data

#### Get Signature

```ts
get data(): T;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L83)

##### Returns

`T`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`data`](PersistedObservable.md#data)

***

### userId

#### Get Signature

```ts
get userId(): string;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:74](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L74)

##### Returns

`string`

***

### value

#### Get Signature

```ts
get value(): PersistedModel<T>;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L75)

##### Returns

[`PersistedModel`](../type-aliases/PersistedModel.md)\<`T`\>

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`value`](PersistedObservable.md#value)

## Methods

### call()

```ts
call<T>(fn): Promise<T>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:108](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L108)

#### Type Parameters

##### T

`T`

#### Parameters

##### fn

(`client`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### callWithStream()

```ts
callWithStream<T>(streamId, fn): Promise<T>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:130](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L130)

#### Type Parameters

##### T

`T`

#### Parameters

##### streamId

`string`

##### fn

(`client`, `stream`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

***

### load()

```ts
protected load(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L57)

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`load`](PersistedObservable.md#load)

***

### login()

```ts
login(newUserMetadata?): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:186](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L186)

#### Parameters

##### newUserMetadata?

###### spaceId

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

***

### onLoaded()

```ts
protected onLoaded(): void;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L70)

#### Returns

`void`

#### Overrides

[`PersistedObservable`](PersistedObservable.md).[`onLoaded`](PersistedObservable.md#onloaded)

***

### onSaved()

```ts
protected onSaved(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L113)

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`onSaved`](PersistedObservable.md#onsaved)

***

### registerView()

```ts
registerView(viewFn): void;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:134](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L134)

#### Parameters

##### viewFn

[`onClientStartedFn`](../type-aliases/onClientStartedFn.md)

#### Returns

`void`

***

### setData()

```ts
setData(newDataPartial): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L88)

#### Parameters

##### newDataPartial

`Partial`\<`T`\>

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`setData`](PersistedObservable.md#setdata)

***

### setValue()

```ts
setValue(_newValue): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L79)

#### Parameters

##### \_newValue

[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`RiverConnectionModel`](../interfaces/RiverConnectionModel.md)\>

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`setValue`](PersistedObservable.md#setvalue)

***

### start()

```ts
start(): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:77](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L77)

#### Returns

`Promise`\<`void`\>

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L94)

#### Returns

`Promise`\<`void`\>

***

### subscribe()

```ts
subscribe(subscriber, opts): () => void;
```

Defined in: [packages/sdk/src/observable/observable.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L27)

#### Parameters

##### subscriber

(`newValue`, `prevValue`) => `void`

##### opts

###### condition?

(`value`) => `boolean`

###### fireImediately?

`boolean`

###### once?

`boolean`

#### Returns

```ts
(): void;
```

##### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`subscribe`](PersistedObservable.md#subscribe)

***

### unsubscribe()

```ts
unsubscribe(subscriber): void;
```

Defined in: [packages/sdk/src/observable/observable.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L65)

#### Parameters

##### subscriber

(`value`, `prevValue`) => `void`

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`unsubscribe`](PersistedObservable.md#unsubscribe)

***

### when()

```ts
when(condition, opts): Promise<PersistedModel<RiverConnectionModel>>;
```

Defined in: [packages/sdk/src/observable/observable.ts:45](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L45)

#### Parameters

##### condition

(`value`) => `boolean`

##### opts

###### description?

`string`

###### timeoutMs

`number`

#### Returns

`Promise`\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`RiverConnectionModel`](../interfaces/RiverConnectionModel.md)\>\>

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`when`](PersistedObservable.md#when)

***

### withStream()

```ts
withStream(streamId): object;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/riverConnection.ts:117](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/riverConnection.ts#L117)

#### Parameters

##### streamId

`string`

#### Returns

`object`

##### call()

```ts
call: <T>(fn) => Promise<T>;
```

###### Type Parameters

###### T

`T`

###### Parameters

###### fn

(`client`, `stream`) => `Promise`\<`T`\>

###### Returns

`Promise`\<`T`\>
