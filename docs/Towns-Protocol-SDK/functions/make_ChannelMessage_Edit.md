# Function: make\_ChannelMessage\_Edit()

```ts
function make_ChannelMessage_Edit(refEventId, post): ChannelMessage;
```

Defined in: [packages/sdk/src/types.ts:470](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/types.ts#L470)

## Parameters

### refEventId

`string`

### post

#### content

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

#### replyId?

`string`

**Generated**

from field: optional string reply_id = 3;

#### replyPreview?

`string`

**Generated**

from field: optional string reply_preview = 4;

#### threadId?

`string`

**Generated**

from field: optional string thread_id = 1;

#### threadPreview?

`string`

**Generated**

from field: optional string thread_preview = 2;

## Returns

`ChannelMessage`
