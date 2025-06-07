# Class: StreamStateView\_User

Defined in: [packages/sdk/src/streamStateView\_User.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L18)

## theme_extends

- [`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

## Constructors

### Constructor

```ts
new StreamStateView_User(streamId): StreamStateView_User;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L27)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_User`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`constructor`](StreamStateView_AbstractContent.md#constructor)

## Properties

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L19)

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`streamId`](StreamStateView_AbstractContent.md#streamid)

***

### streamMemberships

```ts
readonly streamMemberships: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L20)

#### Index Signature

```ts
[key: string]: UserPayload_UserMembership
```

***

### tipsReceived

```ts
tipsReceived: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:22](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L22)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tipsReceivedCount

```ts
tipsReceivedCount: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L24)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tipsSent

```ts
tipsSent: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L21)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tipsSentCount

```ts
tipsSentCount: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L23)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tokenTransfers

```ts
tokenTransfers: BlockchainTransaction_TokenTransfer[] = [];
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L25)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   cleartext, 
   _encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L84)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### \_encryptionEmitter

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
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L32)

#### Parameters

##### snapshot

`Snapshot`

##### content

`UserPayload_Snapshot`

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

### getMembership()

```ts
getMembership(streamId): undefined | UserPayload_UserMembership;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:197](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L197)

#### Parameters

##### streamId

`string`

#### Returns

`undefined` \| `UserPayload_UserMembership`

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

### isJoined()

```ts
isJoined(streamId): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:205](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L205)

#### Parameters

##### streamId

`string`

#### Returns

`boolean`

***

### isMember()

```ts
isMember(streamId, membership): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:201](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L201)

#### Parameters

##### streamId

`string`

##### membership

`MembershipOp`

#### Returns

`boolean`

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
   _event, 
   _stateEmitter, 
   _encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L40)

#### Parameters

##### \_event

[`ConfirmedTimelineEvent`](../type-aliases/ConfirmedTimelineEvent.md)

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

##### \_encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

#### Inherited from

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
   _encryptionEmitter, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_User.ts:47](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_User.ts#L47)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### \_encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`prependEvent`](StreamStateView_AbstractContent.md#prependevent)
