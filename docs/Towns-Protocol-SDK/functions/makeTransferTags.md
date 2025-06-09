# Function: makeTransferTags()

```ts
function makeTransferTags(event, streamView): 
  | undefined
  | {
  groupMentionTypes: GroupMentionType[];
  mentionedUserAddresses: Uint8Array<ArrayBufferLike>[];
  messageInteractionType: MessageInteractionType;
  participatingUserAddresses: Uint8Array<ArrayBufferLike>[];
  threadId?: Uint8Array<ArrayBufferLike>;
};
```

Defined in: [packages/sdk/src/tags.ts:44](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tags.ts#L44)

## Parameters

### event

#### address

`Uint8Array`

**Generated**

from field: bytes address = 1;

#### amount

`string`

uint64 isn't big enough

**Generated**

from field: string amount = 2;

#### channelId

`Uint8Array`

**Generated**

from field: bytes channel_id = 5;

#### isBuy

`boolean`

**Generated**

from field: bool is_buy = 6;

#### messageId

`Uint8Array`

**Generated**

from field: bytes message_id = 4;

#### sender

`Uint8Array`

**Generated**

from field: bytes sender = 3;

### streamView

[`StreamStateView`](../classes/StreamStateView.md)

## Returns

`undefined`

```ts
{
  groupMentionTypes: GroupMentionType[];
  mentionedUserAddresses: Uint8Array<ArrayBufferLike>[];
  messageInteractionType: MessageInteractionType;
  participatingUserAddresses: Uint8Array<ArrayBufferLike>[];
  threadId?: Uint8Array<ArrayBufferLike>;
}
```

### groupMentionTypes

```ts
groupMentionTypes: GroupMentionType[];
```

#### Generated

from field: repeated river.GroupMentionType group_mention_types = 2;

### mentionedUserAddresses

```ts
mentionedUserAddresses: Uint8Array<ArrayBufferLike>[];
```

#### Generated

from field: repeated bytes mentioned_user_addresses = 3;

### messageInteractionType

```ts
messageInteractionType: MessageInteractionType;
```

#### Generated

from field: river.MessageInteractionType message_interaction_type = 1;

### participatingUserAddresses

```ts
participatingUserAddresses: Uint8Array<ArrayBufferLike>[];
```

#### Generated

from field: repeated bytes participating_user_addresses = 4;

### threadId?

```ts
optional threadId: Uint8Array<ArrayBufferLike>;
```

#### Generated

from field: optional bytes thread_id = 5;
