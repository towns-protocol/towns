# Class: PersistedObservable\<T\>

Defined in: [packages/sdk/src/observable/persistedObservable.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L42)

## theme_extends

- [`Observable`](Observable.md)\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<`T`\>\>

## theme_extended_by

- [`Dms`](Dms.md)
- [`Dm`](Dm.md)
- [`Gdms`](Gdms.md)
- [`Gdm`](Gdm.md)
- [`Members`](Members.md)
- [`Member`](Member.md)
- [`RiverChain`](RiverChain.md)
- [`RiverConnection`](RiverConnection.md)
- [`Channel`](Channel.md)
- [`Space`](Space.md)
- [`Spaces`](Spaces.md)
- [`UserInbox`](UserInbox.md)
- [`UserMemberships`](UserMemberships.md)
- [`UserMetadata`](UserMetadata.md)
- [`UserSettings`](UserSettings.md)
- [`User`](User.md)

## Type Parameters

### T

`T` *extends* [`Identifiable`](../interfaces/Identifiable.md)

## Implements

- `Storable`

## Constructors

### Constructor

```ts
new PersistedObservable<T>(
   initialValue, 
   store, 
loadPriority): PersistedObservable<T>;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L51)

#### Parameters

##### initialValue

`T`

##### store

[`Store`](Store.md)

##### loadPriority

[`LoadPriority`](../enumerations/LoadPriority.md) = `LoadPriority.low`

#### Returns

`PersistedObservable`\<`T`\>

#### Overrides

[`Observable`](Observable.md).[`constructor`](Observable.md#constructor)

## Properties

### \_value

```ts
protected _value: PersistedModel;
```

Defined in: [packages/sdk/src/observable/observable.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L11)

#### Inherited from

[`Observable`](Observable.md).[`_value`](Observable.md#_value)

***

### loadPriority

```ts
protected readonly loadPriority: LoadPriority;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L48)

***

### store

```ts
protected readonly store: Store;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L47)

***

### subscribers

```ts
protected subscribers: Subscription<PersistedModel<T>>[] = [];
```

Defined in: [packages/sdk/src/observable/observable.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L10)

#### Inherited from

[`Observable`](Observable.md).[`subscribers`](Observable.md#subscribers)

***

### tableName

```ts
protected tableName: string = '';
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L46)

## Accessors

### data

#### Get Signature

```ts
get data(): T;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L83)

##### Returns

`T`

***

### value

#### Get Signature

```ts
get value(): PersistedModel<T>;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L75)

##### Returns

[`PersistedModel`](../type-aliases/PersistedModel.md)\<`T`\>

#### Overrides

[`Observable`](Observable.md).[`value`](Observable.md#value)

## Methods

### load()

```ts
protected load(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L57)

#### Returns

`void`

***

### onLoaded()

```ts
protected onLoaded(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L109)

#### Returns

`void`

***

### onSaved()

```ts
protected onSaved(): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L113)

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

***

### setValue()

```ts
setValue(_newValue): void;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L79)

#### Parameters

##### \_newValue

[`PersistedModel`](../type-aliases/PersistedModel.md)\<`T`\>

#### Returns

`void`

#### Overrides

[`Observable`](Observable.md).[`setValue`](Observable.md#setvalue)

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

[`Observable`](Observable.md).[`subscribe`](Observable.md#subscribe)

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

[`Observable`](Observable.md).[`unsubscribe`](Observable.md#unsubscribe)

***

### when()

```ts
when(condition, opts): Promise<PersistedModel<T>>;
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

`Promise`\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<`T`\>\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
