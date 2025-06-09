# Function: decryptAesGcm()

```ts
function decryptAesGcm(
   key, 
   ciphertext, 
iv): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/encryption/src/cryptoAesGcm.ts:31](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/cryptoAesGcm.ts#L31)

## Parameters

### key

`CryptoKey`

### ciphertext

`Uint8Array`

### iv

`Uint8Array`

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>
