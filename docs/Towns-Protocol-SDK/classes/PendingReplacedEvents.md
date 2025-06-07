# Class: PendingReplacedEvents

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L6)

## theme_extends

- [`Observable`](Observable.md)\<`PendingReplacedEventsMap`\>

## Constructors

### Constructor

```ts
new PendingReplacedEvents(initialValue): PendingReplacedEvents;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L7)

#### Parameters

##### initialValue

`Record`\<`string`, [`TimelineEvent`](../interfaces/TimelineEvent.md)\> = `{}`

#### Returns

`PendingReplacedEvents`

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
protected subscribers: Subscription<PendingReplacedEventsMap>[] = [];
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
add(eventId, event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L23)

#### Parameters

##### eventId

`string`

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### get()

```ts
get(eventId): undefined | TimelineEvent;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L19)

#### Parameters

##### eventId

`string`

#### Returns

`undefined` \| [`TimelineEvent`](../interfaces/TimelineEvent.md)

***

### reset()

```ts
reset(): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L15)

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

Defined in: [packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/pendingReplacedEvents.ts#L11)

#### Parameters

##### fn

(`current`) => `PendingReplacedEventsMap`

#### Returns

`void`

***

### when()

```ts
when(condition, opts): Promise<PendingReplacedEventsMap>;
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

`Promise`\<`PendingReplacedEventsMap`\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
