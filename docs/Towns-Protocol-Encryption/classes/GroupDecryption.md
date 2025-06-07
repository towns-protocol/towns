# Class: GroupDecryption

Defined in: [packages/encryption/src/groupDecryption.ts:17](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L17)

Group decryption implementation

## Param

parameters, as per [DecryptionAlgorithm](DecryptionAlgorithm.md)

## theme_extends

- [`DecryptionAlgorithm`](DecryptionAlgorithm.md)

## Constructors

### Constructor

```ts
new GroupDecryption(params): GroupDecryption;
```

Defined in: [packages/encryption/src/groupDecryption.ts:20](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L20)

#### Parameters

##### params

[`IDecryptionParams`](../interfaces/IDecryptionParams.md)

#### Returns

`GroupDecryption`

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`constructor`](DecryptionAlgorithm.md#constructor)

## Properties

### algorithm

```ts
readonly algorithm: GroupEncryption = GroupEncryptionAlgorithmId.GroupEncryption;
```

Defined in: [packages/encryption/src/groupDecryption.ts:18](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L18)

***

### device

```ts
readonly device: EncryptionDevice;
```

Defined in: [packages/encryption/src/base.ts:57](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L57)

olm.js wrapper

#### Inherited from

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`device`](DecryptionAlgorithm.md#device)

## Methods

### decrypt()

```ts
decrypt(streamId, content): Promise<string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L31)

returns a promise which resolves to a
EventDecryptionResult once we have finished
decrypting, or rejects with an `algorithms.DecryptionError` if there is a
problem decrypting the event.

#### Parameters

##### streamId

`string`

##### content

`EncryptedData`

#### Returns

`Promise`\<`string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`decrypt`](DecryptionAlgorithm.md#decrypt)

***

### exportGroupSession()

```ts
exportGroupSession(streamId, sessionId): Promise<
  | undefined
| GroupEncryptionSession>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L89)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`exportGroupSession`](DecryptionAlgorithm.md#exportgroupsession)

***

### exportGroupSessionIds()

```ts
exportGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:102](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L102)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`exportGroupSessionIds`](DecryptionAlgorithm.md#exportgroupsessionids)

***

### exportGroupSessions()

```ts
exportGroupSessions(): Promise<GroupEncryptionSession[]>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:97](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L97)

#### Returns

`Promise`\<[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`exportGroupSessions`](DecryptionAlgorithm.md#exportgroupsessions)

***

### hasSessionKey()

```ts
hasSessionKey(streamId, sessionId): Promise<boolean>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:107](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L107)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`hasSessionKey`](DecryptionAlgorithm.md#hassessionkey)

***

### importStreamKey()

```ts
importStreamKey(streamId, session): Promise<void>;
```

Defined in: [packages/encryption/src/groupDecryption.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupDecryption.ts#L70)

#### Parameters

##### streamId

`string`

the stream id of the session

##### session

[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`DecryptionAlgorithm`](DecryptionAlgorithm.md).[`importStreamKey`](DecryptionAlgorithm.md#importstreamkey)
