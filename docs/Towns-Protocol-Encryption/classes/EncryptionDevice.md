# Class: EncryptionDevice

Defined in: [packages/encryption/src/encryptionDevice.ts:80](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L80)

## Constructors

### Constructor

```ts
new EncryptionDevice(delegate, cryptoStore): EncryptionDevice;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L109)

#### Parameters

##### delegate

[`EncryptionDelegate`](EncryptionDelegate.md)

##### cryptoStore

[`CryptoStore`](CryptoStore.md)

#### Returns

`EncryptionDevice`

## Properties

### deviceCurve25519Key

```ts
deviceCurve25519Key: null | string = null;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L85)

Curve25519 key for the account, unknown until we load the account from storage in init()

***

### deviceDoNotUseKey

```ts
deviceDoNotUseKey: null | string = null;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L87)

Ed25519 key for the account, unknown until we load the account from storage in init()

***

### fallbackKey

```ts
fallbackKey: object;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L89)

#### key

```ts
key: string;
```

#### keyId

```ts
keyId: string;
```

***

### olmPrekeyPromise

```ts
olmPrekeyPromise: Promise<any>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:98](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L98)

***

### pickleKey

```ts
pickleKey: string = 'DEFAULT_KEY';
```

Defined in: [packages/encryption/src/encryptionDevice.ts:82](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L82)

***

### sessionsInProgress

```ts
sessionsInProgress: Record<string, Promise<void>> = {};
```

Defined in: [packages/encryption/src/encryptionDevice.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L93)

## Methods

### addHybridGroupSession()

```ts
addHybridGroupSession(
   streamId, 
   sessionId, 
sessionKey): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:668](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L668)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

##### sessionKey

`string`

#### Returns

`Promise`\<`void`\>

***

### addInboundGroupSession()

```ts
addInboundGroupSession(
   streamId, 
   sessionId, 
   sessionKey, 
   keysClaimed, 
   _exportFormat, 
extraSessionData): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:581](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L581)

Add an inbound group session to the session store

#### Parameters

##### streamId

`string`

room in which this session will be used

##### sessionId

`string`

session identifier

##### sessionKey

`string`

base64-encoded secret key

##### keysClaimed

`Record`\<`string`, `string`\>

Other keys the sender claims.

##### \_exportFormat

`boolean`

##### extraSessionData

[`GroupSessionExtraData`](../type-aliases/GroupSessionExtraData.md) = `{}`

any other data to be include with the session

#### Returns

`Promise`\<`void`\>

***

### createHybridGroupSession()

```ts
createHybridGroupSession(
   streamId, 
   miniblockNum, 
   miniblockHash): Promise<{
  sessionId: string;
  sessionKey: HybridGroupSessionKey;
  sessionRecord: HybridGroupSessionRecord;
}>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:483](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L483)

#### Parameters

##### streamId

`string`

##### miniblockNum

`bigint`

##### miniblockHash

`Uint8Array`

#### Returns

`Promise`\<\{
  `sessionId`: `string`;
  `sessionKey`: `HybridGroupSessionKey`;
  `sessionRecord`: [`HybridGroupSessionRecord`](../interfaces/HybridGroupSessionRecord.md);
\}\>

***

### createOutboundGroupSession()

```ts
createOutboundGroupSession(streamId): Promise<string>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:449](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L449)

Generate a new outbound group session

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`\>

***

### decryptMessage()

```ts
decryptMessage(
   ciphertext, 
   theirDeviceIdentityKey, 
messageType): Promise<string>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:758](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L758)

Decrypt an incoming message using an existing session

#### Parameters

##### ciphertext

`string`

base64-encoded body from the received message

##### theirDeviceIdentityKey

`string`

Curve25519 identity key for the
    remote device

##### messageType

`number` = `0`

messageType field from the received message

#### Returns

`Promise`\<`string`\>

decrypted payload.

***

### encryptGroupMessage()

```ts
encryptGroupMessage(payloadString, streamId): Promise<{
  ciphertext: string;
  sessionId: string;
}>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:709](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L709)

Encrypt an outgoing message with an outbound group session

#### Parameters

##### payloadString

`string`

payload to be encrypted

##### streamId

`string`

#### Returns

`Promise`\<\{
  `ciphertext`: `string`;
  `sessionId`: `string`;
\}\>

ciphertext

***

### encryptUsingFallbackKey()

```ts
encryptUsingFallbackKey(
   theirIdentityKey, 
   fallbackKey, 
   payload): Promise<{
  body: string;
  type: 0 | 1;
}>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:726](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L726)

#### Parameters

##### theirIdentityKey

`string`

##### fallbackKey

`string`

##### payload

`string`

#### Returns

`Promise`\<\{
  `body`: `string`;
  `type`: `0` \| `1`;
\}\>

***

### exportDevice()

```ts
exportDevice(): Promise<ExportedDevice>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:221](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L221)

Export the current device state

#### Returns

`Promise`\<`ExportedDevice`\>

ExportedDevice object containing the device state

***

### exportHybridGroupSession()

```ts
exportHybridGroupSession(streamId, sessionId): Promise<
  | undefined
| GroupEncryptionSession>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:890](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L890)

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

### exportHybridGroupSessions()

```ts
exportHybridGroupSessions(): Promise<GroupEncryptionSession[]>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:938](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L938)

