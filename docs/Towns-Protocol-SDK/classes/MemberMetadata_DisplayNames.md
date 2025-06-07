# Class: MemberMetadata\_DisplayNames

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L12)

## Constructors

### Constructor

```ts
new MemberMetadata_DisplayNames(streamId): MemberMetadata_DisplayNames;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L20)

#### Parameters

##### streamId

`string`

#### Returns

`MemberMetadata_DisplayNames`

## Properties

### displayNameEvents

```ts
readonly displayNameEvents: Map<string, {
  pending: boolean;
  userId: string;
}>;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L18)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L13)

***

### plaintextDisplayNames

```ts
readonly plaintextDisplayNames: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L17)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L15)

***

### userIdToEventId

```ts
readonly userIdToEventId: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L16)

## Methods

### addEncryptedData()

```ts
addEncryptedData(
   eventId, 
   encryptedData, 
   userId, 
   pending, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:24](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L24)

#### Parameters

##### eventId

`string`

##### encryptedData

`EncryptedData`

##### userId

`string`

##### pending

`boolean` = `true`

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### info()

```ts
info(userId): object;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:131](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L131)

#### Parameters

##### userId

`string`

#### Returns

`object`

##### displayName

```ts
displayName: string;
```

##### displayNameEncrypted

```ts
displayNameEncrypted: boolean;
```

***

### onConfirmEvent()

```ts
onConfirmEvent(eventId, emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:53](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L53)

#### Parameters

##### eventId

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

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

Defined in: [packages/sdk/src/memberMetadata\_DisplayNames.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_DisplayNames.ts#L67)

#### Parameters

##### eventId

`string`

##### content

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`
