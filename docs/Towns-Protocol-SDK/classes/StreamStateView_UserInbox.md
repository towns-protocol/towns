# Class: StreamStateView\_UserInbox

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L16)

## theme_extends

- [`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

## Constructors

### Constructor

```ts
new StreamStateView_UserInbox(streamId): StreamStateView_UserInbox;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L20)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_UserInbox`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`constructor`](StreamStateView_AbstractContent.md#constructor)

## Properties

### deviceSummary

```ts
deviceSummary: Record<string, UserInboxPayload_Snapshot_DeviceSummary> = {};
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L18)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L17)

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`streamId`](StreamStateView_AbstractContent.md#streamid)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   _cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:66](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L66)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

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
   _emitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L25)

#### Parameters

##### snapshot

`Snapshot`

##### content

`UserInboxPayload_Snapshot`

##### \_emitter

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
onAppendLocalEvent(_event, _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L56)

#### Parameters

##### \_event

[`StreamTimelineEvent`](../interfaces/StreamTimelineEvent.md)

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onAppendLocalEvent`](StreamStateView_AbstractContent.md#onappendlocalevent)

***

### onConfirmedEvent()

```ts
onConfirmedEvent(
   event, 
   emitter, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L35)

#### Parameters

##### event

[`ConfirmedTimelineEvent`](../type-aliases/ConfirmedTimelineEvent.md)

##### emitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

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
   _eventId, 
   _content, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L48)

#### Parameters

##### \_eventId

`string`

##### \_content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onDecryptedContent`](StreamStateView_AbstractContent.md#ondecryptedcontent)

***

### prependEvent()

```ts
prependEvent(
   event, 
   _cleartext, 
   encryptionEmitter, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserInbox.ts:43](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserInbox.ts#L43)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`prependEvent`](StreamStateView_AbstractContent.md#prependevent)
