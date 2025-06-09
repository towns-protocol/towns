# Class: TransactionalClient

Defined in: [packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts:7](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts#L7)

## theme_extends

- [`Client`](Client.md)

## Constructors

### Constructor

```ts
new TransactionalClient(
   store, 
   signerContext, 
   rpcClient, 
   cryptoStore, 
   entitlementsDelegate, 
   opts?): TransactionalClient;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts:9](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts#L9)

#### Parameters

##### store

[`Store`](Store.md)

##### signerContext

[`SignerContext`](../interfaces/SignerContext.md)

##### rpcClient

[`StreamRpcClient`](../type-aliases/StreamRpcClient.md)

##### cryptoStore

[`CryptoStore`](../../Towns-Protocol-Encryption/classes/CryptoStore.md)

##### entitlementsDelegate

[`EntitlementsDelegate`](../../Towns-Protocol-Encryption/interfaces/EntitlementsDelegate.md)

##### opts?

[`ClientOptions`](../type-aliases/ClientOptions.md)

#### Returns

`TransactionalClient`

#### Overrides

[`Client`](Client.md).[`constructor`](Client.md#constructor)

## Properties

### cryptoBackend?

```ts
optional cryptoBackend: GroupEncryptionCrypto;
```

Defined in: [packages/sdk/src/client.ts:224](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L224)

#### Inherited from

[`Client`](Client.md).[`cryptoBackend`](Client.md#cryptobackend)

***

### cryptoStore

```ts
cryptoStore: CryptoStore;
```

Defined in: [packages/sdk/src/client.ts:225](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L225)

#### Inherited from

[`Client`](Client.md).[`cryptoStore`](Client.md#cryptostore)

***

### opts?

```ts
optional opts: ClientOptions;
```

Defined in: [packages/sdk/src/client.ts:244](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L244)

#### Inherited from

[`Client`](Client.md).[`opts`](Client.md#opts)

***

### rpcClient

```ts
readonly rpcClient: StreamRpcClient;
```

Defined in: [packages/sdk/src/client.ts:206](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L206)

#### Inherited from

[`Client`](Client.md).[`rpcClient`](Client.md#rpcclient)

***

### signerContext

```ts
readonly signerContext: SignerContext;
```

Defined in: [packages/sdk/src/client.ts:205](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L205)

#### Inherited from

[`Client`](Client.md).[`signerContext`](Client.md#signercontext)

***

### store

```ts
store: Store;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts:8](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts#L8)

***

### streams

```ts
readonly streams: SyncedStreams;
```

Defined in: [packages/sdk/src/client.ts:208](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L208)

#### Inherited from

[`Client`](Client.md).[`streams`](Client.md#streams)

***

### userId

```ts
readonly userId: string;
```

Defined in: [packages/sdk/src/client.ts:207](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L207)

#### Inherited from

[`Client`](Client.md).[`userId`](Client.md#userid)

***

### userInboxStreamId?

```ts
optional userInboxStreamId: string;
```

Defined in: [packages/sdk/src/client.ts:213](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L213)

#### Inherited from

[`Client`](Client.md).[`userInboxStreamId`](Client.md#userinboxstreamid)

***

### userMetadataStreamId?

```ts
optional userMetadataStreamId: string;
```

Defined in: [packages/sdk/src/client.ts:212](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L212)

#### Inherited from

[`Client`](Client.md).[`userMetadataStreamId`](Client.md#usermetadatastreamid)

***

### userSettingsStreamId?

```ts
optional userSettingsStreamId: string;
```

Defined in: [packages/sdk/src/client.ts:211](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L211)

#### Inherited from

[`Client`](Client.md).[`userSettingsStreamId`](Client.md#usersettingsstreamid)

***

### userStreamId?

```ts
optional userStreamId: string;
```

Defined in: [packages/sdk/src/client.ts:210](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L210)

#### Inherited from

[`Client`](Client.md).[`userStreamId`](Client.md#userstreamid)

## Accessors

### clientInitStatus

#### Get Signature

```ts
get clientInitStatus(): ClientInitStatus;
```

Defined in: [packages/sdk/src/client.ts:317](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L317)

##### Returns

[`ClientInitStatus`](../type-aliases/ClientInitStatus.md)

#### Inherited from

[`Client`](Client.md).[`clientInitStatus`](Client.md#clientinitstatus)

***

### cryptoInitialized

#### Get Signature

```ts
get cryptoInitialized(): boolean;
```

Defined in: [packages/sdk/src/client.ts:322](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L322)

##### Returns

`boolean`

#### Inherited from

[`Client`](Client.md).[`cryptoInitialized`](Client.md#cryptoinitialized)

***

### streamSyncActive

#### Get Signature

```ts
get streamSyncActive(): boolean;
```

Defined in: [packages/sdk/src/client.ts:313](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L313)

##### Returns

`boolean`

#### Inherited from

[`Client`](Client.md).[`streamSyncActive`](Client.md#streamsyncactive)

## Methods

### ackInboxStream()

```ts
ackInboxStream(): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2631](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2631)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`ackInboxStream`](Client.md#ackinboxstream)

***

### addListener()

```ts
addListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:22

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`addListener`](Client.md#addlistener)

***

### addTransaction()

```ts
addTransaction(
   chainId, 
   receipt, 
   content?, 
   tags?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2040](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2040)

#### Parameters

##### chainId

`number`

##### receipt

[`ContractReceipt`](../type-aliases/ContractReceipt.md) | [`SolanaTransactionReceipt`](../type-aliases/SolanaTransactionReceipt.md)

##### content?

\{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: `bigint`;
`channelId`: `Uint8Array`;
`currency`: `Uint8Array`;
`messageId`: `Uint8Array`;
`receiver`: `Uint8Array`;
`sender`: `Uint8Array`;
`tokenId`: `bigint`;
\};
`toUserAddress`: `Uint8Array`;
\};
\}

###### case

`"tip"`

###### value

\{
`event?`: \{
`amount`: `bigint`;
`channelId`: `Uint8Array`;
`currency`: `Uint8Array`;
`messageId`: `Uint8Array`;
`receiver`: `Uint8Array`;
`sender`: `Uint8Array`;
`tokenId`: `bigint`;
\};
`toUserAddress`: `Uint8Array`;
\}

**Generated**

from field: river.BlockchainTransaction.Tip tip = 101;

###### value.event?

\{
`amount`: `bigint`;
`channelId`: `Uint8Array`;
`currency`: `Uint8Array`;
`messageId`: `Uint8Array`;
`receiver`: `Uint8Array`;
`sender`: `Uint8Array`;
`tokenId`: `bigint`;
\}

event emitted by the tipping facet

**Generated**

from field: river.BlockchainTransaction.Tip.Event event = 1;

###### value.event.amount

`bigint`

**Generated**

from field: uint64 amount = 5;

###### value.event.channelId

`Uint8Array`

**Generated**

from field: bytes channel_id = 7;

###### value.event.currency

`Uint8Array`

**Generated**

from field: bytes currency = 2;

###### value.event.messageId

`Uint8Array`

**Generated**

from field: bytes message_id = 6;

###### value.event.receiver

`Uint8Array`

wallet that received funds

**Generated**

from field: bytes receiver = 4;

###### value.event.sender

`Uint8Array`

wallet that sent funds

**Generated**

from field: bytes sender = 3;

###### value.event.tokenId

`bigint`

**Generated**

from field: uint64 token_id = 1;

###### value.toUserAddress

`Uint8Array`

user that received funds

**Generated**

from field: bytes toUserAddress = 2;

|

\{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}

###### case

`"tokenTransfer"`

###### value

\{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\}

**Generated**

from field: river.BlockchainTransaction.TokenTransfer token_transfer = 102;

###### value.address

`Uint8Array`

**Generated**

from field: bytes address = 1;

###### value.amount

`string`

uint64 isn't big enough

**Generated**

from field: string amount = 2;

###### value.channelId

`Uint8Array`

**Generated**

from field: bytes channel_id = 5;

###### value.isBuy

`boolean`

**Generated**

from field: bool is_buy = 6;

###### value.messageId

`Uint8Array`

**Generated**

from field: bytes message_id = 4;

###### value.sender

`Uint8Array`

**Generated**

from field: bytes sender = 3;

|

\{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: `number`;
`user`: `Uint8Array`;
\};
`spaceAddress`: `Uint8Array`;
\};
\}

###### case

`"spaceReview"`

###### value

\{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: `number`;
`user`: `Uint8Array`;
\};
`spaceAddress`: `Uint8Array`;
\}

**Generated**

from field: river.BlockchainTransaction.SpaceReview space_review = 103;

###### value.action

`BlockchainTransaction_SpaceReview_Action`

action that was taken (add, update, delete)

**Generated**

from field: river.BlockchainTransaction.SpaceReview.Action action = 2;

###### value.event?

\{
`rating`: `number`;
`user`: `Uint8Array`;
\}

event emitted by the space review facet

**Generated**

from field: river.BlockchainTransaction.SpaceReview.Event event = 3;

###### value.event.rating

`number`

the comment can be found in the receipt logs

**Generated**

from field: int32 rating = 2;

###### value.event.user

`Uint8Array`

**Generated**

from field: bytes user = 1;

###### value.spaceAddress

`Uint8Array`

space that was reviewed

**Generated**

from field: bytes space_address = 1;

| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

##### tags?

###### groupMentionTypes

`GroupMentionType`[]

**Generated**

from field: repeated river.GroupMentionType group_mention_types = 2;

###### mentionedUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes mentioned_user_addresses = 3;

###### messageInteractionType

`MessageInteractionType`

**Generated**

from field: river.MessageInteractionType message_interaction_type = 1;

###### participatingUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes participating_user_addresses = 4;

###### threadId?

`Uint8Array`\<`ArrayBufferLike`\>

**Generated**

from field: optional bytes thread_id = 5;

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`addTransaction`](Client.md#addtransaction)

***

### addTransaction\_SpaceReview()

```ts
addTransaction_SpaceReview(
   chainId, 
   receipt, 
   event, 
   spaceId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2132](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2132)

#### Parameters

##### chainId

`number`

##### receipt

[`ContractReceipt`](../type-aliases/ContractReceipt.md)

##### event

[`SpaceReviewEventObject`](../../Towns-Protocol-Web3/interfaces/SpaceReviewEventObject.md)

##### spaceId

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`addTransaction_SpaceReview`](Client.md#addtransaction_spacereview)

***

### addTransaction\_Tip()

```ts
addTransaction_Tip(
   chainId, 
   receipt, 
   event, 
   toUserId, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2078](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2078)

#### Parameters

##### chainId

`number`

##### receipt

[`ContractReceipt`](../type-aliases/ContractReceipt.md)

##### event

`TipEventObject`

##### toUserId

`string`

##### opts?

`SendBlockchainTransactionOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`addTransaction_Tip`](Client.md#addtransaction_tip)

***

### addTransaction\_Transfer()

```ts
addTransaction_Transfer(
   chainId, 
   receipt, 
   event, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2112](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2112)

#### Parameters

##### chainId

`number`

##### receipt

[`ContractReceipt`](../type-aliases/ContractReceipt.md) | [`SolanaTransactionReceipt`](../type-aliases/SolanaTransactionReceipt.md)

##### event

###### address

`Uint8Array`

**Generated**

from field: bytes address = 1;

###### amount

`string`

uint64 isn't big enough

**Generated**

from field: string amount = 2;

###### channelId

`Uint8Array`

**Generated**

from field: bytes channel_id = 5;

###### isBuy

`boolean`

**Generated**

from field: bool is_buy = 6;

###### messageId

`Uint8Array`

**Generated**

from field: bytes message_id = 4;

###### sender

`Uint8Array`

**Generated**

from field: bytes sender = 3;

##### opts?

`SendBlockchainTransactionOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`addTransaction_Transfer`](Client.md#addtransaction_transfer)

***

### createChannel()

```ts
createChannel(
   spaceId, 
   channelName, 
   channelTopic, 
   inChannelId, 
   streamSettings?, 
   channelSettings?): Promise<{
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:687](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L687)

#### Parameters

##### spaceId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### channelName

`string`

##### channelTopic

`string`

##### inChannelId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### streamSettings?

###### disableMiniblockCreation

`boolean`

Test setting for testing with manual miniblock creation through Info debug request.

**Generated**

from field: bool disable_miniblock_creation = 1;

##### channelSettings?

###### autojoin

`boolean`

**Generated**

from field: bool autojoin = 1;

###### hideUserJoinLeaveEvents

`boolean`

**Generated**

from field: bool hide_user_join_leave_events = 2;

#### Returns

`Promise`\<\{
  `streamId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`createChannel`](Client.md#createchannel)

***

### createDMChannel()

```ts
createDMChannel(userId, streamSettings?): Promise<{
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:726](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L726)

#### Parameters

##### userId

`string`

##### streamSettings?

###### disableMiniblockCreation

`boolean`

Test setting for testing with manual miniblock creation through Info debug request.

**Generated**

from field: bool disable_miniblock_creation = 1;

#### Returns

`Promise`\<\{
  `streamId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`createDMChannel`](Client.md#createdmchannel)

***

### createGDMChannel()

```ts
createGDMChannel(
   userIds, 
   channelProperties?, 
   streamSettings?): Promise<{
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:767](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L767)

#### Parameters

##### userIds

`string`[]

##### channelProperties?

`EncryptedData`

##### streamSettings?

###### disableMiniblockCreation

`boolean`

Test setting for testing with manual miniblock creation through Info debug request.

**Generated**

from field: bool disable_miniblock_creation = 1;

#### Returns

`Promise`\<\{
  `streamId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`createGDMChannel`](Client.md#creategdmchannel)

***

### createMediaStream()

```ts
createMediaStream(
   channelId, 
   spaceId, 
   userId, 
   chunkCount, 
   firstChunk?, 
   firstChunkIv?, 
   streamSettings?, 
   perChunkEncryption?): Promise<{
  creationCookie: CreationCookie;
}>;
```

Defined in: [packages/sdk/src/client.ts:814](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L814)

#### Parameters

##### channelId

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### spaceId

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### userId

`undefined` | `string`

##### chunkCount

`number`

##### firstChunk?

`Uint8Array`\<`ArrayBufferLike`\>

##### firstChunkIv?

`Uint8Array`\<`ArrayBufferLike`\>

##### streamSettings?

###### disableMiniblockCreation

`boolean`

Test setting for testing with manual miniblock creation through Info debug request.

**Generated**

from field: bool disable_miniblock_creation = 1;

##### perChunkEncryption?

`boolean`

#### Returns

`Promise`\<\{
  `creationCookie`: `CreationCookie`;
\}\>

#### Inherited from

[`Client`](Client.md).[`createMediaStream`](Client.md#createmediastream)

***

### createSpace()

```ts
createSpace(spaceAddressOrId): Promise<{
  streamId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:655](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L655)

#### Parameters

##### spaceAddressOrId

`string`

#### Returns

`Promise`\<\{
  `streamId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`createSpace`](Client.md#createspace)

***

### createSyncedStream()

```ts
createSyncedStream(streamId): SyncedStream;
```

Defined in: [packages/sdk/src/client.ts:337](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L337)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

[`SyncedStream`](SyncedStream.md)

#### Inherited from

[`Client`](Client.md).[`createSyncedStream`](Client.md#createsyncedstream)

***

### debugDropStream()

```ts
debugDropStream(syncId, streamId): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2832](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2832)

#### Parameters

##### syncId

`string`

##### streamId

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`debugDropStream`](Client.md#debugdropstream)

***

### debugForceAddEvent()

```ts
debugForceAddEvent(streamId, event): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2827](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2827)

#### Parameters

##### streamId

`string`

##### event

`Envelope`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`debugForceAddEvent`](Client.md#debugforceaddevent)

***

### debugForceMakeMiniblock()

```ts
debugForceMakeMiniblock(streamId, opts): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2818](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2818)

#### Parameters

##### streamId

`string`

##### opts

###### forceSnapshot?

`boolean`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`debugForceMakeMiniblock`](Client.md#debugforcemakeminiblock)

***

### decryptGroupEvent()

```ts
decryptGroupEvent(
   streamId, 
   eventId, 
   kind, 
encryptedData): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2681](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2681)

decrypts and updates the decrypted event

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

#### Inherited from

[`Client`](Client.md).[`decryptGroupEvent`](Client.md#decryptgroupevent)

***

### downloadNewInboxMessages()

```ts
downloadNewInboxMessages(): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2310](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2310)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`downloadNewInboxMessages`](Client.md#downloadnewinboxmessages)

***

### downloadUserDeviceInfo()

```ts
downloadUserDeviceInfo(userIds): Promise<UserDeviceCollection>;
```

Defined in: [packages/sdk/src/client.ts:2339](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2339)

#### Parameters

##### userIds

`string`[]

#### Returns

`Promise`\<[`UserDeviceCollection`](../../Towns-Protocol-Encryption/interfaces/UserDeviceCollection.md)\>

#### Inherited from

[`Client`](Client.md).[`downloadUserDeviceInfo`](Client.md#downloaduserdeviceinfo)

***

### emit()

```ts
emit<E>(event, ...args): boolean;
```

Defined in: [packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts:21](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/river-connection/models/transactionalClient.ts#L21)

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### args

...`Parameters`\<[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]\>

#### Returns

`boolean`

#### Overrides

[`Client`](Client.md).[`emit`](Client.md#emit)

***

### encryptAndShareGroupSessions()

```ts
encryptAndShareGroupSessions(
   inStreamId, 
   sessions, 
   toDevices, 
algorithm): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2717](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2717)

#### Parameters

##### inStreamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### sessions

[`GroupEncryptionSession`](../../Towns-Protocol-Encryption/interfaces/GroupEncryptionSession.md)[]

##### toDevices

[`UserDeviceCollection`](../../Towns-Protocol-Encryption/interfaces/UserDeviceCollection.md)

##### algorithm

[`GroupEncryptionAlgorithmId`](../../Towns-Protocol-Encryption/enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`encryptAndShareGroupSessions`](Client.md#encryptandsharegroupsessions)

***

### encryptGroupEvent()

```ts
encryptGroupEvent(
   event, 
   streamId, 
algorithm): Promise<EncryptedData>;
```

Defined in: [packages/sdk/src/client.ts:2785](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2785)

#### Parameters

##### event

`Uint8Array`

##### streamId

`string`

##### algorithm

[`GroupEncryptionAlgorithmId`](../../Towns-Protocol-Encryption/enumerations/GroupEncryptionAlgorithmId.md)

#### Returns

`Promise`\<`EncryptedData`\>

#### Inherited from

[`Client`](Client.md).[`encryptGroupEvent`](Client.md#encryptgroupevent)

***

### encryptWithDeviceKeys()

```ts
encryptWithDeviceKeys(payloadClearText, deviceKeys): Promise<Record<string, string>>;
```

Defined in: [packages/sdk/src/client.ts:2797](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2797)

#### Parameters

##### payloadClearText

`string`

##### deviceKeys

[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)[]

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

#### Inherited from

[`Client`](Client.md).[`encryptWithDeviceKeys`](Client.md#encryptwithdevicekeys)

***

### ensureOutboundSession()

```ts
ensureOutboundSession(streamId, opts): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2666](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2666)

#### Parameters

##### streamId

`string`

##### opts

###### awaitInitialShareSession

`boolean`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`ensureOutboundSession`](Client.md#ensureoutboundsession)

***

### eventNames()

```ts
eventNames(): (string | symbol)[];
```

Defined in: node\_modules/typed-emitter/index.d.ts:34

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

[`Client`](Client.md).[`eventNames`](Client.md#eventnames)

***

### getDevicesInStream()

```ts
getDevicesInStream(stream_id): Promise<UserDeviceCollection>;
```

Defined in: [packages/sdk/src/client.ts:2276](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2276)

Get the list of active devices for all users in the room

#### Parameters

##### stream\_id

`string`

#### Returns

`Promise`\<[`UserDeviceCollection`](../../Towns-Protocol-Encryption/interfaces/UserDeviceCollection.md)\>

Promise which resolves to `null`, or an array whose
    first element is a DeviceInfoMap indicating
    the devices that messages should be encrypted to, and whose second
    element is a map from userId to deviceId to data indicating the devices
    that are in the room but that have been blocked.

#### Inherited from

[`Client`](Client.md).[`getDevicesInStream`](Client.md#getdevicesinstream)

***

### getMaxListeners()

```ts
getMaxListeners(): number;
```

Defined in: node\_modules/typed-emitter/index.d.ts:39

#### Returns

`number`

#### Inherited from

[`Client`](Client.md).[`getMaxListeners`](Client.md#getmaxlisteners)

***

### getMediaPayload()

```ts
getMediaPayload(
   streamId, 
   secretKey, 
iv): Promise<undefined | Uint8Array<ArrayBufferLike>>;
```

Defined in: [packages/sdk/src/client.ts:1782](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1782)

#### Parameters

##### streamId

`string`

##### secretKey

`Uint8Array`

##### iv

`Uint8Array`

#### Returns

`Promise`\<`undefined` \| `Uint8Array`\<`ArrayBufferLike`\>\>

#### Inherited from

[`Client`](Client.md).[`getMediaPayload`](Client.md#getmediapayload)

***

### getMiniblockInfo()

```ts
getMiniblockInfo(streamId): Promise<{
  miniblockHash: Uint8Array;
  miniblockNum: bigint;
}>;
```

Defined in: [packages/sdk/src/client.ts:2293](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2293)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<\{
  `miniblockHash`: `Uint8Array`;
  `miniblockNum`: `bigint`;
\}\>

#### Inherited from

[`Client`](Client.md).[`getMiniblockInfo`](Client.md#getminiblockinfo)

***

### getMiniblocks()

```ts
getMiniblocks(
   streamId, 
   fromInclusive, 
   toExclusive, 
   opts?): Promise<{
  miniblocks: ParsedMiniblock[];
  terminus: boolean;
}>;
```

Defined in: [packages/sdk/src/client.ts:2152](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2152)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### fromInclusive

`bigint`

##### toExclusive

`bigint`

##### opts?

###### skipPersistence?

`boolean`

#### Returns

`Promise`\<\{
  `miniblocks`: [`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[];
  `terminus`: `boolean`;
\}\>

#### Inherited from

[`Client`](Client.md).[`getMiniblocks`](Client.md#getminiblocks)

***

### getStream()

```ts
getStream(streamId): Promise<StreamStateView>;
```

Defined in: [packages/sdk/src/client.ts:1294](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1294)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<[`StreamStateView`](StreamStateView.md)\>

#### Inherited from

[`Client`](Client.md).[`getStream`](Client.md#getstream)

***

### getStreamEx()

```ts
getStreamEx(streamId): Promise<StreamStateView>;
```

Defined in: [packages/sdk/src/client.ts:1348](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1348)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<[`StreamStateView`](StreamStateView.md)\>

#### Inherited from

[`Client`](Client.md).[`getStreamEx`](Client.md#getstreamex)

***

### getStreamLastMiniblockHash()

```ts
getStreamLastMiniblockHash(streamId): Promise<GetLastMiniblockHashResponse>;
```

Defined in: [packages/sdk/src/client.ts:2566](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2566)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`GetLastMiniblockHashResponse`\>

#### Inherited from

[`Client`](Client.md).[`getStreamLastMiniblockHash`](Client.md#getstreamlastminiblockhash)

***

### getUserBio()

```ts
getUserBio(userId): Promise<undefined | UserBio>;
```

Defined in: [packages/sdk/src/client.ts:1137](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1137)

#### Parameters

##### userId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`undefined` \| `UserBio`\>

#### Inherited from

[`Client`](Client.md).[`getUserBio`](Client.md#getuserbio)

***

### getUserProfileImage()

```ts
getUserProfileImage(userId): Promise<undefined | ChunkedMedia>;
```

Defined in: [packages/sdk/src/client.ts:1109](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1109)

#### Parameters

##### userId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`undefined` \| `ChunkedMedia`\>

#### Inherited from

[`Client`](Client.md).[`getUserProfileImage`](Client.md#getuserprofileimage)

***

### initializeUser()

```ts
initializeUser(opts?): Promise<{
  initCryptoTime: number;
  initUserInboxStreamTime: number;
  initUserMetadataStreamTime: number;
  initUserSettingsStreamTime: number;
  initUserStreamTime: number;
}>;
```

Defined in: [packages/sdk/src/client.ts:377](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L377)

#### Parameters

##### opts?

###### encryptionDeviceInit?

[`EncryptionDeviceInitOpts`](../../Towns-Protocol-Encryption/type-aliases/EncryptionDeviceInitOpts.md)

###### spaceId?

`string` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<\{
  `initCryptoTime`: `number`;
  `initUserInboxStreamTime`: `number`;
  `initUserMetadataStreamTime`: `number`;
  `initUserSettingsStreamTime`: `number`;
  `initUserStreamTime`: `number`;
\}\>

#### Inherited from

[`Client`](Client.md).[`initializeUser`](Client.md#initializeuser)

***

### initStream()

```ts
initStream(
   streamId, 
   allowGetStream, 
persistedData?): Promise<Stream>;
```

Defined in: [packages/sdk/src/client.ts:1408](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1408)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### allowGetStream

`boolean` = `true`

##### persistedData?

[`LoadedStream`](../interfaces/LoadedStream.md)

#### Returns

`Promise`\<[`Stream`](Stream.md)\>

#### Inherited from

[`Client`](Client.md).[`initStream`](Client.md#initstream)

***

### inviteUser()

```ts
inviteUser(streamId, userId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1900](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1900)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### userId

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`inviteUser`](Client.md#inviteuser)

***

### isUsernameAvailable()

```ts
isUsernameAvailable(streamId, username): boolean;
```

Defined in: [packages/sdk/src/client.ts:1238](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1238)

#### Parameters

##### streamId

`string`

##### username

`string`

#### Returns

`boolean`

#### Inherited from

[`Client`](Client.md).[`isUsernameAvailable`](Client.md#isusernameavailable)

***

### joinStream()

```ts
joinStream(streamId, opts?): Promise<Stream>;
```

Defined in: [packages/sdk/src/client.ts:1928](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1928)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### opts?

###### skipWaitForMiniblockConfirmation?

`boolean`

###### skipWaitForUserStreamUpdate?

`boolean`

#### Returns

`Promise`\<[`Stream`](Stream.md)\>

#### Inherited from

[`Client`](Client.md).[`joinStream`](Client.md#joinstream)

***

### joinUser()

```ts
joinUser(streamId, userId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1914](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1914)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### userId

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`joinUser`](Client.md#joinuser)

***

### knownDevicesForUserId()

```ts
knownDevicesForUserId(userId): Promise<UserDevice[]>;
```

Defined in: [packages/sdk/src/client.ts:2373](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2373)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)[]\>

#### Inherited from

[`Client`](Client.md).[`knownDevicesForUserId`](Client.md#knowndevicesforuserid)

***

### leaveStream()

```ts
leaveStream(streamId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1972](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1972)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`leaveStream`](Client.md#leavestream)

***

### listenerCount()

```ts
listenerCount<E>(event): number;
```

Defined in: node\_modules/typed-emitter/index.d.ts:37

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

#### Returns

`number`

#### Inherited from

[`Client`](Client.md).[`listenerCount`](Client.md#listenercount)

***

### listeners()

```ts
listeners<E>(event): ClientEvents[E][];
```

Defined in: node\_modules/typed-emitter/index.d.ts:36

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

#### Returns

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\][]

#### Inherited from

[`Client`](Client.md).[`listeners`](Client.md#listeners)

***

### makeEventAndAddToStream()

```ts
makeEventAndAddToStream(
   streamId, 
   payload, 
   options): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2377](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2377)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### payload

\{
`case`: `"miniblockHeader"`;
`value`: \{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\};
\}

###### case

`"miniblockHeader"`

###### value

\{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\}

**Generated**

from field: river.MiniblockHeader miniblock_header = 100;

###### value.content

\| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

stream payloads are required to have a content field

**Generated**

from oneof river.MiniblockHeader.content

###### value.eventHashes

`Uint8Array`\<`ArrayBufferLike`\>[]

Hashes of the events included in the block.

**Generated**

from field: repeated bytes event_hashes = 4;

###### value.eventNumOffset

`bigint`

count of all events in the stream before this block

**Generated**

from field: int64 event_num_offset = 6;

###### value.miniblockNum

`bigint`

Miniblock number.
0 for genesis block.
Must be 1 greater than the previous block number.

**Generated**

from field: int64 miniblock_num = 1;

###### value.prevMiniblockHash

`Uint8Array`

Hash of the previous block.

**Generated**

from field: bytes prev_miniblock_hash = 2;

###### value.prevSnapshotMiniblockNum

`bigint`

pointer to block with previous snapshot

**Generated**

from field: int64 prev_snapshot_miniblock_num = 7;

###### value.snapshot?

\{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\}

Snapshot of the state at the end of the block.

**Generated**

from field: optional river.Snapshot snapshot = 5;

###### value.snapshot.content

\| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

Snapshot data specific for each stream type.

**Generated**

from oneof river.Snapshot.content

###### value.snapshot.members?

\{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\}

**Generated**

from field: river.MemberPayload.Snapshot members = 1;

###### value.snapshot.members.encryptionAlgorithm?

\{
`algorithm?`: `string`;
\}

**Generated**

from field: river.MemberPayload.EncryptionAlgorithm encryption_algorithm = 4;

###### value.snapshot.members.encryptionAlgorithm.algorithm?

`string`

**Generated**

from field: optional string algorithm = 1;

###### value.snapshot.members.joined

`object`[]

**Generated**

from field: repeated river.MemberPayload.Snapshot.Member joined = 1;

###### value.snapshot.members.pins

`object`[]

**Generated**

from field: repeated river.MemberPayload.SnappedPin pins = 2;

###### value.snapshot.members.tips

\{
[`key`: `string`]: `bigint`;
\}

tips sent in this stream: map<currency, amount>

**Generated**

from field: map<string, uint64> tips = 5;

###### value.snapshot.members.tipsCount

\{
[`key`: `string`]: `bigint`;
\}

**Generated**

from field: map<string, uint64> tips_count = 6;

###### value.snapshot.snapshotVersion

`number`

**Generated**

from field: int32 snapshot_version = 2;

###### value.snapshotHash?

`Uint8Array`\<`ArrayBufferLike`\>

hash of the snapshot.

**Generated**

from field: optional bytes snapshot_hash = 8;

###### value.timestamp?

\{
`nanos`: `number`;
`seconds`: `bigint`;
\}

Timestamp of the block.
Must be greater than the previous block timestamp.

**Generated**

from field: google.protobuf.Timestamp timestamp = 3;

###### value.timestamp.nanos

`number`

Non-negative fractions of a second at nanosecond resolution. Negative
second values with fractions must still have non-negative nanos values
that count forward in time. Must be from 0 to 999,999,999
inclusive.

**Generated**

from field: int32 nanos = 2;

###### value.timestamp.seconds

`bigint`

Represents seconds of UTC time since Unix epoch
1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
9999-12-31T23:59:59Z inclusive.

**Generated**

from field: int64 seconds = 1;

|

\{
`case`: `"memberPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"memberPayload"`

###### value

\{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MemberPayload member_payload = 101;

###### value.content

\| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MemberPayload.content

|

\{
`case`: `"spacePayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"spacePayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.SpacePayload space_payload = 102;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.SpacePayload.content

|

\{
`case`: `"channelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"channelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.ChannelPayload channel_payload = 103;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.ChannelPayload.content

|

\{
`case`: `"userPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserPayload user_payload = 104;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserPayload.content

|

\{
`case`: `"userSettingsPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userSettingsPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserSettingsPayload user_settings_payload = 105;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserSettingsPayload.content

|

\{
`case`: `"userMetadataPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userMetadataPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserMetadataPayload user_metadata_payload = 106;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserMetadataPayload.content

|

\{
`case`: `"userInboxPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userInboxPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserInboxPayload user_inbox_payload = 107;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserInboxPayload.content

|

\{
`case`: `"mediaPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"mediaPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MediaPayload media_payload = 108;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MediaPayload.content

|

\{
`case`: `"dmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"dmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.DmChannelPayload dm_channel_payload = 109;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.DmChannelPayload.content

|

\{
`case`: `"gdmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"gdmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.GdmChannelPayload gdm_channel_payload = 110;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.GdmChannelPayload.content

| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

##### options

###### cleartext?

`Uint8Array`\<`ArrayBufferLike`\>

###### localId?

`string`

###### method?

`string`

###### optional?

`boolean`

###### tags?

\{
  `groupMentionTypes`: `GroupMentionType`[];
  `mentionedUserAddresses`: `Uint8Array`\<`ArrayBufferLike`\>[];
  `messageInteractionType`: `MessageInteractionType`;
  `participatingUserAddresses`: `Uint8Array`\<`ArrayBufferLike`\>[];
  `threadId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\}

###### tags.groupMentionTypes

`GroupMentionType`[]

**Generated**

from field: repeated river.GroupMentionType group_mention_types = 2;

###### tags.mentionedUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes mentioned_user_addresses = 3;

###### tags.messageInteractionType

`MessageInteractionType`

**Generated**

from field: river.MessageInteractionType message_interaction_type = 1;

###### tags.participatingUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes participating_user_addresses = 4;

###### tags.threadId?

`Uint8Array`\<`ArrayBufferLike`\>

**Generated**

from field: optional bytes thread_id = 5;

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`makeEventAndAddToStream`](Client.md#makeeventandaddtostream)

***

### makeEventWithHashAndAddToStream()

```ts
makeEventWithHashAndAddToStream(
   streamId, 
   payload, 
   prevMiniblockHash, 
   prevMiniblockNum, 
   optional?, 
   localId?, 
   cleartext?, 
   tags?, 
   retryCount?): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
  prevMiniblockHash: Uint8Array;
}>;
```

Defined in: [packages/sdk/src/client.ts:2425](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2425)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### payload

\{
`case`: `"miniblockHeader"`;
`value`: \{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\};
\}

###### case

`"miniblockHeader"`

###### value

\{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\}

**Generated**

from field: river.MiniblockHeader miniblock_header = 100;

###### value.content

\| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

stream payloads are required to have a content field

**Generated**

from oneof river.MiniblockHeader.content

###### value.eventHashes

`Uint8Array`\<`ArrayBufferLike`\>[]

Hashes of the events included in the block.

**Generated**

from field: repeated bytes event_hashes = 4;

###### value.eventNumOffset

`bigint`

count of all events in the stream before this block

**Generated**

from field: int64 event_num_offset = 6;

###### value.miniblockNum

`bigint`

Miniblock number.
0 for genesis block.
Must be 1 greater than the previous block number.

**Generated**

from field: int64 miniblock_num = 1;

###### value.prevMiniblockHash

`Uint8Array`

Hash of the previous block.

**Generated**

from field: bytes prev_miniblock_hash = 2;

###### value.prevSnapshotMiniblockNum

`bigint`

pointer to block with previous snapshot

**Generated**

from field: int64 prev_snapshot_miniblock_num = 7;

###### value.snapshot?

\{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\}

Snapshot of the state at the end of the block.

**Generated**

from field: optional river.Snapshot snapshot = 5;

###### value.snapshot.content

\| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

Snapshot data specific for each stream type.

**Generated**

from oneof river.Snapshot.content

###### value.snapshot.members?

\{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\}

**Generated**

from field: river.MemberPayload.Snapshot members = 1;

###### value.snapshot.members.encryptionAlgorithm?

\{
`algorithm?`: `string`;
\}

**Generated**

from field: river.MemberPayload.EncryptionAlgorithm encryption_algorithm = 4;

###### value.snapshot.members.encryptionAlgorithm.algorithm?

`string`

**Generated**

from field: optional string algorithm = 1;

###### value.snapshot.members.joined

`object`[]

**Generated**

from field: repeated river.MemberPayload.Snapshot.Member joined = 1;

###### value.snapshot.members.pins

`object`[]

**Generated**

from field: repeated river.MemberPayload.SnappedPin pins = 2;

###### value.snapshot.members.tips

\{
[`key`: `string`]: `bigint`;
\}

tips sent in this stream: map<currency, amount>

**Generated**

from field: map<string, uint64> tips = 5;

###### value.snapshot.members.tipsCount

\{
[`key`: `string`]: `bigint`;
\}

**Generated**

from field: map<string, uint64> tips_count = 6;

###### value.snapshot.snapshotVersion

`number`

**Generated**

from field: int32 snapshot_version = 2;

###### value.snapshotHash?

`Uint8Array`\<`ArrayBufferLike`\>

hash of the snapshot.

**Generated**

from field: optional bytes snapshot_hash = 8;

###### value.timestamp?

\{
`nanos`: `number`;
`seconds`: `bigint`;
\}

Timestamp of the block.
Must be greater than the previous block timestamp.

**Generated**

from field: google.protobuf.Timestamp timestamp = 3;

###### value.timestamp.nanos

`number`

Non-negative fractions of a second at nanosecond resolution. Negative
second values with fractions must still have non-negative nanos values
that count forward in time. Must be from 0 to 999,999,999
inclusive.

**Generated**

from field: int32 nanos = 2;

###### value.timestamp.seconds

`bigint`

Represents seconds of UTC time since Unix epoch
1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
9999-12-31T23:59:59Z inclusive.

**Generated**

from field: int64 seconds = 1;

|

\{
`case`: `"memberPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"memberPayload"`

###### value

\{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MemberPayload member_payload = 101;

###### value.content

\| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MemberPayload.content

|

\{
`case`: `"spacePayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"spacePayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.SpacePayload space_payload = 102;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.SpacePayload.content

|

\{
`case`: `"channelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"channelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.ChannelPayload channel_payload = 103;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.ChannelPayload.content

|

\{
`case`: `"userPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserPayload user_payload = 104;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserPayload.content

|

\{
`case`: `"userSettingsPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userSettingsPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserSettingsPayload user_settings_payload = 105;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserSettingsPayload.content

|

\{
`case`: `"userMetadataPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userMetadataPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserMetadataPayload user_metadata_payload = 106;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserMetadataPayload.content

|

\{
`case`: `"userInboxPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userInboxPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserInboxPayload user_inbox_payload = 107;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserInboxPayload.content

|

\{
`case`: `"mediaPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"mediaPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MediaPayload media_payload = 108;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MediaPayload.content

|

\{
`case`: `"dmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"dmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.DmChannelPayload dm_channel_payload = 109;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.DmChannelPayload.content

|

\{
`case`: `"gdmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"gdmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.GdmChannelPayload gdm_channel_payload = 110;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.GdmChannelPayload.content

| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

##### prevMiniblockHash

`Uint8Array`

##### prevMiniblockNum

`bigint`

##### optional?

`boolean`

##### localId?

`string`

##### cleartext?

`Uint8Array`\<`ArrayBufferLike`\>

##### tags?

###### groupMentionTypes

`GroupMentionType`[]

**Generated**

from field: repeated river.GroupMentionType group_mention_types = 2;

###### mentionedUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes mentioned_user_addresses = 3;

###### messageInteractionType

`MessageInteractionType`

**Generated**

from field: river.MessageInteractionType message_interaction_type = 1;

###### participatingUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes participating_user_addresses = 4;

###### threadId?

`Uint8Array`\<`ArrayBufferLike`\>

**Generated**

from field: optional bytes thread_id = 5;

##### retryCount?

`number`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
  `prevMiniblockHash`: `Uint8Array`;
\}\>

#### Inherited from

[`Client`](Client.md).[`makeEventWithHashAndAddToStream`](Client.md#makeeventwithhashandaddtostream)

***

### makeMediaEventWithHashAndAddToMediaStream()

```ts
makeMediaEventWithHashAndAddToMediaStream(
   creationCookie, 
   last, 
   payload): Promise<{
  creationCookie: CreationCookie;
}>;
```

Defined in: [packages/sdk/src/client.ts:2546](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2546)

#### Parameters

##### creationCookie

`CreationCookie`

##### last

`boolean`

##### payload

\{
`case`: `"miniblockHeader"`;
`value`: \{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\};
\}

###### case

`"miniblockHeader"`

###### value

\{
`content`:   \| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`eventHashes`: `Uint8Array`\<`ArrayBufferLike`\>[];
`eventNumOffset`: `bigint`;
`miniblockNum`: `bigint`;
`prevMiniblockHash`: `Uint8Array`;
`prevSnapshotMiniblockNum`: `bigint`;
`snapshot?`: \{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\};
`snapshotHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`timestamp?`: \{
`nanos`: `number`;
`seconds`: `bigint`;
\};
\}

**Generated**

from field: river.MiniblockHeader miniblock_header = 100;

###### value.content

\| \{
`case`: `"none"`;
`value`: \{
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

stream payloads are required to have a content field

**Generated**

from oneof river.MiniblockHeader.content

###### value.eventHashes

`Uint8Array`\<`ArrayBufferLike`\>[]

Hashes of the events included in the block.

**Generated**

from field: repeated bytes event_hashes = 4;

###### value.eventNumOffset

`bigint`

count of all events in the stream before this block

**Generated**

from field: int64 event_num_offset = 6;

###### value.miniblockNum

`bigint`

Miniblock number.
0 for genesis block.
Must be 1 greater than the previous block number.

**Generated**

from field: int64 miniblock_num = 1;

###### value.prevMiniblockHash

`Uint8Array`

Hash of the previous block.

**Generated**

from field: bytes prev_miniblock_hash = 2;

###### value.prevSnapshotMiniblockNum

`bigint`

pointer to block with previous snapshot

**Generated**

from field: int64 prev_snapshot_miniblock_num = 7;

###### value.snapshot?

\{
`content`:   \| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`members?`: \{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
`snapshotVersion`: `number`;
\}

Snapshot of the state at the end of the block.

**Generated**

from field: optional river.Snapshot snapshot = 5;

###### value.snapshot.content

\| \{
`case`: `"spaceContent"`;
`value`: \{
`channels`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`spaceImage?`: \{
`creatorAddress`: `Uint8Array`;
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"channelContent"`;
`value`: \{
`inception?`: \{
`channelSettings?`: ... \| ...;
`settings?`: ... \| ...;
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userContent"`;
`value`: \{
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`memberships`: `object`[];
`tipsReceived`: \{
[`key`: `string`]: `bigint`;
\};
`tipsReceivedCount`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSent`: \{
[`key`: `string`]: `bigint`;
\};
`tipsSentCount`: \{
[`key`: `string`]: `bigint`;
\};
\};
\}
\| \{
`case`: `"userSettingsContent"`;
`value`: \{
`fullyReadMarkers`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`userBlocksList`: `object`[];
\};
\}
\| \{
`case`: `"userMetadataContent"`;
`value`: \{
`bio?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`encryptionDevices`: `object`[];
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
`profileImage?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
\};
\}
\| \{
`case`: `"mediaContent"`;
`value`: \{
`inception?`: \{
`channelId?`: ... \| ...;
`chunkCount`: `number`;
`perChunkEncryption?`: ... \| ... \| ...;
`settings?`: ... \| ...;
`spaceId?`: ... \| ...;
`streamId`: `Uint8Array`;
`userId?`: ... \| ...;
\};
\};
\}
\| \{
`case`: `"dmChannelContent"`;
`value`: \{
`inception?`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"gdmChannelContent"`;
`value`: \{
`channelProperties?`: \{
`data?`: ... \| ...;
`eventHash`: `Uint8Array`;
`eventNum`: `bigint`;
\};
`inception?`: \{
`channelProperties?`: ... \| ...;
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `"userInboxContent"`;
`value`: \{
`deviceSummary`: \{
[`key`: `string`]: `object`;
\};
`inception?`: \{
`settings?`: ... \| ...;
`streamId`: `Uint8Array`;
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

Snapshot data specific for each stream type.

**Generated**

from oneof river.Snapshot.content

###### value.snapshot.members?

\{
`encryptionAlgorithm?`: \{
`algorithm?`: `string`;
\};
`joined`: `object`[];
`pins`: `object`[];
`tips`: \{
[`key`: `string`]: `bigint`;
\};
`tipsCount`: \{
[`key`: `string`]: `bigint`;
\};
\}

**Generated**

from field: river.MemberPayload.Snapshot members = 1;

###### value.snapshot.members.encryptionAlgorithm?

\{
`algorithm?`: `string`;
\}

**Generated**

from field: river.MemberPayload.EncryptionAlgorithm encryption_algorithm = 4;

###### value.snapshot.members.encryptionAlgorithm.algorithm?

`string`

**Generated**

from field: optional string algorithm = 1;

###### value.snapshot.members.joined

`object`[]

**Generated**

from field: repeated river.MemberPayload.Snapshot.Member joined = 1;

###### value.snapshot.members.pins

`object`[]

**Generated**

from field: repeated river.MemberPayload.SnappedPin pins = 2;

###### value.snapshot.members.tips

\{
[`key`: `string`]: `bigint`;
\}

tips sent in this stream: map<currency, amount>

**Generated**

from field: map<string, uint64> tips = 5;

###### value.snapshot.members.tipsCount

\{
[`key`: `string`]: `bigint`;
\}

**Generated**

from field: map<string, uint64> tips_count = 6;

###### value.snapshot.snapshotVersion

`number`

**Generated**

from field: int32 snapshot_version = 2;

###### value.snapshotHash?

`Uint8Array`\<`ArrayBufferLike`\>

hash of the snapshot.

**Generated**

from field: optional bytes snapshot_hash = 8;

###### value.timestamp?

\{
`nanos`: `number`;
`seconds`: `bigint`;
\}

Timestamp of the block.
Must be greater than the previous block timestamp.

**Generated**

from field: google.protobuf.Timestamp timestamp = 3;

###### value.timestamp.nanos

`number`

Non-negative fractions of a second at nanosecond resolution. Negative
second values with fractions must still have non-negative nanos values
that count forward in time. Must be from 0 to 999,999,999
inclusive.

**Generated**

from field: int32 nanos = 2;

###### value.timestamp.seconds

`bigint`

Represents seconds of UTC time since Unix epoch
1970-01-01T00:00:00Z. Must be from 0001-01-01T00:00:00Z to
9999-12-31T23:59:59Z inclusive.

**Generated**

from field: int64 seconds = 1;

|

\{
`case`: `"memberPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"memberPayload"`

###### value

\{
`content`:   \| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MemberPayload member_payload = 101;

###### value.content

\| \{
`case`: `"membership"`;
`value`: \{
`initiatorAddress`: `Uint8Array`;
`op`: `MembershipOp`;
`reason`: `MembershipReason`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"keySolicitation"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
`isNewDevice`: `boolean`;
`sessionIds`: `string`[];
\};
\}
\| \{
`case`: `"keyFulfillment"`;
`value`: \{
`deviceKey`: `string`;
`sessionIds`: `string`[];
`userAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"username"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"displayName"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"ensAddress"`;
`value`: `Uint8Array`;
\}
\| \{
`case`: `"nft"`;
`value`: \{
`chainId`: `number`;
`contractAddress`: `Uint8Array`;
`tokenId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"pin"`;
`value`: \{
`event?`: \{
`createdAtEpochMs`: `bigint`;
`creatorAddress`: `Uint8Array`;
`delegateExpiryEpochMs`: `bigint`;
`delegateSig`: `Uint8Array`;
`payload`: \{ value: \{ miniblockNum: bigint; prevMiniblockHash: Uint8Array\<ArrayBufferLike\>; timestamp?: \{ seconds: bigint; nanos: number; \} \| undefined; eventHashes: Uint8Array\<...\>\[\]; ... 4 more ...; content: \{ ...; \} \| \{ ...; \}; \}; case: "miniblockHeader"; \} \| ... 10 more ... \| \{ ...; \};
`prevMiniblockHash?`: `Uint8Array`\<`ArrayBufferLike`\>;
`prevMiniblockNum?`: `bigint`;
`salt`: `Uint8Array`;
`tags?`: \{
`groupMentionTypes`: ...[];
`mentionedUserAddresses`: ...[];
`messageInteractionType`: `MessageInteractionType`;
`participatingUserAddresses`: ...[];
`threadId?`: ... \| ...;
\};
\};
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"unpin"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"memberBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `"encryptionAlgorithm"`;
`value`: \{
`algorithm?`: `string`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MemberPayload.content

|

\{
`case`: `"spacePayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"spacePayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.SpacePayload space_payload = 102;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"channel"`;
`value`: \{
`channelId`: `Uint8Array`;
`op`: `ChannelOp`;
`originEvent?`: \{
`hash`: `Uint8Array`;
`signature`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
`settings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\};
\}
\| \{
`case`: `"spaceImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"updateChannelAutojoin"`;
`value`: \{
`autojoin`: `boolean`;
`channelId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"updateChannelHideUserJoinLeaveEvents"`;
`value`: \{
`channelId`: `Uint8Array`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.SpacePayload.content

|

\{
`case`: `"channelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"channelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.ChannelPayload channel_payload = 103;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelSettings?`: \{
`autojoin`: `boolean`;
`hideUserJoinLeaveEvents`: `boolean`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId`: `Uint8Array`;
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"redaction"`;
`value`: \{
`eventId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.ChannelPayload.content

|

\{
`case`: `"userPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserPayload user_payload = 104;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userMembership"`;
`value`: \{
`inviter?`: `Uint8Array`\<`ArrayBufferLike`\>;
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"userMembershipAction"`;
`value`: \{
`op`: `MembershipOp`;
`reason?`: `MembershipReason`;
`streamId`: `Uint8Array`;
`streamParentId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"blockchainTransaction"`;
`value`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: \{
`amount`: ...;
`channelId`: ...;
`currency`: ...;
`messageId`: ...;
`receiver`: ...;
`sender`: ...;
`tokenId`: ...;
\};
`toUserAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: `Uint8Array`;
`amount`: `string`;
`channelId`: `Uint8Array`;
`isBuy`: `boolean`;
`messageId`: `Uint8Array`;
`sender`: `Uint8Array`;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: `BlockchainTransaction_SpaceReview_Action`;
`event?`: \{
`rating`: ...;
`user`: ...;
\};
`spaceAddress`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: `object`[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: \{
`postTokenBalances`: ...[];
`preTokenBalances`: ...[];
\};
`slot`: `bigint`;
`transaction?`: \{
`signatures`: ...[];
\};
\};
\};
\}
\| \{
`case`: `"receivedBlockchainTransaction"`;
`value`: \{
`fromUserAddress`: `Uint8Array`;
`transaction?`: \{
`content`:   \| \{
`case`: `"tip"`;
`value`: \{
`event?`: ...;
`toUserAddress`: ...;
\};
\}
\| \{
`case`: `"tokenTransfer"`;
`value`: \{
`address`: ...;
`amount`: ...;
`channelId`: ...;
`isBuy`: ...;
`messageId`: ...;
`sender`: ...;
\};
\}
\| \{
`case`: `"spaceReview"`;
`value`: \{
`action`: ...;
`event?`: ...;
`spaceAddress`: ...;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
`receipt?`: \{
`blockNumber`: `bigint`;
`chainId`: `bigint`;
`from`: `Uint8Array`;
`logs`: ...[];
`to`: `Uint8Array`;
`transactionHash`: `Uint8Array`;
\};
`solanaReceipt?`: \{
`meta?`: ... \| ...;
`slot`: `bigint`;
`transaction?`: ... \| ...;
\};
\};
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserPayload.content

|

\{
`case`: `"userSettingsPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userSettingsPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserSettingsPayload user_settings_payload = 105;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"fullyReadMarkers"`;
`value`: \{
`content?`: \{
`data`: `string`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"userBlock"`;
`value`: \{
`eventNum`: `bigint`;
`isBlocked`: `boolean`;
`userId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserSettingsPayload.content

|

\{
`case`: `"userMetadataPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userMetadataPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserMetadataPayload user_metadata_payload = 106;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"encryptionDevice"`;
`value`: \{
`deviceKey`: `string`;
`fallbackKey`: `string`;
\};
\}
\| \{
`case`: `"profileImage"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"bio"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserMetadataPayload.content

|

\{
`case`: `"userInboxPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"userInboxPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.UserInboxPayload user_inbox_payload = 107;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"ack"`;
`value`: \{
`deviceKey`: `string`;
`miniblockNum`: `bigint`;
\};
\}
\| \{
`case`: `"groupEncryptionSessions"`;
`value`: \{
`algorithm`: `string`;
`ciphertexts`: \{
[`key`: `string`]: `string`;
\};
`senderKey`: `string`;
`sessionIds`: `string`[];
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.UserInboxPayload.content

|

\{
`case`: `"mediaPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"mediaPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.MediaPayload media_payload = 108;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`chunkCount`: `number`;
`perChunkEncryption?`: `boolean`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`spaceId?`: `Uint8Array`\<`ArrayBufferLike`\>;
`streamId`: `Uint8Array`;
`userId?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `"chunk"`;
`value`: \{
`chunkIndex`: `number`;
`data`: `Uint8Array`;
`iv?`: `Uint8Array`\<`ArrayBufferLike`\>;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.MediaPayload.content

|

\{
`case`: `"dmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"dmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.DmChannelPayload dm_channel_payload = 109;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`firstPartyAddress`: `Uint8Array`;
`secondPartyAddress`: `Uint8Array`;
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.DmChannelPayload.content

|

\{
`case`: `"gdmChannelPayload"`;
`value`: \{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\};
\}

###### case

`"gdmChannelPayload"`

###### value

\{
`content`:   \| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\};
\}

**Generated**

from field: river.GdmChannelPayload gdm_channel_payload = 110;

###### value.content

\| \{
`case`: `"inception"`;
`value`: \{
`channelProperties?`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
`settings?`: \{
`disableMiniblockCreation`: `boolean`;
\};
`streamId`: `Uint8Array`;
\};
\}
\| \{
`case`: `"message"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `"channelProperties"`;
`value`: \{
`algorithm`: `string`;
`checksum?`: `string`;
`ciphertext`: `string`;
`ciphertextBytes`: `Uint8Array`;
`ivBytes`: `Uint8Array`;
`refEventId?`: `string`;
`senderKey`: `string`;
`sessionId`: `string`;
`sessionIdBytes`: `Uint8Array`;
`version`: `EncryptedDataVersion`;
\};
\}
\| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

**Generated**

from oneof river.GdmChannelPayload.content

| \{
`case`: `undefined`;
`value?`: `undefined`;
\}

#### Returns

`Promise`\<\{
  `creationCookie`: `CreationCookie`;
\}\>

#### Inherited from

[`Client`](Client.md).[`makeMediaEventWithHashAndAddToMediaStream`](Client.md#makemediaeventwithhashandaddtomediastream)

***

### off()

```ts
off<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:28

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`off`](Client.md#off)

***

### on()

```ts
on<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:23

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`on`](Client.md#on)

***

### once()

```ts
once<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:24

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`once`](Client.md#once)

***

### onNetworkStatusChanged()

```ts
onNetworkStatusChanged(isOnline): void;
```

Defined in: [packages/sdk/src/client.ts:433](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L433)

#### Parameters

##### isOnline

`boolean`

#### Returns

`void`

#### Inherited from

[`Client`](Client.md).[`onNetworkStatusChanged`](Client.md#onnetworkstatuschanged)

***

### pin()

```ts
pin(streamId, eventId): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1205](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1205)

#### Parameters

##### streamId

`string`

##### eventId

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`pin`](Client.md#pin)

***

### prependListener()

```ts
prependListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:25

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`prependListener`](Client.md#prependlistener)

***

### prependOnceListener()

```ts
prependOnceListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:26

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`prependOnceListener`](Client.md#prependoncelistener)

***

### rawListeners()

```ts
rawListeners<E>(event): ClientEvents[E][];
```

Defined in: node\_modules/typed-emitter/index.d.ts:35

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

#### Returns

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\][]

#### Inherited from

[`Client`](Client.md).[`rawListeners`](Client.md#rawlisteners)

***

### redactMessage()

```ts
redactMessage(streamId, eventId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1873](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1873)

#### Parameters

##### streamId

`string`

##### eventId

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`redactMessage`](Client.md#redactmessage)

***

### removeAllListeners()

```ts
removeAllListeners<E>(event?): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:29

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event?

`E`

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`removeAllListeners`](Client.md#removealllisteners)

***

### removeListener()

```ts
removeListener<E>(event, listener): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:30

#### Type Parameters

##### E

`E` *extends* 
  \| keyof SyncedStreamEvents
  \| keyof StreamEncryptionEvents
  \| keyof StreamStateEvents
  \| `"decryptionExtStatusChanged"`

#### Parameters

##### event

`E`

##### listener

[`ClientEvents`](../type-aliases/ClientEvents.md)\[`E`\]

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`removeListener`](Client.md#removelistener)

***

### removeUser()

```ts
removeUser(streamId, userId): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2001](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2001)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### userId

`string`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`removeUser`](Client.md#removeuser)

***

### resetCrypto()

```ts
resetCrypto(): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:2601](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2601)

Resets crypto backend and creates a new encryption account, uploading device keys to UserDeviceKey stream.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`resetCrypto`](Client.md#resetcrypto)

***

### retrySendMessage()

```ts
retrySendMessage(streamId, localId): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1886](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1886)

#### Parameters

##### streamId

`string`

##### localId

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`retrySendMessage`](Client.md#retrysendmessage)

***

### scrollback()

```ts
scrollback(streamId): Promise<{
  fromInclusiveMiniblockNum: bigint;
  terminus: boolean;
}>;
```

Defined in: [packages/sdk/src/client.ts:2207](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2207)

#### Parameters

##### streamId

`string`

#### Returns

`Promise`\<\{
  `fromInclusiveMiniblockNum`: `bigint`;
  `terminus`: `boolean`;
\}\>

#### Inherited from

[`Client`](Client.md).[`scrollback`](Client.md#scrollback)

***

### sendChannelMessage()

```ts
sendChannelMessage(
   streamId, 
   inPayload, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1561](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1561)

#### Parameters

##### streamId

`string`

##### inPayload

###### payload

  \| \{
  `case`: `"post"`;
  `value`: \{
     `content`:   \| \{
        `case`: `"text"`;
        `value`: \{
           `attachments`: `object`[];
           `body`: `string`;
           `mentions`: `object`[];
        \};
      \}
        \| \{
        `case`: `"image"`;
        `value`: \{
           `info?`: \{
              `height?`: `number`;
              `mimetype`: `string`;
              `size?`: `number`;
              `url`: `string`;
              `width?`: `number`;
           \};
           `thumbnail?`: \{
              `height?`: `number`;
              `mimetype`: `string`;
              `size?`: `number`;
              `url`: `string`;
              `width?`: `number`;
           \};
           `title`: `string`;
        \};
      \}
        \| \{
        `case`: `"gm"`;
        `value`: \{
           `typeUrl`: `string`;
           `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
        \};
      \}
        \| \{
        `case`: `undefined`;
        `value?`: `undefined`;
      \};
     `replyId?`: `string`;
     `replyPreview?`: `string`;
     `threadId?`: `string`;
     `threadPreview?`: `string`;
  \};
\}
  \| \{
  `case`: `"reaction"`;
  `value`: \{
     `reaction`: `string`;
     `refEventId`: `string`;
  \};
\}
  \| \{
  `case`: `"edit"`;
  `value`: \{
     `post?`: \{
        `content`:   \| \{
           `case`: `"text"`;
           `value`: \{
              `attachments`: `object`[];
              `body`: `string`;
              `mentions`: `object`[];
           \};
         \}
           \| \{
           `case`: `"image"`;
           `value`: \{
              `info?`: \{
                 `height?`: ...;
                 `mimetype`: ...;
                 `size?`: ...;
                 `url`: ...;
                 `width?`: ...;
              \};
              `thumbnail?`: \{
                 `height?`: ...;
                 `mimetype`: ...;
                 `size?`: ...;
                 `url`: ...;
                 `width?`: ...;
              \};
              `title`: `string`;
           \};
         \}
           \| \{
           `case`: `"gm"`;
           `value`: \{
              `typeUrl`: `string`;
              `value?`: `Uint8Array`\<...\>;
           \};
         \}
           \| \{
           `case`: `undefined`;
           `value?`: `undefined`;
         \};
        `replyId?`: `string`;
        `replyPreview?`: `string`;
        `threadId?`: `string`;
        `threadPreview?`: `string`;
     \};
     `refEventId`: `string`;
  \};
\}
  \| \{
  `case`: `"redaction"`;
  `value`: \{
     `reason?`: `string`;
     `refEventId`: `string`;
  \};
\}
  \| \{
  `case`: `undefined`;
  `value?`: `undefined`;
\}

**Generated**

from oneof river.ChannelMessage.payload

##### opts?

`SendChannelMessageOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage`](Client.md#sendchannelmessage)

***

### sendChannelMessage\_Edit()

```ts
sendChannelMessage_Edit(
   streamId, 
   refEventId, 
   newPost): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1840](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1840)

#### Parameters

##### streamId

`string`

##### refEventId

`string`

##### newPost

###### content

  \| \{
  `case`: `"text"`;
  `value`: \{
     `attachments`: `object`[];
     `body`: `string`;
     `mentions`: `object`[];
  \};
\}
  \| \{
  `case`: `"image"`;
  `value`: \{
     `info?`: \{
        `height?`: `number`;
        `mimetype`: `string`;
        `size?`: `number`;
        `url`: `string`;
        `width?`: `number`;
     \};
     `thumbnail?`: \{
        `height?`: `number`;
        `mimetype`: `string`;
        `size?`: `number`;
        `url`: `string`;
        `width?`: `number`;
     \};
     `title`: `string`;
  \};
\}
  \| \{
  `case`: `"gm"`;
  `value`: \{
     `typeUrl`: `string`;
     `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
  \};
\}
  \| \{
  `case`: `undefined`;
  `value?`: `undefined`;
\}

**Generated**

from oneof river.ChannelMessage.Post.content

###### replyId?

`string`

**Generated**

from field: optional string reply_id = 3;

###### replyPreview?

`string`

**Generated**

from field: optional string reply_preview = 4;

###### threadId?

`string`

**Generated**

from field: optional string thread_id = 1;

###### threadPreview?

`string`

**Generated**

from field: optional string thread_preview = 2;

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Edit`](Client.md#sendchannelmessage_edit)

***

### sendChannelMessage\_Edit\_Text()

```ts
sendChannelMessage_Edit_Text(
   streamId, 
   refEventId, 
   payload): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1856](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1856)

#### Parameters

##### streamId

`string`

##### refEventId

`string`

##### payload

`Omit`\<\{
  `content`:   \| \{
     `case`: `"text"`;
     `value`: \{
        `attachments`: `object`[];
        `body`: `string`;
        `mentions`: `object`[];
     \};
   \}
     \| \{
     `case`: `"image"`;
     `value`: \{
        `info?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `thumbnail?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `title`: `string`;
     \};
   \}
     \| \{
     `case`: `"gm"`;
     `value`: \{
        `typeUrl`: `string`;
        `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
     \};
   \}
     \| \{
     `case`: `undefined`;
     `value?`: `undefined`;
   \};
  `replyId?`: `string`;
  `replyPreview?`: `string`;
  `threadId?`: `string`;
  `threadPreview?`: `string`;
\}, `"content"`\> & `object`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Edit_Text`](Client.md#sendchannelmessage_edit_text)

***

### sendChannelMessage\_GM()

```ts
sendChannelMessage_GM(
   streamId, 
   payload, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1741](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1741)

#### Parameters

##### streamId

`string`

##### payload

`Omit`\<\{
  `content`:   \| \{
     `case`: `"text"`;
     `value`: \{
        `attachments`: `object`[];
        `body`: `string`;
        `mentions`: `object`[];
     \};
   \}
     \| \{
     `case`: `"image"`;
     `value`: \{
        `info?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `thumbnail?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `title`: `string`;
     \};
   \}
     \| \{
     `case`: `"gm"`;
     `value`: \{
        `typeUrl`: `string`;
        `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
     \};
   \}
     \| \{
     `case`: `undefined`;
     `value?`: `undefined`;
   \};
  `replyId?`: `string`;
  `replyPreview?`: `string`;
  `threadId?`: `string`;
  `threadPreview?`: `string`;
\}, `"content"`\> & `object`

##### opts?

`SendChannelMessageOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_GM`](Client.md#sendchannelmessage_gm)

***

### sendChannelMessage\_Image()

```ts
sendChannelMessage_Image(
   streamId, 
   payload, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1715](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1715)

#### Parameters

##### streamId

`string`

##### payload

`Omit`\<\{
  `content`:   \| \{
     `case`: `"text"`;
     `value`: \{
        `attachments`: `object`[];
        `body`: `string`;
        `mentions`: `object`[];
     \};
   \}
     \| \{
     `case`: `"image"`;
     `value`: \{
        `info?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `thumbnail?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `title`: `string`;
     \};
   \}
     \| \{
     `case`: `"gm"`;
     `value`: \{
        `typeUrl`: `string`;
        `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
     \};
   \}
     \| \{
     `case`: `undefined`;
     `value?`: `undefined`;
   \};
  `replyId?`: `string`;
  `replyPreview?`: `string`;
  `threadId?`: `string`;
  `threadPreview?`: `string`;
\}, `"content"`\> & `object`

##### opts?

`SendChannelMessageOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Image`](Client.md#sendchannelmessage_image)

***

### sendChannelMessage\_Reaction()

```ts
sendChannelMessage_Reaction(
   streamId, 
   payload, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1804](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1804)

#### Parameters

##### streamId

`string`

##### payload

###### reaction

`string`

**Generated**

from field: string reaction = 2;

###### refEventId

`string`

**Generated**

from field: string ref_event_id = 1;

##### opts?

`SendChannelMessageOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Reaction`](Client.md#sendchannelmessage_reaction)

***

### sendChannelMessage\_Redaction()

```ts
sendChannelMessage_Redaction(streamId, payload): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1821](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1821)

#### Parameters

##### streamId

`string`

##### payload

###### reason?

`string`

**Generated**

from field: optional string reason = 2;

###### refEventId

`string`

**Generated**

from field: string ref_event_id = 1;

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Redaction`](Client.md#sendchannelmessage_redaction)

***

### sendChannelMessage\_Text()

```ts
sendChannelMessage_Text(
   streamId, 
   payload, 
   opts?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1689](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1689)

#### Parameters

##### streamId

`string`

##### payload

`Omit`\<\{
  `content`:   \| \{
     `case`: `"text"`;
     `value`: \{
        `attachments`: `object`[];
        `body`: `string`;
        `mentions`: `object`[];
     \};
   \}
     \| \{
     `case`: `"image"`;
     `value`: \{
        `info?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `thumbnail?`: \{
           `height?`: `number`;
           `mimetype`: `string`;
           `size?`: `number`;
           `url`: `string`;
           `width?`: `number`;
        \};
        `title`: `string`;
     \};
   \}
     \| \{
     `case`: `"gm"`;
     `value`: \{
        `typeUrl`: `string`;
        `value?`: `Uint8Array`\<`ArrayBufferLike`\>;
     \};
   \}
     \| \{
     `case`: `undefined`;
     `value?`: `undefined`;
   \};
  `replyId?`: `string`;
  `replyPreview?`: `string`;
  `threadId?`: `string`;
  `threadPreview?`: `string`;
\}, `"content"`\> & `object`

##### opts?

`SendChannelMessageOptions`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendChannelMessage_Text`](Client.md#sendchannelmessage_text)

***

### sendFullyReadMarkers()

```ts
sendFullyReadMarkers(channelId, fullyReadMarkers): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:997](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L997)

#### Parameters

##### channelId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### fullyReadMarkers

`Record`\<`string`, `FullyReadMarker`\>

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendFullyReadMarkers`](Client.md#sendfullyreadmarkers)

***

### sendMediaPayload()

```ts
sendMediaPayload(
   creationCookie, 
   last, 
   data, 
   chunkIndex, 
   iv?): Promise<{
  creationCookie: CreationCookie;
}>;
```

Defined in: [packages/sdk/src/client.ts:1767](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1767)

#### Parameters

##### creationCookie

`CreationCookie`

##### last

`boolean`

##### data

`Uint8Array`

##### chunkIndex

`number`

##### iv?

`Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<\{
  `creationCookie`: `CreationCookie`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendMediaPayload`](Client.md#sendmediapayload)

***

### sendMessage()

```ts
sendMessage(
   streamId, 
   body, 
   mentions?, 
   attachments?): Promise<{
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1546](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1546)

#### Parameters

##### streamId

`string`

##### body

`string`

##### mentions?

`object`[]

##### attachments?

`object`[] = `[]`

#### Returns

`Promise`\<\{
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`sendMessage`](Client.md#sendmessage)

***

### setDisplayName()

```ts
setDisplayName(streamId, displayName): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1142](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1142)

#### Parameters

##### streamId

`string`

##### displayName

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`setDisplayName`](Client.md#setdisplayname)

***

### setEnsAddress()

```ts
setEnsAddress(streamId, walletAddress): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1181](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1181)

#### Parameters

##### streamId

`string`

##### walletAddress

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`setEnsAddress`](Client.md#setensaddress)

***

### setHighPriorityStreams()

```ts
setHighPriorityStreams(streamIds): void;
```

Defined in: [packages/sdk/src/client.ts:2659](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2659)

#### Parameters

##### streamIds

`string`[]

#### Returns

`void`

#### Inherited from

[`Client`](Client.md).[`setHighPriorityStreams`](Client.md#sethighprioritystreams)

***

### setMaxListeners()

```ts
setMaxListeners(maxListeners): this;
```

Defined in: node\_modules/typed-emitter/index.d.ts:40

#### Parameters

##### maxListeners

`number`

#### Returns

`this`

#### Inherited from

[`Client`](Client.md).[`setMaxListeners`](Client.md#setmaxlisteners)

***

### setNft()

```ts
setNft(
   streamId, 
   tokenId, 
   chainId, 
contractAddress): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1191](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1191)

#### Parameters

##### streamId

`string`

##### tokenId

`string`

##### chainId

`number`

##### contractAddress

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`setNft`](Client.md#setnft)

***

### setSpaceImage()

```ts
setSpaceImage(spaceStreamId, chunkedMediaInfo): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1054](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1054)

#### Parameters

##### spaceStreamId

`string`

##### chunkedMediaInfo

###### encryption

  \| \{
  `case`: `"aesgcm"`;
  `value`: \{
     `iv`: `Uint8Array`;
     `secretKey`: `Uint8Array`;
  \};
\}
  \| \{
  `case`: `undefined`;
  `value?`: `undefined`;
\}

**Generated**

from oneof river.ChunkedMedia.encryption

###### info?

\{
  `filename`: `string`;
  `heightPixels`: `number`;
  `mimetype`: `string`;
  `sizeBytes`: `bigint`;
  `widthPixels`: `number`;
\}

**Generated**

from field: river.MediaInfo info = 1;

###### info.filename

`string`

**Generated**

from field: string filename = 5;

###### info.heightPixels

`number`

**Generated**

from field: int32 heightPixels = 4;

###### info.mimetype

`string`

**Generated**

from field: string mimetype = 1;

###### info.sizeBytes

`bigint`

**Generated**

from field: int64 sizeBytes = 2;

###### info.widthPixels

`number`

**Generated**

from field: int32 widthPixels = 3;

###### streamId

`string`

**Generated**

from field: string streamId = 2;

###### thumbnail?

\{
  `content`: `Uint8Array`;
  `info?`: \{
     `filename`: `string`;
     `heightPixels`: `number`;
     `mimetype`: `string`;
     `sizeBytes`: `bigint`;
     `widthPixels`: `number`;
  \};
\}

**Generated**

from field: river.EmbeddedMedia thumbnail = 3;

###### thumbnail.content

`Uint8Array`

**Generated**

from field: bytes content = 2;

###### thumbnail.info?

\{
  `filename`: `string`;
  `heightPixels`: `number`;
  `mimetype`: `string`;
  `sizeBytes`: `bigint`;
  `widthPixels`: `number`;
\}

**Generated**

from field: river.MediaInfo info = 1;

###### thumbnail.info.filename

`string`

**Generated**

from field: string filename = 5;

###### thumbnail.info.heightPixels

`number`

**Generated**

from field: int32 heightPixels = 4;

###### thumbnail.info.mimetype

`string`

**Generated**

from field: string mimetype = 1;

###### thumbnail.info.sizeBytes

`bigint`

**Generated**

from field: int64 sizeBytes = 2;

###### thumbnail.info.widthPixels

`number`

**Generated**

from field: int32 widthPixels = 3;

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`setSpaceImage`](Client.md#setspaceimage)

***

### setStreamEncryptionAlgorithm()

```ts
setStreamEncryptionAlgorithm(streamId, encryptionAlgorithm?): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:974](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L974)

#### Parameters

##### streamId

`string`

##### encryptionAlgorithm?

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`setStreamEncryptionAlgorithm`](Client.md#setstreamencryptionalgorithm)

***

### setUserBio()

```ts
setUserBio(bio): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1114](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1114)

#### Parameters

##### bio

###### bio

`string`

**Generated**

from field: string bio = 1;

###### updatedAtEpochMs?

`bigint`

**Generated**

from field: optional uint64 updated_at_epoch_ms = 2;

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`setUserBio`](Client.md#setuserbio)

***

### setUsername()

```ts
setUsername(streamId, username): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1156](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1156)

#### Parameters

##### streamId

`string`

##### username

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`setUsername`](Client.md#setusername)

***

### setUserProfileImage()

```ts
setUserProfileImage(chunkedMediaInfo): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1084](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1084)

#### Parameters

##### chunkedMediaInfo

###### encryption

  \| \{
  `case`: `"aesgcm"`;
  `value`: \{
     `iv`: `Uint8Array`;
     `secretKey`: `Uint8Array`;
  \};
\}
  \| \{
  `case`: `undefined`;
  `value?`: `undefined`;
\}

**Generated**

from oneof river.ChunkedMedia.encryption

###### info?

\{
  `filename`: `string`;
  `heightPixels`: `number`;
  `mimetype`: `string`;
  `sizeBytes`: `bigint`;
  `widthPixels`: `number`;
\}

**Generated**

from field: river.MediaInfo info = 1;

###### info.filename

`string`

**Generated**

from field: string filename = 5;

###### info.heightPixels

`number`

**Generated**

from field: int32 heightPixels = 4;

###### info.mimetype

`string`

**Generated**

from field: string mimetype = 1;

###### info.sizeBytes

`bigint`

**Generated**

from field: int64 sizeBytes = 2;

###### info.widthPixels

`number`

**Generated**

from field: int32 widthPixels = 3;

###### streamId

`string`

**Generated**

from field: string streamId = 2;

###### thumbnail?

\{
  `content`: `Uint8Array`;
  `info?`: \{
     `filename`: `string`;
     `heightPixels`: `number`;
     `mimetype`: `string`;
     `sizeBytes`: `bigint`;
     `widthPixels`: `number`;
  \};
\}

**Generated**

from field: river.EmbeddedMedia thumbnail = 3;

###### thumbnail.content

`Uint8Array`

**Generated**

from field: bytes content = 2;

###### thumbnail.info?

\{
  `filename`: `string`;
  `heightPixels`: `number`;
  `mimetype`: `string`;
  `sizeBytes`: `bigint`;
  `widthPixels`: `number`;
\}

**Generated**

from field: river.MediaInfo info = 1;

###### thumbnail.info.filename

`string`

**Generated**

from field: string filename = 5;

###### thumbnail.info.heightPixels

`number`

**Generated**

from field: int32 heightPixels = 4;

###### thumbnail.info.mimetype

`string`

**Generated**

from field: string mimetype = 1;

###### thumbnail.info.sizeBytes

`bigint`

**Generated**

from field: int64 sizeBytes = 2;

###### thumbnail.info.widthPixels

`number`

**Generated**

from field: int32 widthPixels = 3;

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`setUserProfileImage`](Client.md#setuserprofileimage)

***

### startSync()

```ts
startSync(): void;
```

Defined in: [packages/sdk/src/client.ts:1531](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1531)

#### Returns

`void`

#### Inherited from

[`Client`](Client.md).[`startSync`](Client.md#startsync)

***

### stop()

```ts
stop(): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:326](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L326)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`stop`](Client.md#stop)

***

### stopSync()

```ts
stopSync(): Promise<void>;
```

Defined in: [packages/sdk/src/client.ts:1536](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1536)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`Client`](Client.md).[`stopSync`](Client.md#stopsync)

***

### stream()

```ts
stream(streamId): undefined | SyncedStream;
```

Defined in: [packages/sdk/src/client.ts:333](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L333)

#### Parameters

##### streamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

#### Returns

`undefined` \| [`SyncedStream`](SyncedStream.md)

#### Inherited from

[`Client`](Client.md).[`stream`](Client.md#stream)

***

### unpin()

```ts
unpin(streamId, eventId): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1222](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1222)

#### Parameters

##### streamId

`string`

##### eventId

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`unpin`](Client.md#unpin)

***

### updateChannel()

```ts
updateChannel(
   spaceId, 
   channelId, 
   unused1, 
   unused2): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:890](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L890)

#### Parameters

##### spaceId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### channelId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### unused1

`string`

##### unused2

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`updateChannel`](Client.md#updatechannel)

***

### updateChannelAutojoin()

```ts
updateChannelAutojoin(
   spaceId, 
   channelId, 
   autojoin): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:910](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L910)

#### Parameters

##### spaceId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### channelId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### autojoin

`boolean`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`updateChannelAutojoin`](Client.md#updatechannelautojoin)

***

### updateChannelHideUserJoinLeaveEvents()

```ts
updateChannelHideUserJoinLeaveEvents(
   spaceId, 
   channelId, 
   hideUserJoinLeaveEvents): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:929](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L929)

#### Parameters

##### spaceId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### channelId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### hideUserJoinLeaveEvents

`boolean`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`updateChannelHideUserJoinLeaveEvents`](Client.md#updatechannelhideuserjoinleaveevents)

***

### updateGDMChannelProperties()

```ts
updateGDMChannelProperties(
   streamId, 
   channelName, 
   channelTopic): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:953](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L953)

#### Parameters

##### streamId

`string`

##### channelName

`string`

##### channelTopic

`string`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`updateGDMChannelProperties`](Client.md#updategdmchannelproperties)

***

### updateUserBlock()

```ts
updateUserBlock(userId, isBlocked): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:1021](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1021)

#### Parameters

##### userId

`string`

##### isBlocked

`boolean`

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`updateUserBlock`](Client.md#updateuserblock)

***

### uploadDeviceKeys()

```ts
uploadDeviceKeys(): Promise<{
  error?: AddEventResponse_Error;
  eventId: string;
}>;
```

Defined in: [packages/sdk/src/client.ts:2614](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2614)

#### Returns

`Promise`\<\{
  `error?`: `AddEventResponse_Error`;
  `eventId`: `string`;
\}\>

#### Inherited from

[`Client`](Client.md).[`uploadDeviceKeys`](Client.md#uploaddevicekeys)

***

### userDeviceKey()

```ts
userDeviceKey(): UserDevice;
```

Defined in: [packages/sdk/src/client.ts:2811](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L2811)

#### Returns

[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)

#### Inherited from

[`Client`](Client.md).[`userDeviceKey`](Client.md#userdevicekey)

***

### waitForStream()

```ts
waitForStream(inStreamId, opts?): Promise<Stream>;
```

Defined in: [packages/sdk/src/client.ts:1246](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/client.ts#L1246)

#### Parameters

##### inStreamId

`string` | `Uint8Array`\<`ArrayBufferLike`\>

##### opts?

###### logId?

`string`

###### timeoutMs?

`number`

#### Returns

`Promise`\<[`Stream`](Stream.md)\>

#### Inherited from

[`Client`](Client.md).[`waitForStream`](Client.md#waitforstream)
