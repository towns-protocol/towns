# Function: makeEvent()

```ts
function makeEvent(
   context, 
   payload, 
   prevMiniblockHash?, 
   prevMiniblockNum?, 
tags?): Promise<Envelope>;
```

Defined in: [packages/sdk/src/sign.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sign.ts#L83)

## Parameters

### context

[`SignerContext`](../interfaces/SignerContext.md)

### payload

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

#### case

`"miniblockHeader"`

#### value

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

#### value.content

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

#### value.eventHashes

`Uint8Array`\<`ArrayBufferLike`\>[]

Hashes of the events included in the block.

**Generated**

from field: repeated bytes event_hashes = 4;

#### value.eventNumOffset

`bigint`

count of all events in the stream before this block

**Generated**

from field: int64 event_num_offset = 6;

#### value.miniblockNum

`bigint`

Miniblock number.
0 for genesis block.
Must be 1 greater than the previous block number.

**Generated**

from field: int64 miniblock_num = 1;

#### value.prevMiniblockHash

`Uint8Array`

Hash of the previous block.

**Generated**

from field: bytes prev_miniblock_hash = 2;

#### value.prevSnapshotMiniblockNum

`bigint`

pointer to block with previous snapshot

**Generated**

from field: int64 prev_snapshot_miniblock_num = 7;

#### value.snapshot?

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

#### value.snapshot.content

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

#### value.snapshot.members?

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

#### value.snapshot.members.encryptionAlgorithm?

\{
`algorithm?`: `string`;
\}

**Generated**

from field: river.MemberPayload.EncryptionAlgorithm encryption_algorithm = 4;

#### value.snapshot.members.encryptionAlgorithm.algorithm?

`string`

**Generated**

from field: optional string algorithm = 1;

#### value.snapshot.members.joined

`object`[]

**Generated**

from field: repeated river.MemberPayload.Snapshot.Member joined = 1;

#### value.snapshot.members.pins

`object`[]

**Generated**

from field: repeated river.MemberPayload.SnappedPin pins = 2;

#### value.snapshot.members.tips

\{
[`key`: `string`]: `bigint`;
\}

tips sent in this stream: map<currency, amount>

**Generated**

from field: map<string, uint64> tips = 5;

#### value.snapshot.members.tipsCount

\{
[`key`: `string`]: `bigint`;
\}

**Generated**

from field: map<string, uint64> tips_count = 6;

#### value.snapshot.snapshotVersion

`number`

**Generated**

from field: int32 snapshot_version = 2;

#### value.snapshotHash?

`Uint8Array`\<`ArrayBufferLike`\>

hash of the snapshot.

**Generated**

from field: optional bytes snapshot_hash = 8;

#### value.timestamp?

\{
`nanos`: `number`;
`seconds`: `bigint`;
\}

Timestamp of the block.
Must be greater than the previous block timestamp.

**Generated**

from field: google.protobuf.Timestamp timestamp = 3;

#### value.timestamp.nanos

`number`

Non-negative fractions of a second at nanosecond resolution. Negative
second values with fractions must still have non-negative nanos values
that count forward in time. Must be from 0 to 999,999,999
inclusive.

**Generated**

from field: int32 nanos = 2;

#### value.timestamp.seconds

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

#### case

`"memberPayload"`

#### value

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

#### value.content

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

#### case

`"spacePayload"`

#### value

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

#### value.content

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

#### case

`"channelPayload"`

#### value

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

#### value.content

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

#### case

`"userPayload"`

#### value

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

#### value.content

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

#### case

`"userSettingsPayload"`

#### value

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

#### value.content

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

#### case

`"userMetadataPayload"`

#### value

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

#### value.content

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

#### case

`"userInboxPayload"`

#### value

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

#### value.content

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

#### case

`"mediaPayload"`

#### value

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

#### value.content

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

#### case

`"dmChannelPayload"`

#### value

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

#### value.content

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

#### case

`"gdmChannelPayload"`

#### value

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

#### value.content

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

### prevMiniblockHash?

`Uint8Array`\<`ArrayBufferLike`\>

### prevMiniblockNum?

`bigint`

### tags?

#### groupMentionTypes

`GroupMentionType`[]

**Generated**

from field: repeated river.GroupMentionType group_mention_types = 2;

#### mentionedUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes mentioned_user_addresses = 3;

#### messageInteractionType

`MessageInteractionType`

**Generated**

from field: river.MessageInteractionType message_interaction_type = 1;

#### participatingUserAddresses

`Uint8Array`\<`ArrayBufferLike`\>[]

**Generated**

from field: repeated bytes participating_user_addresses = 4;

#### threadId?

`Uint8Array`\<`ArrayBufferLike`\>

**Generated**

from field: optional bytes thread_id = 5;

## Returns

`Promise`\<`Envelope`\>
