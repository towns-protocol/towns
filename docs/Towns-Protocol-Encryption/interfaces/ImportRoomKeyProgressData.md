# Interface: ImportRoomKeyProgressData

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:37](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L37)

Room key import progress report.
Used when calling [GroupEncryptionCrypto#importRoomKeys](../classes/GroupEncryptionCrypto.md#importroomkeys) or
[GroupEncryptionCrypto#importRoomKeysAsJson](../classes/GroupEncryptionCrypto.md#importroomkeysasjson) as the parameter of
the progressCallback. Used to display feedback.

## Properties

### failures?

```ts
optional failures: number;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:40](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L40)

***

### stage

```ts
stage: string;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:38](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L38)

***

### successes?

```ts
optional successes: number;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:39](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L39)

***

### total?

```ts
optional total: number;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L41)
