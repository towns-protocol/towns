# Class: MemberMetadata\_Usernames

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L9)

## Constructors

### Constructor

```ts
new MemberMetadata_Usernames(streamId): MemberMetadata_Usernames;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L21)

#### Parameters

##### streamId

`string`

#### Returns

`MemberMetadata_Usernames`

## Properties

### checksums

```ts
readonly checksums: Set<string>;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:19](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L19)

***

### confirmedUserIds

```ts
readonly confirmedUserIds: Set<string>;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L14)

***

### log

```ts
log: DLogger;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:10](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L10)

***

### plaintextUsernames

```ts
readonly plaintextUsernames: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:12](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L12)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:11](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L11)

***

### userIdToEventId

```ts
readonly userIdToEventId: Map<string, string>;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:13](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L13)

***

### usernameEvents

```ts
readonly usernameEvents: Map<string, {
  checksum: string;
  pending: boolean;
  userId: string;
}>;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L15)

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

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:35](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L35)

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

### cleartextUsernameAvailable()

```ts
cleartextUsernameAvailable(username): boolean;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:123](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L123)

#### Parameters

##### username

`string`

#### Returns

`boolean`

***

### info()

```ts
info(userId): object;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:194](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L194)

#### Parameters

##### userId

`string`

#### Returns

`object`

##### username

```ts
username: string;
```

##### usernameConfirmed

```ts
usernameConfirmed: boolean;
```

##### usernameEncrypted

```ts
usernameEncrypted: boolean;
```

***

### onConfirmEvent()

```ts
onConfirmEvent(eventId, emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:77](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L77)

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

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:96](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L96)

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

### resetLocalUsername()

```ts
resetLocalUsername(userId, emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:30](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L30)

#### Parameters

##### userId

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### setLocalUsername()

```ts
setLocalUsername(
   userId, 
   username, 
   emitter?): void;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:25](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L25)

#### Parameters

##### userId

`string`

##### username

`string`

##### emitter?

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### usernameAvailable()

```ts
usernameAvailable(checksum): boolean;
```

Defined in: [packages/sdk/src/memberMetadata\_Usernames.ts:128](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/memberMetadata_Usernames.ts#L128)

#### Parameters

##### checksum

`string`

#### Returns

`boolean`
