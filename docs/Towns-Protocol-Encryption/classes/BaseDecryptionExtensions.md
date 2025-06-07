# Class: `abstract` BaseDecryptionExtensions

Defined in: [packages/encryption/src/decryptionExtensions.ts:193](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L193)

Responsibilities:
1. Download new to-device messages that happened while we were offline
2. Decrypt new to-device messages
3. Decrypt encrypted content
4. Retry decryption failures, request keys for failed decryption
5. Respond to key solicitations

Notes:
If in the future we started snapshotting the eventNum of the last message sent by every user,
we could use that to determine the order we send out keys, and the order that we reply to key solicitations.

It should be easy to introduce a priority stream, where we decrypt messages from that stream first, before
anything else, so the messages show up quicky in the ui that the user is looking at.

We need code to purge bad sessions (if someones sends us the wrong key, or a key that doesn't decrypt the message)

## theme_extended_by

- [`ClientDecryptionExtensions`](../../Towns-Protocol-SDK/classes/ClientDecryptionExtensions.md)

## Constructors

### Constructor

```ts
new BaseDecryptionExtensions(
   emitter, 
   crypto, 
   entitlementDelegate, 
   userDevice, 
   userId, 
   upToDateStreams, 
   inLogId): BaseDecryptionExtensions;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:224](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L224)

#### Parameters

##### emitter

`TypedEventEmitter`\<[`DecryptionEvents`](../type-aliases/DecryptionEvents.md)\>

##### crypto

[`GroupEncryptionCrypto`](GroupEncryptionCrypto.md)

##### entitlementDelegate

[`EntitlementsDelegate`](../interfaces/EntitlementsDelegate.md)

##### userDevice

[`UserDevice`](../interfaces/UserDevice.md)

##### userId

`string`

##### upToDateStreams

`Set`\<`string`\>

##### inLogId

`string`

#### Returns

`BaseDecryptionExtensions`

## Properties

### \_onStopFn()?

```ts
protected optional _onStopFn: () => void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:212](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L212)

#### Returns

`void`

***

### crypto

```ts
readonly crypto: GroupEncryptionCrypto;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:219](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L219)

***

### entitlementDelegate

```ts
readonly entitlementDelegate: EntitlementsDelegate;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:220](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L220)

***

### log

```ts
protected log: object;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:213](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L213)

#### debug

```ts
debug: DLogger;
```

#### error

```ts
error: DLogger;
```

#### info

```ts
info: DLogger;
```

***

### userDevice

```ts
readonly userDevice: UserDevice;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:221](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L221)

***

### userId

```ts
readonly userId: string;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:222](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L222)

## Accessors

### status

#### Get Signature

```ts
get status(): DecryptionStatus;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:472](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L472)

##### Returns

[`DecryptionStatus`](../enumerations/DecryptionStatus.md)

## Methods

### ackNewGroupSession()

```ts
abstract ackNewGroupSession(session): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:252](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L252)

#### Parameters

##### session

`UserInboxPayload_GroupEncryptionSessions`

#### Returns

`Promise`\<`void`\>

***

### checkStartTicking()

```ts
protected checkStartTicking(): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:493](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L493)

#### Returns

`void`

***

### decryptGroupEvent()

```ts
abstract decryptGroupEvent(
   streamId, 
   eventId, 
   kind, 
encryptedData): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:255](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L255)

#### Parameters

##### streamId

`string`

##### eventId

`string`

##### kind

`string`

##### encryptedData

`EncryptedData`

#### Returns

`Promise`\<`void`\>

***

### downloadNewMessages()

```ts
abstract downloadNewMessages(): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:261](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L261)

#### Returns

`Promise`\<`void`\>

***

### encryptAndShareGroupSessions()

```ts
abstract encryptAndShareGroupSessions(args): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:276](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L276)

#### Parameters

##### args

[`GroupSessionsData`](../interfaces/GroupSessionsData.md)

#### Returns

`Promise`\<`void`\>

***

### enqueueInitKeySolicitations()

```ts
enqueueInitKeySolicitations(
   streamId, 
   eventHashStr, 
   members, 
   sigBundle): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:321](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L321)

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### members

`object`[]

##### sigBundle

[`EventSignatureBundle`](../interfaces/EventSignatureBundle.md)

#### Returns

`void`

***

### enqueueKeySolicitation()

```ts
enqueueKeySolicitation(
   streamId, 
   eventHashStr, 
   fromUserId, 
   fromUserAddress, 
   keySolicitation, 
   sigBundle): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:365](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L365)

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### fromUserId

`string`

##### fromUserAddress

`Uint8Array`

##### keySolicitation

[`KeySolicitationContent`](../interfaces/KeySolicitationContent.md)

##### sigBundle

[`EventSignatureBundle`](../interfaces/EventSignatureBundle.md)

#### Returns

`void`

***

### enqueueNewEncryptedContent()

```ts
enqueueNewEncryptedContent(
   streamId, 
   eventId, 
   kind, 
   encryptedData): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:299](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L299)

