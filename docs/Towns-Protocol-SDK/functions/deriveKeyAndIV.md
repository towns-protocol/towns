# Function: deriveKeyAndIV()

```ts
function deriveKeyAndIV(keyPhrase): Promise<{
  iv: Uint8Array;
  key: Uint8Array;
}>;
```

Defined in: [packages/sdk/src/crypto\_utils.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/crypto_utils.ts#L41)

## Parameters

### keyPhrase

`string` | `Uint8Array`\<`ArrayBufferLike`\>

## Returns

`Promise`\<\{
  `iv`: `Uint8Array`;
  `key`: `Uint8Array`;
\}\>
