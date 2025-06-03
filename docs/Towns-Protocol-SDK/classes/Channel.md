# Class: Channel

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L29)

## theme_extends

- [`PersistedObservable`](PersistedObservable.md)\<[`ChannelModel`](../interfaces/ChannelModel.md)\>

## Constructors

### Constructor

```ts
new Channel(
   id, 
   spaceId, 
   riverConnection, 
   spaceDapp, 
   store): Channel;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L32)

#### Parameters

##### id

`string`

##### spaceId

`string`

##### riverConnection

[`RiverConnection`](RiverConnection.md)

##### spaceDapp

[`SpaceDapp`](../../Towns-Protocol-Web3/classes/SpaceDapp.md)

##### store

[`Store`](Store.md)

#### Returns

`Channel`

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L31)

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
protected subscribers: Subscription<PersistedModel<ChannelModel>>[] = [];
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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L30)

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:188](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L188)

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

### join()

```ts
join(): Promise<void>;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L78)

Joins the channel.

#### Returns

`Promise`\<`void`\>

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L44)

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:126](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L126)

Pins a message to the top of the channel.

#### Parameters

##### eventId

`string`

The event id of the message to pin.

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

The event id of the pin action.

***

### redact()

```ts
redact(eventId, reason?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:165](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L165)

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:90](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L90)

Sends a message to the channel.

#### Parameters

##### message

`string`

The message to send.

##### options?

Additional options for the message.

###### attachments?

`object`[]

The attachments in the message. You can attach images, videos, links, files, or even other messages.

###### mentions?

`object`[]

The users that are mentioned in the message

###### replyId?

`string`

If set, this message will be linked as a reply to the specified message.

###### threadId?

`string`

If set, this message will be linked to a thread with the specified message.

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

The event id of the message.

***

### sendReaction()

```ts
sendReaction(refEventId, reaction): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:150](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L150)

Sends a reaction to a message.

#### Parameters

##### refEventId

`string`

The event id of the message to react to.

##### reaction

`string`

The reaction to send. Can be any string, including emoji, unicode characters.

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

[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`ChannelModel`](../interfaces/ChannelModel.md)\>

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

Defined in: [packages/sdk/src/sync-agent/spaces/models/channel.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/spaces/models/channel.ts#L138)

Unpins a message from the channel.

#### Parameters

##### eventId

`string`

The event id of the message to unpin.

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

The event id of the unpin action.

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
when(condition, opts): Promise<PersistedModel<ChannelModel>>;
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

`Promise`\<[`PersistedModel`](../type-aliases/PersistedModel.md)\<[`ChannelModel`](../interfaces/ChannelModel.md)\>\>

#### Inherited from

[`PersistedObservable`](PersistedObservable.md).[`when`](PersistedObservable.md#when)
