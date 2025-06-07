# Class: StreamStateView\_Members

Defined in: [packages/sdk/src/streamStateView\_Members.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L75)

## theme_extends

- [`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md)

## Constructors

### Constructor

```ts
new StreamStateView_Members(streamId): StreamStateView_Members;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:95](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L95)

#### Parameters

##### streamId

`string`

#### Returns

`StreamStateView_Members`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`constructor`](StreamStateView_AbstractContent.md#constructor)

## Properties

### encryptionAlgorithm?

```ts
optional encryptionAlgorithm: string = undefined;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:90](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L90)

***

### invitedUsers

```ts
readonly invitedUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:79](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L79)

***

### joined

```ts
readonly joined: Map<string, StreamMember>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:77](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L77)

***

### joinedUsers

```ts
readonly joinedUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:78](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L78)

***

### leftUsers

```ts
readonly leftUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:80](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L80)

***

### memberMetadata

```ts
readonly memberMetadata: StreamStateView_MemberMetadata;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:86](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L86)

***

### pendingInvitedUsers

```ts
readonly pendingInvitedUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:82](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L82)

***

### pendingJoinedUsers

```ts
readonly pendingJoinedUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:81](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L81)

***

### pendingLeftUsers

```ts
readonly pendingLeftUsers: Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:83](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L83)

***

### pendingMembershipEvents

```ts
readonly pendingMembershipEvents: Map<string, MemberPayload_Membership>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:84](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L84)

***

### pins

```ts
readonly pins: Pin[] = [];
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:87](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L87)

***

### solicitHelper

```ts
readonly solicitHelper: StreamStateView_Members_Solicitations;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:85](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L85)

***

### spaceReviews

```ts
spaceReviews: MemberSpaceReview[] = [];
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:91](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L91)

***

### streamId

```ts
readonly streamId: string;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:76](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L76)

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`streamId`](StreamStateView_AbstractContent.md#streamid)

***

### tips

```ts
tips: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:88](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L88)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tipsCount

```ts
tipsCount: object = {};
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:89](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L89)

#### Index Signature

```ts
[key: string]: bigint
```

***

### tokenTransfers

```ts
tokenTransfers: MemberTokenTransfer[] = [];
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:93](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L93)

## Methods

### appendEvent()

```ts
appendEvent(
   event, 
   cleartext, 
   encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:267](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L267)

Places event in a pending queue, to be applied when the event is confirmed in a miniblock header

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`appendEvent`](StreamStateView_AbstractContent.md#appendevent)

***

### applyMembershipEvent()

```ts
applyMembershipEvent(
   userId, 
   op, 
   type, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:695](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L695)

#### Parameters

##### userId

`string`

##### op

`MembershipOp`

##### type

`"pending"` | `"confirmed"`

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

***

### applySnapshot()

```ts
applySnapshot(
   event, 
   snapshot, 
   cleartexts, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:103](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L103)

#### Parameters

##### event

[`ParsedEvent`](../interfaces/ParsedEvent.md)

##### snapshot

`Snapshot`

##### cleartexts

`undefined` | `Record`\<`string`, `string` \| `Uint8Array`\<`ArrayBufferLike`\>\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

***

### decryptEvent()

```ts
decryptEvent(
   kind, 
   event, 
   content, 
   cleartext, 
   encryptionEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:23](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L23)

#### Parameters

##### kind

`"text"` | `"channelMessage"` | `"channelProperties"`

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### content

`EncryptedData`

##### cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`decryptEvent`](StreamStateView_AbstractContent.md#decryptevent)

***

### getStreamParentId()

```ts
getStreamParentId(): undefined | string;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:63](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L63)

#### Returns

`undefined` \| `string`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`getStreamParentId`](StreamStateView_AbstractContent.md#getstreamparentid)

***

### getStreamParentIdAsBytes()

```ts
getStreamParentIdAsBytes(): undefined | Uint8Array<ArrayBufferLike>;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:67](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L67)

#### Returns

`undefined` \| `Uint8Array`\<`ArrayBufferLike`\>

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`getStreamParentIdAsBytes`](StreamStateView_AbstractContent.md#getstreamparentidasbytes)

***

### info()

```ts
info(userId): MembershipOp;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:613](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L613)

#### Parameters

##### userId

`string`

#### Returns

`MembershipOp`

***

### isMember()

```ts
isMember(membership, userId): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:585](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L585)

#### Parameters

##### membership

`MembershipOp`

##### userId

`string`

#### Returns

`boolean`

***

### isMemberJoined()

```ts
isMemberJoined(userId): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:581](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L581)

#### Parameters

##### userId

`string`

#### Returns

`boolean`

***

### joinedOrInvitedParticipants()

```ts
joinedOrInvitedParticipants(): Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:609](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L609)

#### Returns

`Set`\<`string`\>

***

### joinedParticipants()

```ts
joinedParticipants(): Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:605](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L605)

#### Returns

`Set`\<`string`\>

***

### needsScrollback()

```ts
needsScrollback(): boolean;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:75](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L75)

#### Returns

`boolean`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`needsScrollback`](StreamStateView_AbstractContent.md#needsscrollback)

***

### onAppendLocalEvent()

```ts
onAppendLocalEvent(_event, _stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_AbstractContent.ts:56](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_AbstractContent.ts#L56)

#### Parameters

##### \_event

[`StreamTimelineEvent`](../interfaces/StreamTimelineEvent.md)

##### \_stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Inherited from

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onAppendLocalEvent`](StreamStateView_AbstractContent.md#onappendlocalevent)

***

### onConfirmedEvent()

```ts
onConfirmedEvent(
   event, 
   stateEmitter, 
   _): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:517](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L517)

#### Parameters

##### event

[`ConfirmedTimelineEvent`](../type-aliases/ConfirmedTimelineEvent.md)

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

##### \_

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onConfirmedEvent`](StreamStateView_AbstractContent.md#onconfirmedevent)

***

### onDecryptedContent()

```ts
onDecryptedContent(
   eventId, 
   content, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:566](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L566)

#### Parameters

##### eventId

`string`

##### content

[`DecryptedContent`](../type-aliases/DecryptedContent.md)

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`onDecryptedContent`](StreamStateView_AbstractContent.md#ondecryptedcontent)

***

### participants()

```ts
participants(): Set<string>;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:601](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L601)

#### Returns

`Set`\<`string`\>

***

### prependEvent()

```ts
prependEvent(
   event, 
   _cleartext, 
   _encryptionEmitter, 
   stateEmitter): void;
```

Defined in: [packages/sdk/src/streamStateView\_Members.ts:205](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/streamStateView_Members.ts#L205)

#### Parameters

##### event

[`RemoteTimelineEvent`](../type-aliases/RemoteTimelineEvent.md)

##### \_cleartext

`undefined` | `string` | `Uint8Array`\<`ArrayBufferLike`\>

##### \_encryptionEmitter

`undefined` | `TypedEventEmitter`\<[`StreamEncryptionEvents`](../type-aliases/StreamEncryptionEvents.md)\>

##### stateEmitter

`undefined` | `TypedEventEmitter`\<[`StreamStateEvents`](../type-aliases/StreamStateEvents.md)\>

#### Returns

`void`

#### Overrides

[`StreamStateView_AbstractContent`](StreamStateView_AbstractContent.md).[`prependEvent`](StreamStateView_AbstractContent.md#prependevent)
