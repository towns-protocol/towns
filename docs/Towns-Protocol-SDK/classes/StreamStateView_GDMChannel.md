# Class: StreamStateView\_GDMChannel

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L17)

## theme_extends

- [`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

## Constructors

### Constructor

```ts
new StreamStateView_GDMChannel(streamId): StreamStateView_GDMChannel;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L24)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_GDMChannel`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`constructor`](StreamStateView_AbstractContent.md#constructor)

## Properties

### channelMetadata

```ts
readonly channelMetadata: StreamStateView_ChannelMetadata;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L19)

***

### lastEventCreatedAtEpochMs

```ts
lastEventCreatedAtEpochMs: bigint = 0n;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L22)

***

### messages

```ts
readonly messages: StreamStateView_ChannelMessages;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L20)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L18)

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`streamId`](StreamStateView_AbstractContent.md#streamid)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L78)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`appendEvent`](StreamStateView_AbstractContent.md#appendevent)

***

### applySnapshot()

```ts
applySnapshot(
   snapshot, 
   content, 
   cleartexts, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L31)

#### Parameters

##### snapshot

`Snapshot`

##### content

`GdmChannelPayload_Snapshot`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### decryptEvent()

```ts
decryptEvent(
   kind, 
   event, 
   content, 
   cleartext, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L23)

#### Parameters

##### kind

`"text"` | `"channelMessage"` | `"channelProperties"`

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### content

`EncryptedData`

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`decryptEvent`](StreamStateView_AbstractContent.md#decryptevent)

***

### getStreamParentId()

```ts
getStreamParentId(): undefined | string;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L63)

#### Returns

`undefined` \| `string`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`getStreamParentId`](StreamStateView_AbstractContent.md#getstreamparentid)

***

### getStreamParentIdAsBytes()

```ts
getStreamParentIdAsBytes(): undefined | Uint8Array<ArrayBufferLike>;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L67)

#### Returns

`undefined` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`getStreamParentIdAsBytes`](StreamStateView_AbstractContent.md#getstreamparentidasbytes)

***

### needsScrollback()

```ts
needsScrollback(): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L75)

#### Returns

`boolean`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`needsScrollback`](StreamStateView_AbstractContent.md#needsscrollback)

***

### onAppendLocalEvent()

```ts
onAppendLocalEvent(event, stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:130](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L130)

#### Parameters

##### event

[`StreamTimelineEvent`](../interfaces/StreamTimelineEvent.md)

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onAppendLocalEvent`](StreamStateView_AbstractContent.md#onappendlocalevent)

***

### onConfirmedEvent()

```ts
onConfirmedEvent(
   event, 
   emitter, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:122](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L122)

#### Parameters

##### event

[`ConfirmedTimelineEvent`](../type-aliases/ConfirmedTimelineEvent.md)

##### emitter

`undefined` | `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onConfirmedEvent`](StreamStateView_AbstractContent.md#onconfirmedevent)

***

### onDecryptedContent()

```ts
onDecryptedContent(
   eventId, 
   content, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:110](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L110)

#### Parameters

##### eventId

`string`

##### content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### emitter

`TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onDecryptedContent`](StreamStateView_AbstractContent.md#ondecryptedcontent)

***

### prependEvent()

```ts
prependEvent(
   event, 
   cleartext, 
   encryptionEmitter, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_GDMChannel.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_GDMChannel.ts#L46)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`prependEvent`](StreamStateView_AbstractContent.md#prependevent)
