# Class: GroupEncryptionCrypto

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L44)

## Constructors

### Constructor

```ts
new GroupEncryptionCrypto(client, cryptoStore): GroupEncryptionCrypto;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:54](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L54)

#### Parameters

##### client

[`IGroupEncryptionClient`](../interfaces/IGroupEncryptionClient.md)

##### cryptoStore

[`CryptoStore`](CryptoStore.md)

#### Returns

`GroupEncryptionCrypto`

## Properties

### cryptoStore

```ts
readonly cryptoStore: CryptoStore;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:50](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L50)

***

### globalBlacklistUnverifiedDevices

```ts
globalBlacklistUnverifiedDevices: boolean = false;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:51](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L51)

***

### globalErrorOnUnknownDevices

```ts
globalErrorOnUnknownDevices: boolean = true;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:52](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L52)

***

### groupDecryption

```ts
readonly groupDecryption: Record<GroupEncryptionAlgorithmId, DecryptionAlgorithm>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:49](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L49)

***

### groupEncryption

```ts
readonly groupEncryption: Record<GroupEncryptionAlgorithmId, EncryptionAlgorithm>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:48](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L48)

## Methods

### decryptGroupEvent()

```ts
decryptGroupEvent(streamId, content): Promise<string | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:188](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L188)

Decrypt a received event using group encryption algorithm

#### Parameters

##### streamId

`string`

##### content

`EncryptedData`

#### Returns

`Promise`\<`string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

a promise which resolves once we have finished decrypting.
Rejects with an error if there is a problem decrypting the event.

***

### decryptWithDeviceKey()

```ts
decryptWithDeviceKey(ciphertext, senderDeviceKey): Promise<string>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:135](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L135)

Decrypt a received event using the device key

#### Parameters

##### ciphertext

`string`

##### senderDeviceKey

`string`

#### Returns

`Promise`\<`string`\>

a promise which resolves once we have finished decrypting.
Rejects with an error if there is a problem decrypting the event.

***

### encryptGroupEvent()

```ts
encryptGroupEvent(
   streamId, 
   payload, 
algorithm): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:162](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L162)

Encrypt an event using group encryption algorithm

#### Parameters

##### streamId

`string`

##### payload

`Uint8Array`

##### algorithm

[`GroupEncryptionAlgorithmId`](../enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`EncryptedData`\>

Promise which resolves when the event has been
    encrypted, or null if nothing was needed

***

### encryptGroupEvent\_deprecated\_v0()

```ts
encryptGroupEvent_deprecated_v0(
   streamId, 
   payload, 
algorithm): Promise<EncryptedData>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:175](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L175)

Deprecated uses v0 encryption version

#### Parameters

##### streamId

`string`

##### payload

`string`

##### algorithm

[`GroupEncryptionAlgorithmId`](../enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`EncryptedData`\>

Promise which resolves when the event has been
    encrypted, or null if nothing was needed

***

### encryptWithDeviceKeys()

```ts
encryptWithDeviceKeys(payload, deviceKeys): Promise<Record<string, string>>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:110](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L110)

Encrypt an event using the device keys

#### Parameters

##### payload

`string`

string to be encrypted

##### deviceKeys

[`UserDevice`](../interfaces/UserDevice.md)[]

recipients to encrypt message for

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

Promise which resolves when the event has been
    encrypted, or null if nothing was needed

***

### ensureOutboundSession()

```ts
ensureOutboundSession(
   streamId, 
   algorithm, 
opts?): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:148](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L148)

Ensure that we have an outbound group session key for the given stream

#### Parameters

##### streamId

`string`

##### algorithm

[`GroupEncryptionAlgorithmId`](../enumerations/GroupEncryptionAlgorithmId.md)

##### opts?

###### awaitInitialShareSession

`boolean`

#### Returns

`Promise`\<`void`\>

Promise which resolves when the event has been
    created, use options to await the initial share

***

### exportDevice()

```ts
exportDevice(): Promise<ExportedDevice>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:251](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L251)

#### Returns

`Promise`\<`ExportedDevice`\>

***

### exportGroupSession()

```ts
exportGroupSession(streamId, sessionId): Promise<
  | undefined
| GroupEncryptionSession>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:197](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L197)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<
  \| `undefined`
  \| [`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)\>

***

### exportRoomKeys()

```ts
exportRoomKeys(): Promise<GroupEncryptionSession[]>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:214](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L214)

#### Returns

`Promise`\<[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]\>

***

### getGroupSessionIds()

```ts
getGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:224](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L224)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getUserDevice()

```ts
getUserDevice(): UserDevice;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:243](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L243)

#### Returns

[`UserDevice`](../interfaces/UserDevice.md)

***

### hasHybridSession()

```ts
hasHybridSession(streamId): Promise<boolean>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:354](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L354)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### hasSessionKey()

```ts
hasSessionKey(
   streamId, 
   sessionId, 
algorithm): Promise<boolean>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:234](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L234)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

##### algorithm

[`GroupEncryptionAlgorithmId`](../enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`boolean`\>

***

### importRoomKeys()

```ts
importRoomKeys(keys, opts): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:290](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L290)

Import a list of room keys previously exported by exportRoomKeys

#### Parameters

##### keys

[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]

a list of session export objects

##### opts

[`ImportRoomKeysOpts`](../interfaces/ImportRoomKeysOpts.md) = `{}`

#### Returns

`Promise`\<`void`\>

a promise which resolves once the keys have been imported

***

### importRoomKeysAsJson()

```ts
importRoomKeysAsJson(keys): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:349](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L349)

Import a JSON string encoding a list of room keys previously
exported by exportRoomKeysAsJson

#### Parameters

##### keys

`string`

a JSON string encoding a list of session export
   objects, each of which is an GroupEncryptionSession

#### Returns

`Promise`\<`void`\>

a promise which resolves once the keys have been imported

***

### importSessionKeys()

```ts
importSessionKeys(streamId, keys): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:262](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L262)

Import a list of group session keys previously exported by exportRoomKeys

#### Parameters

##### streamId

`string`

the id of the stream the keys are for

##### keys

[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]

a list of session export objects

#### Returns

`Promise`\<`void`\>

a promise which resolves once the keys have been imported

***

### init()

```ts
init(opts?): Promise<void>;
```

Defined in: [packages/encryption/src/groupEncryptionCrypto.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/groupEncryptionCrypto.ts#L88)

Iniitalize crypto module prior to usage

#### Parameters

##### opts?

[`EncryptionDeviceInitOpts`](../type-aliases/EncryptionDeviceInitOpts.md)

#### Returns

`Promise`\<`void`\>
