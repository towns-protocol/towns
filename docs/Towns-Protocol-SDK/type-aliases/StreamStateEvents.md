# Type Alias: StreamStateEvents

```ts
type StreamStateEvents = object;
```

Defined in: [packages/sdk/src/streamEvents.ts:76](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L76)

## Properties

### channelPinAdded()

```ts
channelPinAdded: (channelId, pin) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L113)

#### Parameters

##### channelId

`string`

##### pin

[`Pin`](../interfaces/Pin.md)

#### Returns

`void`

***

### channelPinDecrypted()

```ts
channelPinDecrypted: (channelId, pin, index) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:115](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L115)

#### Parameters

##### channelId

`string`

##### pin

[`Pin`](../interfaces/Pin.md)

##### index

`number`

#### Returns

`void`

***

### channelPinRemoved()

```ts
channelPinRemoved: (channelId, pin, index) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:114](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L114)

#### Parameters

##### channelId

`string`

##### pin

[`Pin`](../interfaces/Pin.md)

##### index

`number`

#### Returns

`void`

***

### clientInitStatusUpdated()

```ts
clientInitStatusUpdated: (status) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:77](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L77)

#### Parameters

##### status

[`ClientInitStatus`](ClientInitStatus.md)

#### Returns

`void`

***

### eventDecrypted()

```ts
eventDecrypted: (streamId, contentKind, event) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:121](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L121)

#### Parameters

##### streamId

`string`

##### contentKind

`SnapshotCaseType`

##### event

[`DecryptedTimelineEvent`](DecryptedTimelineEvent.md)

#### Returns

`void`

***

### fullyReadMarkersUpdated()

```ts
fullyReadMarkersUpdated: (channelId, fullyReadMarkers) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:116](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L116)

#### Parameters

##### channelId

`string`

##### fullyReadMarkers

`Record`\<`string`, `FullyReadMarker`\>

#### Returns

`void`

***

### spaceChannelAutojoinUpdated()

```ts
spaceChannelAutojoinUpdated: (spaceId, channelId, autojoin) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:104](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L104)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

##### autojoin

`boolean`

#### Returns

`void`

***

### spaceChannelCreated()

```ts
spaceChannelCreated: (spaceId, channelId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:102](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L102)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

#### Returns

`void`

***

### spaceChannelDeleted()

```ts
spaceChannelDeleted: (spaceId, channelId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:110](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L110)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

#### Returns

`void`

***

### spaceChannelHideUserJoinLeaveEventsUpdated()

```ts
spaceChannelHideUserJoinLeaveEventsUpdated: (spaceId, channelId, hideUserJoinLeaveEvents) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:105](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L105)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

##### hideUserJoinLeaveEvents

`boolean`

#### Returns

`void`

***

### spaceChannelUpdated()

```ts
spaceChannelUpdated: (spaceId, channelId, updatedAtEventNum) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:103](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L103)

#### Parameters

##### spaceId

`string`

##### channelId

`string`

##### updatedAtEventNum

`bigint`

#### Returns

`void`

***

### spaceImageUpdated()

```ts
spaceImageUpdated: (spaceId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:111](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L111)

#### Parameters

##### spaceId

`string`

#### Returns

`void`

***

### spaceReviewsUpdated()

```ts
spaceReviewsUpdated: (streamId, review) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:112](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L112)

#### Parameters

##### streamId

`string`

##### review

[`SpaceReviewEventObject`](../../Towns-Protocol-Web3/interfaces/SpaceReviewEventObject.md)

#### Returns

`void`

***

### streamChannelPropertiesUpdated()

```ts
streamChannelPropertiesUpdated: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:142](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L142)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### streamDisplayNameUpdated()

```ts
streamDisplayNameUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:137](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L137)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamEncryptionAlgorithmUpdated()

```ts
streamEncryptionAlgorithmUpdated: (streamId, encryptionAlgorithm?) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:143](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L143)

#### Parameters

##### streamId

`string`

##### encryptionAlgorithm?

`string`

#### Returns

`void`

***

### streamEnsAddressUpdated()

```ts
streamEnsAddressUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:140](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L140)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamInitialized()

```ts
streamInitialized: (streamId, contentKind) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:126](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L126)

#### Parameters

##### streamId

`string`

##### contentKind

`SnapshotCaseType`

#### Returns

`void`

***

### streamLatestTimestampUpdated()

