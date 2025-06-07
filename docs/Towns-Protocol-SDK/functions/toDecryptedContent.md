# Function: toDecryptedContent()

```ts
function toDecryptedContent(
   kind, 
   dataVersion, 
   cleartext): DecryptedContent;
```

Defined in: [packages/sdk/src/encryptedContentTypes.ts:53](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/encryptedContentTypes.ts#L53)

## Parameters

### kind

`"text"` | `"channelMessage"` | `"channelProperties"`

### dataVersion

`EncryptedDataVersion`

### cleartext

`string` | `Uint8Array`\<`ArrayBufferLike`\>

## Returns

[`DecryptedContent`](../type-aliases/DecryptedContent.md)
