# Class: ClientDecryptionExtensions

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:41](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L41)

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

## theme_extends

- [`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md)

## Constructors

### Constructor

```ts
new ClientDecryptionExtensions(
   client, 
   crypto, 
   delegate, 
   userId, 
   userDevice, 
   unpackEnvelopeOpts, 
   logId): ClientDecryptionExtensions;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:46](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L46)

#### Parameters

##### client

[`Client`](Client.md)

##### crypto

[`GroupEncryptionCrypto`](../../Towns-Protocol-Encryption/classes/GroupEncryptionCrypto.md)

##### delegate

[`EntitlementsDelegate`](../../Towns-Protocol-Encryption/interfaces/EntitlementsDelegate.md)

##### userId

`string`

##### userDevice

[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)

##### unpackEnvelopeOpts

`undefined` | \{
`disableSignatureValidation?`: `boolean`;
\}

##### logId

`string`

#### Returns

`ClientDecryptionExtensions`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`constructor`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#constructor)

## Properties

### \_onStopFn()?

```ts
protected optional _onStopFn: () => void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:110

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`_onStopFn`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#_onstopfn)

***

### crypto

```ts
readonly crypto: GroupEncryptionCrypto;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:116

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`crypto`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#crypto)

***

### entitlementDelegate

```ts
readonly entitlementDelegate: EntitlementsDelegate;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:117

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`entitlementDelegate`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#entitlementdelegate)

***

### log

```ts
protected log: object;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:111

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

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`log`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#log)

***

### userDevice

```ts
readonly userDevice: UserDevice;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:118

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`userDevice`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#userdevice)

***

### userId

```ts
readonly userId: string;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:119

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`userId`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#userid)

## Accessors

### status

#### Get Signature

```ts
get status(): DecryptionStatus;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:164

##### Returns

[`DecryptionStatus`](../../Towns-Protocol-Encryption/enumerations/DecryptionStatus.md)

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`status`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#status)

## Methods

### ackNewGroupSession()

```ts
ackNewGroupSession(_session): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:268](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L268)

#### Parameters

##### \_session

`UserInboxPayload_GroupEncryptionSessions`

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`ackNewGroupSession`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#acknewgroupsession)

***

### checkStartTicking()

```ts
protected checkStartTicking(): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:168

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`checkStartTicking`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#checkstartticking)

***

### decryptGroupEvent()

```ts
decryptGroupEvent(
   streamId, 
   eventId, 
   kind, 
encryptedData): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:165](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L165)

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

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`decryptGroupEvent`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#decryptgroupevent)

***

### downloadNewMessages()

```ts
downloadNewMessages(): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:174](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L174)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`downloadNewMessages`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#downloadnewmessages)

***

### encryptAndShareGroupSessions()

```ts
encryptAndShareGroupSessions(__namedParameters): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:274](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L274)

#### Parameters

##### \_\_namedParameters

[`GroupSessionsData`](../../Towns-Protocol-Encryption/interfaces/GroupSessionsData.md)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`encryptAndShareGroupSessions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#encryptandsharegroupsessions)

***

### enqueueInitKeySolicitations()

```ts
enqueueInitKeySolicitations(
   streamId, 
   eventHashStr, 
   members, 
   sigBundle): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:150

#### Parameters

##### streamId

`string`

##### eventHashStr

`string`

##### members

`object`[]

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`enqueueInitKeySolicitations`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#enqueueinitkeysolicitations)

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

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:155

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

[`KeySolicitationContent`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationContent.md)

##### sigBundle

[`EventSignatureBundle`](../../Towns-Protocol-Encryption/interfaces/EventSignatureBundle.md)

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`enqueueKeySolicitation`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#enqueuekeysolicitation)

***

### enqueueNewEncryptedContent()

```ts
enqueueNewEncryptedContent(
   streamId, 
   eventId, 
   kind, 
   encryptedData): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:148

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

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`enqueueNewEncryptedContent`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#enqueuenewencryptedcontent)

***

### enqueueNewGroupSessions()

```ts
enqueueNewGroupSessions(sessions, _senderId): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:147

#### Parameters

##### sessions

`UserInboxPayload_GroupEncryptionSessions`

##### \_senderId

`string`

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`enqueueNewGroupSessions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#enqueuenewgroupsessions)

***

### enqueueNewMessageDownload()

```ts
enqueueNewMessageDownload(): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:160

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`enqueueNewMessageDownload`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#enqueuenewmessagedownload)

***

### getKeySolicitations()

```ts
getKeySolicitations(streamId): KeySolicitationContent[];
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:179](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L179)

#### Parameters

##### streamId

`string`

#### Returns

[`KeySolicitationContent`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationContent.md)[]

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`getKeySolicitations`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#getkeysolicitations)

***

### getPriorityForStream()

```ts
getPriorityForStream(
   streamId, 
   highPriorityIds, 
   recentStreamIds): number;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:355](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L355)

