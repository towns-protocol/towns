# Interface: IGroupEncryptionClient

Defined in: [packages/encryption/src/base.ts:6](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L6)

## Methods

### downloadUserDeviceInfo()

```ts
downloadUserDeviceInfo(userIds, forceDownload): Promise<UserDeviceCollection>;
```

Defined in: [packages/encryption/src/base.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L7)

#### Parameters

##### userIds

`string`[]

##### forceDownload

`boolean`

#### Returns

`Promise`\<[`UserDeviceCollection`](UserDeviceCollection.md)\>

***

### encryptAndShareGroupSessions()

```ts
encryptAndShareGroupSessions(
   streamId, 
   sessions, 
   devicesInRoom, 
algorithm): Promise<void>;
```

Defined in: [packages/encryption/src/base.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L8)

#### Parameters

##### streamId

`string`

##### sessions

[`GroupEncryptionSession`](GroupEncryptionSession.md)[]

##### devicesInRoom

[`UserDeviceCollection`](UserDeviceCollection.md)

##### algorithm

[`GroupEncryptionAlgorithmId`](../enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`void`\>

***

### getDevicesInStream()

```ts
getDevicesInStream(streamId): Promise<UserDeviceCollection>;
```

Defined in: [packages/encryption/src/base.ts:14](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L14)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<[`UserDeviceCollection`](UserDeviceCollection.md)\>

***

### getMiniblockInfo()

```ts
getMiniblockInfo(streamId): Promise<{
  miniblockHash: Uint8Array;
  miniblockNum: bigint;
}>;
```

Defined in: [packages/encryption/src/base.ts:15](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/base.ts#L15)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<\{
  `miniblockHash`: `Uint8Array`;
  `miniblockNum`: `bigint`;
\}\>
