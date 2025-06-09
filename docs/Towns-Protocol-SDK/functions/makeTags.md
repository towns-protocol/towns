# Function: makeTags()

```ts
function makeTags(message, streamView): object;
```

Defined in: [packages/sdk/src/tags.ts:16](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/tags.ts#L16)

## Parameters

### message

#### payload

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

### streamView

[`StreamStateView`](../classes/StreamStateView.md)

## Returns

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
