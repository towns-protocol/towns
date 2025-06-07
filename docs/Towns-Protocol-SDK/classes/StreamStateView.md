# Class: StreamStateView

Defined in: [packages/sdk/src/streamStateView.ts:61](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L61)

## Constructors

### Constructor

```ts
new StreamStateView(userId, streamId): StreamStateView;
```

Defined in: [packages/sdk/src/streamStateView.ts:152](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L152)

#### Parameters

##### userId

`string`

##### streamId

`string`

#### Returns

`StreamStateView`

## Properties

### contentKind

```ts
readonly contentKind: 
  | undefined
  | "spaceContent"
  | "channelContent"
  | "userContent"
  | "userSettingsContent"
  | "userMetadataContent"
  | "mediaContent"
  | "dmChannelContent"
  | "gdmChannelContent"
  | "userInboxContent";
```

Defined in: [packages/sdk/src/streamStateView.ts:64](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L64)

***

### events

```ts
readonly events: Map<string, StreamTimelineEvent>;
```

Defined in: [packages/sdk/src/streamStateView.ts:66](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L66)

***

### isInitialized

```ts
isInitialized: boolean = false;
```

Defined in: [packages/sdk/src/streamStateView.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L67)

***

### lastEventNum

```ts
lastEventNum: bigint = 0n;
```

Defined in: [packages/sdk/src/streamStateView.ts:70](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L70)

***

### membershipContent

```ts
membershipContent: StreamStateView_Members;
```

Defined in: [packages/sdk/src/streamStateView.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L75)

***

### miniblockInfo?

```ts
optional miniblockInfo: object;
```

Defined in: [packages/sdk/src/streamStateView.ts:72](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L72)

#### max

```ts
max: bigint;
```

#### min

```ts
min: bigint;
```

#### terminusReached

```ts
terminusReached: boolean;
```

***

### prevMiniblockHash?

```ts
optional prevMiniblockHash: Uint8Array<ArrayBufferLike>;
```

Defined in: [packages/sdk/src/streamStateView.ts:68](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L68)

***

### prevMiniblockNum?

```ts
optional prevMiniblockNum: bigint;
```

Defined in: [packages/sdk/src/streamStateView.ts:69](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L69)

***

### prevSnapshotMiniblockNum

```ts
prevSnapshotMiniblockNum: bigint;
```

Defined in: [packages/sdk/src/streamStateView.ts:71](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L71)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView.ts:62](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L62)

***

### syncCookie?

```ts
optional syncCookie: SyncCookie;
```

Defined in: [packages/sdk/src/streamStateView.ts:73](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L73)

***

### timeline

```ts
readonly timeline: StreamTimelineEvent[] = [];
```

Defined in: [packages/sdk/src/streamStateView.ts:65](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L65)

***

### userId

```ts
readonly userId: string;
```

Defined in: [packages/sdk/src/streamStateView.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L63)

## Accessors

### channelContent

#### Get Signature

```ts
get channelContent(): StreamStateView_Channel;
```

Defined in: [packages/sdk/src/streamStateView.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L86)

##### Returns

[`StreamStateView_Channel`](StreamStateView_Channel.md)

***

### dmChannelContent

#### Get Signature

```ts
get dmChannelContent(): StreamStateView_DMChannel;
```

Defined in: [packages/sdk/src/streamStateView.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L93)

##### Returns

[`StreamStateView_DMChannel`](StreamStateView_DMChannel.md)

***

### gdmChannelContent

#### Get Signature

```ts
get gdmChannelContent(): StreamStateView_GDMChannel;
```

Defined in: [packages/sdk/src/streamStateView.ts:103](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L103)

##### Returns

[`StreamStateView_GDMChannel`](StreamStateView_GDMChannel.md)

***

### mediaContent

#### Get Signature

```ts
get mediaContent(): StreamStateView_Media;
```

Defined in: [packages/sdk/src/streamStateView.ts:147](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L147)

##### Returns

[`StreamStateView_Media`](StreamStateView_Media.md)

***

### spaceContent

#### Get Signature

```ts
get spaceContent(): StreamStateView_Space;
```

Defined in: [packages/sdk/src/streamStateView.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L79)

##### Returns

[`StreamStateView_Space`](StreamStateView_Space.md)

***

### userContent

#### Get Signature

```ts
get userContent(): StreamStateView_User;
```

Defined in: [packages/sdk/src/streamStateView.ts:113](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L113)

##### Returns

[`StreamStateView_User`](StreamStateView_User.md)

***

### userInboxContent

#### Get Signature

```ts
get userInboxContent(): StreamStateView_UserInbox;
```

Defined in: [packages/sdk/src/streamStateView.ts:138](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L138)

##### Returns

[`StreamStateView_UserInbox`](StreamStateView_UserInbox.md)

