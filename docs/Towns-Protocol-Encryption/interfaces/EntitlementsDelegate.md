# Interface: EntitlementsDelegate

Defined in: [packages/encryption/src/decryptionExtensions.ts:28](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L28)

## Methods

### isEntitled()

```ts
isEntitled(
   spaceId, 
   channelId, 
   user, 
permission): Promise<boolean>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:29](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L29)

#### Parameters

##### spaceId

`undefined` | `string`

##### channelId

`undefined` | `string`

##### user

`string`

##### permission

[`Permission`](../../Towns-Protocol-Web3/type-aliases/Permission.md)

#### Returns

`Promise`\<`boolean`\>
