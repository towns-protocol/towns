# Function: makeEvents()

```ts
function makeEvents(
   context, 
   payloads, 
prevMiniblockHash?): Promise<Envelope[]>;
```

Defined in: [packages/sdk/src/sign.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sign.ts#L113)

## Parameters

### context

[`SignerContext`](../interfaces/SignerContext.md)

### payloads

(
  \| \{
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
                 `settings?`: ...;
                 `streamId`: ...;
              \};
              `spaceImage?`: \{
                 `creatorAddress`: ...;
                 `data?`: ...;
                 `eventHash`: ...;
                 `eventNum`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `"channelContent"`;
           `value`: \{
              `inception?`: \{
                 `channelSettings?`: ...;
                 `settings?`: ...;
                 `spaceId`: ...;
                 `streamId`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `"userContent"`;
           `value`: \{
              `inception?`: \{
                 `settings?`: ...;
                 `streamId`: ...;
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
                 `settings?`: ...;
                 `streamId`: ...;
              \};
              `userBlocksList`: `object`[];
           \};
         \}
           \| \{
           `case`: `"userMetadataContent"`;
           `value`: \{
              `bio?`: \{
                 `data?`: ...;
                 `eventHash`: ...;
                 `eventNum`: ...;
              \};
              `encryptionDevices`: `object`[];
              `inception?`: \{
                 `settings?`: ...;
                 `streamId`: ...;
              \};
              `profileImage?`: \{
                 `data?`: ...;
                 `eventHash`: ...;
                 `eventNum`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `"mediaContent"`;
           `value`: \{
              `inception?`: \{
                 `channelId?`: ...;
                 `chunkCount`: ...;
                 `perChunkEncryption?`: ...;
                 `settings?`: ...;
                 `spaceId?`: ...;
                 `streamId`: ...;
                 `userId?`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `"dmChannelContent"`;
           `value`: \{
              `inception?`: \{
                 `firstPartyAddress`: ...;
                 `secondPartyAddress`: ...;
                 `settings?`: ...;
                 `streamId`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `"gdmChannelContent"`;
           `value`: \{
              `channelProperties?`: \{
                 `data?`: ...;
                 `eventHash`: ...;
                 `eventNum`: ...;
              \};
              `inception?`: \{
                 `channelProperties?`: ...;
                 `settings?`: ...;
                 `streamId`: ...;
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
                 `settings?`: ...;
                 `streamId`: ...;
              \};
           \};
         \}
           \| \{
           `case`: `undefined`;
           `value?`: `undefined`;
         \};
        `members?`: \{
           `encryptionAlgorithm?`: \{
              `algorithm?`: ... \| ...;
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
  \| \{
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
              `prevMiniblockHash?`: `Uint8Array`\<...\>;
              `prevMiniblockNum?`: `bigint`;
              `salt`: `Uint8Array`;
              `tags?`: \{
                 `groupMentionTypes`: ...;
                 `mentionedUserAddresses`: ...;
                 `messageInteractionType`: ...;
                 `participatingUserAddresses`: ...;
                 `threadId?`: ...;
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
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value?`: ...;
               \};
              `receipt?`: \{
                 `blockNumber`: ...;
                 `chainId`: ...;
                 `from`: ...;
                 `logs`: ...;
                 `to`: ...;
                 `transactionHash`: ...;
              \};
              `solanaReceipt?`: \{
                 `meta?`: ...;
                 `slot`: ...;
                 `transaction?`: ...;
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
  \| \{
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
  \| \{
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
  \| \{
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
                 `event?`: ... \| ...;
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
                 `event?`: ... \| ...;
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
                 `postTokenBalances`: ...;
                 `preTokenBalances`: ...;
              \};
              `slot`: `bigint`;
              `transaction?`: \{
                 `signatures`: ...;
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
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value`: ...;
               \}
                 \| \{
                 `case`: ...;
                 `value?`: ...;
               \};
              `receipt?`: \{
                 `blockNumber`: ...;
                 `chainId`: ...;
                 `from`: ...;
                 `logs`: ...;
                 `to`: ...;
                 `transactionHash`: ...;
              \};
              `solanaReceipt?`: \{
                 `meta?`: ...;
                 `slot`: ...;
                 `transaction?`: ...;
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
  \| \{
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
  \| \{
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
  \| \{
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
  \| \{
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
  \| \{
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
  \| \{
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
  \| \{
  `case`: `undefined`;
  `value?`: `undefined`;
\})[]

### prevMiniblockHash?

`Uint8Array`\<`ArrayBufferLike`\>

## Returns

`Promise`\<`Envelope`[]\>
