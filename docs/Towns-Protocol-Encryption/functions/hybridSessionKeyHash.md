# Function: hybridSessionKeyHash()

```ts
function hybridSessionKeyHash(
   streamId, 
   key, 
   miniblockNum, 
miniblockHash): Promise<Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:954](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L954)

## Parameters

### streamId

`Uint8Array`

### key

`Uint8Array`

### miniblockNum

`bigint`

### miniblockHash

`Uint8Array`

## Returns

`Promise`\<`Uint8Array`\<`ArrayBufferLike`\>\>
