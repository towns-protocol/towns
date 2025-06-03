# Class: StreamStateView\_MemberMetadata

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L31)

## Constructors

### Constructor

```ts
new StreamStateView_MemberMetadata(streamId): StreamStateView_MemberMetadata;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L37)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_MemberMetadata`

## Properties

### displayNames

```ts
readonly displayNames: MemberMetadata_DisplayNames;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:33](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L33)

***

### ensAddresses

```ts
readonly ensAddresses: MemberMetadata_EnsAddresses;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:34](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L34)

***

### nfts

```ts
readonly nfts: MemberMetadata_Nft;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L35)

***

### usernames

```ts
readonly usernames: MemberMetadata_Usernames;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:32](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L32)

## Methods

### appendDisplayName()

```ts
appendDisplayName(
   eventId, 
   data, 
   userId, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:117](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L117)

#### Parameters

##### eventId

`string`

##### data

`EncryptedData`

##### userId

`string`

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### appendEnsAddress()

```ts
appendEnsAddress(
   eventId, 
   EnsAddress, 
   userId, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:155](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L155)

#### Parameters

##### eventId

`string`

##### EnsAddress

`Uint8Array`

##### userId

`string`

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### appendNft()

```ts
appendNft(
   eventId, 
   nft, 
   userId, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:164](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L164)

#### Parameters

##### eventId

`string`

##### nft

`MemberPayload_Nft`

##### userId

`string`

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### appendUsername()

```ts
appendUsername(
   eventId, 
   data, 
   userId, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:136](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L136)

#### Parameters

##### eventId

`string`

##### data

`EncryptedData`

##### userId

`string`

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### applySnapshot()

```ts
applySnapshot(
   usernames, 
   displayNames, 
   ensAddresses, 
   nfts, 
   cleartexts, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L44)

#### Parameters

##### usernames

`object`[]

##### displayNames

`object`[]

##### ensAddresses

`object`[]

##### nfts

`object`[]

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### onConfirmedEvent()

```ts
onConfirmedEvent(confirmedEvent, stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:97](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L97)

#### Parameters

##### confirmedEvent

[`ConfirmedTimelineEvent`](../type-aliases/ConfirmedTimelineEvent.md)

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### onDecryptedContent()

```ts
onDecryptedContent(
   eventId, 
   content, 
   emitter?): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:173](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L173)

#### Parameters

##### eventId

`string`

##### content

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### prependEvent()

```ts
prependEvent(
   _event, 
   _cleartext, 
   _encryptionEmitter, 
   _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:108](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L108)

#### Parameters

##### \_event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### \_encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### userInfo()

```ts
userInfo(userId): UserInfo;
```

Defined in: [packages/sdk/src/streamStateView\_MemberMetadata.ts:182](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_MemberMetadata.ts#L182)

#### Parameters

##### userId

`string`

#### Returns

[`UserInfo`](../type-aliases/UserInfo.md)