#### Returns

`Promise`\<[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]\>

***

### exportInboundGroupSession()

```ts
exportInboundGroupSession(streamId, sessionId): Promise<
  | undefined
| GroupEncryptionSession>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:864](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L864)

Export an inbound group session

#### Parameters

##### streamId

`string`

streamId of session

##### sessionId

`string`

session identifier

#### Returns

`Promise`\<
  \| `undefined`
  \| [`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)\>

***

### exportInboundGroupSessions()

```ts
exportInboundGroupSessions(): Promise<GroupEncryptionSession[]>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:911](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L911)

Get a list containing all of the room keys

#### Returns

`Promise`\<[`GroupEncryptionSession`](../interfaces/GroupEncryptionSession.md)[]\>

a list of session export objects

***

### forgetOldFallbackKey()

```ts
forgetOldFallbackKey(): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:355](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L355)

#### Returns

`Promise`\<`void`\>

***

### generateFallbackKeyIfNeeded()

```ts
generateFallbackKeyIfNeeded(): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:332](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L332)

Generate a new fallback keys

#### Returns

`Promise`\<`void`\>

Resolved once the account is saved back having generated the key

***

### getFallbackKey()

```ts
getFallbackKey(): Promise<{
  key: string;
  keyId: string;
}>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:342](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L342)

#### Returns

`Promise`\<\{
  `key`: `string`;
  `keyId`: `string`;
\}\>

***

### getHybridGroupSessionIds()

```ts
getHybridGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:820](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L820)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getHybridGroupSessionKey()

```ts
getHybridGroupSessionKey(streamId, sessionId): Promise<HybridGroupSessionKey>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:432](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L432)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<`HybridGroupSessionKey`\>

***

### getHybridGroupSessionKeyForStream()

```ts
getHybridGroupSessionKeyForStream(streamId): Promise<HybridGroupSessionKey>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:414](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L414)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`HybridGroupSessionKey`\>

***

### getInboundGroupSession()

```ts
getInboundGroupSession(streamId, sessionId): Promise<{
  data:   | undefined
     | InboundGroupSessionData;
  session: undefined | InboundGroupSession;
}>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:549](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L549)

**`Internal`**

Extract an InboundGroupSession from the crypto store and call the given function

#### Parameters

##### streamId

`string`

The stream ID to extract the session for, or null to fetch
    sessions for any room.

##### sessionId

`string`

#### Returns

`Promise`\<\{
  `data`:   \| `undefined`
     \| [`InboundGroupSessionData`](../interfaces/InboundGroupSessionData.md);
  `session`: `undefined` \| `InboundGroupSession`;
\}\>

***

### getInboundGroupSessionIds()

```ts
getInboundGroupSessionIds(streamId): Promise<string[]>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:816](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L816)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<`string`[]\>

***

### getOutboundGroupSessionKey()

```ts
getOutboundGroupSessionKey(streamId): Promise<IOutboundGroupSessionKey>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:405](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L405)

Get the session keys for an outbound group session

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<[`IOutboundGroupSessionKey`](../interfaces/IOutboundGroupSessionKey.md)\>

current chain index, and
    base64-encoded secret key.

***

### hasHybridGroupSessionKey()

```ts
hasHybridGroupSessionKey(streamId, sessionId): Promise<boolean>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:853](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L853)

#### Parameters

##### streamId

`string`

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

***

### hasInboundSessionKeys()

```ts
hasInboundSessionKeys(streamId, sessionId): Promise<boolean>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:831](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L831)

Determine if we have the keys for a given group session

#### Parameters

##### streamId

`string`

stream in which the message was received

##### sessionId

`string`

session identifier

#### Returns

`Promise`\<`boolean`\>

***

### init()

```ts
init(opts?): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:133](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L133)

Iniitialize the Account. Must be called prior to any other operation
on the device.

Data from an exported device can be provided in order to recreate this device.

Attempts to load the Account from the crypto store, or create one otherwise
storing the account in storage.

Reads the device keys from the Account object.

#### Parameters

##### opts?

[`EncryptionDeviceInitOpts`](../type-aliases/EncryptionDeviceInitOpts.md)

#### Returns

`Promise`\<`void`\>

***

### markKeysAsPublished()

```ts
markKeysAsPublished(): Promise<void>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:321](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L321)

Marks all of the fallback keys as published.

#### Returns

`Promise`\<`void`\>

***

### sign()

```ts
sign(message): Promise<string>;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:313](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L313)

Signs a message with the ed25519 key for this account.

#### Parameters

##### message

`string`

message to be signed

#### Returns

`Promise`\<`string`\>

base64-encoded signature

***

### verifySignature()

```ts
verifySignature(
   key, 
   message, 
   signature): void;
```

Defined in: [packages/encryption/src/encryptionDevice.ts:808](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/encryptionDevice.ts#L808)

Verify an ed25519 signature.

#### Parameters

##### key

`string`

ed25519 key

##### message

`string`

message which was signed

##### signature

`string`

base64-encoded signature to be checked

#### Returns

`void`

#### Throws

Error if there is a problem with the verification. If the key was
too small then the message will be "OLM.INVALID_BASE64". If the signature
was invalid then the message will be "OLM.BAD_MESSAGE_MAC".
