# Class: Dm

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L29)

## theme_extends

- [`PersistedObservable`](PersistedObservable.md)\<[`DmModel`](../interfaces/DmModel.md)\>

## Constructors

### Constructor

```ts
new Dm(
   id, 
   riverConnection, 
   store): Dm;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L32)

#### Parameters

##### id

`string`

##### riverConnection

[`RiverConnection`](RiverConnection.md)

##### store

[`Store`](Store.md)

#### Returns

`Dm`

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

### loadPriority

```ts
protected readonly loadPriority: LoadPriority;
```

Defined in: [packages/sdk/src/observable/persistedObservable.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/observable/persistedObservable.ts#L48)

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`loadPriority`](PersistedObservable.md#loadpriority)

***

### members

```ts
members: Members;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L31)

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
protected subscribers: Subscription<PersistedModel<DmModel>>[] = [];
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

***

### timeline

```ts
timeline: MessageTimeline;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L30)

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

### adminRedact()

```ts
adminRedact(eventId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:141](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L141)

Redacts any message as an admin.

#### Parameters

##### eventId

`string`

The event id of the message to redact

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

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

### onLoaded()

```ts
protected onLoaded(): void;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:42](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L42)

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

### pin()

```ts
pin(eventId): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L87)

#### Parameters

##### eventId

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

***

### redact()

```ts
redact(eventId, reason?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:118](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L118)

Redacts your own event.

#### Parameters

##### eventId

`string`

The event id of the message to redact

##### reason?

`string`

The reason for the redaction

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

***

### sendMessage()

```ts
sendMessage(message, options?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L61)

#### Parameters

##### message

`string`

##### options?

###### attachments?

`object`[]

###### mentions?

`object`[]

###### replyId?

`string`

###### threadId?

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

***

### sendReaction()

```ts
sendReaction(refEventId, reaction): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:103](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L103)

#### Parameters

##### refEventId

`string`

##### reaction

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

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

[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`DmModel`](../interfaces/DmModel.md)\>

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

### unpin()

```ts
unpin(eventId): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/dms/models/dm.ts:95](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/dms/models/dm.ts#L95)

#### Parameters

##### eventId

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

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
when(condition, opts): Promise<PersistedModel<DmModel>>;
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

`Promise`\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`DmModel`](../interfaces/DmModel.md)\>\>

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`when`](PersistedObservable.md#when)
