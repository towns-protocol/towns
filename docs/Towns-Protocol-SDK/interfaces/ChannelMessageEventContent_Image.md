# Interface: ChannelMessageEventContent\_Image

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:326](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L326)

## Properties

### info?

```ts
optional info: 
  | ChannelMessage_Post_Content_Image_Info
  | {
  height?: number;
  mimetype: string;
  size?: number;
  url: string;
  width?: number;
};
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:328](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L328)

#### Type declaration

`ChannelMessage_Post_Content_Image_Info`

```ts
{
  height?: number;
  mimetype: string;
  size?: number;
  url: string;
  width?: number;
}
```

#### height?

```ts
optional height: number;
```

##### Generated

from field: optional int32 height = 5;

#### mimetype

```ts
mimetype: string;
```

##### Generated

from field: string mimetype = 2;

#### size?

```ts
optional size: number;
```

##### Generated

from field: optional int32 size = 3;

#### url

```ts
url: string;
```

##### Generated

from field: string url = 1;

#### width?

```ts
optional width: number;
```

##### Generated

from field: optional int32 width = 4;

***

### msgType

```ts
msgType: Image;
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:327](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L327)

***

### thumbnail?

```ts
optional thumbnail: 
  | ChannelMessage_Post_Content_Image_Info
  | {
  height?: number;
  mimetype: string;
  size?: number;
  url: string;
  width?: number;
};
```

Defined in: [packages/sdk/src/sync-agent/timeline/models/timeline-types.ts:331](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/sdk/src/sync-agent/timeline/models/timeline-types.ts#L331)

#### Type declaration

`ChannelMessage_Post_Content_Image_Info`

```ts
{
  height?: number;
  mimetype: string;
  size?: number;
  url: string;
  width?: number;
}
```

#### height?

```ts
optional height: number;
```

##### Generated

from field: optional int32 height = 5;

#### mimetype

```ts
mimetype: string;
```

##### Generated

from field: string mimetype = 2;

#### size?

```ts
optional size: number;
```

##### Generated

from field: optional int32 size = 3;

#### url

```ts
url: string;
```

##### Generated

from field: string url = 1;

#### width?

```ts
optional width: number;
```

##### Generated

from field: optional int32 width = 4;