```ts
streamLatestTimestampUpdated: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:135](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L135)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### streamLocalEventUpdated()

```ts
streamLocalEventUpdated: (streamId, contentKind, localEventId, event) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:129](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L129)

#### Parameters

##### streamId

`string`

##### contentKind

`SnapshotCaseType`

##### localEventId

`string`

##### event

[`LocalTimelineEvent`](LocalTimelineEvent.md)

#### Returns

`void`

***

### streamMembershipUpdated()

```ts
streamMembershipUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:81](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L81)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamNewUserInvited()

```ts
streamNewUserInvited: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L79)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamNewUserJoined()

```ts
streamNewUserJoined: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L78)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamNftUpdated()

```ts
streamNftUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:141](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L141)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamPendingDisplayNameUpdated()

```ts
streamPendingDisplayNameUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:139](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L139)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamPendingMembershipUpdated()

```ts
streamPendingMembershipUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:82](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L82)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamPendingUsernameUpdated()

```ts
streamPendingUsernameUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L138)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamTipped()

```ts
streamTipped: (streamId, eventId, transaction) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:97](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L97)

#### Parameters

##### streamId

`string`

##### eventId

`string`

##### transaction

`BlockchainTransaction_Tip`

#### Returns

`void`

***

### streamTokenTransfer()

```ts
streamTokenTransfer: (streamId, transaction) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:144](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L144)

#### Parameters

##### streamId

`string`

##### transaction

###### address

`Uint8Array`

###### amount

`bigint`

###### chainId

`string`

###### createdAtEpochMs

`bigint`

###### isBuy

`boolean`

###### messageId

`string`

###### userId

`string`

#### Returns

`void`

***

### streamUpdated()

```ts
streamUpdated: (streamId, contentKind, change) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:128](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L128)

#### Parameters

##### streamId

`string`

##### contentKind

`SnapshotCaseType`

##### change

[`StreamChange`](StreamChange.md)

#### Returns

`void`

***

### streamUpToDate()

```ts
streamUpToDate: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:127](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L127)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### streamUserLeft()

```ts
streamUserLeft: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:80](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L80)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### streamUsernameUpdated()

```ts
streamUsernameUpdated: (streamId, userId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:136](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L136)

#### Parameters

##### streamId

`string`

##### userId

`string`

#### Returns

`void`

***

### userBioUpdated()

```ts
userBioUpdated: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L88)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### userBlockUpdated()

```ts
userBlockUpdated: (userBlock) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:120](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L120)

#### Parameters

##### userBlock

`UserSettingsPayload_UserBlock`

#### Returns

`void`

***

### userDeviceKeysUpdated()

```ts
userDeviceKeysUpdated: (streamId, deviceKeys) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:94](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L94)

#### Parameters

##### streamId

`string`

##### deviceKeys

[`UserDevice`](../../Towns-Protocol-Encryption/interfaces/UserDevice.md)[]

#### Returns

`void`

***

### userInboxDeviceSummaryUpdated()

```ts
userInboxDeviceSummaryUpdated: (streamId, deviceKey, summary) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L89)

#### Parameters

##### streamId

`string`

##### deviceKey

`string`

##### summary

`UserInboxPayload_Snapshot_DeviceSummary`

#### Returns

`void`

***

### userInvitedToStream()

```ts
userInvitedToStream: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L84)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### userJoinedStream()

```ts
userJoinedStream: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L83)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### userLeftStream()

```ts
userLeftStream: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L85)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### userProfileImageUpdated()

```ts
userProfileImageUpdated: (streamId) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L87)

#### Parameters

##### streamId

`string`

#### Returns

`void`

***

### userStreamMembershipChanged()

```ts
userStreamMembershipChanged: (streamId, payload) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L86)

#### Parameters

##### streamId

`string`

##### payload

`UserPayload_UserMembership`

#### Returns

`void`

***

### userTipReceived()

```ts
userTipReceived: (streamId, currency, amount) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:96](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L96)

#### Parameters

##### streamId

`string`

##### currency

`string`

##### amount

`bigint`

#### Returns

`void`

***

### userTipSent()

```ts
userTipSent: (streamId, currency, amount) => void;
```

Defined in: [packages/sdk/src/streamEvents.ts:95](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamEvents.ts#L95)

#### Parameters

##### streamId

`string`

##### currency

`string`

##### amount

`bigint`

#### Returns

`void`