#### Parameters

##### streamId

`string`

##### highPriorityIds

`Set`\<`string`\>

##### recentStreamIds

`Set`\<`string`\>

#### Returns

`number`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`getPriorityForStream`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#getpriorityforstream)

***

### getRespondDelayMSForKeySolicitation()

```ts
getRespondDelayMSForKeySolicitation(streamId, userId): number;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:188](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L188)

Override the default implementation to use the number of members in the stream
to determine the delay time.

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`number`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`getRespondDelayMSForKeySolicitation`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#getresponddelaymsforkeysolicitation)

***

### hasStream()

```ts
hasStream(streamId): boolean;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:149](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L149)

#### Parameters

##### streamId

`string`

#### Returns

`boolean`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`hasStream`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#hasstream)

***

### isUserEntitledToKeyExchange()

```ts
isUserEntitledToKeyExchange(
   streamId, 
   userId, 
opts?): Promise<boolean>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:199](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L199)

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

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`isUserEntitledToKeyExchange`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#isuserentitledtokeyexchange)

***

### isUserInboxStreamUpToDate()

```ts
isUserInboxStreamUpToDate(upToDateStreams): boolean;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:154](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L154)

#### Parameters

##### upToDateStreams

`Set`\<`string`\>

#### Returns

`boolean`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`isUserInboxStreamUpToDate`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#isuserinboxstreamuptodate)

***

### isValidEvent()

```ts
isValidEvent(item): object;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:231](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L231)

#### Parameters

##### item

[`KeySolicitationItem`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationItem.md)

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

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`isValidEvent`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#isvalidevent)

***

### onDecryptionError()

```ts
onDecryptionError(item, err): void;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:259](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L259)

#### Parameters

##### item

[`EncryptedContentItem`](../../Towns-Protocol-Encryption/interfaces/EncryptedContentItem.md)

##### err

[`DecryptionSessionError`](../../Towns-Protocol-Encryption/interfaces/DecryptionSessionError.md)

#### Returns

`void`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`onDecryptionError`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#ondecryptionerror)

***

### onStart()

```ts
onStart(): void;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:334](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L334)

#### Returns

`void`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`onStart`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#onstart)

***

### onStop()

```ts
onStop(): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:340](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L340)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`onStop`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#onstop)

***

### resetUpToDateStreams()

```ts
resetUpToDateStreams(): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:157

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`resetUpToDateStreams`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#resetuptodatestreams)

***

### retryDecryptionFailures()

```ts
retryDecryptionFailures(streamId): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:158

#### Parameters

##### streamId

`string`

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`retryDecryptionFailures`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#retrydecryptionfailures)

***

### sendKeyFulfillment()

```ts
sendKeyFulfillment(__namedParameters): Promise<{
  error?: AddEventResponse_Error;
}>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:312](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L312)

#### Parameters

##### \_\_namedParameters

[`KeyFulfilmentData`](../../Towns-Protocol-Encryption/interfaces/KeyFulfilmentData.md)

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
\}\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`sendKeyFulfillment`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#sendkeyfulfillment)

***

### sendKeySolicitation()

```ts
sendKeySolicitation(__namedParameters): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:298](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L298)

#### Parameters

##### \_\_namedParameters

[`KeySolicitationData`](../../Towns-Protocol-Encryption/interfaces/KeySolicitationData.md)

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`sendKeySolicitation`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#sendkeysolicitation)

***

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:197

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`setHighPriorityStreams`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#sethighprioritystreams)

***

### setStreamUpToDate()

```ts
setStreamUpToDate(streamId): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:156

#### Parameters

##### streamId

`string`

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`setStreamUpToDate`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#setstreamuptodate)

***

### shouldPauseTicking()

```ts
shouldPauseTicking(): boolean;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:161](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L161)

#### Returns

`boolean`

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`shouldPauseTicking`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#shouldpauseticking)

***

### start()

```ts
start(): void;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:159

#### Returns

`void`

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`start`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#start)

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: packages/encryption/dist/decryptionExtensions.d.ts:162

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`stop`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#stop)

***

### uploadDeviceKeys()

```ts
uploadDeviceKeys(): Promise<void>;
```

Defined in: [packages/sdk/src/clientDecryptionExtensions.ts:330](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/clientDecryptionExtensions.ts#L330)

uploadDeviceKeys
upload device keys to the server

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseDecryptionExtensions`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md).[`uploadDeviceKeys`](../../Towns-Protocol-Encryption/classes/BaseDecryptionExtensions.md#uploaddevicekeys)
