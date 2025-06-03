# Class: StreamStateView\_ChannelMessages

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L9)

## Constructors

### Constructor

```ts
new StreamStateView_ChannelMessages(streamId, parent): StreamStateView_ChannelMessages;
```

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L10)

#### Parameters

##### streamId

`string`

##### parent

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

#### Returns

`StreamStateView_ChannelMessages`

## Properties

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L11)

## Methods

### appendChannelMessage()

```ts
appendChannelMessage(
   event, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter, 
   value): void;
```

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L23)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

##### value

`EncryptedData`

#### Returns

`void`

***

### onDecryptedContent()

```ts
onDecryptedContent(
   _eventId, 
   _content, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L15)

#### Parameters

##### \_eventId

`string`

##### \_content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### prependChannelMessage()

```ts
prependChannelMessage(
   event, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter, 
   value): void;
```

Defined in: [packages/sdk/src/streamStateView\_Common\_ChannelMessages.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Common_ChannelMessages.ts#L33)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

##### value

`EncryptedData`

#### Returns

`void`
