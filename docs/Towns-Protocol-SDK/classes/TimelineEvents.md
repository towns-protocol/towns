# Class: TimelineEvents

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:4](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L4)

## theme_extends

- [`Observable`](Observable.md)\<[`TimelineEvent`](../interfaces/TimelineEvent.md)[]\>

## Constructors

### Constructor

```ts
new TimelineEvents(initialValue): TimelineEvents;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:5](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L5)

#### Parameters

##### initialValue

[`TimelineEvent`](../interfaces/TimelineEvent.md)[] = `[]`

#### Returns

`TimelineEvents`

#### Overrides

[`Observable`](Observable.md).[`constructor`](Observable.md#constructor)

## Properties

### \_value

```ts
protected _value: TimelineEvent[];
```

Defined in: [packages/sdk/src/observable/observable.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/observable.ts#L11)

#### Inherited from

[`Observable`](Observable.md).[`_value`](Observable.md#_value)

***

### subscribers

```ts
protected subscribers: Subscription<TimelineEvent[]>[] = [];
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

### append()

```ts
append(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L33)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### getLatestEvent()

```ts
getLatestEvent(kind?): undefined | TimelineEvent;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L9)

#### Parameters

##### kind?

[`RiverTimelineEvent`](../enumerations/RiverTimelineEvent.md)

#### Returns

`undefined` \| [`TimelineEvent`](../interfaces/TimelineEvent.md)

***

### prepend()

```ts
prepend(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L37)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### removeByIndex()

```ts
removeByIndex(eventIndex): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L41)

#### Parameters

##### eventIndex

`number`

#### Returns

`void`

***

### replace()

```ts
replace(
   newEvent, 
   eventIndex, 
   timeline): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L24)

#### Parameters

##### newEvent

[`TimelineEvent`](../interfaces/TimelineEvent.md)

##### eventIndex

`number`

##### timeline

[`TimelineEvent`](../interfaces/TimelineEvent.md)[]

#### Returns

`void`

***

### reset()

```ts
reset(): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L20)

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

[`TimelineEvent`](../interfaces/TimelineEvent.md)[]

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

Defined in: [packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timelineEvents.ts#L16)

#### Parameters

##### fn

(`current`) => [`TimelineEvent`](../interfaces/TimelineEvent.md)[]

#### Returns

`void`

***

### when()

```ts
when(condition, opts): Promise<TimelineEvent[]>;
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

`Promise`\<[`TimelineEvent`](../interfaces/TimelineEvent.md)[]\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
