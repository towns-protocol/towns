# Function: decryptAESGCM()

```ts
function decryptAESGCM(
   data, 
   key, 
iv): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/sdk/src/crypto\_utils.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/crypto_utils.ts#L94)

## Parameters

### data

`string` | `Uint8Array`\<`ArrayBufferLike`\>

### key

`Uint8Array`

### iv

`Uint8Array`

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>
