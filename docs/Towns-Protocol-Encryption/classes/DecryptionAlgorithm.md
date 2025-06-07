# Class: `abstract` DecryptionAlgorithm

Defined in: [packages/encryption/src/base.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L56)

base type for decryption implementations

## theme_extended_by

- [`GroupDecryption`](GroupDecryption.md)
- [`HybridGroupDecryption`](HybridGroupDecryption.md)

## Implements

- [`IDecryptionParams`](../interfaces/IDecryptionParams.md)

## Constructors

### Constructor

```ts
new DecryptionAlgorithm(params): DecryptionAlgorithm;
```

Defined in: [packages/encryption/src/base.ts:59](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L59)

#### Parameters

##### params

[`IDecryptionParams`](../interfaces/IDecryptionParams.md)

#### Returns

`DecryptionAlgorithm`

## Properties

### device

```ts
readonly device: EncryptionDevice;
```

Defined in: [packages/encryption/src/base.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L57)

olm.js wrapper

#### Implementation of

[`IDecryptionParams`](../interfaces/IDecryptionParams.md).[`device`](../interfaces/IDecryptionParams.md#device)

## Methods

### decrypt()

```ts
abstract decrypt(streamId, content): Promise<string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/encryption/src/base.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L63)

#### Parameters

##### streamId

`string`

##### content

`EncryptedData`

#### Returns

`Promise`\<`string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

***

### exportGroupSession()

```ts
abstract exportGroupSession(streamId, sessionId): Promise<
  | undefined
| GroupEncryptionSession>;
```

Defined in: [packages/encryption/src/base.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L67)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)\>

***

### exportGroupSessionIds()

```ts
abstract exportGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/base.ts:73](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L73)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### exportGroupSessions()

```ts
abstract exportGroupSessions(): Promise<GroupEncryptionSession[]>;
```

Defined in: [packages/encryption/src/base.ts:72](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L72)

#### Returns

`Promise`\<[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]\>

***

### hasSessionKey()

```ts
abstract hasSessionKey(streamId, sessionId): Promise<boolean>;
```

Defined in: [packages/encryption/src/base.ts:74](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L74)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### importStreamKey()

```ts
abstract importStreamKey(streamId, session): Promise<void>;
```

Defined in: [packages/encryption/src/base.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L65)

#### Parameters

##### streamId

`string`

##### session

[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)

#### Returns

`Promise`\<`void`\>
