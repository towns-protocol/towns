# Function: encryptAESGCM()

```ts
function encryptAESGCM(
   data, 
   key?, 
   iv?): Promise<{
  ciphertext: Uint8Array;
  iv: Uint8Array;
  secretKey: Uint8Array;
}>;
```

Defined in: [packages/sdk/src/crypto\_utils.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/crypto_utils.ts#L61)

## Parameters

### data

`Uint8Array`

### key?

`Uint8Array`\<`ArrayBufferLike`\>

### iv?

`Uint8Array`\<`ArrayBufferLike`\>

## Returns

`Promise`\<\{
  `ciphertext`: `Uint8Array`;
  `iv`: `Uint8Array`;
  `secretKey`: `Uint8Array`;
\}\>
