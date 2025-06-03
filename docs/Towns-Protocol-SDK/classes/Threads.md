# Class: Threads

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L8)

## theme_extends

- [`Observable`](Observable.md)\<`ThreadsMap`\>

## Constructors

### Constructor

```ts
new Threads(initialValue): Threads;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L9)

#### Parameters

##### initialValue

`ThreadsMap` = `{}`

#### Returns

`Threads`

#### Overrides

[`Observable`](Observable.md).[`constructor`](Observable.md#constructor)

## Properties

### \_value

```ts
protected _value: T;
```

Defined in: [packages/sdk/src/observable/observable.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L11)

#### Inherited from

[`Observable`](Observable.md).[`_value`](Observable.md#_value)

***

### subscribers

```ts
protected subscribers: Subscription<ThreadsMap>[] = [];
```

Defined in: [packages/sdk/src/observable/observable.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L10)

#### Inherited from

[`Observable`](Observable.md).[`subscribers`](Observable.md#subscribers)

## Accessors

### value

#### Get Signature

```ts
get value(): T;
```

Defined in: [packages/sdk/src/observable/observable.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L17)

##### Returns

`T`

#### Inherited from

[`Observable`](Observable.md).[`value`](Observable.md#value)

## Methods

### add()

```ts
add(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L25)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### get()

```ts
get(parentId): undefined | TimelineEvent[];
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L21)

#### Parameters

##### parentId

`string`

#### Returns

`undefined` \| [`TimelineEvent`](../interfaces/TimelineEvent.md)[]

***

### remove()

```ts
remove(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L39)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### replace()

```ts
replace(event, eventIndex): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L57)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

##### eventIndex

`number`

#### Returns

`void`

***

### reset()

```ts
reset(): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L17)

#### Returns

`void`

***

### setValue()

```ts
setValue(newValue): void;
```

Defined in: [packages/sdk/src/observable/observable.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L21)

#### Parameters

##### newValue

`T`

#### Returns

`void`

#### Inherited from

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

### update()

```ts
update(fn): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threads.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threads.ts#L13)

#### Parameters

##### fn

(`current`) => `ThreadsMap`

#### Returns

`void`

***

### when()

```ts
when(condition, opts): Promise<ThreadsMap>;
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

`Promise`\<`ThreadsMap`\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
