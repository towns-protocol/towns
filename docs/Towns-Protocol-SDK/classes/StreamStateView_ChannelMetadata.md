# Class: StreamStateView\_ChannelMetadata

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L8)

## Constructors

### Constructor

```ts
new StreamStateView_ChannelMetadata(streamId): StreamStateView_ChannelMetadata;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L14)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_ChannelMetadata`

## Properties

### channelProperties

```ts
channelProperties: undefined | ChannelProperties;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L11)

***

### latestEncryptedChannelProperties?

```ts
optional latestEncryptedChannelProperties: object;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L12)

#### data

```ts
data: EncryptedData;
```

#### eventId

```ts
eventId: string;
```

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L9)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L10)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   cleartext, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L70)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### emitter

`undefined` | `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`

***

### applySnapshot()

```ts
applySnapshot(
   encryptedChannelProperties, 
   cleartexts, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L18)

#### Parameters

##### encryptedChannelProperties

`WrappedEncryptedData`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### onDecryptedContent()

```ts
onDecryptedContent(
   _eventId, 
   content, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L89)

#### Parameters

##### \_eventId

`string`

##### content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### stateEmitter

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### prependEvent()

```ts
prependEvent(
   _event, 
   _cleartext, 
   _emitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_ChannelMetadata.ts:81](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_ChannelMetadata.ts#L81)

#### Parameters

##### \_event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### \_emitter

`undefined` | `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`
