# Interface: ImportRoomKeysOpts

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:26](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L26)

## Properties

### progressCallback()?

```ts
optional progressCallback: (stage) => void;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L28)

Reports ongoing progress of the import process. Can be used for feedback.

#### Parameters

##### stage

[`ImportRoomKeyProgressData`](ImportRoomKeyProgressData.md)

#### Returns

`void`
