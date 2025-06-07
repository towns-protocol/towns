# Class: Reactions

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L6)

## theme_extends

- [`Observable`](Observable.md)\<[`ReactionsMapModel`](../type-aliases/ReactionsMapModel.md)\>

## Constructors

### Constructor

```ts
new Reactions(initialValue): Reactions;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L7)

#### Parameters

##### initialValue

[`ReactionsMapModel`](../type-aliases/ReactionsMapModel.md) = `{}`

#### Returns

`Reactions`

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
protected subscribers: Subscription<ReactionsMapModel>[] = [];
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

### addEvent()

```ts
addEvent(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L51)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### get()

```ts
get(parentId): undefined | MessageReactions;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L11)

#### Parameters

##### parentId

`string`

#### Returns

`undefined` \| [`MessageReactions`](../type-aliases/MessageReactions.md)

***

### removeEvent()

```ts
removeEvent(event): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L25)

#### Parameters

##### event

[`TimelineEvent`](../interfaces/TimelineEvent.md)

#### Returns

`void`

***

### reset()

```ts
reset(): void;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L21)

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

Defined in: [packages/sdk/src/sync-agent/timeline/models/reactions.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/reactions.ts#L17)

#### Parameters

##### fn

(`current`) => [`ReactionsMapModel`](../type-aliases/ReactionsMapModel.md)

#### Returns

`void`

***

### when()

```ts
when(condition, opts): Promise<ReactionsMapModel>;
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

`Promise`\<[`ReactionsMapModel`](../type-aliases/ReactionsMapModel.md)\>

#### Inherited from

[`Observable`](Observable.md).[`when`](Observable.md#when)
