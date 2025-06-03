# Class: ThreadStats

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L9)

## theme_extends

- [`Observable`](Observable.md)\<`ThreadStatsMap`\>

## Constructors

### Constructor

```ts
new ThreadStats(initialValue): ThreadStats;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L10)

#### Parameters

##### initialValue

`ThreadStatsMap` = `{}`

#### Returns

`ThreadStats`

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
protected subscribers: Subscription<ThreadStatsMap>[] = [];
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
add(
   userId, 
   event, 
   currentTimeline): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L26)

#### Parameters

##### userId

`string`

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

##### currentTimeline

[`TimelineEvent`](../interfaces/TimelineEvent.md)[]

#### Returns

`void`

***

### get()

```ts
get(eventId): undefined | ThreadStatsData;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L22)

#### Parameters

##### eventId

`string`

#### Returns

`undefined` \| [`ThreadStatsData`](../interfaces/ThreadStatsData.md)

***

### remove()

```ts
remove(timelineEvent): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:59](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L59)

#### Parameters

##### timelineEvent

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### reset()

```ts
reset(): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L18)

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

Defined in: [packages/sdk/src/sync-agent/timeline/models/threadStats.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/threadStats.ts#L14)

#### Parameters

##### fn

(`current`) => `ThreadStatsMap`

#### Returns

`void`

***

### when()

```ts
when(condition, opts): Promise<ThreadStatsMap>;
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

`Promise`\<`ThreadStatsMap`\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
