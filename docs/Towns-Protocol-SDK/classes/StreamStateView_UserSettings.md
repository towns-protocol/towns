# Class: StreamStateView\_UserSettings

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:27](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L27)

## theme_extends

- [`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

## Constructors

### Constructor

```ts
new StreamStateView_UserSettings(streamId): StreamStateView_UserSettings;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L34)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_UserSettings`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`constructor`](StreamStateView_AbstractContent.md#constructor)

## Properties

### fullyReadMarkers

```ts
readonly fullyReadMarkers: Map<string, Record<string, {
  beginUnreadWindow: bigint;
  channelId: string;
  endUnreadWindow: bigint;
  eventId: string;
  eventNum: bigint;
  isUnread: boolean;
  markedReadAtTs: bigint;
  mentions: number;
  threadParentId?: string;
}>>;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L31)

***

### fullyReadMarkersSrc

```ts
readonly fullyReadMarkersSrc: Map<string, UserSettingsPayload_MarkerContent>;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L30)

***

### settings

```ts
readonly settings: Map<string, string>;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L29)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L28)

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`streamId`](StreamStateView_AbstractContent.md#streamid)

***

### userBlocks

```ts
readonly userBlocks: Record<string, UserSettingsPayload_Snapshot_UserBlocks> = {};
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L32)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   _cleartext, 
   _encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L75)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

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
applySnapshot(snapshot, content): void;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L39)

#### Parameters

##### snapshot

`Snapshot`

##### content

`UserSettingsPayload_Snapshot`

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

### getLastBlock()

```ts
getLastBlock(userId): undefined | UserSettingsPayload_Snapshot_UserBlocks_Block;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:152](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L152)

#### Parameters

##### userId

`string`

#### Returns

`undefined` \| `UserSettingsPayload_Snapshot_UserBlocks_Block`

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

### isUserBlocked()

```ts
isUserBlocked(userId): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:134](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L134)

#### Parameters

##### userId

`string`

#### Returns

`boolean`

***

### isUserBlockedAt()

```ts
isUserBlockedAt(userId, eventNum): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:142](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L142)

#### Parameters

##### userId

`string`

##### eventNum

`bigint`

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

Defined in: [packages/sdk/src/streamStateView\_UserSettings.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_UserSettings.ts#L51)

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
