# Class: User

Defined in: [packages/sdk/src/sync-agent/user/user.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L14)

## theme_extends

- [`PersistedObservable`](PersistedObservable.md)\<[`UserModel`](../interfaces/UserModel.md)\>

## Constructors

### Constructor

```ts
new User(
   id, 
   store, 
   riverConnection): User;
```

Defined in: [packages/sdk/src/sync-agent/user/user.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L20)

#### Parameters

##### id

`string`

##### store

[`Store`](Store.md)

##### riverConnection

[`RiverConnection`](RiverConnection.md)

#### Returns

`User`

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

### deviceKeys

```ts
deviceKeys: UserMetadata;
```

Defined in: [packages/sdk/src/sync-agent/user/user.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L17)

***

### inbox

```ts
inbox: UserInbox;
```

Defined in: [packages/sdk/src/sync-agent/user/user.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L16)

***

### loadPriority

```ts
protected readonly loadPriority: LoadPriority;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L48)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`loadPriority`](PersistedObservable.md#loadpriority)

***

### memberships

```ts
memberships: UserMemberships;
```

Defined in: [packages/sdk/src/sync-agent/user/user.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L15)

***

### settings

```ts
settings: UserSettings;
```

Defined in: [packages/sdk/src/sync-agent/user/user.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/user/user.ts#L18)

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
protected subscribers: Subscription<PersistedModel<UserModel>>[] = [];
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

### onLoaded()

```ts
protected onLoaded(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L109)

#### Returns

`void`

#### Inherited from

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

[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`UserModel`](../interfaces/UserModel.md)\>

#### Returns

`void`

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`setValue`](PersistedObservable.md#setvalue)

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
when(condition, opts): Promise<PersistedModel<UserModel>>;
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

`Promise`\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`UserModel`](../interfaces/UserModel.md)\>\>

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`when`](PersistedObservable.md#when)