#### Parameters

##### streamId

`string`

##### eventId

`string`

##### kind

`string`

##### encryptedData

`EncryptedData`

#### Returns

`void`

***

### enqueueNewGroupSessions()

```ts
enqueueNewGroupSessions(sessions, _senderId): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:289](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L289)

#### Parameters

##### sessions

`UserInboxPayload_GroupEncryptionSessions`

##### \_senderId

`string`

#### Returns

`void`

***

### enqueueNewMessageDownload()

```ts
enqueueNewMessageDownload(): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:451](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L451)

#### Returns

`void`

***

### getKeySolicitations()

```ts
abstract getKeySolicitations(streamId): KeySolicitationContent[];
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:262](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L262)

#### Parameters

##### streamId

`string`

#### Returns

[`KeySolicitationContent`](../interfaces/KeySolicitationContent.md)[]

***

### getPriorityForStream()

```ts
abstract getPriorityForStream(
   streamId, 
   highPriorityIds, 
   recentStreamIds): number;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:283](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L283)

#### Parameters

##### streamId

`string`

##### highPriorityIds

`Set`\<`string`\>

##### recentStreamIds

`Set`\<`string`\>

#### Returns

`number`

***

### getRespondDelayMSForKeySolicitation()

```ts
getRespondDelayMSForKeySolicitation(_streamId, _userId): number;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:926](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L926)

can be overridden to add a delay to the key solicitation response

#### Parameters

##### \_streamId

`string`

##### \_userId

`string`

#### Returns

`number`

***

### hasStream()

```ts
abstract hasStream(streamId): boolean;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:263](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L263)

#### Parameters

##### streamId

`string`

#### Returns

`boolean`

***

### isUserEntitledToKeyExchange()

```ts
abstract isUserEntitledToKeyExchange(
   streamId, 
   userId, 
opts?): Promise<boolean>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:264](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L264)

#### Parameters

##### streamId

`string`

##### userId

`string`

##### opts?

###### skipOnChainValidation

`boolean`

#### Returns

`Promise`\<`boolean`\>

***

### isUserInboxStreamUpToDate()

```ts
abstract isUserInboxStreamUpToDate(upToDateStreams): boolean;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:270](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L270)

#### Parameters

##### upToDateStreams

`Set`\<`string`\>

#### Returns

`boolean`

***

### isValidEvent()

```ts
abstract isValidEvent(item): object;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:269](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L269)

#### Parameters

##### item

[`KeySolicitationItem`](../interfaces/KeySolicitationItem.md)

#### Returns

`object`

##### isValid

```ts
isValid: boolean;
```

##### reason?

```ts
optional reason: string;
```

***

### onDecryptionError()

```ts
abstract onDecryptionError(item, err): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:271](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L271)

#### Parameters

##### item

[`EncryptedContentItem`](../interfaces/EncryptedContentItem.md)

##### err

[`DecryptionSessionError`](../interfaces/DecryptionSessionError.md)

#### Returns

`void`

***

### onStart()

```ts
onStart(): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:455](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L455)

#### Returns

`void`

***

### onStop()

```ts
onStop(): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:467](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L467)

#### Returns

`Promise`\<`void`\>

***

### resetUpToDateStreams()

```ts
resetUpToDateStreams(): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:415](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L415)

#### Returns

`void`

***

### retryDecryptionFailures()

```ts
retryDecryptionFailures(streamId): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:420](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L420)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### sendKeyFulfillment()

```ts
abstract sendKeyFulfillment(args): Promise<{
  error?: AddEventResponse_Error;
}>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:273](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L273)

#### Parameters

##### args

[`KeyFulfilmentData`](../interfaces/KeyFulfilmentData.md)

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
\}\>

***

### sendKeySolicitation()

```ts
abstract sendKeySolicitation(args): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:272](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L272)

#### Parameters

##### args

[`KeySolicitationData`](../interfaces/KeySolicitationData.md)

#### Returns

`Promise`\<`void`\>

***

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:930](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L930)

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

***

### setStreamUpToDate()

```ts
setStreamUpToDate(streamId): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:409](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L409)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### shouldPauseTicking()

```ts
abstract shouldPauseTicking(): boolean;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:277](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L277)

#### Returns

`boolean`

***

### start()

```ts
start(): void;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:435](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L435)

#### Returns

`void`

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:459](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L459)

#### Returns

`Promise`\<`void`\>

***

### uploadDeviceKeys()

```ts
abstract uploadDeviceKeys(): Promise<void>;
```

Defined in: [packages/encryption/src/decryptionExtensions.ts:282](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/encryption/src/decryptionExtensions.ts#L282)

uploadDeviceKeys
upload device keys to the server

#### Returns

`Promise`\<`void`\>