***

### userMetadataContent

#### Get Signature

```ts
get userMetadataContent(): StreamStateView_UserMetadata;
```

Defined in: [packages/sdk/src/streamStateView.ts:129](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L129)

##### Returns

[`StreamStateView_UserMetadata`](StreamStateView_UserMetadata.md)

***

### userSettingsContent

#### Get Signature

```ts
get userSettingsContent(): StreamStateView_UserSettings;
```

Defined in: [packages/sdk/src/streamStateView.ts:120](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L120)

##### Returns

[`StreamStateView_UserSettings`](StreamStateView_UserSettings.md)

## Methods

### appendEvents()

```ts
appendEvents(
   events, 
   nextSyncCookie, 
   cleartexts, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:613](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L613)

#### Parameters

##### events

[`ParsedEvent`](../interfaces/ParsedEvent.md)[]

##### nextSyncCookie

`SyncCookie`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### emitter

`TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`

***

### appendLocalEvent()

```ts
appendLocalEvent(
   channelMessage, 
   status, 
   emitter): string;
```

Defined in: [packages/sdk/src/streamStateView.ts:683](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L683)

#### Parameters

##### channelMessage

`ChannelMessage`

##### status

[`LocalEventStatus`](../type-aliases/LocalEventStatus.md)

##### emitter

`undefined` | `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`string`

***

### getContent()

```ts
getContent(): StreamStateView_AbstractContent;
```

Defined in: [packages/sdk/src/streamStateView.ts:739](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L739)

#### Returns

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

***

### getMemberMetadata()

```ts
getMemberMetadata(): StreamStateView_MemberMetadata;
```

Defined in: [packages/sdk/src/streamStateView.ts:735](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L735)

#### Returns

[`StreamStateView_MemberMetadata`](StreamStateView_MemberMetadata.md)

***

### getMembers()

```ts
getMembers(): StreamStateView_Members;
```

Defined in: [packages/sdk/src/streamStateView.ts:731](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L731)

#### Returns

[`StreamStateView_Members`](StreamStateView_Members.md)

***

### getUsersEntitledToKeyExchange()

```ts
getUsersEntitledToKeyExchange(): Set<string>;
```

Defined in: [packages/sdk/src/streamStateView.ts:776](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L776)

#### Returns

`Set`\<`string`\>

***

### initialize()

```ts
initialize(
   nextSyncCookie, 
   minipoolEvents, 
   snapshot, 
   miniblocks, 
   prependedMiniblocks, 
   prevSnapshotMiniblockNum, 
   cleartexts, 
   localEvents, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:520](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L520)

#### Parameters

##### nextSyncCookie

`SyncCookie`

##### minipoolEvents

[`ParsedEvent`](../interfaces/ParsedEvent.md)[]

##### snapshot

`Snapshot`

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### prependedMiniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### prevSnapshotMiniblockNum

`bigint`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### localEvents

[`LocalTimelineEvent`](../type-aliases/LocalTimelineEvent.md)[]

##### emitter

`undefined` | `TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`

***

### prependEvents()

```ts
prependEvents(
   miniblocks, 
   cleartexts, 
   terminus, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:633](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L633)

#### Parameters

##### miniblocks

[`ParsedMiniblock`](../interfaces/ParsedMiniblock.md)[]

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### terminus

`boolean`

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### updateDecryptedContent()

```ts
updateDecryptedContent(
   eventId, 
   content, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:479](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L479)

#### Parameters

##### eventId

`string`

##### content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### emitter

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### updateDecryptedContentError()

```ts
updateDecryptedContentError(
   eventId, 
   content, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:505](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L505)

#### Parameters

##### eventId

`string`

##### content

[`DecryptionSessionError`](../../Towns-Protocol-Encryption/interfaces/DecryptionSessionError.md)

##### emitter

`TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### updateLocalEvent()

```ts
updateLocalEvent(
   localId, 
   parsedEventHash, 
   status, 
   emitter): void;
```

Defined in: [packages/sdk/src/streamStateView.ts:707](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L707)

#### Parameters

##### localId

`string`

##### parsedEventHash

`string`

##### status

[`LocalEventStatus`](../type-aliases/LocalEventStatus.md)

##### emitter

`TypedEventEmitter`\<[`StreamEvents`](../type-aliases/StreamEvents.md)\>

#### Returns

`void`

***

### userIsEntitledToKeyExchange()

```ts
userIsEntitledToKeyExchange(userId): boolean;
```

Defined in: [packages/sdk/src/streamStateView.ts:772](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView.ts#L772)

Streams behave slightly differently.
Regular channels: the user needs to be an active member. SO_JOIN
DMs: always open for key exchange for any of the two participants

#### Parameters

##### userId

`string`

#### Returns

`boolean`
