# Function: encryptAesGcm()

```ts
function encryptAesGcm(key, data): Promise<{
  ciphertext: Uint8Array;
  iv: Uint8Array;
}>;
```

Defined in: [packages/encryption/src/cryptoAesGcm.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoAesGcm.ts#L14)

## Parameters

### key

`CryptoKey`

### data

`Uint8Array`

## Returns

`Promise`\<\{
  `ciphertext`: `Uint8Array`;
  `iv`: `Uint8Array`;
\}\>
